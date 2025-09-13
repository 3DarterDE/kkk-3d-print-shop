import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/lib/models/Product";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    console.log('Connected to MongoDB');

    // Find all products with variations
    const products = await Product.find({ 
      variations: { $exists: true, $not: { $size: 0 } } 
    });

    console.log(`Found ${products.length} products with variations`);

    let updatedCount = 0;

    for (const product of products) {
      let needsUpdate = false;
      const updatedVariations = product.variations.map((variation: any) => {
        // Check if this variation already has a "Standard" option
        const hasStandard = variation.options.some((option: any) => option.value === "Standard");
        
        if (!hasStandard) {
          needsUpdate = true;
          return {
            ...variation,
            options: [
              // Add "Standard" option first
              {
                value: "Standard",
                priceAdjustment: 0,
                inStock: product.inStock && (product.stockQuantity || 0) > 0,
                stockQuantity: product.stockQuantity || 0
              },
              // Then add existing options
              ...variation.options
            ]
          };
        }
        
        return variation;
      });

      if (needsUpdate) {
        await Product.updateOne(
          { _id: product._id },
          { $set: { variations: updatedVariations } }
        );
        updatedCount++;
        console.log(`Updated product: ${product.title}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Migration completed. Updated ${updatedCount} products.`,
      updatedCount 
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { success: false, error: 'Migration failed' },
      { status: 500 }
    );
  }
}
