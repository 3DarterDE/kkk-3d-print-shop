import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Brand from '@/lib/models/Brand';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    await connectToDatabase();
    const brands = await Brand.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    
    return NextResponse.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const body = await request.json();
    const { name, description, image, imageSizes, sortOrder } = body;

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    await connectToDatabase();
    
    const brand = new Brand({
      name,
      slug,
      description,
      image,
      imageSizes,
      sortOrder: sortOrder || 0,
      isActive: true
    });

    await brand.save();

    return NextResponse.json(brand);
  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
  }
}
