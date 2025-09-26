import mongoose, { Schema, Model } from 'mongoose';

export interface IUser {
  _id?: any;
  auth0Id: string; // e.g. 'auth0|abc123'
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  salutation?: 'Herr' | 'Frau' | 'Divers';
  phone?: string;
  dateOfBirth?: Date;
  address?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    street?: string;
    houseNumber?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  billingAddress?: {
    firstName?: string;
    lastName?: string;
    company?: string;
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
  bonusPoints: number; // Bonuspunkte-Guthaben des Users
  createdAt?: Date;
  updatedAt?: Date;
}

const AddressSchema = new Schema({
  firstName: { type: String },
  lastName: { type: String },
  company: { type: String },
  street: { type: String },
  houseNumber: { type: String },
  addressLine2: { type: String },
  city: { type: String },
  postalCode: { type: String },
  country: { type: String, default: 'Deutschland' }
}, { _id: false });

const UserSchema = new Schema<IUser>({
  auth0Id: { type: String, required: true, unique: true, index: true },
  email: { type: String },
  name: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  salutation: {
    type: String,
    enum: ['Herr', 'Frau', 'Divers'],
    default: null
  },
  phone: { type: String },
  dateOfBirth: { type: Date },
  address: AddressSchema,
  billingAddress: AddressSchema,
  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'bank'],
    default: 'card'
  },
  newsletterSubscribed: { type: Boolean, default: false },
  newsletterSubscribedAt: { type: Date },
  isAdmin: { type: Boolean, default: false, index: true },
  isVerified: { type: Boolean, default: false },
  bonusPoints: { type: Number, default: 0 }, // Bonuspunkte-Guthaben, startet bei 0
}, { timestamps: true });

if (mongoose.models.User) {
  mongoose.deleteModel('User');
}

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;
