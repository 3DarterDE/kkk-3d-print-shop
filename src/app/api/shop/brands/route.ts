import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Brand from '@/lib/models/Brand';

export async function GET() {
  try {
    await connectToDatabase();
    const brands = await Brand.find({ isActive: true })
      .select('_id name slug image imageSizes sortOrder')
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    
    const result = NextResponse.json(brands);
    
    // Cache for 60 seconds (brands don't change often)
    result.headers.set('Cache-Control', 'public, max-age=60');
    
    return result;
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}