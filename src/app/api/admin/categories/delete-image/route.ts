import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Category from '@/lib/models/Category';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json({ error: 'Missing categoryId' }, { status: 400 });
    }

    await connectToDatabase();

    // Get category to find image paths
    const category = await Category.findById(categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Delete all image files if they exist
    if (category.imageSizes) {
      const baseDir = path.join(process.cwd(), 'public', 'uploads', 'categories');
      
      try {
        // Delete main image
        if (category.imageSizes.main) {
          const mainPath = path.join(baseDir, path.basename(category.imageSizes.main));
          await unlink(mainPath);
        }
        
        // Delete thumb image
        if (category.imageSizes.thumb) {
          const thumbPath = path.join(baseDir, path.basename(category.imageSizes.thumb));
          await unlink(thumbPath);
        }
        
        // Delete small image
        if (category.imageSizes.small) {
          const smallPath = path.join(baseDir, path.basename(category.imageSizes.small));
          await unlink(smallPath);
        }
      } catch (fileError) {
        console.warn('Some image files could not be deleted:', fileError);
        // Continue even if some files don't exist
      }
    }

    // Update category to remove image references
    await Category.findByIdAndUpdate(categoryId, {
      $unset: {
        image: 1,
        imageSizes: 1
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Category images deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting category images:', error);
    return NextResponse.json(
      { error: 'Failed to delete images' },
      { status: 500 }
    );
  }
}
