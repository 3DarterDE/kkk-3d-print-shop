import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Brand from '@/lib/models/Brand';
import { cloudinary, getCloudinaryFolderForType, getImageEagerTransforms, slugifyName, extractPublicIdFromUrl } from '@/lib/cloudinary';
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
    const file = (formData.get('image') as File) || (formData.get('file') as File);
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
    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 20MB' }, { status: 400 });
    }

    if (!brandId) {
      return NextResponse.json({ error: 'No brand ID provided' }, { status: 400 });
    }

    // Upload to Cloudinary with eager transforms
    const folder = getCloudinaryFolderForType('brand');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const publicId = `${slugifyName(file.name)}-${Date.now()}`;
    const upload = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, public_id: publicId, use_filename: false, unique_filename: false, overwrite: true, resource_type: 'image', eager: [
          { width: 400, height: 400, crop: 'fill', gravity: 'auto', fetch_format: 'webp', quality: 'auto' },
          { width: 150, height: 150, crop: 'fill', gravity: 'auto', fetch_format: 'webp', quality: 'auto' },
          { width: 80, height: 80, crop: 'fill', gravity: 'auto', fetch_format: 'webp', quality: 'auto' },
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

    // If brand already had an image, delete it from Cloudinary first
    if (brand.image && brand.image.includes('res.cloudinary.com')) {
      const pid = extractPublicIdFromUrl(brand.image);
      if (pid) {
        try { await cloudinary.uploader.destroy(pid, { resource_type: 'image' }); } catch {}
      }
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
