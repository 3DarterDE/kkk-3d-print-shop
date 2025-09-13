import { connectToDatabase } from "@/lib/mongodb";
import { Product, type ProductDocument } from "@/lib/models/Product";
import { cache } from "react";

// Cache the database connection
let dbConnected = false;
const connectPromise = connectToDatabase().then(() => {
  dbConnected = true;
});

export const fetchAllProducts = cache(async (): Promise<ProductDocument[]> => {
  const start = Date.now();
  
  if (!dbConnected) {
    await connectPromise;
  }
  const connectTime = Date.now() - start;
  
  const queryStart = Date.now();
  const products = await Product.find({})
    .select('_id slug title price offerPrice isOnSale isTopSeller images imageSizes tags categoryId subcategoryId subcategoryIds sortOrder createdAt')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();
  const queryTime = Date.now() - queryStart;
  
  console.log(`fetchAllProducts - Connect: ${connectTime}ms, Query: ${queryTime}ms, Total: ${Date.now() - start}ms`);
  return products as unknown as ProductDocument[];
});

export const fetchProductBySlug = cache(async (slug: string): Promise<ProductDocument | null> => {
  const start = Date.now();

  if (!dbConnected) {
    await connectPromise;
  }
  const connectTime = Date.now() - start;

  const queryStart = Date.now();
  const product = await Product.findOne({ slug }).lean();
  const queryTime = Date.now() - queryStart;

  console.log(`fetchProductBySlug - Connect: ${connectTime}ms, Query: ${queryTime}ms, Total: ${Date.now() - start}ms`);
  return (product as unknown as ProductDocument) || null;
});

export const fetchRecommendedProducts = cache(async (productIds: string[]): Promise<ProductDocument[]> => {
  const start = Date.now();

  if (!dbConnected) {
    await connectPromise;
  }
  const connectTime = Date.now() - start;

  const queryStart = Date.now();
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const queryTime = Date.now() - queryStart;

  console.log(`fetchRecommendedProducts - Connect: ${connectTime}ms, Query: ${queryTime}ms, Total: ${Date.now() - start}ms`);
  return products as unknown as ProductDocument[];
});


