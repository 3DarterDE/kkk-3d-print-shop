import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import { Product } from "@/lib/models/Product";

export const revalidate = 30; // Cache for 30 seconds

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const subcategoryId = searchParams.get('subcategoryId');
    
    let targetCategoryId = categoryId;
    
    // If subcategory is specified, use it; otherwise use main category
    if (subcategoryId) {
      targetCategoryId = subcategoryId;
    }
    
    if (!targetCategoryId) {
      return NextResponse.json({ error: "Category ID required" }, { status: 400 });
    }
    
    const category = await Category.findById(targetCategoryId).lean();
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    
    // Get top seller products for this category
    const topSellerProductIds = category.topSellerProducts || [];
    
    if (topSellerProductIds.length === 0) {
      return NextResponse.json([]);
    }
    
    // Optimized query - only fetch products that are in the topSellerProductIds array
    // and match the category criteria, then sort by the order in topSellerProducts array
    const topSellerProducts = await Product.find({
      _id: { $in: topSellerProductIds },
      inStock: true,
      $or: [
        { categoryId: targetCategoryId },
        { subcategoryId: targetCategoryId },
        { subcategoryIds: targetCategoryId }
      ]
    })
      .select('title slug price offerPrice isOnSale images imageSizes')
      .lean();
    
    // Create a map for O(1) lookup instead of O(n) find operations
    const productMap = new Map(topSellerProducts.map(p => [p._id.toString(), p]));
    
    // Sort by the order in topSellerProducts array and filter out undefined values
    const sortedProducts = topSellerProductIds
      .map(id => productMap.get(id))
      .filter(Boolean);
    
    return NextResponse.json(sortedProducts);
  } catch (error) {
    console.error("Failed to fetch category top sellers:", error);
    return NextResponse.json({ error: "Failed to fetch top sellers" }, { status: 500 });
  }
}
