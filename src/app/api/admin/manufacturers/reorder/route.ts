import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Manufacturer from '@/lib/models/Manufacturer';

// PUT - Reorder manufacturers
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { manufacturers } = body;
    
    if (!Array.isArray(manufacturers)) {
      return NextResponse.json({ error: 'Manufacturers array is required' }, { status: 400 });
    }
    
    // Update sort order for each manufacturer
    const updatePromises = manufacturers.map((manufacturer: { _id: string; sortOrder: number }) =>
      Manufacturer.findByIdAndUpdate(manufacturer._id, { sortOrder: manufacturer.sortOrder })
    );
    
    await Promise.all(updatePromises);
    
    return NextResponse.json({ message: 'Manufacturers reordered successfully' });
  } catch (error) {
    console.error('Error reordering manufacturers:', error);
    return NextResponse.json({ error: 'Failed to reorder manufacturers' }, { status: 500 });
  }
}
