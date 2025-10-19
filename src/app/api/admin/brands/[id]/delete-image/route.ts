import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Brand from '@/lib/models/Brand';
import { cloudinary, extractPublicIdFromUrl } from '@/lib/cloudinary';
import { verifyCsrfFromRequest } from '@/lib/csrf';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfOk = await verifyCsrfFromRequest(request);
    if (!csrfOk) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    const { response } = await requireAdmin();
    if (response) return response;
    const { id } = await params;
    await connectToDatabase();
    const brand = await Brand.findById(id);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    if (brand.image && brand.image.includes('res.cloudinary.com')) {
      const pid = extractPublicIdFromUrl(brand.image);
      if (pid) {
        try { await cloudinary.uploader.destroy(pid, { resource_type: 'image' }); } catch {}
      }
    }
    brand.image = undefined as any;
    brand.imageSizes = undefined as any;
    await brand.save();
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete brand image' }, { status: 500 });
  }
}


