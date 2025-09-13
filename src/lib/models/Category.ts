import mongoose, { Schema, Document } from 'mongoose';

export interface CategoryDocument extends Document {
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: string;
  subcategories?: CategoryDocument[];
  topSellerProducts?: string[]; // Array of product IDs
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    topSellerProducts: { type: [String], default: [] }
  },
  { timestamps: true, strict: false, versionKey: false }
);

// Add compound index for parentId and slug to ensure uniqueness within parent categories
CategorySchema.index({ parentId: 1, slug: 1 }, { unique: true });

export default mongoose.models.Category || mongoose.model<CategoryDocument>('Category', CategorySchema);
