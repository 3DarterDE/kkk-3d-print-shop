import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ProductFilter } from '@/lib/models/Filter';
import mongoose from 'mongoose';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    
    const ProductFilterSchema = new mongoose.Schema({
      productId: String,
      filterId: String,
      filterName: String,
      values: [String],
      createdAt: Date,
      updatedAt: Date
    });
    
    const ProductFilterModel = mongoose.models.ProductFilter || mongoose.model('ProductFilter', ProductFilterSchema);
    
    let query = {};
    if (productId) {
      query = { productId };
    }
    
    const productFilters = await ProductFilterModel.find(query);
    return NextResponse.json(productFilters);
  } catch (error) {
    console.error('Error fetching product filters:', error);
    return NextResponse.json({ error: 'Failed to fetch product filters' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const schema = z.object({ productId: z.string().min(1), filterId: z.string().min(1), filterName: z.string().min(1), values: z.array(z.string()).default([]) });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data as any;
    
    const ProductFilterSchema = new mongoose.Schema({
      productId: String,
      filterId: String,
      filterName: String,
      values: [String],
      createdAt: Date,
      updatedAt: Date
    });
    
    const ProductFilterModel = mongoose.models.ProductFilter || mongoose.model('ProductFilter', ProductFilterSchema);
    
    const productFilter = new ProductFilterModel({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const result = await productFilter.save();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating product filter:', error);
    return NextResponse.json({ error: 'Failed to create product filter' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const schema = z.object({ _id: z.string().min(1), productId: z.string().min(1).optional(), filterId: z.string().min(1).optional(), filterName: z.string().min(1).optional(), values: z.array(z.string()).optional() });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }
    const { _id, ...updateData } = parsed.data as any;
    
    const ProductFilterSchema = new mongoose.Schema({
      productId: String,
      filterId: String,
      filterName: String,
      values: [String],
      createdAt: Date,
      updatedAt: Date
    });
    
    const ProductFilterModel = mongoose.models.ProductFilter || mongoose.model('ProductFilter', ProductFilterSchema);
    
    const result = await ProductFilterModel.findByIdAndUpdate(
      _id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    
    if (!result) {
      return NextResponse.json({ error: 'Product filter not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating product filter:', error);
    return NextResponse.json({ error: 'Failed to update product filter' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const productId = searchParams.get('productId');
    
    if (!id && !productId) {
      return NextResponse.json({ error: 'Product filter ID or productId is required' }, { status: 400 });
    }
    
    const ProductFilterSchema = new mongoose.Schema({
      productId: String,
      filterId: String,
      filterName: String,
      values: [String],
      createdAt: Date,
      updatedAt: Date
    });
    
    const ProductFilterModel = mongoose.models.ProductFilter || mongoose.model('ProductFilter', ProductFilterSchema);
    
    let result;
    if (id) {
      // Delete specific product filter by ID
      result = await ProductFilterModel.findByIdAndDelete(id);
    } else if (productId) {
      // Delete all product filters for a specific product
      result = await ProductFilterModel.deleteMany({ productId });
    }
    
    if (!result) {
      return NextResponse.json({ error: 'Product filter not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, deletedCount: result.deletedCount || 1 });
  } catch (error) {
    console.error('Error deleting product filter:', error);
    return NextResponse.json({ error: 'Failed to delete product filter' }, { status: 500 });
  }
}
