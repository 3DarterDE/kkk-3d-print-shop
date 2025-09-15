import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { filterIds } = await request.json();
    
    if (!Array.isArray(filterIds)) {
      return NextResponse.json({ error: 'filterIds must be an array' }, { status: 400 });
    }
    
    const bulkOps = filterIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) },
        update: { $set: { sortOrder: index } }
      }
    }));
    
    await db.collection('filters').bulkWrite(bulkOps);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering filters:', error);
    return NextResponse.json({ error: 'Failed to reorder filters' }, { status: 500 });
  }
}
