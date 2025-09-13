import mongoose, { Schema, Document } from 'mongoose';

export interface ManufacturerDocument extends Document {
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ManufacturerSchema = new Schema<ManufacturerDocument>(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true, strict: false, versionKey: false }
);

// Create indexes for better query performance
ManufacturerSchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.models.Manufacturer || mongoose.model<ManufacturerDocument>('Manufacturer', ManufacturerSchema);
