import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Product } from '@/lib/models/Product';
import Category from '@/lib/models/Category';
import Brand from '@/lib/models/Brand';

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
    
    // Create a more flexible search pattern that handles partial matches
    // For example, "steel" should match "steeldart"
    // But be more restrictive to avoid false positives
    const queryTrimmed = query.trim();
    // Only use flexible search for specific short queries to avoid false positives
    const shouldUseFlexibleSearch = queryTrimmed === 'steel';
    const flexibleSearchRegex = shouldUseFlexibleSearch ? 
      new RegExp(queryTrimmed.replace(/(.)/g, '$1.{0,1}'), 'i') : 
      new RegExp(queryTrimmed, 'i');
    
    // First, get all categories that match the search query (including subcategories)
    // Only use flexible search for category names/slugs, not descriptions
    const matchingCategories = await Category.find({
      $or: [
        { name: { $regex: searchRegex } },
        { slug: { $regex: searchRegex } },
        { name: { $regex: flexibleSearchRegex } },
        { slug: { $regex: flexibleSearchRegex } }
      ]
    }).select('_id name slug parentId').lean();
    
    const matchingCategoryIds = matchingCategories.map(cat => (cat as any)._id);
    
    // Also find subcategories by searching for categories that have a parent
    const matchingSubcategories = await Category.find({
      $and: [
        { parentId: { $exists: true, $ne: null } },
        {
          $or: [
            { name: { $regex: searchRegex } },
            { slug: { $regex: searchRegex } },
            { name: { $regex: flexibleSearchRegex } },
            { slug: { $regex: flexibleSearchRegex } }
          ]
        }
      ]
    }).select('_id name slug parentId').lean();
    
    const matchingSubcategoryIds = matchingSubcategories.map(cat => (cat as any)._id);
    
    // Combine all matching category IDs
    const allMatchingCategoryIds = [...matchingCategoryIds, ...matchingSubcategoryIds];
    
    // First, get all products that match in title, tags, category, subcategory, brand, or belong to matching categories
    // Use flexible search only for categories/subategories, exact search for product fields
    const primaryProducts = await Product.find({
      $or: [
        { title: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } },
        { category: { $regex: searchRegex } },
        { subcategory: { $regex: searchRegex } },
        { brand: { $regex: searchRegex } },
        { categoryId: { $in: allMatchingCategoryIds } },
        { subcategoryId: { $in: allMatchingCategoryIds } },
        { subcategoryIds: { $in: allMatchingCategoryIds } }
      ]
      // Show all products, including out of stock ones
    })
    .select('_id slug title price offerPrice isOnSale isTopSeller inStock stockQuantity images imageSizes tags brand categoryId subcategoryId subcategoryIds variations createdAt updatedAt')
    .limit(limit)
    .lean();

    // Then, get products that only match in description (for "Das könnte Sie auch interessieren")
    // Only include description matches for longer queries to avoid too many false positives
    const descriptionOnlyProducts = queryTrimmed.length > 6 ? await Product.find({
      $and: [
        { 
          $or: [
            { description: { $regex: searchRegex } },
            { description: { $regex: flexibleSearchRegex } }
          ]
        },
        { 
          $nor: [
            { title: { $regex: searchRegex } },
            { title: { $regex: flexibleSearchRegex } },
            { tags: { $in: [searchRegex] } },
            { tags: { $in: [flexibleSearchRegex] } },
            { category: { $regex: searchRegex } },
            { category: { $regex: flexibleSearchRegex } },
            { subcategory: { $regex: searchRegex } },
            { subcategory: { $regex: flexibleSearchRegex } },
            { categoryId: { $in: allMatchingCategoryIds } },
            { subcategoryId: { $in: allMatchingCategoryIds } },
            { subcategoryIds: { $in: allMatchingCategoryIds } }
          ]
        }
      ]
      // Show all products, including out of stock ones
    })
    .select('_id slug title price offerPrice isOnSale isTopSeller inStock stockQuantity images imageSizes tags brand categoryId subcategoryId subcategoryIds variations createdAt updatedAt')
    .limit(5) // Limit description-only matches to 5
    .lean() : [];

    // Also search in category names if we have category references
    // Only search in category names/slugs, not descriptions to avoid false positives
    const categorySearch = await Category.find({
      $or: [
        { name: { $regex: searchRegex } },
        { name: { $regex: flexibleSearchRegex } },
        { slug: { $regex: searchRegex } },
        { slug: { $regex: flexibleSearchRegex } }
      ]
    })
    .select('name slug description _id parentId image imageSizes')
    .lean();

    // Also search in brand names
    const brandSearch = await Brand.find({
      isActive: true,
      $or: [
        { name: { $regex: searchRegex } },
        { name: { $regex: flexibleSearchRegex } },
        { slug: { $regex: searchRegex } },
        { slug: { $regex: flexibleSearchRegex } }
      ]
    })
    .select('name slug description _id image imageSizes')
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
    .select('_id slug title price offerPrice isOnSale isTopSeller inStock stockQuantity images imageSizes tags brand categoryId subcategoryId subcategoryIds variations createdAt updatedAt')
    .limit(limit)
    .lean();

    // Also get products that belong to matching brands
    const productsFromBrands = await Product.find({
      brand: { $in: brandSearch.map(brand => brand.slug) }
    })
    .select('_id slug title price offerPrice isOnSale isTopSeller inStock stockQuantity images imageSizes tags brand categoryId subcategoryId subcategoryIds variations createdAt updatedAt')
    .limit(limit)
    .lean();

    // Combine and deduplicate primary results (excluding description-only matches)
    const allPrimaryProducts = [...primaryProducts, ...productsFromCategories, ...productsFromBrands];
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
        
        // Check for flexible matches
        const hasFlexibleTitleMatch = flexibleSearchRegex.test(title);
        const hasFlexibleDescriptionMatch = flexibleSearchRegex.test(description);
        const hasFlexibleTagMatch = tags.some((tag: string) => flexibleSearchRegex.test(tag));
        
        // PRIORITY 1: Available top sellers get highest priority
        if (product.isTopSeller && isAvailable) {
          score += 10000; // Very high base score for available top sellers
          
          // Add text relevance on top of top seller bonus
          if (title === queryLower) score += 1000;
          else if (title.startsWith(queryLower)) score += 800;
          else if (title.includes(queryLower)) score += 600;
          else if (hasFlexibleTitleMatch) score += 500;
          else if (description.includes(queryLower)) score += 400;
          else if (hasFlexibleDescriptionMatch) score += 300;
          else if (tags.some((tag: string) => tag.includes(queryLower))) score += 300;
          else if (hasFlexibleTagMatch) score += 200;
          
          return score;
        }
        
        // PRIORITY 2: Available products (not top sellers)
        if (isAvailable) {
          score += 5000; // High base score for available products
          
          // Add text relevance on top of availability bonus
          if (title === queryLower) score += 1000;
          else if (title.startsWith(queryLower)) score += 800;
          else if (title.includes(queryLower)) score += 600;
          else if (hasFlexibleTitleMatch) score += 500;
          else if (description.includes(queryLower)) score += 400;
          else if (hasFlexibleDescriptionMatch) score += 300;
          else if (tags.some((tag: string) => tag.includes(queryLower))) score += 300;
          else if (hasFlexibleTagMatch) score += 200;
          
          return score;
        }
        
        // PRIORITY 3: Out-of-stock top sellers (lower priority than available products)
        if (product.isTopSeller) {
          score += 2000; // Lower base score for out-of-stock top sellers
          
          // Add text relevance on top of top seller bonus
          if (title === queryLower) score += 1000;
          else if (title.startsWith(queryLower)) score += 800;
          else if (title.includes(queryLower)) score += 600;
          else if (hasFlexibleTitleMatch) score += 500;
          else if (description.includes(queryLower)) score += 400;
          else if (hasFlexibleDescriptionMatch) score += 300;
          else if (tags.some((tag: string) => tag.includes(queryLower))) score += 300;
          else if (hasFlexibleTagMatch) score += 200;
          
          return score;
        }
        
        // PRIORITY 4: Out-of-stock products (lowest priority)
        // Much lower text relevance scores for out-of-stock products
        if (title === queryLower) score += 100;
        else if (title.startsWith(queryLower)) score += 80;
        else if (title.includes(queryLower)) score += 60;
        else if (hasFlexibleTitleMatch) score += 50;
        else if (description.includes(queryLower)) score += 40;
        else if (hasFlexibleDescriptionMatch) score += 30;
        else if (tags.some((tag: string) => tag.includes(queryLower))) score += 30;
        else if (hasFlexibleTagMatch) score += 20;
        
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
    
    // Add matching categories to the map
    matchingCategories.forEach(cat => {
      categoryMap.set((cat as any)._id.toString(), cat.name);
    });
    
    // Add matching subcategories to the map
    matchingSubcategories.forEach(cat => {
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
        // Include availability considering variations for dropdown UI
        isAvailable: isProductAvailable(product),
        stockQuantity: product.stockQuantity,
        images: product.images || [],
        imageSizes: product.imageSizes || [],
        tags: product.tags || [],
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId,
        subcategoryIds: product.subcategoryIds,
        category: categoryName,
        subcategory: product.subcategory,
        type: 'product'
      };
    });

    // Format description-only products for "Das könnte Sie auch interessieren" - limit to 10
    const formattedDescriptionProducts = filteredDescriptionProducts.slice(0, 10).map(product => {
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
      
      // Check for flexible matches
      const hasFlexibleNameA = flexibleSearchRegex.test(nameA);
      const hasFlexibleNameB = flexibleSearchRegex.test(nameB);
      const hasFlexibleDescA = flexibleSearchRegex.test(descA);
      const hasFlexibleDescB = flexibleSearchRegex.test(descB);
      
      // Exact name match gets highest priority
      if (nameA === queryLower && nameB !== queryLower) return -1;
      if (nameB === queryLower && nameA !== queryLower) return 1;
      
      // Name starts with query gets second priority
      if (nameA.startsWith(queryLower) && !nameB.startsWith(queryLower)) return -1;
      if (nameB.startsWith(queryLower) && !nameA.startsWith(queryLower)) return 1;
      
      // Name contains query gets third priority
      if (nameA.includes(queryLower) && !nameB.includes(queryLower)) return -1;
      if (nameB.includes(queryLower) && !nameA.includes(queryLower)) return 1;
      
      // Flexible name match gets fourth priority
      if (hasFlexibleNameA && !hasFlexibleNameB) return -1;
      if (hasFlexibleNameB && !hasFlexibleNameA) return 1;
      
      // Description contains query gets fifth priority
      if (descA.includes(queryLower) && !descB.includes(queryLower)) return -1;
      if (descB.includes(queryLower) && !descA.includes(queryLower)) return 1;
      
      // Flexible description match gets sixth priority
      if (hasFlexibleDescA && !hasFlexibleDescB) return -1;
      if (hasFlexibleDescB && !hasFlexibleDescA) return 1;
      
      // Finally by name alphabetically
      return nameA.localeCompare(nameB);
    });

    // Sort brands with same logic as categories
    const sortedBrands = brandSearch.sort((a, b) => {
      const queryLower = query.toLowerCase();
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      const descA = (a.description || '').toLowerCase();
      const descB = (b.description || '').toLowerCase();
      
      // Check for flexible matches
      const hasFlexibleNameA = flexibleSearchRegex.test(nameA);
      const hasFlexibleNameB = flexibleSearchRegex.test(nameB);
      const hasFlexibleDescA = flexibleSearchRegex.test(descA);
      const hasFlexibleDescB = flexibleSearchRegex.test(descB);
      
      // Exact name match gets highest priority
      if (nameA === queryLower && nameB !== queryLower) return -1;
      if (nameB === queryLower && nameA !== queryLower) return 1;
      
      // Name starts with query gets second priority
      if (nameA.startsWith(queryLower) && !nameB.startsWith(queryLower)) return -1;
      if (nameB.startsWith(queryLower) && !nameA.startsWith(queryLower)) return 1;
      
      // Name contains query gets third priority
      if (nameA.includes(queryLower) && !nameB.includes(queryLower)) return -1;
      if (nameB.includes(queryLower) && !nameA.includes(queryLower)) return 1;
      
      // Flexible name match gets fourth priority
      if (hasFlexibleNameA && !hasFlexibleNameB) return -1;
      if (hasFlexibleNameB && !hasFlexibleNameA) return 1;
      
      // Description contains query gets fifth priority
      if (descA.includes(queryLower) && !descB.includes(queryLower)) return -1;
      if (descB.includes(queryLower) && !descA.includes(queryLower)) return 1;
      
      // Flexible description match gets sixth priority
      if (hasFlexibleDescA && !hasFlexibleDescB) return -1;
      if (hasFlexibleDescB && !hasFlexibleDescA) return 1;
      
      // Finally by name alphabetically
      return nameA.localeCompare(nameB);
    });

    const formattedCategories = sortedCategories.slice(0, 5).map(category => {
      // Get parent category information if this is a subcategory
      let parentCategory = null;
      if (category.parentId) {
        const parent = allCategories.find(cat => (cat as any)._id.toString() === category.parentId.toString());
        if (parent) {
          parentCategory = {
            _id: (parent as any)._id.toString(),
            name: parent.name,
            slug: parent.slug
          };
        }
      }
      
      return {
        _id: (category as any)._id.toString(),
        slug: category.slug,
        name: category.name,
        description: category.description,
        imageSizes: category.imageSizes,
        parentCategory: parentCategory,
        type: 'category'
      };
    });

    const formattedBrands = sortedBrands.slice(0, 3).map(brand => {
      return {
        _id: (brand as any)._id.toString(),
        slug: brand.slug,
        name: brand.name,
        description: brand.description,
        imageSizes: brand.imageSizes,
        type: 'brand'
      };
    });

    // Combine results: primary products first, then categories, then brands, then description-only products
    const allResults = [...formattedPrimaryProducts, ...formattedCategories, ...formattedBrands, ...formattedDescriptionProducts];

    // Count total products found (before limiting)
    const totalProductsFound = uniquePrimaryProducts.length + filteredDescriptionProducts.length;
    const totalCategoriesFound = categorySearch.length;
    const totalBrandsFound = brandSearch.length;

    return NextResponse.json({ 
      products: formattedPrimaryProducts,
      categories: formattedCategories,
      brands: formattedBrands,
      descriptionProducts: formattedDescriptionProducts, // New field for "Das könnte Sie auch interessieren"
      allResults: allResults,
      total: allResults.length,
      totalProductsFound: totalProductsFound,
      totalCategoriesFound: totalCategoriesFound,
      totalBrandsFound: totalBrandsFound,
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
