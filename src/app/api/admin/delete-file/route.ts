import { NextRequest, NextResponse } from "next/server";
import { unlink, access } from "fs/promises";
import { join } from "path";

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
    const isImage = fileUrl.includes('/uploads/images/');
    const isVideo = fileUrl.includes('/uploads/videos/');
    const isThumbnail = fileUrl.includes('/uploads/thumbnails/');
    const fileType = isImage ? 'images' : isVideo ? 'videos' : isThumbnail ? 'thumbnails' : 'images'; // fallback to images
    const filePath = join(process.cwd(), 'public', 'uploads', fileType, filename);
    
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
