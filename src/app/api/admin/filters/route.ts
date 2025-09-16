import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Filter } from '@/lib/models/Filter';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Create a simple schema for filters if it doesn't exist
    const FilterSchema = new mongoose.Schema({
      name: String,
      type: String,
      options: [{
        name: String,
        value: String,
        sortOrder: Number,
        color: String
      }],
      sortOrder: Number,
      createdAt: Date,
      updatedAt: Date
    });
    
    // Force schema update by deleting the existing model
    if (mongoose.models.Filter) {
      delete mongoose.models.Filter;
    }
    
    const FilterModel = mongoose.model('Filter', FilterSchema);
    const filters = await FilterModel.find({}).sort({ sortOrder: 1 });
    
    console.log('Returning filters:', JSON.stringify(filters, null, 2));
    
    return NextResponse.json(filters);
  } catch (error) {
    console.error('Error fetching filters:', error);
    return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    console.log('Received filter data:', JSON.stringify(data, null, 2));
    
    const FilterSchema = new mongoose.Schema({
      name: String,
      type: String,
      options: [{
        name: String,
        value: String,
        sortOrder: Number,
        color: String
      }],
      sortOrder: Number,
      createdAt: Date,
      updatedAt: Date
    });
    
    // Force schema update by deleting the existing model
    if (mongoose.models.Filter) {
      delete mongoose.models.Filter;
    }
    
    const FilterModel = mongoose.model('Filter', FilterSchema);
    
    const filter = new FilterModel({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const result = await filter.save();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating filter:', error);
    return NextResponse.json({ error: 'Failed to create filter' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    const { _id, ...updateData } = data;
    
    const FilterSchema = new mongoose.Schema({
      name: String,
      type: String,
      options: [{
        name: String,
        value: String,
        sortOrder: Number,
        color: String
      }],
      sortOrder: Number,
      createdAt: Date,
      updatedAt: Date
    });
    
    // Force schema update by deleting the existing model
    if (mongoose.models.Filter) {
      delete mongoose.models.Filter;
    }
    
    const FilterModel = mongoose.model('Filter', FilterSchema);
    
    const result = await FilterModel.findByIdAndUpdate(
      _id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    
    if (!result) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating filter:', error);
    return NextResponse.json({ error: 'Failed to update filter' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Filter ID is required' }, { status: 400 });
    }
    
    const FilterSchema = new mongoose.Schema({
      name: String,
      type: String,
      options: [{
        name: String,
        value: String,
        sortOrder: Number,
        color: String
      }],
      sortOrder: Number,
      createdAt: Date,
      updatedAt: Date
    });
    
    // Force schema update by deleting the existing model
    if (mongoose.models.Filter) {
      delete mongoose.models.Filter;
    }
    
    const FilterModel = mongoose.model('Filter', FilterSchema);
    
    // Also delete all product filters that use this filter
    const ProductFilterSchema = new mongoose.Schema({
      productId: String,
      filterId: String,
      filterName: String,
      values: [String],
      createdAt: Date,
      updatedAt: Date
    });
    
    const ProductFilterModel = mongoose.models.ProductFilter || mongoose.model('ProductFilter', ProductFilterSchema);
    await ProductFilterModel.deleteMany({ filterId: id });
    
    const result = await FilterModel.findByIdAndDelete(id);
    
    if (!result) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting filter:', error);
    return NextResponse.json({ error: 'Failed to delete filter' }, { status: 500 });
  }
}
