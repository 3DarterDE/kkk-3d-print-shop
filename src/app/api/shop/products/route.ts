import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/lib/models/Product";

export const revalidate = 0; // No cache - always fetch fresh data

export async function GET() {
  try {
    await connectToDatabase();
    
    // Get only active products for shop
    const products = await Product.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    
    return NextResponse.json(products);
  } catch (error) {
    console.error("GET shop products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
