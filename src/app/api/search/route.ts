import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Product } from '@/lib/models/Product';
import Category from '@/lib/models/Category';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ products: [] });
    }

    await connectToDatabase();

    // Search in multiple fields using MongoDB text search and regex
    const searchRegex = new RegExp(query.trim(), 'i');
    
    // First, get all products that match in title, tags, category, or subcategory
    const primaryProducts = await Product.find({
      $or: [
        { title: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } },
        { category: { $regex: searchRegex } },
        { subcategory: { $regex: searchRegex } }
      ]
      // Show all products, including out of stock ones
    })
    .select('_id slug title price offerPrice isOnSale isTopSeller inStock stockQuantity images imageSizes tags categoryId subcategoryId subcategoryIds variations createdAt updatedAt')
    .limit(limit)
    .lean();

    // Then, get products that only match in description (for "Das könnte Sie auch interessieren")
    const descriptionOnlyProducts = await Product.find({
      $and: [
        { description: { $regex: searchRegex } },
        { 
          $nor: [
            { title: { $regex: searchRegex } },
            { tags: { $in: [searchRegex] } },
            { category: { $regex: searchRegex } },
            { subcategory: { $regex: searchRegex } }
          ]
        }
      ]
      // Show all products, including out of stock ones
    })
    .select('_id slug title price offerPrice isOnSale isTopSeller inStock stockQuantity images imageSizes tags categoryId subcategoryId subcategoryIds variations createdAt updatedAt')
    .limit(5) // Limit description-only matches to 5
    .lean();

    // Also search in category names if we have category references
    const categorySearch = await Category.find({
      $or: [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } }
      ]
    })
    .select('name slug description _id parentId image imageSizes')
    .lean();

    // Get products that belong to matching categories
    const categoryIds = categorySearch.map(cat => cat._id);
    const productsFromCategories = await Product.find({
      $or: [
        { categoryId: { $in: categoryIds } },
        { subcategoryId: { $in: categoryIds } },
        { subcategoryIds: { $in: categoryIds } }
      ]
      // Show all products, including out of stock ones
    })
    .select('_id slug title price offerPrice isOnSale isTopSeller inStock stockQuantity images imageSizes tags categoryId subcategoryId subcategoryIds variations createdAt updatedAt')
    .limit(limit)
    .lean();

    // Combine and deduplicate primary results (excluding description-only matches)
    const allPrimaryProducts = [...primaryProducts, ...productsFromCategories];
    const uniquePrimaryProducts = allPrimaryProducts.filter((product, index, self) => 
      index === self.findIndex(p => (p as any)._id.toString() === (product as any)._id.toString())
    );

    // Get primary product IDs to exclude from description-only results
    const primaryProductIds = new Set(uniquePrimaryProducts.map(p => (p as any)._id.toString()));
    
    // Filter out description-only products that are already in primary results
    const filteredDescriptionProducts = descriptionOnlyProducts.filter(
      product => !primaryProductIds.has((product as any)._id.toString())
    );

    // Helper function to check if product or any of its variations are available
    const isProductAvailable = (product: any) => {
      // Check main product stock
      if (product.inStock) return true;
      
      // Check if any variation is available
      if (product.variations && product.variations.length > 0) {
        return product.variations.some((variation: any) => 
          variation.options && variation.options.some((option: any) => 
            option.inStock === true || (option.stockQuantity && option.stockQuantity > 0)
          )
        );
      }
      
      return false;
    };

    // Debug logging for the first few products
    if (uniquePrimaryProducts.length > 0) {
      console.log('=== SEARCH DEBUG ===');
      console.log('Query:', query);
      uniquePrimaryProducts.slice(0, 5).forEach((product, index) => {
        const isAvailable = isProductAvailable(product);
        console.log(`${index + 1}. ${product.title}`);
        console.log(`   - isTopSeller: ${product.isTopSeller}`);
        console.log(`   - inStock: ${product.inStock}`);
        console.log(`   - isAvailable: ${isAvailable}`);
        console.log(`   - variations: ${product.variations ? product.variations.length : 0}`);
        if (product.variations && product.variations.length > 0) {
          console.log(`   - variation details:`, product.variations.map((v: any) => ({
            name: v.name,
            options: v.options?.map((o: any) => ({ value: o.value, inStock: o.inStock, stockQuantity: o.stockQuantity }))
          })));
        }
      });
      console.log('==================');
    }

    // Sort primary products by relevance with better prioritization
    const sortedPrimaryProducts = uniquePrimaryProducts.sort((a, b) => {
      const queryLower = query.toLowerCase();
      
      // Calculate match scores for each product
      const getMatchScore = (product: any) => {
        let score = 0;
        const title = product.title.toLowerCase();
        const description = (product.description || '').toLowerCase();
        const tags = (product.tags || []).map((tag: string) => tag.toLowerCase());
        const isAvailable = isProductAvailable(product);
        
        // PRIORITY 1: Available top sellers get highest priority
        if (product.isTopSeller && isAvailable) {
          score += 10000; // Very high base score for available top sellers
          
          // Add text relevance on top of top seller bonus
          if (title === queryLower) score += 1000;
          else if (title.startsWith(queryLower)) score += 800;
          else if (title.includes(queryLower)) score += 600;
          else if (description.includes(queryLower)) score += 400;
          else if (tags.some((tag: string) => tag.includes(queryLower))) score += 300;
          
          return score;
        }
        
        // PRIORITY 2: Available products (not top sellers)
        if (isAvailable) {
          score += 5000; // High base score for available products
          
          // Add text relevance on top of availability bonus
          if (title === queryLower) score += 1000;
          else if (title.startsWith(queryLower)) score += 800;
          else if (title.includes(queryLower)) score += 600;
          else if (description.includes(queryLower)) score += 400;
          else if (tags.some((tag: string) => tag.includes(queryLower))) score += 300;
          
          return score;
        }
        
        // PRIORITY 3: Out-of-stock top sellers (lower priority than available products)
        if (product.isTopSeller) {
          score += 2000; // Lower base score for out-of-stock top sellers
          
          // Add text relevance on top of top seller bonus
          if (title === queryLower) score += 1000;
          else if (title.startsWith(queryLower)) score += 800;
          else if (title.includes(queryLower)) score += 600;
          else if (description.includes(queryLower)) score += 400;
          else if (tags.some((tag: string) => tag.includes(queryLower))) score += 300;
          
          return score;
        }
        
        // PRIORITY 4: Out-of-stock products (lowest priority)
        // Much lower text relevance scores for out-of-stock products
        if (title === queryLower) score += 100;
        else if (title.startsWith(queryLower)) score += 80;
        else if (title.includes(queryLower)) score += 60;
        else if (description.includes(queryLower)) score += 40;
        else if (tags.some((tag: string) => tag.includes(queryLower))) score += 30;
        
        return score;
      };
      
      const scoreA = getMatchScore(a);
      const scoreB = getMatchScore(b);
      
      // Debug logging for sorting
      if (query.toLowerCase().includes('autodart')) {
        console.log(`Comparing: "${a.title}" (${scoreA}) vs "${b.title}" (${scoreB})`);
      }
      
      // Sort by score (highest first)
      if (scoreA !== scoreB) return scoreB - scoreA;
      
      // If scores are equal, sort by title alphabetically
      return a.title.localeCompare(b.title);
    });

    // Get all category names for lookup
    const allCategories = await Category.find({}).lean();
    const categoryMap = new Map();
    allCategories.forEach(cat => {
      categoryMap.set((cat as any)._id.toString(), cat.name);
    });

    // Format primary products
    const formattedPrimaryProducts = sortedPrimaryProducts.slice(0, limit).map(product => {
      // Get category name from categoryId lookup or fallback to category field
      let categoryName = '';
      if (product.categoryId && categoryMap.has(product.categoryId)) {
        categoryName = categoryMap.get(product.categoryId);
      } else if (typeof product.category === 'string') {
        categoryName = product.category;
      }
      
      return {
        _id: (product as any)._id.toString(),
        slug: product.slug,
        title: product.title,
        price: product.price,
        offerPrice: product.offerPrice,
        isOnSale: product.isOnSale,
        isTopSeller: product.isTopSeller,
        inStock: product.inStock,
        stockQuantity: product.stockQuantity,
        images: product.images || [],
        imageSizes: product.imageSizes || [],
        tags: product.tags || [],
        category: categoryName,
        subcategory: product.subcategory,
        type: 'product'
      };
    });

    // Format description-only products for "Das könnte Sie auch interessieren"
    const formattedDescriptionProducts = filteredDescriptionProducts.map(product => {
      // Get category name from categoryId lookup or fallback to category field
      let categoryName = '';
      if (product.categoryId && categoryMap.has(product.categoryId)) {
        categoryName = categoryMap.get(product.categoryId);
      } else if (typeof product.category === 'string') {
        categoryName = product.category;
      }
      
      return {
        _id: (product as any)._id.toString(),
        slug: product.slug,
        title: product.title,
        price: product.price,
        offerPrice: product.offerPrice,
        isOnSale: product.isOnSale,
        isTopSeller: product.isTopSeller,
        inStock: product.inStock,
        stockQuantity: product.stockQuantity,
        images: product.images || [],
        imageSizes: product.imageSizes || [],
        tags: product.tags || [],
        category: categoryName,
        subcategory: product.subcategory,
        type: 'product',
        isDescriptionMatch: true // Flag to identify description-only matches
      };
    });

    // Format categories with better sorting
    const sortedCategories = categorySearch.sort((a, b) => {
      const queryLower = query.toLowerCase();
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      const descA = (a.description || '').toLowerCase();
      const descB = (b.description || '').toLowerCase();
      
      // Exact name match gets highest priority
      if (nameA === queryLower && nameB !== queryLower) return -1;
      if (nameB === queryLower && nameA !== queryLower) return 1;
      
      // Name starts with query gets second priority
      if (nameA.startsWith(queryLower) && !nameB.startsWith(queryLower)) return -1;
      if (nameB.startsWith(queryLower) && !nameA.startsWith(queryLower)) return 1;
      
      // Name contains query gets third priority
      if (nameA.includes(queryLower) && !nameB.includes(queryLower)) return -1;
      if (nameB.includes(queryLower) && !nameA.includes(queryLower)) return 1;
      
      // Description contains query gets fourth priority
      if (descA.includes(queryLower) && !descB.includes(queryLower)) return -1;
      if (descB.includes(queryLower) && !descA.includes(queryLower)) return 1;
      
      // Finally by name alphabetically
      return nameA.localeCompare(nameB);
    });

    const formattedCategories = sortedCategories.slice(0, 3).map(category => ({
      _id: (category as any)._id.toString(),
      slug: category.slug,
      name: category.name,
      description: category.description,
      imageSizes: category.imageSizes,
      type: 'category'
    }));

    // Combine results: primary products first, then categories, then description-only products
    const allResults = [...formattedPrimaryProducts, ...formattedCategories, ...formattedDescriptionProducts];

    return NextResponse.json({ 
      products: formattedPrimaryProducts,
      categories: formattedCategories,
      descriptionProducts: formattedDescriptionProducts, // New field for "Das könnte Sie auch interessieren"
      allResults: allResults,
      total: allResults.length,
      query: query.trim()
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}
