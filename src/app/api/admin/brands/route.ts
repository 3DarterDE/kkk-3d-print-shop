import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Brand from '@/lib/models/Brand';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';

export async function GET() {
  try {
    await requireAdmin();
    await connectToDatabase();
    // Return ALL brands for admin (both active and inactive)
    const brands = await Brand.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    
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

    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      image: z.string().min(1).optional(),
      imageSizes: z.object({ main: z.string().min(1).optional(), thumb: z.string().min(1).optional(), small: z.string().min(1).optional() }).partial().optional(),
      sortOrder: z.number().int().nonnegative().optional()
    });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }
    const { name, description, image, imageSizes, sortOrder } = parsed.data;

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
