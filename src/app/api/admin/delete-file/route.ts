import { NextRequest, NextResponse } from "next/server";
import { unlink, access } from "fs/promises";
import { join } from "path";
import { cloudinary } from '@/lib/cloudinary';

export async function DELETE(request: NextRequest) {
  try {
    const { fileUrl } = await request.json();
    
    if (!fileUrl) {
      return NextResponse.json({ error: "Missing fileUrl" }, { status: 400 });
    }

    // Extract filename from URL (e.g., "/uploads/images/filename.jpg" -> "filename.jpg")
    const filename = fileUrl.split('/').pop();
    if (!filename) {
      return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
    }

    // Determine file type and construct path
    const isCloudinary = fileUrl.includes('res.cloudinary.com');
    const isImage = fileUrl.includes('/uploads/images/') || isCloudinary;
    const isVideo = fileUrl.includes('/uploads/videos/');
    const isThumbnail = fileUrl.includes('/uploads/thumbnails/');
    const fileType = isImage ? 'images' : isVideo ? 'videos' : isThumbnail ? 'thumbnails' : 'images'; // fallback to images
    const filePath = join(process.cwd(), 'public', 'uploads', fileType, filename);
    
    // If Cloudinary asset, delete via API using public_id
    if (isCloudinary) {
      try {
        // Extract public_id from URL: .../upload/v<ver>/<folder>/<name>.<ext>
        const url = new URL(fileUrl);
        const parts = url.pathname.split('/');
        // Find index after '/upload/'
        const uploadIdx = parts.findIndex(p => p === 'upload');
        const publicIdParts = parts.slice(uploadIdx + 2); // skip 'upload' and version 'v123456'
        let publicId = publicIdParts.join('/');
        publicId = publicId.replace(/\.[a-zA-Z0-9]+$/, '');
        const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        return NextResponse.json({ success: true, message: 'Cloudinary asset deleted', result: res });
      } catch (e) {
        console.error('Cloudinary delete failed:', e);
        return NextResponse.json({ error: 'Failed to delete Cloudinary asset' }, { status: 500 });
      }
    }

    // Check if file exists before trying to delete
    try {
      await access(filePath);
      await unlink(filePath);
      console.log(`File deleted: ${filePath}`);
      return NextResponse.json({ success: true, message: "File deleted successfully" });
    } catch (accessError) {
      console.log(`File already deleted or doesn't exist: ${filePath}`);
      return NextResponse.json({ success: true, message: "File already deleted or doesn't exist" });
    }
  } catch (error) {
    console.error("Delete file error:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
