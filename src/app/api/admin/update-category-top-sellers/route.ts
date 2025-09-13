import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import { Product } from "@/lib/models/Product";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const { categoryId, subcategoryId } = await request.json();
    
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
    
    // First, clear all isCategoryTopSeller flags for products in this category
    await Product.updateMany(
      {
        $or: [
          { categoryId: targetCategoryId },
          { subcategoryId: targetCategoryId },
          { subcategoryIds: targetCategoryId }
        ]
      },
      { $set: { isCategoryTopSeller: false } }
    );
    
    // Then set isCategoryTopSeller to true for the top seller products
    if (topSellerProductIds.length > 0) {
      await Product.updateMany(
        {
          _id: { $in: topSellerProductIds },
          $or: [
            { categoryId: targetCategoryId },
            { subcategoryId: targetCategoryId },
            { subcategoryIds: targetCategoryId }
          ]
        },
        { $set: { isCategoryTopSeller: true } }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Updated ${topSellerProductIds.length} category top sellers for category ${targetCategoryId}` 
    });
  } catch (error) {
    console.error("Failed to update category top sellers:", error);
    return NextResponse.json({ error: "Failed to update category top sellers" }, { status: 500 });
  }
}
