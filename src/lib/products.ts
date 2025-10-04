import { connectToDatabase } from "@/lib/mongodb";
import { Product, type ProductDocument } from "@/lib/models/Product";
import Review from "@/lib/models/Review";
import mongoose from "mongoose";
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
  const products = await Product.find({ isActive: true })
    .select('_id slug title price offerPrice isOnSale isTopSeller images imageSizes tags categoryId subcategoryId subcategoryIds sortOrder createdAt')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();
  const queryTime = Date.now() - queryStart;
  
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

  // Load review statistics and reviews for the product
  let reviews = null;
  let reviewStats = null;
  if (product && !Array.isArray(product)) {
    // Use product slug as productId (since reviews are stored with slug)
    const productQueryId = product.slug;
    
    // Load review statistics
    const reviewStatsAgg = await Review.aggregate([
      { $match: { productId: productQueryId } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    // Load individual reviews (first 5)
    const reviewsList = await Review.find({ productId: productQueryId })
      .populate('userId', 'firstName lastName name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (reviewStatsAgg.length > 0) {
      const stats = reviewStatsAgg[0];
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      stats.ratingDistribution.forEach((rating: number) => {
        if (rating >= 1 && rating <= 5) {
          ratingDistribution[rating as keyof typeof ratingDistribution]++;
        }
      });

      reviews = {
        averageRating: Math.round(stats.averageRating * 10) / 10,
        totalReviews: stats.totalReviews
      };

      reviewStats = {
        averageRating: Math.round(stats.averageRating * 10) / 10,
        totalReviews: stats.totalReviews,
        ratingDistribution
      };
    } else {
      reviews = {
        averageRating: 0,
        totalReviews: 0
      };
      reviewStats = {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    // Process reviews for display and serialize for client
    const processedReviews = reviewsList.map((review: any) => ({
      _id: review._id.toString(),
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerified: review.isVerified,
      createdAt: review.createdAt.toISOString(),
      user: {
        name: review.isAnonymous ? 'Anonymer Kunde' : 
              (review.userId?.firstName && review.userId?.lastName ? 
                `${review.userId.firstName} ${review.userId.lastName}` : 
                review.userId?.name || 'Unbekannter Kunde'),
        email: review.userId?.email
      }
    }));

    reviews = {
      ...reviews,
      reviews: processedReviews,
      reviewStats
    };
  }

  if (product && !Array.isArray(product)) {
    // Serialize the product object for client components
    const serializedProduct = {
      ...product,
      _id: (product._id as any).toString(),
      createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt,
      updatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : product.updatedAt,
      reviews
    };
    
    return serializedProduct as unknown as ProductDocument;
  }
  
  return null;
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

  // Load review statistics for recommended products
  if (products.length > 0) {
    // Use product slugs for review matching
    const productSlugs = products.map(p => p.slug).filter(slug => slug);
    
    const reviewStats = await Review.aggregate([
      { $match: { productId: { $in: productSlugs } } },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const reviewMap = new Map();
    reviewStats.forEach(stat => {
      // Handle both ObjectId and string _id
      const key = stat._id.toString();
      reviewMap.set(key, {
        averageRating: Math.round(stat.averageRating * 10) / 10,
        totalReviews: stat.totalReviews
      });
    });

    // Add review data to products and serialize for client
    const productsWithReviews = products.map(product => ({
      ...product,
      _id: (product._id as any).toString(),
      createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt,
      updatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : product.updatedAt,
      reviews: reviewMap.get(product.slug) || {
        averageRating: 0,
        totalReviews: 0
      }
    }));

    return productsWithReviews as unknown as ProductDocument[];
  }

  return products.map(product => ({
    ...product,
    _id: (product._id as any).toString(),
    createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt,
    updatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : product.updatedAt
  })) as unknown as ProductDocument[];
});


