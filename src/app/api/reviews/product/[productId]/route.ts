import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Review from '@/lib/models/Review';
import User from '@/lib/models/User';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    await connectToDatabase();

    // Check if productId is a valid ObjectId, otherwise treat as string
    let productQueryId;
    if (mongoose.Types.ObjectId.isValid(productId)) {
      productQueryId = new mongoose.Types.ObjectId(productId);
    } else {
      productQueryId = productId; // Use as string
    }

    // Get reviews for the product
    const reviews = await Review.find({ productId: productQueryId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get user information separately since userId is stored as string
    const userIds = [...new Set(reviews.map(review => review.userId))];
    const users = await User.find({ _id: { $in: userIds } }, 'firstName lastName name email').lean();
    const userMap = new Map(users.map(user => [user._id.toString(), user]));

    // Get total count for pagination
    const totalReviews = await Review.countDocuments({ productId: productQueryId });

    // Get review statistics
    const stats = await Review.aggregate([
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

    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (stats.length > 0 && stats[0].ratingDistribution) {
      stats[0].ratingDistribution.forEach((rating: number) => {
        ratingDistribution[rating as keyof typeof ratingDistribution]++;
      });
    }

    const result = {
      reviews: reviews.map(review => {
        const user = userMap.get(review.userId);
        const displayName = review.isAnonymous === true
          ? 'Anonymer Kunde'
          : user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}`
            : user?.name || 'Anonymer Kunde';
            
        return {
          _id: review._id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          isVerified: review.isVerified,
          createdAt: review.createdAt,
          user: {
            name: displayName,
            email: user?.email ? '***@***.***' : undefined
          }
        };
      }),
      pagination: {
        page,
        limit,
        total: totalReviews,
        pages: Math.ceil(totalReviews / limit)
      },
      statistics: {
        averageRating: stats.length > 0 ? stats[0].averageRating : 0,
        totalReviews: stats.length > 0 ? stats[0].totalReviews : 0,
        ratingDistribution
      }
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching product reviews:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Bewertungen' }, { status: 500 });
  }
}
