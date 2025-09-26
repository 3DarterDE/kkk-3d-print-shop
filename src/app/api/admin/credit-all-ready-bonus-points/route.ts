import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Review } from '@/lib/models/Review';
import { User } from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
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
    const errors = [];

    for (const review of reviewsToCredit) {
      try {
        // Find the user
        const user = await User.findById(review.userId);
        if (!user) {
          errors.push(`User not found for review ${review._id}`);
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
        errors.push(`Error crediting points for review ${review._id}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully credited ${totalCredited} bonus points for ${creditedReviews.length} reviews`,
      creditedReviews,
      totalCredited,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error crediting review bonus points:', error);
    return NextResponse.json({ error: 'Fehler beim Gutschreiben der Bonuspunkte' }, { status: 500 });
  }
}
