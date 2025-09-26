import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variations?: Record<string, string>;
}

export interface IShippingAddress {
  firstName?: string;
  lastName?: string;
  street: string;
  houseNumber: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface ITrackingInfo {
  trackingNumber: string;
  shippingProvider: 'dhl' | 'dpd' | 'ups' | 'fedex' | 'hermes' | 'gls' | 'other';
  addedAt: Date;
  notes?: string;
  emailSent?: boolean;
  emailSentAt?: Date;
}

export interface IOrder extends Document {
  orderNumber: string;
  userId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'return_requested' | 'return_completed';
  subtotal: number; // Bestellwert vor Versandkosten und Rabatten
  shippingCosts: number; // Versandkosten in Cent
  total: number; // Endbetrag (subtotal + shippingCosts - discounts)
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  billingAddress?: IShippingAddress;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  trackingNumber?: string; // Legacy field for backward compatibility
  shippingProvider?: 'dhl' | 'dpd' | 'ups' | 'fedex' | 'hermes' | 'gls' | 'other'; // Legacy field
  trackingInfo: ITrackingInfo[];
  isEmailSent?: boolean;
  emailSentAt?: Date;
  notes?: string;
  bonusPointsEarned: number; // Bonuspunkte die bei dieser Bestellung verdient wurden
  bonusPointsCredited: boolean; // Ob die Bonuspunkte bereits gutgeschrieben wurden
  bonusPointsCreditedAt?: Date; // Wann die Bonuspunkte gutgeschrieben wurden
  bonusPointsScheduledAt?: Date; // Wann die Bonuspunkte geplant sind (für Timer)
  bonusPointsRedeemed?: number; // Bonuspunkte die bei dieser Bestellung eingelöst wurden
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: String },
  variations: { type: Schema.Types.Mixed }
}, { _id: false });

const ShippingAddressSchema = new Schema<IShippingAddress>({
  firstName: { type: String },
  lastName: { type: String },
  street: { type: String, required: true },
  houseNumber: { type: String, required: true },
  addressLine2: { type: String },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true, default: 'Deutschland' }
}, { _id: false });

const TrackingInfoSchema = new Schema<ITrackingInfo>({
  trackingNumber: { type: String, required: true },
  shippingProvider: { 
    type: String, 
    enum: ['dhl', 'dpd', 'ups', 'fedex', 'hermes', 'gls', 'other'],
    required: true
  },
  addedAt: { type: Date, default: Date.now },
  notes: { type: String },
  emailSent: { type: Boolean, default: false },
  emailSentAt: { type: Date }
}, { _id: true });

const OrderSchema = new Schema<IOrder>({
  orderNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  userId: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'return_requested', 'return_completed'],
    default: 'pending' 
  },
  subtotal: { 
    type: Number, 
    required: true 
  },
  shippingCosts: { 
    type: Number, 
    required: true,
    default: 0
  },
  total: { 
    type: Number, 
    required: true 
  },
  items: [OrderItemSchema],
  shippingAddress: { 
    type: ShippingAddressSchema, 
    required: true 
  },
  billingAddress: ShippingAddressSchema,
  paymentMethod: { type: String },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending' 
  },
  trackingNumber: { type: String }, // Legacy field
  shippingProvider: { 
    type: String, 
    enum: ['dhl', 'dpd', 'ups', 'fedex', 'hermes', 'gls', 'other']
  }, // Legacy field
  trackingInfo: { 
    type: [TrackingInfoSchema], 
    default: [] 
  },
  isEmailSent: { type: Boolean, default: false },
  emailSentAt: { type: Date },
  notes: { type: String },
  bonusPointsEarned: { type: Number, required: true, default: 0 }, // Bonuspunkte die bei dieser Bestellung verdient wurden
  bonusPointsCredited: { type: Boolean, default: false }, // Ob die Bonuspunkte bereits gutgeschrieben wurden
  bonusPointsCreditedAt: { type: Date }, // Wann die Bonuspunkte gutgeschrieben wurden
  bonusPointsScheduledAt: { type: Date }, // Wann die Bonuspunkte geplant sind (für Timer)
  bonusPointsRedeemed: { type: Number, default: 0 } // Bonuspunkte die bei dieser Bestellung eingelöst wurden
}, {
  timestamps: true
});

// Ensure schema updates are applied in dev/hot-reload environments
if (mongoose.models.Order) {
  delete mongoose.models.Order;
}
const Order = mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
