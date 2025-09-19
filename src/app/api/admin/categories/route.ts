import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  try {
    console.log("API: Fetching categories...");
    await connectToDatabase();
    
    // Get all categories (both parent and subcategories) - for admin, show all categories
    const allCategories = await Category.find({})
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    
    console.log("API: Found categories:", allCategories.length);
    
    // Separate parent categories and subcategories
    const parentCategories = allCategories.filter(cat => !cat.parentId);
    const subcategories = allCategories.filter(cat => cat.parentId);
    
    console.log("API: Parent categories:", parentCategories.length);
    console.log("API: Subcategories:", subcategories.length);
    
    // Group subcategories by parent
    const subcategoriesByParent = subcategories.reduce((acc, subcat) => {
      const parentId = subcat.parentId?.toString();
      if (!acc[parentId]) {
        acc[parentId] = [];
      }
      acc[parentId].push(subcat);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Add subcategories to parent categories
    const categoriesWithSubcategories = parentCategories.map(parent => ({
      ...parent,
      subcategories: subcategoriesByParent[(parent._id as any).toString()] || []
    }));
    
    console.log("API: Returning categories with subcategories:", categoriesWithSubcategories.length);
    return NextResponse.json(categoriesWithSubcategories);
  } catch (error) {
    console.error("API: Failed to fetch categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  try {
    await connectToDatabase();
    const body = await request.json();
    
    // Generate slug from name
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Ensure unique slug within the same parent category
    let finalSlug = slug;
    let counter = 1;
    const query = body.parentId 
      ? { slug: finalSlug, parentId: body.parentId }
      : { slug: finalSlug, parentId: null };
    
    while (await Category.findOne(query)) {
      finalSlug = `${slug}-${counter}`;
      counter++;
      query.slug = finalSlug;
    }
    
    const categoryData = {
      name: body.name,
      slug: finalSlug,
      description: body.description || '',
      isActive: body.isActive !== false,
      sortOrder: body.sortOrder || 0,
      parentId: body.parentId || null
    };
    
    const category = await Category.create(categoryData);
    
    // Invalidate cache for shop page and categories API
    revalidatePath('/shop');
    revalidatePath('/api/shop/categories');
    
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
