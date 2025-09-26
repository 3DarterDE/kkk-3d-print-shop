import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ReturnRequest from '@/lib/models/Return';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAdmin();
    if (!user) return response!;

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status && ['received','processing','completed','rejected'].includes(status)) {
      filter.status = status;
    }

    const [items, total] = await Promise.all([
      ReturnRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ReturnRequest.countDocuments(filter),
    ]);

    return NextResponse.json({ returns: items, total, page, limit });
  } catch (error) {
    console.error('Error listing returns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


