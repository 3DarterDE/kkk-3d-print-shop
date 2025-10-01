import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/lib/models/Product";

export async function POST(request: NextRequest) {
  try {
    // Be resilient to empty bodies or invalid JSON
    let slugs: string[] = [];
    try {
      const raw = await request.text();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.slugs)) slugs = parsed.slugs as string[];
      }
    } catch {
      // ignore parse errors and treat as empty
    }

    // If no slugs provided, respond with empty result gracefully (avoid 500/log noise)
    if (!slugs.length) {
      return NextResponse.json({ results: [] });
    }

    await connectToDatabase();
    
    // Get current product data for all slugs
    const products = await Product.find(
      { slug: { $in: slugs } },
      { 
        slug: 1, 
        title: 1, 
        price: 1, 
        offerPrice: 1, 
        isOnSale: 1, 
        inStock: 1, 
        stockQuantity: 1,
        variations: 1 
      }
    ).lean();

    // Create a map for quick lookup
    const productMap = new Map();
    products.forEach(product => {
      productMap.set(product.slug, product);
    });

    // Validate each requested slug
    const validationResults = slugs.map(slug => {
      const product = productMap.get(slug);
      return {
        slug,
        exists: !!product,
        product: product || null
      };
    });

    return NextResponse.json({ results: validationResults });
  } catch (error) {
    console.error("Error validating products:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
