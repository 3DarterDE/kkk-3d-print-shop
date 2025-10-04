import mongoose, { Schema, Model } from 'mongoose';

export interface IDeletedIdentity {
  _id?: any;
  auth0Id?: string;
  // email removed for DSGVO compliance - only store auth0Id for blocking
  reason?: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const DeletedIdentitySchema = new Schema<IDeletedIdentity>({
  auth0Id: { type: String, index: true },
  // email field removed for DSGVO compliance
  reason: { type: String },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

// TTL index – documents expire automatically when expiresAt is reached
DeletedIdentitySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DeletedIdentity: Model<IDeletedIdentity> =
  mongoose.models.DeletedIdentity || mongoose.model<IDeletedIdentity>('DeletedIdentity', DeletedIdentitySchema);

export default DeletedIdentity;


