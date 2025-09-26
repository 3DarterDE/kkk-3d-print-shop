import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const CACHE_DIR = path.join(process.cwd(), 'cache', 'invoices');
    const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();
    let deletedCount = 0;
    let totalSize = 0;

    // Check if cache directory exists
    try {
      await fs.access(CACHE_DIR);
    } catch (error) {
      return NextResponse.json({
        success: true,
        message: 'Cache directory does not exist',
        deletedCount: 0,
        totalSize: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Read all files in cache directory
    const files = await fs.readdir(CACHE_DIR);
    
    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      
      try {
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtime.getTime();
        
        if (fileAge > MAX_AGE_MS) {
          const fileSize = stats.size;
          await fs.unlink(filePath);
          deletedCount++;
          totalSize += fileSize;
          console.log(`Deleted old cache file: ${file} (${(fileSize / 1024).toFixed(2)} KB)`);
        }
      } catch (fileError) {
        console.warn(`Error processing file ${file}:`, fileError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cache cleanup completed successfully`,
      deletedCount,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cache cleanup cron job error:', error);
    return NextResponse.json(
      { error: 'Cache cleanup cron job failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
