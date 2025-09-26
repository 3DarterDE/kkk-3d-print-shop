import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Review } from '@/lib/models/Review';
import { User } from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    // This endpoint should be called by a scheduled job (cron, etc.)
    // For now, we'll make it accessible via admin API
    
    await connectToDatabase();

    // Find all reviews where bonus points should be credited
    const now = new Date();
    const reviewsToCredit = await Review.find({
      bonusPointsCredited: false,
      bonusPointsScheduledAt: { $lte: now },
      bonusPointsAwarded: { $gt: 0 }
    });

    console.log(`Found ${reviewsToCredit.length} reviews ready for bonus point crediting`);

    let totalCredited = 0;
    const creditedReviews = [];

    for (const review of reviewsToCredit) {
      try {
        // Find the user
        const user = await User.findById(review.userId);
        if (!user) {
          console.error(`User not found for review ${review._id}`);
          continue;
        }

        // Credit bonus points
        user.bonusPoints += review.bonusPointsAwarded;
        await user.save();

        // Mark review as credited
        review.bonusPointsCredited = true;
        review.bonusPointsCreditedAt = new Date();
        await review.save();

        totalCredited += review.bonusPointsAwarded;
        creditedReviews.push({
          reviewId: review._id,
          userId: review.userId,
          productId: review.productId,
          pointsAwarded: review.bonusPointsAwarded
        });

        console.log(`Credited ${review.bonusPointsAwarded} points to user ${review.userId} for review ${review._id}`);
      } catch (error) {
        console.error(`Error crediting points for review ${review._id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully credited ${totalCredited} bonus points for ${creditedReviews.length} reviews`,
      creditedReviews,
      totalCredited
    });

  } catch (error) {
    console.error('Error crediting review bonus points:', error);
    return NextResponse.json({ error: 'Fehler beim Gutschreiben der Bonuspunkte' }, { status: 500 });
  }
}

// GET endpoint to check pending bonus points
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const now = new Date();
    const pendingReviews = await Review.find({
      bonusPointsCredited: false,
      bonusPointsScheduledAt: { $lte: now },
      bonusPointsAwarded: { $gt: 0 }
    }).select('userId productId bonusPointsAwarded bonusPointsScheduledAt createdAt');

    const totalPendingPoints = pendingReviews.reduce((sum, review) => sum + review.bonusPointsAwarded, 0);

    return NextResponse.json({
      success: true,
      pendingReviews: pendingReviews.length,
      totalPendingPoints,
      reviews: pendingReviews
    });

  } catch (error) {
    console.error('Error checking pending bonus points:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der ausstehenden Bonuspunkte' }, { status: 500 });
  }
}
