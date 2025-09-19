import mongoose, { Schema, Model } from 'mongoose';

export interface IUser {
  _id?: any;
  auth0Id: string; // e.g. 'auth0|abc123'
  email?: string;
  name?: string;
  isAdmin: boolean;
  isVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>({
  auth0Id: { type: String, required: true, unique: true, index: true },
  email: { type: String },
  name: { type: String },
  isAdmin: { type: Boolean, default: false, index: true },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
