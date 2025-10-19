import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Brand from '@/lib/models/Brand';
import { cloudinary, getCloudinaryFolderForType, getImageEagerTransforms } from '@/lib/cloudinary';
import { verifyCsrfFromRequest } from '@/lib/csrf';
import { rateLimitRequest, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
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
    const { response } = await requireAdmin();
    if (response) return response;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const brandId = formData.get('brandId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    // Validate MIME and size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Block SVG entirely
    if (file.type === 'image/svg+xml' || (file.name && file.name.toLowerCase().endsWith('.svg'))) {
      return NextResponse.json({ error: 'SVG files are not allowed' }, { status: 400 });
    }

    if (!brandId) {
      return NextResponse.json({ error: 'No brand ID provided' }, { status: 400 });
    }

    // Upload to Cloudinary with eager transforms
    const folder = getCloudinaryFolderForType('brand');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const upload = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image', eager: [
          { width: 400, height: 400, crop: 'cover', fetch_format: 'webp', quality: 'auto' },
          { width: 150, height: 150, crop: 'cover', fetch_format: 'webp', quality: 'auto' },
          { width: 80, height: 80, crop: 'cover', fetch_format: 'webp', quality: 'auto' },
        ] },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(buffer);
    });

    await connectToDatabase();
    
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Update brand with image paths
    const eager = upload.eager || [];
    brand.image = upload.secure_url;
    brand.imageSizes = {
      main: eager[0]?.secure_url || upload.secure_url,
      thumb: eager[1]?.secure_url || upload.secure_url,
      small: eager[2]?.secure_url || upload.secure_url,
    } as any;

    await brand.save();

    return NextResponse.json({ success: true, image: brand.image, imageSizes: brand.imageSizes });

  } catch (error) {
    console.error('Error uploading brand image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
