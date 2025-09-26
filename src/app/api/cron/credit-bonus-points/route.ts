import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Review } from '@/lib/models/Review';
import { AdminBonusPoints } from '@/lib/models/AdminBonusPoints';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const now = new Date();
    let creditedCount = 0;
    let totalPoints = 0;

    // Find all expired review timers
    const expiredReviews = await Review.find({
      bonusPointsCredited: false,
      bonusPointsScheduledAt: { $lte: now },
      bonusPointsAwarded: { $gt: 0 }
    });

    // Find all expired admin bonus timers
    const expiredAdminBonus = await AdminBonusPoints.find({
      bonusPointsCredited: false,
      bonusPointsScheduledAt: { $lte: now },
      pointsAwarded: { $gt: 0 }
    });

    // Credit review bonus points
    for (const review of expiredReviews) {
      const user = await User.findById(review.userId);
      if (user) {
        user.bonusPoints += review.bonusPointsAwarded;
        await user.save();

        review.bonusPointsCredited = true;
        review.bonusPointsCreditedAt = new Date();
        await review.save();

        creditedCount++;
        totalPoints += review.bonusPointsAwarded;
      }
    }

    // Credit admin bonus points
    for (const adminBonus of expiredAdminBonus) {
      const user = await User.findById(adminBonus.userId);
      if (user) {
        user.bonusPoints += adminBonus.pointsAwarded;
        await user.save();

        adminBonus.bonusPointsCredited = true;
        adminBonus.bonusPointsCreditedAt = new Date();
        await adminBonus.save();

        creditedCount++;
        totalPoints += adminBonus.pointsAwarded;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron job completed successfully`,
      creditedCount,
      totalPoints,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error.message },
      { status: 500 }
    );
  }
}
