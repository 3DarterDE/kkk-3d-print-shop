import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/lib/models/Product";
import Review from "@/lib/models/Review";
import mongoose from "mongoose";

export const revalidate = 0; // No cache - always fetch fresh data

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '0');
    const random = searchParams.get('random') === 'true';
    const inStock = searchParams.get('inStock') === 'true';
    
    let products;
    
    // Build match criteria
    const matchCriteria: any = { isActive: true };
    if (inStock) {
      // Include products that are either:
      // 1. In stock with basic stock quantity > 0, OR
      // 2. Have variations with at least one available option
      matchCriteria.$or = [
        // Basic stock available
        { 
          inStock: true, 
          stockQuantity: { $gt: 0 },
          $or: [
            { variations: { $exists: false } },
            { variations: { $size: 0 } }
          ]
        },
        // Variations available
        {
          'variations.options': {
            $elemMatch: {
              inStock: true,
              stockQuantity: { $gt: 0 }
            }
          }
        }
      ];
    }
    
    if (random) {
      // Get random products
      products = await Product.aggregate([
        { $match: matchCriteria },
        { $sample: { size: limit || 20 } }
      ]);
    } else {
      // Get only active products for shop (default behavior)
      products = await Product.find(matchCriteria)
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean();
    }
    
    // Get review statistics for all products using product slugs
    const productSlugs = products.map(p => (p as any).slug).filter(slug => slug);
    
    const reviewStats = await Review.aggregate([
      {
        $match: {
          productId: { $in: productSlugs }
        }
      },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);
    
    // Create a map for quick lookup
    const reviewMap = new Map();
    reviewStats.forEach(stat => {
      // Handle both ObjectId and string _id
      const key = stat._id.toString();
      reviewMap.set(key, {
        averageRating: Math.round(stat.averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: stat.totalReviews
      });
    });
    
    // Add review data to products
    const productsWithReviews = products.map(product => ({
      ...product,
      reviews: reviewMap.get((product as any).slug) || {
        averageRating: 0,
        totalReviews: 0
      }
    }));
    
    return NextResponse.json({ products: productsWithReviews });
  } catch (error) {
    console.error("GET shop products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
