import mongoose, { Schema, Document } from 'mongoose';

export type DiscountType = 'percent' | 'fixed';

export interface IDiscountCode extends Document {
  code: string; // uppercase, unique
  type: DiscountType; // percent or fixed amount
  value: number; // percent (e.g., 10) or cents (e.g., 500 for 5€)
  startsAt?: Date;
  endsAt?: Date;
  active: boolean;
  oneTimeUse: boolean; // true: each user can use once; false: unlimited per user
  maxGlobalUses?: number; // optional global limit
  globalUses?: number; // current global usage count
  createdBy?: string; // admin user id
  createdAt: Date;
  updatedAt: Date;
}

const DiscountCodeSchema = new Schema<IDiscountCode>({
  code: { type: String, required: true, unique: true, index: true },
  type: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true },
  startsAt: { type: Date },
  endsAt: { type: Date },
  active: { type: Boolean, default: true },
  oneTimeUse: { type: Boolean, default: false },
  maxGlobalUses: { type: Number },
  globalUses: { type: Number, default: 0 },
  createdBy: { type: String },
}, { timestamps: true });

DiscountCodeSchema.index({ code: 1 });
DiscountCodeSchema.index({ active: 1, startsAt: 1, endsAt: 1 });

// Normalize code to uppercase on save
DiscountCodeSchema.pre('save', function(next) {
  if (this.isModified('code') && typeof this.code === 'string') {
    this.code = this.code.trim().toUpperCase();
  }
  next();
});

if (mongoose.models.DiscountCode) {
  delete mongoose.models.DiscountCode;
}

const DiscountCode = mongoose.model<IDiscountCode>('DiscountCode', DiscountCodeSchema);
export default DiscountCode;


