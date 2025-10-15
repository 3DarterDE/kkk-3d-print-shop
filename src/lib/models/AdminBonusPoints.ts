import mongoose, { Schema, Model } from 'mongoose';

export interface IAdminBonusPoints {
  _id?: any;
  userId: string; // User who receives the bonus points
  orderId: string; // Order this bonus is for
  pointsAwarded: number; // Bonus points given
  reason: string; // Reason for awarding points (e.g., "Customer service", "Compensation", etc.)
  awardedBy: string; // Admin user ID who awarded the points
  bonusPointsCredited: boolean; // Whether bonus points have been credited
  bonusPointsCreditedAt?: Date; // When bonus points were credited
  bonusPointsScheduledAt?: Date; // When bonus points should be credited (2 weeks after award)
  frozenPoints?: number; // Points frozen due to returns
  frozenBy?: string[]; // Array of Return Request IDs that froze points
  createdAt?: Date;
  updatedAt?: Date;
}

const AdminBonusPointsSchema = new Schema<IAdminBonusPoints>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  pointsAwarded: {
    type: Number,
    required: true,
    min: 1
  },
  reason: {
    type: String,
    required: true,
    maxlength: 200
  },
  awardedBy: {
    type: String,
    required: true
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
  },
  frozenPoints: {
    type: Number,
    default: 0
  },
  frozenBy: [{
    type: String
  }]
}, { timestamps: true });

// Index for efficient queries
AdminBonusPointsSchema.index({ userId: 1, createdAt: -1 });
AdminBonusPointsSchema.index({ orderId: 1 });
AdminBonusPointsSchema.index({ bonusPointsCredited: 1, bonusPointsScheduledAt: 1 });

if (mongoose.models.AdminBonusPoints) {
  mongoose.deleteModel('AdminBonusPoints');
}

export const AdminBonusPoints: Model<IAdminBonusPoints> = mongoose.model<IAdminBonusPoints>('AdminBonusPoints', AdminBonusPointsSchema);

export default AdminBonusPoints;
