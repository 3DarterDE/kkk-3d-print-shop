import mongoose, { Schema, Document } from 'mongoose';

export interface FilterOption {
  _id?: string;
  name: string;
  value: string;
  sortOrder: number;
  color?: string; // Hex color code for color filters
}

export interface FilterDocument extends Document {
  _id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'range' | 'color';
  options: FilterOption[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFilter {
  _id?: string;
  productId: string;
  filterId: string;
  filterName: string;
  values: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const FilterOptionSchema = new Schema({
  name: { type: String, required: true },
  value: { type: String, required: true },
  sortOrder: { type: Number, required: true },
  color: { type: String, default: '#000000' }
});

const FilterSchema = new Schema<FilterDocument>(
  {
    name: { type: String, required: true, unique: true },
    type: { 
      type: String, 
      required: true, 
      enum: ['text', 'number', 'select', 'multiselect', 'range', 'color'] 
    },
    options: [FilterOptionSchema],
    sortOrder: { type: Number, default: 0, index: true }
  },
  { timestamps: true, strict: false, versionKey: false }
);

export const Filter = mongoose.models.Filter || mongoose.model<FilterDocument>('Filter', FilterSchema);
