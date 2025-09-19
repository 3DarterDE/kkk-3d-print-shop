import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";

export const revalidate = 0; // No cache - always fetch fresh data

export async function GET() {
  try {
    await connectToDatabase();
    
    // Don't automatically set all categories to active - respect the isActive field
    
    // Get ALL categories first
    const allCategories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('name slug description _id parentId image imageSizes')
      .lean();
    
    // Get parent categories (parentId is null)
    const categories = allCategories.filter(cat => !cat.parentId);
    
    // Get subcategories (parentId is not null)
    const allSubcategories = allCategories.filter(cat => cat.parentId);
    
    // Group subcategories by parent
    const subcategoriesByParent = allSubcategories.reduce((acc, subcat) => {
      const parentId = subcat.parentId?.toString();
      if (!acc[parentId]) {
        acc[parentId] = [];
      }
      acc[parentId].push(subcat);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Add subcategories to parent categories
    const categoriesWithSubcategories = categories.map(category => ({
      ...category,
      _id: (category._id as any).toString(),
      subcategories: (subcategoriesByParent[(category._id as any).toString()] || []).map(sub => ({
        ...sub,
        _id: (sub._id as any).toString(),
        parentId: (sub.parentId as any).toString()
      }))
    }));
    
    return NextResponse.json({ 
      categories: categoriesWithSubcategories,
      total: categoriesWithSubcategories.length 
    });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
