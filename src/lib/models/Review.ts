import mongoose, { Schema, Model } from 'mongoose';

export interface IReview {
  _id?: any;
  userId: string; // User who wrote the review
  productId: string; // Product being reviewed
  orderId: string; // Order this review is for
  rating: number; // 1-5 stars
  title?: string; // Review title
  comment?: string; // Review text
  isAnonymous: boolean; // Whether review should be displayed anonymously
  isVerified: boolean; // True if review is from verified purchase
  bonusPointsAwarded: number; // Bonus points given for this review
  bonusPointsCredited: boolean; // Whether bonus points have been credited
  bonusPointsCreditedAt?: Date; // When bonus points were credited
  bonusPointsScheduledAt?: Date; // When bonus points should be credited (2 weeks after review)
  createdAt?: Date;
  updatedAt?: Date;
}

const ReviewSchema = new Schema<IReview>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  productId: {
    type: String,
    required: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    maxlength: 100
  },
  comment: {
    type: String,
    maxlength: 1000
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: true // Reviews from orders are verified by default
  },
  bonusPointsAwarded: {
    type: Number,
    default: 0
  },
  bonusPointsCredited: {
    type: Boolean,
    default: false
  },
  bonusPointsCreditedAt: {
    type: Date
  },
  bonusPointsScheduledAt: {
    type: Date
  }
}, { timestamps: true });

// Compound index to prevent duplicate reviews for same product from same order
ReviewSchema.index({ userId: 1, productId: 1, orderId: 1 }, { unique: true });

// Index for product reviews
ReviewSchema.index({ productId: 1, createdAt: -1 });

if (mongoose.models.Review) {
  mongoose.deleteModel('Review');
}

export const Review: Model<IReview> = mongoose.model<IReview>('Review', ReviewSchema);

export default Review;
