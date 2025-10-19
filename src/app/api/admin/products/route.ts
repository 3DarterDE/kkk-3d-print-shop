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
    const imageSizeSchema = z.object({ main: z.string().min(1).optional(), thumb: z.string().min(1).optional(), small: z.string().min(1).optional() });
    const variationSchema = z.object({
      name: z.string().min(1),
      options: z.array(z.object({
        value: z.string().min(1),
        priceAdjustment: z.number().int().nonnegative().optional(),
        inStock: z.boolean().optional(),
        stockQuantity: z.number().int().nonnegative().optional(),
      })).default([]),
    });
    const schema = z.object({
      title: z.string().min(1),
      sku: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional().default(''),
      price: z.number().int().nonnegative(),
      offerPrice: z.number().int().nonnegative().optional(),
      isOnSale: z.boolean().optional(),
      isTopSeller: z.boolean().optional(),
      category: z.string().min(1),
      categoryId: z.string().optional(),
      subcategoryId: z.string().optional().nullable(),
      subcategoryIds: z.array(z.string()).optional().default([]),
      brand: z.string().optional().nullable(),
      tags: z.array(z.string()).optional().default([]),
      inStock: z.boolean().optional(),
      stockQuantity: z.number().int().nonnegative().optional(),
      images: z.array(z.string()).optional().default([]),
      imageSizes: z.array(imageSizeSchema).optional().default([]),
      videos: z.array(z.string()).optional().default([]),
      videoThumbnails: z.array(z.string()).optional().default([]),
      properties: z.array(z.object({ name: z.string().min(1), value: z.string().min(1) })).optional().default([]),
      variations: z.array(variationSchema).optional().default([]),
      recommendedProducts: z.array(z.string()).optional().default([]),
      sortOrder: z.number().int().nonnegative().optional(),
      createdAt: z.union([z.date(), z.string(), z.number()]).optional(),
      updatedAt: z.union([z.date(), z.string(), z.number()]).optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    await connectToDatabase();
    
    // Ensure sortOrder is set if not provided
    if (body.sortOrder === undefined) {
      const count = await Product.countDocuments();
      body.sortOrder = count;
    }
    
    // Create product with explicit sortOrder and properties
    const productData = { ...parsed.data } as any;
    if (productData.sortOrder === undefined) {
      const count = await Product.countDocuments();
      productData.sortOrder = count;
    }
    
    const product = await Product.create(productData);
    
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
