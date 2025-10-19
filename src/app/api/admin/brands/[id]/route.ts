import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Brand from '@/lib/models/Brand';
import { cloudinary, extractPublicIdFromUrl } from '@/lib/cloudinary';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const brand = await Brand.findById(id).lean();
    
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    
    return NextResponse.json(brand);
  } catch (error) {
    console.error('Error fetching brand:', error);
    return NextResponse.json({ error: 'Failed to fetch brand' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const body = await request.json();
    const { name, description, image, imageSizes, sortOrder, isActive } = body;

    await connectToDatabase();
    const { id } = await params;
    
    const brand = await Brand.findById(id);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Update fields
    if (name) {
      brand.name = name;
      // Regenerate slug if name changed
      brand.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) brand.description = description;
    if (image !== undefined) brand.image = image;
    if (imageSizes !== undefined) brand.imageSizes = imageSizes;
    if (sortOrder !== undefined) brand.sortOrder = sortOrder;
    if (isActive !== undefined) brand.isActive = isActive;

    await brand.save();

    return NextResponse.json(brand);
  } catch (error) {
    console.error('Error updating brand:', error);
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    await connectToDatabase();
    const { id } = await params;
    
    const brand = await Brand.findById(id);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Hard delete: remove Cloudinary image if present, then delete document
    if (brand.image && brand.image.includes('res.cloudinary.com')) {
      const pid = extractPublicIdFromUrl(brand.image);
      if (pid) {
        try { await cloudinary.uploader.destroy(pid, { resource_type: 'image' }); } catch {}
      }
    }
    await Brand.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Brand permanently deleted' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
  }
}
