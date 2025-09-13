import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/lib/models/Product";

export const revalidate = 30; // Cache for 30 seconds

export async function GET() {
  try {
    await connectToDatabase();
    const topSellers = await Product.find({ 
      isTopSeller: true, 
      inStock: true 
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(4)
      .select('title slug price offerPrice isOnSale images imageSizes')
      .lean();
    
    return NextResponse.json(topSellers);
  } catch (error) {
    console.error("Failed to fetch top sellers:", error);
    return NextResponse.json({ error: "Failed to fetch top sellers" }, { status: 500 });
  }
}
