import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Manufacturer from '@/lib/models/Manufacturer';

export const revalidate = 0; // No cache - always fetch fresh data

// GET - Fetch all active manufacturers for shop
export async function GET() {
  try {
    await connectToDatabase();
    
    const manufacturers = await Manufacturer.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('_id name slug')
      .lean();
    
    return NextResponse.json(manufacturers);
  } catch (error) {
    console.error('Error fetching manufacturers for shop:', error);
    return NextResponse.json({ error: 'Failed to fetch manufacturers' }, { status: 500 });
  }
}
