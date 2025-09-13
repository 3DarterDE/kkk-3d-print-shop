import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/lib/models/Product";
import { revalidatePath } from "next/cache";

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const { productId, isTopSeller } = await request.json();
    
    if (!productId || typeof isTopSeller !== 'boolean') {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }
    
    const product = await Product.findByIdAndUpdate(
      productId, 
      { isTopSeller }, 
      { new: true }
    ).lean();
    
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    
    // Invalidate cache for shop page and top sellers APIs
    revalidatePath('/shop');
    revalidatePath('/api/shop/top-sellers');
    revalidatePath('/api/shop/category-top-sellers');
    
    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to toggle top seller:", error);
    return NextResponse.json({ error: "Failed to toggle top seller" }, { status: 500 });
  }
}
