import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/lib/models/Product';
import { connectToDatabase } from '@/lib/mongodb';
import { getStockQuantityForVariations, isVariationInStock } from '@/lib/variation-stock';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { items } = await request.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items data' }, { status: 400 });
    }

    const results = [];

    for (const item of items) {
      const { slug, quantity, variations = {} } = item;

      if (!slug || !quantity || quantity <= 0) {
        results.push({ slug, success: false, error: 'Invalid item data' });
        continue;
      }

      try {
        // Find the product
        const product = await Product.findOne({ slug });
        
        if (!product) {
          results.push({ slug, success: false, error: 'Product not found' });
          continue;
        }

        // Check if enough stock is available for the specific variation
        const availableStock = getStockQuantityForVariations(product, variations);
        const isInStock = isVariationInStock(product, variations);

        if (!isInStock || availableStock < quantity) {
          results.push({ 
            slug, 
            success: false, 
            error: 'Insufficient stock', 
            available: availableStock 
          });
          continue;
        }

        // Prepare update object
        const updateData: any = {};

        // Check if this is a variation-specific order
        const hasVariations = product.variations && product.variations.length > 0 && Object.keys(variations).length > 0;
        
        if (hasVariations) {
          // Use $set with dot notation to update specific variation option
          for (const variationName in variations) {
            const selectedValue = variations[variationName];
            
            // Find the variation index
            const variationIndex = product.variations.findIndex((v: any) => v.name === variationName);
            if (variationIndex === -1) {
              continue;
            }
            
            // Find the option index
            const optionIndex = product.variations[variationIndex].options.findIndex((o: any) => o.value === selectedValue);
            if (optionIndex === -1) {
              continue;
            }
            
            const currentStock = product.variations[variationIndex].options[optionIndex].stockQuantity;
            const newStock = Math.max(0, currentStock - quantity);
            
            // Use dot notation to update specific option
            updateData[`variations.${variationIndex}.options.${optionIndex}.stockQuantity`] = newStock;
            updateData[`variations.${variationIndex}.options.${optionIndex}.inStock`] = newStock > 0;
          }
          
          // Don't update main stock when variations exist - only use variation-specific stock
        } else {
          // No variations - update main stock
          const newStockQuantity = product.stockQuantity - quantity;
          updateData.stockQuantity = Math.max(0, newStockQuantity);
          updateData.inStock = newStockQuantity > 0;
        }

        // Apply the update
        await Product.updateOne({ slug }, updateData);

        results.push({ 
          slug, 
          success: true, 
          newStockQuantity: hasVariations ? availableStock - quantity : updateData.stockQuantity,
          inStock: hasVariations ? (availableStock - quantity) > 0 : updateData.inStock
        });

      } catch (error) {
        console.error(`Error reducing stock for ${slug}:`, error);
        results.push({ slug, success: false, error: 'Database error' });
      }
    }

    // Invalidate cache for shop page and products API to reflect stock changes
    revalidatePath('/shop');
    revalidatePath('/api/admin/products');

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Error in reduce-stock API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
