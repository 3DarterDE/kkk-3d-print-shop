import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/lib/models/Product";
import { revalidatePath } from "next/cache";

export const revalidate = 0; // No cache - always fetch fresh data

// GET all products
export async function GET() {
  try {
    await connectToDatabase();
    
    // First, ensure all products have sortOrder
    const productsWithoutSortOrder = await Product.find({ sortOrder: { $exists: false } });
    if (productsWithoutSortOrder.length > 0) {
      console.log(`Found ${productsWithoutSortOrder.length} products without sortOrder, updating...`);
      
      // Update products without sortOrder
      for (let i = 0; i < productsWithoutSortOrder.length; i++) {
        await Product.findByIdAndUpdate(productsWithoutSortOrder[i]._id, { 
          sortOrder: i 
        });
      }
    }
    
    const products = await Product.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return NextResponse.json(products);
  } catch (error) {
    console.error("GET products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await connectToDatabase();
    
    // Ensure sortOrder is set if not provided
    if (body.sortOrder === undefined) {
      const count = await Product.countDocuments();
      body.sortOrder = count;
    }
    
    console.log("Creating product with sortOrder:", body.sortOrder);
    console.log("Properties received:", body.properties);
    
    // Create product with explicit sortOrder and properties
    const productData = {
      ...body,
      sortOrder: Number(body.sortOrder),
      properties: body.properties || []
    };
    
    console.log("Product data before save:", productData);
    
    // Use insertOne to ensure sortOrder is saved
    const result = await Product.collection.insertOne(productData);
    const product = await Product.findById(result.insertedId);
    
    console.log("Saved product:", product?.toObject());
    
    // Invalidate cache for shop page and top sellers APIs
    revalidatePath('/shop');
    revalidatePath('/api/shop/top-sellers');
    revalidatePath('/api/shop/category-top-sellers');
    
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json({ 
      error: "Failed to create product", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
