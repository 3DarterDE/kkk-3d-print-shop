import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Category from '@/lib/models/Category';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${category.slug}`;
    const baseDir = path.join(process.cwd(), 'public', 'uploads', 'categories');

    // Ensure directory exists
    await mkdir(baseDir, { recursive: true });

    // Process image with Sharp
    const imageProcessor = sharp(buffer);
    const metadata = await imageProcessor.metadata();

    // Resize to 400x400 (main), 200x200 (thumb), 100x100 (small)
    const mainImage = await imageProcessor
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .webp({ quality: 90 })
      .toBuffer();

    const thumbImage = await sharp(buffer)
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toBuffer();

    const smallImage = await sharp(buffer)
      .resize(100, 100, { fit: 'cover', position: 'center' })
      .webp({ quality: 80 })
      .toBuffer();

    // Save images
    const mainPath = path.join(baseDir, `${filename}.webp`);
    const thumbPath = path.join(baseDir, `${filename}_thumb.webp`);
    const smallPath = path.join(baseDir, `${filename}_small.webp`);

    await writeFile(mainPath, mainImage);
    await writeFile(thumbPath, thumbImage);
    await writeFile(smallPath, smallImage);

    // Update category with image URLs
    const imageUrl = `/uploads/categories/${filename}.webp`;
    const imageSizes = {
      main: `/uploads/categories/${filename}.webp`,
      thumb: `/uploads/categories/${filename}_thumb.webp`,
      small: `/uploads/categories/${filename}_small.webp`
    };

    await Category.findByIdAndUpdate(categoryId, {
      image: imageUrl,
      imageSizes: imageSizes
    });

    return NextResponse.json({
      success: true,
      image: imageUrl,
      imageSizes: imageSizes
    });

  } catch (error) {
    console.error('Error uploading category image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
