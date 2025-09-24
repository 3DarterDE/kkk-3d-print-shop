import mongoose, { Schema, Document } from 'mongoose';

export interface BrandDocument extends Document {
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  image?: string;
  imageSizes?: {
    main: string;
    thumb: string;
    small: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<BrandDocument>(
  {
    name: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    image: { type: String },
    imageSizes: {
      main: { type: String },
      thumb: { type: String },
      small: { type: String }
    }
  },
  { timestamps: true, strict: false, versionKey: false }
);

export default mongoose.models.Brand || mongoose.model<BrandDocument>('Brand', BrandSchema);


