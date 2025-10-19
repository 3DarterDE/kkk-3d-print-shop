import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/lib/models/Product";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { rateLimitRequest, getClientIP } from "@/lib/rate-limit";
import { z } from "zod";

export const revalidate = 0; // No cache - always fetch fresh data

// GET all products
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
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
  const { response } = await requireAdmin();
  if (response) return response;
  try {
    const ip = getClientIP(request);
    const rl = await rateLimitRequest(`admin:write:${ip}`, 30, 60 * 1000);
    if (!rl.success) {
      const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      res.headers.set('Retry-After', Math.max(0, Math.ceil((rl.resetTime - Date.now()) / 1000)).toString());
      return res;
    }

    const csrfOk = await verifyCsrfFromRequest(request);
    if (!csrfOk) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const body = await request.json();
    const schema = z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      price: z.number().nonnegative(),
      stockQuantity: z.number().int().nonnegative().optional(),
      sortOrder: z.number().int().nonnegative().optional(),
      properties: z.array(z.any()).optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }
    await connectToDatabase();
    
    // Ensure sortOrder is set if not provided
    if (body.sortOrder === undefined) {
      const count = await Product.countDocuments();
      body.sortOrder = count;
    }
    
    // Create product with explicit sortOrder and properties
    const productData = {
      ...parsed.data,
      sortOrder: Number(body.sortOrder),
      properties: body.properties || []
    };
    
    // Use insertOne to ensure sortOrder is saved
    const result = await Product.collection.insertOne(productData);
    const product = await Product.findById(result.insertedId);
    
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
