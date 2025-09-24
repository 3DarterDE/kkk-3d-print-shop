import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Brand from '@/lib/models/Brand';
import { convertToWebp, generateThumbnail } from '@/lib/image-utils';

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const brandId = formData.get('brandId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!brandId) {
      return NextResponse.json({ error: 'No brand ID provided' }, { status: 400 });
    }

    // Convert to WebP
    const webpBuffer = await convertToWebp(file);
    
    // Generate different sizes
    const mainImage = await generateThumbnail(webpBuffer, 400, 400);
    const thumbImage = await generateThumbnail(webpBuffer, 150, 150);
    const smallImage = await generateThumbnail(webpBuffer, 80, 80);

    // Save images to public/uploads/brands/
    const timestamp = Date.now();
    const filename = `brand_${timestamp}`;
    
    const mainPath = `/uploads/brands/${filename}_main.webp`;
    const thumbPath = `/uploads/brands/${filename}_thumb.webp`;
    const smallPath = `/uploads/brands/${filename}_small.webp`;

    // In a real app, you'd save these to a file system or cloud storage
    // For now, we'll just return the paths

    await connectToDatabase();
    
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Update brand with image paths
    brand.image = mainPath;
    brand.imageSizes = {
      main: mainPath,
      thumb: thumbPath,
      small: smallPath
    };

    await brand.save();

    return NextResponse.json({
      success: true,
      image: mainPath,
      imageSizes: brand.imageSizes
    });

  } catch (error) {
    console.error('Error uploading brand image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
