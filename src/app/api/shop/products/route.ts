import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/lib/models/Product";
import Review from "@/lib/models/Review";
import mongoose from "mongoose";

export const revalidate = 0; // No cache - always fetch fresh data

export async function GET() {
  try {
    await connectToDatabase();
    
    // Get only active products for shop
    const products = await Product.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    
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
    
    // Debug logging
    console.log('Review stats found:', reviewStats.length);
    console.log('First few review stats:', reviewStats.slice(0, 3));
    console.log('Review map size:', reviewMap.size);
    console.log('First product slug:', (products[0] as any)?.slug);
    console.log('First product reviews:', productsWithReviews[0]?.reviews);
    console.log('Product slugs we searched for:', productSlugs.slice(0, 3));
    
    return NextResponse.json(productsWithReviews);
  } catch (error) {
    console.error("GET shop products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
