import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Category from '@/lib/models/Category';
import { cloudinary, getCloudinaryFolderForType, getImageEagerTransforms } from '@/lib/cloudinary';
import path from 'path';
import { requireAdmin } from '@/lib/auth';
import { verifyCsrfFromRequest } from '@/lib/csrf';
import { rateLimitRequest, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const ip = getClientIP(request);
    const rl = await rateLimitRequest(`admin:upload:${ip}`, 20, 60 * 1000);
    if (!rl.success) {
      const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      res.headers.set('Retry-After', Math.max(0, Math.ceil((rl.resetTime - Date.now()) / 1000)).toString());
      return res;
    }

    const csrfOk = await verifyCsrfFromRequest(request);
    if (!csrfOk) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const categoryId = formData.get('categoryId') as string;

    if (!file || !categoryId) {
      return NextResponse.json({ error: 'Missing file or categoryId' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Block SVG entirely
    if (file.type === 'image/svg+xml' || (file.name && file.name.toLowerCase().endsWith('.svg'))) {
      return NextResponse.json({ error: 'SVG files are not allowed' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Upload to Cloudinary with eager transforms
    const folder = getCloudinaryFolderForType('category');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const upload = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image', eager: getImageEagerTransforms() },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(buffer);
    });

    const eager = upload.eager || [];
    const imageUrl = upload.secure_url as string;
    const imageSizes = {
      main: eager[0]?.secure_url || imageUrl,
      thumb: eager[1]?.secure_url || imageUrl,
      small: eager[2]?.secure_url || imageUrl,
    } as any;

    await Category.findByIdAndUpdate(categoryId, { image: imageUrl, imageSizes });

    return NextResponse.json({ success: true, image: imageUrl, imageSizes });

  } catch (error) {
    console.error('Error uploading category image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
