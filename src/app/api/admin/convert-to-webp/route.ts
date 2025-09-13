import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { join } from "path";
import { access, mkdir } from "fs/promises";

export async function POST(request: NextRequest) {
  try {
    const { imagePath } = await request.json();
    
    if (!imagePath) {
      return NextResponse.json({ error: "Image path is required" }, { status: 400 });
    }

    // Convert relative path to absolute path
    let absoluteImagePath;
    if (imagePath.startsWith('/')) {
      absoluteImagePath = join(process.cwd(), 'public', imagePath);
    } else if (imagePath.includes(':')) {
      absoluteImagePath = imagePath;
    } else {
      absoluteImagePath = join(process.cwd(), imagePath);
    }

    console.log('Converting image to WebP:', absoluteImagePath);

    // Check if image file exists
    try {
      await access(absoluteImagePath);
    } catch {
      return NextResponse.json({ error: "Image file not found" }, { status: 404 });
    }

    // Generate WebP filename
    const originalFilename = imagePath.split('/').pop()?.replace(/\.[^/.]+$/, "");
    if (!originalFilename) {
      return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
    }

    const webpFilename = `${originalFilename}.webp`;
    const webpPath = join(process.cwd(), 'public', 'uploads', 'images', webpFilename);
    const webpUrl = `/uploads/images/${webpFilename}`;

    // Ensure images directory exists
    const imagesDir = join(process.cwd(), 'public', 'uploads', 'images');
    try {
      await access(imagesDir);
    } catch {
      await mkdir(imagesDir, { recursive: true });
    }

    // Generate different sizes
    const sizes = [
      { suffix: '', size: 800, quality: 85 }, // Main size for product pages
      { suffix: '_thumb', size: 400, quality: 80 }, // Thumbnail for shop listings
      { suffix: '_small', size: 200, quality: 75 } // Small size for mobile/quick loading
    ];

    const generatedImages = [];

    for (const { suffix, size, quality } of sizes) {
      const sizedFilename = `${originalFilename}${suffix}.webp`;
      const sizedPath = join(process.cwd(), 'public', 'uploads', 'images', sizedFilename);
      const sizedUrl = `/uploads/images/${sizedFilename}`;

      await sharp(absoluteImagePath)
        .resize(size, size, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .webp({ quality, effort: 6 })
        .toFile(sizedPath);

      generatedImages.push({
        size,
        url: sizedUrl,
        path: sizedPath
      });

      console.log(`Generated ${size}x${size} WebP: ${sizedPath}`);
    }

    // Delete original image if it's not already WebP
    if (!imagePath.toLowerCase().endsWith('.webp')) {
      try {
        await access(absoluteImagePath);
        const { unlink } = await import('fs/promises');
        await unlink(absoluteImagePath);
        console.log(`Original image deleted: ${absoluteImagePath}`);
      } catch (error) {
        console.log(`Could not delete original image: ${error}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      webpUrl: generatedImages.find(img => img.size === 800)?.url || webpUrl,
      webpPath: generatedImages.find(img => img.size === 800)?.path || webpPath,
      originalPath: imagePath,
      generatedImages
    });

  } catch (error) {
    console.error("WebP conversion error:", error);
    return NextResponse.json({ 
      error: "Failed to convert image to WebP",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
