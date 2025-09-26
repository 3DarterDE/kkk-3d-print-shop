import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Review from '@/lib/models/Review';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    if (!user) {
      return response!;
    }

    const body = await request.json();
    const { reviews } = body;

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json({ error: 'Keine Bewertungen erhalten' }, { status: 400 });
    }

    await connectToDatabase();

    // Validate each review
    for (const review of reviews) {
      if (!review.productId || !review.orderId || !review.rating || review.rating < 1 || review.rating > 5) {
        return NextResponse.json({ error: 'Ungültige Bewertungsdaten' }, { status: 400 });
      }
    }

    // Check if user already reviewed these specific products from this order
    const productIds = reviews.map(r => r.productId);
    const existingReviews = await Review.find({
      userId: user._id.toString(),
      orderId: reviews[0].orderId,
      productId: { $in: productIds }
    });

    if (existingReviews.length > 0) {
      const alreadyReviewedProducts = existingReviews.map(r => r.productId);
      return NextResponse.json({ 
        error: `Du hast bereits Bewertungen für folgende Produkte abgegeben: ${alreadyReviewedProducts.join(', ')}` 
      }, { status: 400 });
    }

    // Create reviews
    const createdReviews = [];
    let totalBonusPoints = 0;

    for (const reviewData of reviews) {
      // Calculate when bonus points should be credited (2 weeks from now)
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 14); // 2 weeks

      const review = new Review({
        userId: user._id.toString(),
        productId: reviewData.productId,
        orderId: reviewData.orderId,
        rating: reviewData.rating,
        title: reviewData.title || '',
        comment: reviewData.comment || '',
        isAnonymous: reviewData.isAnonymous || false,
        isVerified: true,
        bonusPointsAwarded: reviewData.bonusPointsAwarded || 0,
        bonusPointsCredited: false,
        bonusPointsScheduledAt: scheduledDate
      });

      await review.save();
      createdReviews.push(review);
      totalBonusPoints += reviewData.bonusPointsAwarded || 0;
    }

    // Note: Bonus points will be credited automatically after 2 weeks via scheduled job

    return NextResponse.json({ 
      success: true, 
      reviews: createdReviews,
      bonusPointsAwarded: totalBonusPoints
    });

  } catch (error) {
    console.error('Error creating reviews:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der Bewertungen' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    if (!user) {
      return response!;
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const orderId = searchParams.get('orderId');

    await connectToDatabase();

    let query: any = {};
    if (productId) {
      query.productId = productId;
    }
    if (orderId) {
      // Support multiple order IDs separated by comma
      const orderIds = orderId.split(',').map(id => id.trim());
      query.orderId = { $in: orderIds };
    }

    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ reviews });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Bewertungen' }, { status: 500 });
  }
}
