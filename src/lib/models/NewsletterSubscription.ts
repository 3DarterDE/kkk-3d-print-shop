import mongoose, { Schema, Document } from 'mongoose';

export interface INewsletterSubscription extends Document {
  email: string;
  firstName?: string;
  lastName?: string;
  source: 'checkout' | 'footer' | 'profile';
  subscribedAt: Date;
  isActive: boolean;
  mailchimpId?: string;
  userId?: string; // Optional: für registrierte User
  createdAt?: Date;
  updatedAt?: Date;
}

const NewsletterSubscriptionSchema = new Schema<INewsletterSubscription>({
  email: { 
    type: String, 
    required: true, 
    lowercase: true,
    index: true 
  },
  firstName: { type: String },
  lastName: { type: String },
  source: { 
    type: String, 
    required: true,
    enum: ['checkout', 'footer', 'profile']
  },
  subscribedAt: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  isActive: { 
    type: Boolean, 
    required: true, 
    default: true 
  },
  mailchimpId: { type: String },
  userId: { type: String }, // Optional: für registrierte User
}, { 
  timestamps: true 
});

// Ensure unique email per active subscription
NewsletterSubscriptionSchema.index({ email: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

export default mongoose.models.NewsletterSubscription || mongoose.model<INewsletterSubscription>('NewsletterSubscription', NewsletterSubscriptionSchema);
