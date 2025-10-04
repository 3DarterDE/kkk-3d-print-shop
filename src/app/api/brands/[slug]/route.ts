import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Brand from '@/lib/models/Brand';

export const revalidate = 0; // No cache - always fetch fresh data

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    await connectToDatabase();
    
    // Find brand by slug
    const brand = await Brand.findOne({ 
      slug: slug,
      isActive: true 
    }).lean();

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' }, 
        { status: 404 }
      );
    }

    return NextResponse.json(brand);
  } catch (error) {
    console.error('Brand fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand' }, 
      { status: 500 }
    );
  }
}
