import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const { parentId, subcategories } = await request.json();
    
    if (!parentId || !subcategories || !Array.isArray(subcategories)) {
      return NextResponse.json({ error: "Parent ID and subcategories array are required" }, { status: 400 });
    }
    
    // Update sortOrder for each subcategory
    for (let i = 0; i < subcategories.length; i++) {
      const subcategoryId = subcategories[i];
      if (subcategoryId) {
        await Category.findByIdAndUpdate(subcategoryId, { sortOrder: i });
      }
    }
    
    return NextResponse.json({ success: true, message: "Subcategories reordered successfully" });
  } catch (error) {
    console.error("Failed to reorder subcategories:", error);
    return NextResponse.json({ error: "Failed to reorder subcategories" }, { status: 500 });
  }
}
