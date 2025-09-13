import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const category = await Category.findById(id).lean();
    
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    
    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to fetch category:", error);
    return NextResponse.json({ error: "Failed to fetch category" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    
    // If name is being updated, regenerate slug
    if (body.name) {
      const slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // Ensure unique slug within the same parent category (excluding current category)
      let finalSlug = slug;
      let counter = 1;
      const query = body.parentId 
        ? { slug: finalSlug, parentId: body.parentId, _id: { $ne: id } }
        : { slug: finalSlug, parentId: null, _id: { $ne: id } };
      
      while (await Category.findOne(query)) {
        finalSlug = `${slug}-${counter}`;
        counter++;
        query.slug = finalSlug;
      }
      body.slug = finalSlug;
    }
    
    const category = await Category.findByIdAndUpdate(id, body, { new: true }).lean();
    
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    
    // Invalidate cache for shop page and categories API
    revalidatePath('/shop');
    revalidatePath('/api/shop/categories');
    
    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    // Check if category is used by any products or has subcategories
    const { Product } = await import("@/lib/models/Product");
    const productsUsingCategory = await Product.find({ categoryId: id }).countDocuments();
    const subcategoriesCount = await Category.find({ parentId: id }).countDocuments();
    
    if (productsUsingCategory > 0) {
      return NextResponse.json({ 
        error: `Cannot delete category. It is used by ${productsUsingCategory} product(s).` 
      }, { status: 400 });
    }
    
    if (subcategoriesCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete category. It has ${subcategoriesCount} subcategory(ies). Please delete subcategories first.` 
      }, { status: 400 });
    }
    
    const category = await Category.findByIdAndDelete(id);
    
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    
    // Invalidate cache for shop page and categories API
    revalidatePath('/shop');
    revalidatePath('/api/shop/categories');
    
    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
