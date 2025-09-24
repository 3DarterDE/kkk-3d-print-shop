import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Brand from '@/lib/models/Brand';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { brandIds } = await request.json();

    if (!Array.isArray(brandIds)) {
      return NextResponse.json({ error: 'Invalid brandIds array' }, { status: 400 });
    }

    await connectToDatabase();

    // Update sortOrder for each brand
    for (let i = 0; i < brandIds.length; i++) {
      await Brand.findByIdAndUpdate(brandIds[i], { sortOrder: i });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering brands:', error);
    return NextResponse.json({ error: 'Failed to reorder brands' }, { status: 500 });
  }
}
