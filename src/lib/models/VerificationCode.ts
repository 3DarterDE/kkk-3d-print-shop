import mongoose, { Schema, Model } from 'mongoose';

export interface IVerificationCode {
  _id?: any;
  email: string;
  code: string;
  expiresAt: Date;
  used: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const VerificationCodeSchema = new Schema<IVerificationCode>({
  email: { type: String, required: true, index: true },
  code: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  used: { type: Boolean, default: false, index: true },
}, { timestamps: true });

// TTL Index: Automatically delete documents after expiresAt
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationCode: Model<IVerificationCode> = mongoose.models.VerificationCode || mongoose.model<IVerificationCode>('VerificationCode', VerificationCodeSchema);

export default VerificationCode;
