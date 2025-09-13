import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import { Product } from "@/lib/models/Product";
import { revalidatePath } from "next/cache";

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const { categoryId, productIds, isSubCategory = false } = await request.json();
    
    // No limit on top sellers anymore
    
    // Update category with top seller products
    const category = await Category.findByIdAndUpdate(
      categoryId,
      { topSellerProducts: productIds },
      { new: true }
    );
    
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    
    // Determine which flag to update based on whether it's a subcategory
    const flagToUpdate = isSubCategory ? 'isSubCategoryTopSeller' : 'isCategoryTopSeller';
    
    // Update the appropriate top seller flags in products
    // First, clear all flags for products in this category
    await Product.updateMany(
      {
        $or: [
          { categoryId: categoryId },
          { subcategoryId: categoryId },
          { subcategoryIds: categoryId }
        ]
      },
      { $set: { [flagToUpdate]: false } }
    );
    
    // Then set the appropriate flag to true for the top seller products
    if (productIds.length > 0) {
      await Product.updateMany(
        {
          _id: { $in: productIds },
          $or: [
            { categoryId: categoryId },
            { subcategoryId: categoryId },
            { subcategoryIds: categoryId }
          ]
        },
        { $set: { [flagToUpdate]: true } }
      );
    }
    
    // Invalidate cache for shop page
    revalidatePath('/shop');
    revalidatePath('/api/admin/products');
    
    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to update category top sellers:", error);
    return NextResponse.json({ error: "Failed to update top sellers" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    
    if (!categoryId) {
      return NextResponse.json({ error: "Category ID required" }, { status: 400 });
    }
    
    const category = await Category.findById(categoryId).lean();
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    
    // Get products in this category
    const products = await Product.find({
      $or: [
        { categoryId: categoryId },
        { subcategoryId: categoryId },
        { subcategoryIds: categoryId }
      ]
    }).select('_id title price offerPrice isOnSale images').lean();
    
    return NextResponse.json({
      category,
      products,
      topSellerProducts: (category as any).topSellerProducts || []
    });
  } catch (error) {
    console.error("Failed to fetch category top sellers:", error);
    return NextResponse.json({ error: "Failed to fetch top sellers" }, { status: 500 });
  }
}
