import mongoose, { Schema, Document } from 'mongoose';

export interface IReturnItem {
  productId: string; // same as Order.items.productId (slug/id reference)
  name: string;
  price: number; // unit price at time of order
  quantity: number; // quantity being returned
  image?: string;
  variations?: Record<string, string>;
  accepted?: boolean; // admin decision per item
  frozenBonusPoints?: number; // bonus points frozen for this item
  refundPercentage?: number; // 100, 60, or 0
  notReturned?: boolean; // article was not returned
}

export interface IReturnRequest extends Document {
  orderId: string; // Order _id
  orderNumber: string; // denormalized for quick lookup
  userId: string; // User _id
  customer: {
    name?: string;
    email?: string;
  };
  items: IReturnItem[];
  status: 'received' | 'processing' | 'completed' | 'rejected';
  notes?: string; // admin notes
  refund?: {
    method?: string; // paypal, klarna, bank, other
    reference?: string; // provider reference or manual note
    amount?: number; // cents/euros depending on convention (use cents recommended)
  };
  timerPausedAt?: Date; // when bonus points timer was paused
  createdAt: Date;
  updatedAt: Date;
}

const ReturnItemSchema = new Schema<IReturnItem>({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String },
  variations: { type: Schema.Types.Mixed },
  accepted: { type: Boolean, default: false },
  frozenBonusPoints: { type: Number, default: 0 },
  refundPercentage: { type: Number, default: 100 },
  notReturned: { type: Boolean, default: false },
}, { _id: false });

const ReturnRequestSchema = new Schema<IReturnRequest>({
  orderId: { type: String, required: true, index: true },
  orderNumber: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  customer: {
    name: { type: String },
    email: { type: String },
  },
  items: { type: [ReturnItemSchema], required: true },
  status: { 
    type: String, 
    enum: ['received', 'processing', 'completed', 'rejected'],
    default: 'received'
  },
  notes: { type: String },
  refund: {
    method: { type: String },
    reference: { type: String },
    amount: { type: Number },
  },
  timerPausedAt: { type: Date },
}, { timestamps: true });

// Ensure schema updates in dev
if (mongoose.models.ReturnRequest) {
  delete mongoose.models.ReturnRequest;
}

const ReturnRequest = mongoose.model<IReturnRequest>('ReturnRequest', ReturnRequestSchema);
export default ReturnRequest;


