import { NextRequest, NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import { join } from "path";
import { access, mkdir, unlink } from "fs/promises";

export async function POST(request: NextRequest) {
  try {
    const { videoPath } = await request.json();
    
    if (!videoPath) {
      return NextResponse.json({ error: "Video path is required" }, { status: 400 });
    }

    // Convert relative path to absolute path
    let absoluteVideoPath;
    if (videoPath.startsWith('/')) {
      // Relative path starting with /
      absoluteVideoPath = join(process.cwd(), 'public', videoPath);
    } else if (videoPath.includes(':')) {
      // Already absolute path (contains drive letter)
      absoluteVideoPath = videoPath;
    } else {
      // Relative path
      absoluteVideoPath = join(process.cwd(), videoPath);
    }

    console.log('Video path:', videoPath);
    console.log('Absolute video path:', absoluteVideoPath);

    // Check if video file exists
    try {
      await access(absoluteVideoPath);
      console.log('Video file exists');
    } catch (error) {
      console.error('Video file not found:', error);
      return NextResponse.json({ error: "Video file not found" }, { status: 404 });
    }

    // Extract filename and create thumbnail path
    const videoFilename = videoPath.split('/').pop()?.replace(/\.[^/.]+$/, "");
    if (!videoFilename) {
      return NextResponse.json({ error: "Invalid video path" }, { status: 400 });
    }

    const thumbnailFilename = `${videoFilename}_thumb.jpg`;
    const webpThumbnailFilename = `${videoFilename}_thumb.webp`;
    const thumbnailPath = join(process.cwd(), 'public', 'uploads', 'thumbnails', thumbnailFilename);
    const webpThumbnailPath = join(process.cwd(), 'public', 'uploads', 'thumbnails', webpThumbnailFilename);
    const thumbnailUrl = `/uploads/thumbnails/${webpThumbnailFilename}`;

    // Ensure thumbnails directory exists
    const thumbnailsDir = join(process.cwd(), 'public', 'uploads', 'thumbnails');
    try {
      await access(thumbnailsDir);
    } catch {
      await mkdir(thumbnailsDir, { recursive: true });
    }

    // Generate thumbnail using FFmpeg with proper aspect ratio
    await new Promise((resolve, reject) => {
      ffmpeg(absoluteVideoPath)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: thumbnailFilename,
          folder: join(process.cwd(), 'public', 'uploads', 'thumbnails'),
          size: '500x?'
        })
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('Processing: ' + progress.percent + '% done');
        })
        .on('end', async () => {
          console.log(`Thumbnail generated: ${thumbnailPath}`);
          
          // Convert JPG thumbnail to WebP
          try {
            await sharp(thumbnailPath)
              .webp({ quality: 85, effort: 6 })
              .toFile(webpThumbnailPath);
            
            console.log(`Thumbnail converted to WebP: ${webpThumbnailPath}`);
            
            // Delete original JPG thumbnail
            await unlink(thumbnailPath);
            console.log(`Original JPG thumbnail deleted: ${thumbnailPath}`);
          } catch (webpError) {
            console.error('WebP conversion failed:', webpError);
            // Continue with JPG if WebP conversion fails
          }
          
          resolve(undefined);
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        });
    });

    return NextResponse.json({ 
      success: true, 
      thumbnailUrl,
      thumbnailPath 
    });

  } catch (error) {
    console.error("Thumbnail generation error:", error);
    return NextResponse.json({ 
      error: "Failed to generate thumbnail",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
