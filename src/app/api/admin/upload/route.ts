import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
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

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 413 });
    }

    // Reject WebP files - they should be converted from other formats
    if (file.type && file.type === 'image/webp') {
      return NextResponse.json({ error: "WebP files are not allowed. Please upload PNG, JPG, or other image formats instead." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist (use plural form)
    const folderType = type === "image" ? "images" : "videos";
    const uploadsDir = join(process.cwd(), "public", "uploads", folderType);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${originalName}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    // Return the public URL
    const publicUrl = `/uploads/${folderType}/${filename}`;

    // Convert images to WebP and generate multiple sizes
    let finalUrl = publicUrl;
    let imageSizes = null;
    if (type === "image") {
      try {
        const webpResponse = await fetch(`${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/convert-to-webp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: publicUrl })
        });
        
        if (webpResponse.ok) {
          const webpData = await webpResponse.json();
          finalUrl = webpData.webpUrl;
          imageSizes = webpData.generatedImages || [];
          console.log(`Image converted to WebP with sizes:`, imageSizes);
        }
      } catch (error) {
        console.error("WebP conversion failed:", error);
        // Continue with original image
      }
    }

    // Generate thumbnail for videos
    let thumbnailUrl = null;
    if (type === "video") {
      try {
        const thumbnailResponse = await fetch(`${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/generate-thumbnail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoPath: publicUrl })
        });
        
        if (thumbnailResponse.ok) {
          const thumbnailData = await thumbnailResponse.json();
          thumbnailUrl = thumbnailData.thumbnailUrl;
        }
      } catch (error) {
        console.error("Thumbnail generation failed:", error);
        // Continue without thumbnail
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      url: finalUrl,
      filename,
      thumbnailUrl,
      imageSizes
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
