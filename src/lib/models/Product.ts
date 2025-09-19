import { Schema, model, models } from "mongoose";

export interface ProductDocument {
  _id: string;
  sku: string; // Artikelnummer/SKU - für Kunden sichtbar
  slug: string;
  title: string;
  description: string;
  price: number;
  offerPrice?: number;
  isOnSale: boolean;
  images: string[];
  imageSizes?: {
    main: string;    // 800x800
    thumb: string;   // 400x400
    small: string;   // 200x200
  }[];
  videos: string[];
  videoThumbnails: string[];
  tags: string[];
  category: string;
  categoryId?: string;
  subcategoryId?: string;
  subcategoryIds?: string[];
  properties: Array<{ name: string; value: string }>;
  variations?: {
    name: string; // e.g., "Gewicht", "Größe", "Farbe"
    options: Array<{
      value: string; // e.g., "19g", "20g", "21g", "schwarz", "rot", "gelb"
      priceAdjustment?: number; // Optional price adjustment in cents
      inStock?: boolean; // Optional stock status per variation
      stockQuantity?: number; // Optional stock quantity per variation option
    }>;
  }[];
  recommendedProducts: string[]; // Array of product IDs
  isTopSeller: boolean;
  isActive: boolean;
  inStock: boolean;
  stockQuantity: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<ProductDocument>(
  {
    sku: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    description: { type: String, required: false },
    price: { type: Number, required: true, min: 0, index: true },
    offerPrice: { type: Number, min: 0 },
    isOnSale: { type: Boolean, default: false, index: true },
  images: { type: [String], default: [] },
  imageSizes: [{
    main: { type: String },
    thumb: { type: String },
    small: { type: String }
  }],
  videos: { type: [String], default: [] },
  videoThumbnails: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  category: { type: String, default: "3d-print", index: true },
  categoryId: { type: String, index: true },
  subcategoryId: { type: String, index: true },
  subcategoryIds: { type: [String], default: [], index: true },
  properties: {
    type: [{
      name: { type: String, required: true },
      value: { type: String, required: true }
    }],
    default: []
  },
  variations: [{
    name: { type: String, required: true },
    options: [{
      value: { type: String, required: true },
      priceAdjustment: { type: Number, default: 0 },
      inStock: { type: Boolean, default: true },
      stockQuantity: { type: Number, default: 0, min: 0 }
    }]
  }],
  recommendedProducts: { type: [String], default: [] },
  isTopSeller: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
  inStock: { type: Boolean, default: true, index: true },
    stockQuantity: { type: Number, default: 0, min: 0, index: true },
    sortOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true, strict: false, versionKey: false }
);

// Add sortOrder field to existing documents
ProductSchema.pre('save', function(next) {
  if (this.isNew && this.sortOrder === undefined) {
    this.sortOrder = 0;
  }
  next();
});

// Create compound indexes for better query performance
ProductSchema.index({ category: 1, inStock: 1 });
ProductSchema.index({ categoryId: 1, inStock: 1 });
ProductSchema.index({ isTopSeller: 1, inStock: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ isOnSale: 1, inStock: 1 });
ProductSchema.index({ stockQuantity: 1, inStock: 1 });
ProductSchema.index({ tags: 1 });

export const Product = models.Product || model<ProductDocument>("Product", ProductSchema);


