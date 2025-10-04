import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/lib/models/Product";
import { unlink, access } from "fs/promises";
import { join } from "path";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

// PUT update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await connectToDatabase();
    
    // If only sortOrder or isActive is being updated, do a simple update
    if (Object.keys(body).length === 1 && (body.sortOrder !== undefined || body.isActive !== undefined)) {
      console.log(`Updating product ${id} with:`, body);
      
      // Convert string id to ObjectId
      const objectId = new mongoose.Types.ObjectId(id);
      
      // Use direct MongoDB operation to ensure the field is saved
      const result = await Product.collection.updateOne(
        { _id: objectId },
        { $set: body }
      );
      
      console.log(`Update result:`, result);
      
      const product = await Product.findById(id);
      return NextResponse.json(product);
    }
    
    // Get old product data to compare files
    const oldProduct = await Product.findById(id);
    if (!oldProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Find files that were removed
    const oldImages = oldProduct.images || [];
    const oldVideos = oldProduct.videos || [];
    const newImages = body.images || [];
    const newVideos = body.videos || [];

    const removedImages = oldImages.filter((img: string) => !newImages.includes(img));
    const removedVideos = oldVideos.filter((vid: string) => !newVideos.includes(vid));
    const removedFiles = [...removedImages, ...removedVideos];
    
    // Add all image size variants for removed images
    if (oldProduct.imageSizes && oldProduct.imageSizes.length > 0) {
      for (let i = 0; i < removedImages.length; i++) {
        const removedImageIndex = oldImages.indexOf(removedImages[i]);
        if (removedImageIndex !== -1 && oldProduct.imageSizes[removedImageIndex]) {
          const imageSize = oldProduct.imageSizes[removedImageIndex];
          if (imageSize.main) removedFiles.push(imageSize.main);
          if (imageSize.thumb) removedFiles.push(imageSize.thumb);
          if (imageSize.small) removedFiles.push(imageSize.small);
        }
      }
    }

    // Delete removed files from filesystem
    for (const fileUrl of removedFiles) {
      try {
        const filename = fileUrl.split('/').pop();
        if (!filename) continue;

        const isImage = fileUrl.includes('/uploads/images/');
        const isVideo = fileUrl.includes('/uploads/videos/');
        const fileType = isImage ? 'images' : isVideo ? 'videos' : 'images'; // fallback to images
        const filePath = join(process.cwd(), 'public', 'uploads', fileType, filename);
        
        // Check if file exists before trying to delete
        try {
          await access(filePath);
          await unlink(filePath);
          console.log(`Deleted removed file: ${filePath}`);
        } catch (accessError) {
          console.log(`File already deleted or doesn't exist: ${filePath}`);
        }
      } catch (fileError) {
        console.error(`Failed to delete removed file ${fileUrl}:`, fileError);
      }
    }
    
    // Ensure subcategory fields are properly handled
    const updateData = { ...body };
    
    // Handle subcategory removal explicitly
    if (updateData.subcategoryId === null || updateData.subcategoryId === undefined || updateData.subcategoryId === '') {
      updateData.subcategoryId = undefined;
      updateData.subcategoryIds = [];
      // Also ensure categoryId-only products don't have subcategory
      if (!updateData.$unset) updateData.$unset = {};
      updateData.$unset.subcategoryId = ""; // This explicitly removes the subcategoryId field
    }
    
    // If subcategoryId has a value but subcategoryIds is empty, populate subcategoryIds
    if (updateData.subcategoryId && updateData.subcategoryId !== '' && 
        (!updateData.subcategoryIds || updateData.subcategoryIds.length === 0)) {
      updateData.subcategoryIds = [updateData.subcategoryId];
    }
    
    // Handle brand removal explicitly
    if (updateData.brand === null || updateData.brand === undefined || updateData.brand === '') {
      updateData.brand = undefined;
      if (!updateData.$unset) updateData.$unset = {};
      updateData.$unset.brand = ""; // This explicitly removes the brand field
    }
    
    // Update product in database
    const product = await Product.findByIdAndUpdate(id, updateData, { new: true });
    
    // Invalidate cache for shop page and top sellers APIs
    revalidatePath('/shop');
    revalidatePath('/api/shop/top-sellers');
    revalidatePath('/api/shop/category-top-sellers');
    
    return NextResponse.json(product);
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Delete associated files from filesystem
    const filesToDelete = [
      ...(product.images || []), 
      ...(product.videos || []), 
      ...(product.videoThumbnails || [])
    ];
    
    // Add all image size variants to deletion list
    if (product.imageSizes && product.imageSizes.length > 0) {
      for (const imageSize of product.imageSizes) {
        if (imageSize.main) filesToDelete.push(imageSize.main);
        if (imageSize.thumb) filesToDelete.push(imageSize.thumb);
        if (imageSize.small) filesToDelete.push(imageSize.small);
      }
    }
    
    for (const fileUrl of filesToDelete) {
      try {
        // Extract filename from URL (e.g., "/uploads/images/filename.jpg" -> "filename.jpg")
        const filename = fileUrl.split('/').pop();
        if (!filename) continue;

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
          console.log(`Deleted file: ${filePath}`);
        } catch (accessError) {
          console.log(`File already deleted or doesn't exist: ${filePath}`);
        }
      } catch (fileError) {
        console.error(`Failed to delete file ${fileUrl}:`, fileError);
        // Continue with other files even if one fails
      }
    }
    
    // Get the sortOrder of the product being deleted
    const deletedProduct = await Product.findById(id).lean() as any;
    const deletedSortOrder = deletedProduct?.sortOrder || 0;

    // Delete product from database
    await Product.findByIdAndDelete(id);

    // Update sortOrder for all products with higher sortOrder
    if (deletedSortOrder !== undefined) {
      const productsToUpdate = await Product.find({ sortOrder: { $gt: deletedSortOrder } }).lean();
      
      // Update each product individually to ensure sortOrder is properly updated
      for (const product of productsToUpdate) {
        const newSortOrder = (product.sortOrder || 0) - 1;
        
        // Use direct MongoDB operation with ObjectId
        const objectId = new mongoose.Types.ObjectId(product._id as string);
        await Product.collection.updateOne(
          { _id: objectId },
          { $set: { sortOrder: newSortOrder } }
        );
      }
    }

    // Invalidate cache for shop page and top sellers APIs
    revalidatePath('/shop');
    revalidatePath('/api/shop/top-sellers');
    revalidatePath('/api/shop/category-top-sellers');

    return NextResponse.json({ message: "Product and associated files deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
