import mongoose, { Schema, Model } from 'mongoose';

export interface IUser {
  _id?: any;
  auth0Id: string; // e.g. 'auth0|abc123'
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  salutation?: 'Herr' | 'Frau' | 'Divers';
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
  useSameAddress?: boolean;
  paymentMethod?: 'card' | 'paypal' | 'bank';
  newsletterSubscribed?: boolean;
  newsletterSubscribedAt?: Date;
  isAdmin: boolean;
  isVerified?: boolean;
  bonusPoints: number; // Bonuspunkte-Guthaben des Users
  savedCart?: {
    items: Array<{
      slug: string;
      title: string;
      price: number;
      quantity: number;
      variations?: Record<string, string>;
      image?: string;
      imageSizes?: {
        main: string;
        thumb: string;
        small: string;
      }[];
      stockQuantity?: number;
    }>;
    discountCode?: string | null;
    discountCents?: number;
    updatedAt?: Date;
  };
  welcomeEmailSent?: boolean;
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
  address: AddressSchema,
  billingAddress: AddressSchema,
  useSameAddress: { type: Boolean, default: false },
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
  savedCart: {
    items: {
      type: [
        {
          slug: { type: String, required: true },
          title: { type: String, required: true },
          price: { type: Number, required: true },
          quantity: { type: Number, required: true },
          variations: { type: Schema.Types.Mixed },
          image: { type: String },
          imageSizes: { type: Schema.Types.Mixed },
          stockQuantity: { type: Number },
        },
      ],
      default: [],
    },
    discountCode: { type: String, default: null },
    discountCents: { type: Number, default: 0 },
    updatedAt: { type: Date },
  },
  welcomeEmailSent: { type: Boolean, default: false },
}, { timestamps: true });

if (mongoose.models.User) {
  mongoose.deleteModel('User');
}

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;
