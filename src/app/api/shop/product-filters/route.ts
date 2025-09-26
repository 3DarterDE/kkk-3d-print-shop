import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

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
