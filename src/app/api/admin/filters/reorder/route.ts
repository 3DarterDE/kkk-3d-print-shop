import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Filter } from "@/lib/models/Filter";
import { revalidatePath } from "next/cache";

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const { filters } = await request.json();
    
    if (!filters || !Array.isArray(filters)) {
      return NextResponse.json({ error: "Filters array is required" }, { status: 400 });
    }
    
    // Update sortOrder for each filter
    for (const filter of filters) {
      if (filter.id && filter.sortOrder !== undefined) {
        await Filter.findByIdAndUpdate(filter.id, { sortOrder: filter.sortOrder });
      }
    }
    
    // Invalidate cache for shop page and filters API
    revalidatePath('/shop');
    revalidatePath('/api/shop/filters');
    
    return NextResponse.json({ success: true, message: "Filters reordered successfully" });
  } catch (error) {
    console.error("Failed to reorder filters:", error);
    return NextResponse.json({ error: "Failed to reorder filters" }, { status: 500 });
  }
}