#!/usr/bin/env node

/**
 * Script to credit review bonus points after 2 weeks
 * Run this script manually or set up as a cron job
 * 
 * Usage: node scripts/credit-review-bonus-points.js
 */

const { MongoClient } = require('mongodb');

async function creditReviewBonusPoints() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/3darter');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const reviewsCollection = db.collection('reviews');
    const usersCollection = db.collection('users');
    
    // Find all reviews where bonus points should be credited
    const now = new Date();
    const reviewsToCredit = await reviewsCollection.find({
      bonusPointsCredited: false,
      bonusPointsScheduledAt: { $lte: now },
      bonusPointsAwarded: { $gt: 0 }
    }).toArray();
    
    console.log(`Found ${reviewsToCredit.length} reviews ready for bonus point crediting`);
    
    let totalCredited = 0;
    const creditedReviews = [];
    
    for (const review of reviewsToCredit) {
      try {
        // Find the user
        const user = await usersCollection.findOne({ _id: review.userId });
        if (!user) {
          console.error(`User not found for review ${review._id}`);
          continue;
        }
        
        // Credit bonus points
        await usersCollection.updateOne(
          { _id: review.userId },
          { $inc: { bonusPoints: review.bonusPointsAwarded } }
        );
        
        // Mark review as credited
        await reviewsCollection.updateOne(
          { _id: review._id },
          { 
            $set: { 
              bonusPointsCredited: true,
              bonusPointsCreditedAt: new Date()
            }
          }
        );
        
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
    
    console.log(`\n✅ Successfully credited ${totalCredited} bonus points for ${creditedReviews.length} reviews`);
    
    if (creditedReviews.length > 0) {
      console.log('\nCredited reviews:');
      creditedReviews.forEach(review => {
        console.log(`- Review ${review.reviewId}: ${review.pointsAwarded} points to user ${review.userId}`);
      });
    }
    
  } catch (error) {
    console.error('Error crediting review bonus points:', error);
  } finally {
    await client.close();
  }
}

// Run the script
creditReviewBonusPoints().catch(console.error);
