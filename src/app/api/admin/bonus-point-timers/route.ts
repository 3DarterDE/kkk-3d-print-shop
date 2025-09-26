import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Review } from '@/lib/models/Review';
import { User } from '@/lib/models/User';
import Order from '@/lib/models/Order';
import { AdminBonusPoints } from '@/lib/models/AdminBonusPoints';

// GET: Fetch all pending bonus point timers
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // all, pending, ready, credited
    const search = searchParams.get('search') || ''; // search by customer name or email

    let query: any = {
      bonusPointsAwarded: { $gt: 0 }
    };

    if (status === 'pending') {
      query.bonusPointsCredited = false;
      query.bonusPointsScheduledAt = { $gt: new Date() };
    } else if (status === 'ready') {
      query.bonusPointsCredited = false;
      query.bonusPointsScheduledAt = { $lte: new Date() };
    } else if (status === 'credited') {
      query.bonusPointsCredited = true;
    }

    // Get both review and admin bonus points
    const [reviews, adminBonusPoints] = await Promise.all([
      Review.find(query)
        .sort({ bonusPointsCredited: 1, bonusPointsScheduledAt: 1 })
        .lean(),
      AdminBonusPoints.find(query)
        .sort({ bonusPointsCredited: 1, bonusPointsScheduledAt: 1 })
        .lean()
    ]);

    // Get order and user information for each review
    const reviewsWithOrderInfo = await Promise.all(
      reviews.map(async (review) => {
        const [order, user] = await Promise.all([
          Order.findById(review.orderId).lean(),
          User.findById(review.userId).lean()
        ]);
        return {
          ...review,
          type: 'review',
          orderNumber: order?.orderNumber || 'N/A',
          orderStatus: order?.status || 'unknown',
          orderCreatedAt: order?.createdAt,
          userId: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || ''
          }
        };
      })
    );

    // Get order and user information for each admin bonus points
    const adminBonusWithOrderInfo = await Promise.all(
      adminBonusPoints.map(async (adminBonus) => {
        const [order, user, awardedByUser] = await Promise.all([
          Order.findById(adminBonus.orderId).lean(),
          User.findById(adminBonus.userId).lean(),
          User.findById(adminBonus.awardedBy).lean()
        ]);
        return {
          ...adminBonus,
          type: 'admin',
          orderNumber: order?.orderNumber || 'N/A',
          orderStatus: order?.status || 'unknown',
          orderCreatedAt: order?.createdAt,
          userId: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || ''
          },
          awardedByUser: {
            firstName: awardedByUser?.firstName || '',
            lastName: awardedByUser?.lastName || '',
            email: awardedByUser?.email || ''
          }
        };
      })
    );

    // Combine both types
    const allTimers = [...reviewsWithOrderInfo, ...adminBonusWithOrderInfo];

    // Apply search filter if provided
    let filteredTimers = allTimers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTimers = allTimers.filter(timer => {
        const fullName = `${timer.userId.firstName} ${timer.userId.lastName}`.toLowerCase();
        const email = timer.userId.email.toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
    }

    // Calculate statistics
    const stats = {
      total: filteredTimers.length,
      pending: filteredTimers.filter(r => !r.bonusPointsCredited && r.bonusPointsScheduledAt && r.bonusPointsScheduledAt > new Date()).length,
      ready: filteredTimers.filter(r => !r.bonusPointsCredited && r.bonusPointsScheduledAt && r.bonusPointsScheduledAt <= new Date()).length,
      credited: filteredTimers.filter(r => r.bonusPointsCredited).length,
      totalPendingPoints: filteredTimers
        .filter(r => !r.bonusPointsCredited)
        .reduce((sum, r) => sum + ((r as any).bonusPointsAwarded || (r as any).pointsAwarded || 0), 0)
    };

    return NextResponse.json({
      success: true,
      reviews: filteredTimers,
      stats
    });

  } catch (error) {
    console.error('Error fetching bonus point timers:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Bonuspunkte-Timer' }, { status: 500 });
  }
}

// POST: Manual actions on timers (credit, cancel, etc.)
export async function POST(request: NextRequest) {
  try {
    const { action, reviewId, reason } = await request.json();

    if (!action || !reviewId) {
      return NextResponse.json({ error: 'Action und Review ID sind erforderlich' }, { status: 400 });
    }

    await connectToDatabase();

    // Try to find in both Review and AdminBonusPoints
    let review = await Review.findById(reviewId);
    let adminBonus = null;
    let timerType = 'review';

    if (!review) {
      adminBonus = await AdminBonusPoints.findById(reviewId);
      timerType = 'admin';
      if (!adminBonus) {
        return NextResponse.json({ error: 'Timer nicht gefunden' }, { status: 404 });
      }
    }

    switch (action) {
      case 'credit_now':
        // Credit bonus points immediately
        const userId = timerType === 'review' ? review?.userId : adminBonus?.userId;
        const pointsToCredit = timerType === 'review' ? review?.bonusPointsAwarded : adminBonus?.pointsAwarded;
        
        const user = await User.findById(userId);
        if (!user) {
          return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
        }

        user.bonusPoints += pointsToCredit || 0;
        await user.save();

        if (timerType === 'review' && review) {
          review.bonusPointsCredited = true;
          review.bonusPointsCreditedAt = new Date();
          await review.save();
        } else if (adminBonus) {
          adminBonus.bonusPointsCredited = true;
          adminBonus.bonusPointsCreditedAt = new Date();
          await adminBonus.save();
        }

        return NextResponse.json({
          success: true,
          message: `${pointsToCredit} Bonuspunkte wurden gutgeschrieben`,
          action: 'credited'
        });

      case 'cancel':
        // Cancel the bonus points timer
        if (timerType === 'review' && review) {
          review.bonusPointsAwarded = 0;
          review.bonusPointsCredited = true;
          review.bonusPointsCreditedAt = new Date();
          await review.save();
        } else if (adminBonus) {
          adminBonus.pointsAwarded = 0;
          adminBonus.bonusPointsCredited = true;
          adminBonus.bonusPointsCreditedAt = new Date();
          await adminBonus.save();
        }

        return NextResponse.json({
          success: true,
          message: 'Bonuspunkte-Timer wurde storniert',
          action: 'cancelled'
        });

      case 'extend':
        // Extend the timer by 1 week
        const currentDate = timerType === 'review' 
          ? (review?.bonusPointsScheduledAt || new Date())
          : (adminBonus?.bonusPointsScheduledAt || new Date());
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        
        if (timerType === 'review' && review) {
          review.bonusPointsScheduledAt = newDate;
          await review.save();
        } else if (adminBonus) {
          adminBonus.bonusPointsScheduledAt = newDate;
          await adminBonus.save();
        }

        return NextResponse.json({
          success: true,
          message: 'Timer wurde um 1 Woche verlängert',
          action: 'extended',
          newScheduledDate: newDate
        });

      default:
        return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing timer action:', error);
    return NextResponse.json({ error: 'Fehler bei der Timer-Verarbeitung' }, { status: 500 });
  }
}
