import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/lib/models/Product";
import { revalidatePath } from "next/cache";

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const { products } = await request.json();
    
    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: "Products array is required" }, { status: 400 });
    }
    
    // Update sortOrder for each product
    for (const product of products) {
      if (product.id && product.sortOrder !== undefined) {
        await Product.findByIdAndUpdate(product.id, { sortOrder: product.sortOrder });
      }
    }
    
    // Invalidate cache for shop page and products API
    revalidatePath('/shop');
    revalidatePath('/api/shop/products');
    
    return NextResponse.json({ success: true, message: "Products reordered successfully" });
  } catch (error) {
    console.error("Failed to reorder products:", error);
    return NextResponse.json({ error: "Failed to reorder products" }, { status: 500 });
  }
}
