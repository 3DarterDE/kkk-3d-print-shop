import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Product } from '@/lib/models/Product';
import Category from '@/lib/models/Category';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

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
    
    // Get all products that match in title, tags, category, subcategory, description, or belong to matching categories
    // Use flexible search only for categories/subcategories, exact search for product fields
    const allMatchingProducts = await Product.find({
      $or: [
        { title: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } },
        { category: { $regex: searchRegex } },
        { subcategory: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { categoryId: { $in: allMatchingCategoryIds } },
        { subcategoryId: { $in: allMatchingCategoryIds } },
        { subcategoryIds: { $in: allMatchingCategoryIds } }
      ]
      // Show all products, including out of stock ones
    })
    .select('_id slug title price offerPrice isOnSale isTopSeller inStock stockQuantity images imageSizes tags categoryId subcategoryId subcategoryIds variations createdAt updatedAt description')
    .lean();

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

    // Sort products by relevance with better prioritization
    const sortedProducts = allMatchingProducts.sort((a, b) => {
      const queryLower = query.toLowerCase();
      
      // Calculate match scores for each product
      const getMatchScore = (product: any) => {
        let score = 0;
        const title = product.title.toLowerCase();
        const description = (product.description || '').toLowerCase();
        const tags = (product.tags || []).map((tag: string) => tag.toLowerCase());
        const category = (product.category || '').toLowerCase();
        const subcategory = (product.subcategory || '').toLowerCase();
        const isAvailable = isProductAvailable(product);
        
        // Check if product belongs to matching categories
        const belongsToMatchingCategory = allMatchingCategoryIds.some(catId => 
          product.categoryId && product.categoryId.toString() === catId.toString()
        );
        const belongsToMatchingSubcategory = allMatchingCategoryIds.some(catId => 
          (product.subcategoryId && product.subcategoryId.toString() === catId.toString()) ||
          (product.subcategoryIds && product.subcategoryIds.some((subId: any) => subId.toString() === catId.toString()))
        );
        
        // Check for flexible matches
        const hasFlexibleTitleMatch = flexibleSearchRegex.test(title);
        const hasFlexibleDescriptionMatch = flexibleSearchRegex.test(description);
        const hasFlexibleCategoryMatch = flexibleSearchRegex.test(category);
        const hasFlexibleSubcategoryMatch = flexibleSearchRegex.test(subcategory);
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
          else if (category.includes(queryLower)) score += 200;
          else if (hasFlexibleCategoryMatch) score += 150;
          else if (subcategory.includes(queryLower)) score += 200;
          else if (hasFlexibleSubcategoryMatch) score += 150;
          else if (belongsToMatchingCategory) score += 150;
          else if (belongsToMatchingSubcategory) score += 100;
          
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
          else if (category.includes(queryLower)) score += 200;
          else if (hasFlexibleCategoryMatch) score += 150;
          else if (subcategory.includes(queryLower)) score += 200;
          else if (hasFlexibleSubcategoryMatch) score += 150;
          else if (belongsToMatchingCategory) score += 150;
          else if (belongsToMatchingSubcategory) score += 100;
          
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
          else if (category.includes(queryLower)) score += 200;
          else if (hasFlexibleCategoryMatch) score += 150;
          else if (subcategory.includes(queryLower)) score += 200;
          else if (hasFlexibleSubcategoryMatch) score += 150;
          else if (belongsToMatchingCategory) score += 150;
          else if (belongsToMatchingSubcategory) score += 100;
          
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
        else if (category.includes(queryLower)) score += 20;
        else if (hasFlexibleCategoryMatch) score += 15;
        else if (subcategory.includes(queryLower)) score += 20;
        else if (hasFlexibleSubcategoryMatch) score += 15;
        else if (belongsToMatchingCategory) score += 15;
        else if (belongsToMatchingSubcategory) score += 10;
        
        return score;
      };
      
      const scoreA = getMatchScore(a);
      const scoreB = getMatchScore(b);
      
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

    // Format products
    const formattedProducts = sortedProducts.map(product => {
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
        // Include computed availability that also considers variations
        isAvailable: isProductAvailable(product),
        stockQuantity: product.stockQuantity,
        images: product.images || [],
        imageSizes: product.imageSizes || [],
        variations: product.variations || [],
        tags: product.tags || [],
        // Preserve IDs so the client can relate by category/subcategory
        categoryId: product.categoryId ? (product.categoryId as any).toString?.() || String(product.categoryId) : undefined,
        subcategoryId: product.subcategoryId ? (product.subcategoryId as any).toString?.() || String(product.subcategoryId) : undefined,
        subcategoryIds: Array.isArray(product.subcategoryIds)
          ? (product.subcategoryIds as any[]).map(id => (id as any).toString?.() || String(id))
          : [],
        category: categoryName,
        subcategory: product.subcategory,
        description: product.description
      };
    });

    return NextResponse.json({ 
      products: formattedProducts,
      total: formattedProducts.length,
      query: query.trim()
    });

  } catch (error) {
    console.error('Full search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}
