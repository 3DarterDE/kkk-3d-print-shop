import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import { revalidatePath } from "next/cache";

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const { categories } = await request.json();
    
    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json({ error: "Categories array is required" }, { status: 400 });
    }
    
    // Update sortOrder for each category
    for (let i = 0; i < categories.length; i++) {
      const categoryId = categories[i];
      if (categoryId) {
        await Category.findByIdAndUpdate(categoryId, { sortOrder: i });
      }
    }
    
    // Invalidate cache for shop page and categories API
    revalidatePath('/shop');
    revalidatePath('/api/shop/categories');
    
    return NextResponse.json({ success: true, message: "Categories reordered successfully" });
  } catch (error) {
    console.error("Failed to reorder categories:", error);
    return NextResponse.json({ error: "Failed to reorder categories" }, { status: 500 });
  }
}
