import { NextRequest, NextResponse } from "next/server";
import { cloudinary, getCloudinaryFolderForType, getImageEagerTransforms, slugifyName } from '@/lib/cloudinary';
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "image" or "video"
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Block SVG entirely (XSS risk via embedded scripts)
    if (file.type === 'image/svg+xml' || (file.name && file.name.toLowerCase().endsWith('.svg'))) {
      return NextResponse.json({ error: 'SVG files are not allowed' }, { status: 400 });
    }

    // Check file size (20MB limit)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 413 });
    }

    // Reject WebP files - they should be converted from other formats
    if (file.type && file.type === 'image/webp') {
      return NextResponse.json({ error: "WebP files are not allowed. Please upload PNG, JPG, or other image formats instead." }, { status: 400 });
    }

    // Upload to Cloudinary
    const folder = getCloudinaryFolderForType(type === 'image' ? 'image' : 'video');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const publicId = `${slugifyName(file.name)}-${Date.now()}`;
    const upload = await new Promise<any>((resolve, reject) => {
      const options: any = { folder, public_id: publicId, use_filename: false, unique_filename: false, overwrite: true, resource_type: type === 'image' ? 'image' : 'video' };
      if (type === 'image') options.eager = getImageEagerTransforms();
      const stream = cloudinary.uploader.upload_stream(options, (error, result) => (error ? reject(error) : resolve(result)));
      stream.end(buffer);
    });

    let finalUrl = upload.secure_url as string;
    const eagerArr = upload.eager || [];
    // Map eager transforms to main/thumb/small structure for frontend compatibility
    let imageSizes = [
      { size: 800, url: eagerArr[0]?.secure_url || finalUrl },
      { size: 400, url: eagerArr[1]?.secure_url || finalUrl },
      { size: 200, url: eagerArr[2]?.secure_url || finalUrl },
    ];
    const publicUrl = finalUrl;
    let thumbnailUrl = null;
    // For images, Cloudinary eager transforms already give responsive sizes

    // Generate thumbnail for videos via Cloudinary
    if (type === "video") {
      try {
        // Cloudinary can transform video frames to image thumbnails via URL, but here we keep simple
        thumbnailUrl = upload.secure_url; // or construct a derived image if needed later
      } catch {}
    }
    
    return NextResponse.json({ success: true, url: finalUrl, thumbnailUrl, imageSizes });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
