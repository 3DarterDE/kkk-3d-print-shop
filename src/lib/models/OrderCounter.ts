import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderCounter extends Document {
  yearSuffix: string; // last two digits of year, e.g., "25"
  seq: number;        // sequential counter for that year
}

const OrderCounterSchema = new Schema<IOrderCounter>({
  yearSuffix: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 }
});

const OrderCounter: Model<IOrderCounter> =
  mongoose.models.OrderCounter || mongoose.model<IOrderCounter>('OrderCounter', OrderCounterSchema);

export default OrderCounter;


