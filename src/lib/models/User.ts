import mongoose, { Schema, Model } from 'mongoose';

export interface IUser {
  _id?: any;
  auth0Id: string; // e.g. 'auth0|abc123'
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: {
    street?: string;
    houseNumber?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  billingAddress?: {
    street?: string;
    houseNumber?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  paymentMethod?: 'card' | 'paypal' | 'bank';
  newsletterSubscribed?: boolean;
  newsletterSubscribedAt?: Date;
  isAdmin: boolean;
  isVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>({
  auth0Id: { type: String, required: true, unique: true, index: true },
  email: { type: String },
  name: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  phone: { type: String },
  dateOfBirth: { type: Date },
  address: {
    street: { type: String },
    houseNumber: { type: String },
    addressLine2: { type: String },
    city: { type: String },
    postalCode: { type: String },
    country: { type: String, default: 'Deutschland' }
  },
  billingAddress: {
    street: { type: String },
    houseNumber: { type: String },
    addressLine2: { type: String },
    city: { type: String },
    postalCode: { type: String },
    country: { type: String, default: 'Deutschland' }
  },
  paymentMethod: { 
    type: String, 
    enum: ['card', 'paypal', 'bank'],
    default: 'card'
  },
  newsletterSubscribed: { type: Boolean, default: false },
  newsletterSubscribedAt: { type: Date },
  isAdmin: { type: Boolean, default: false, index: true },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
