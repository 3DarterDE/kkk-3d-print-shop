import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    
    // Create schemas
    const FilterSchema = new mongoose.Schema({
      name: String,
      type: String,
      options: [{
        name: String,
        value: String,
        sortOrder: Number
      }],
      sortOrder: Number,
      createdAt: Date,
      updatedAt: Date
    });
    
    const FilterModel = mongoose.models.Filter || mongoose.model('Filter', FilterSchema);
    
    // For now, just return all filters
    // TODO: Implement category-based filtering when product filters are set up
    const filters = await FilterModel.find({}).sort({ sortOrder: 1 });
    
    return NextResponse.json(filters);
  } catch (error) {
    console.error('Error fetching category filters:', error);
    return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 });
  }
}
