/**
 * Utility functions for image optimization and sizing
 */

export type ImageSize = 'main' | 'thumb' | 'small';

/**
 * Get the appropriate image URL based on size and context
 * @param imageUrl - The base image URL (without size suffix)
 * @param size - The desired size variant
 * @param imageSizes - Optional array of image sizes from database
 * @param imageIndex - Index of the image in the images array
 * @returns The optimized image URL
 */
export function getOptimizedImageUrl(
  imageUrl: string, 
  size: ImageSize = 'main',
  imageSizes?: Array<{ main: string; thumb: string; small: string }>,
  imageIndex: number = 0
): string {
  if (!imageUrl) return '';
  
  // If we have imageSizes from database, use them
  if (imageSizes && imageSizes[imageIndex]) {
    const imageSizeData = imageSizes[imageIndex];
    switch (size) {
      case 'main':
        return imageSizeData.main || imageUrl;
      case 'thumb':
        return imageSizeData.thumb || imageUrl;
      case 'small':
        return imageSizeData.small || imageUrl;
      default:
        return imageSizeData.main || imageUrl;
    }
  }
  
  // Fallback: If it's already a WebP image, try to get the size variant
  if (imageUrl.endsWith('.webp')) {
    const baseUrl = imageUrl.replace('.webp', '');
    const sizeSuffix = getSizeSuffix(size);
    return `${baseUrl}${sizeSuffix}.webp`;
  }
  
  // For non-WebP images, return as-is (fallback)
  return imageUrl;
}

/**
 * Get the size suffix for different image variants
 * @param size - The desired size variant
 * @returns The suffix to append to the filename
 */
function getSizeSuffix(size: ImageSize): string {
  switch (size) {
    case 'main':
      return ''; // 800x800
    case 'thumb':
      return '_thumb'; // 400x400
    case 'small':
      return '_small'; // 200x200
    default:
      return '';
  }
}

/**
 * Generate srcset for responsive images
 * @param imageUrl - The base image URL
 * @returns A srcset string for responsive loading
 */
export function generateSrcSet(imageUrl: string): string {
  if (!imageUrl) return '';
  
  const baseUrl = imageUrl.replace('.webp', '');
  
  return [
    `${baseUrl}_small.webp 200w`,
    `${baseUrl}_thumb.webp 400w`,
    `${baseUrl}.webp 800w`
  ].join(', ');
}

/**
 * Get the appropriate image size for different contexts
 * @param context - The context where the image will be displayed
 * @returns The recommended image size
 */
export function getContextualImageSize(context: 'shop-listing' | 'product-detail' | 'mobile' | 'thumbnail' | 'search-result'): ImageSize {
  switch (context) {
    case 'shop-listing':
    case 'thumbnail':
    case 'search-result':
      return 'thumb'; // 400x400 for shop listings and search results
    case 'product-detail':
      return 'main'; // 800x800 for product detail pages
    case 'mobile':
      return 'small'; // 200x200 for mobile/quick loading
    default:
      return 'main';
  }
}

/**
 * Convert image file to WebP format
 * @param file - The image file to convert
 * @returns Promise<Buffer> - The WebP image buffer
 */
export async function convertToWebp(file: File): Promise<Buffer> {
  // For now, return the file as-is since we don't have sharp installed
  // In production, you would use sharp or similar library for proper conversion
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate thumbnail from image buffer
 * @param imageBuffer - The source image buffer
 * @param width - Target width
 * @param height - Target height
 * @returns Promise<Buffer> - The thumbnail image buffer
 */
export async function generateThumbnail(imageBuffer: Buffer, width: number, height: number): Promise<Buffer> {
  // For now, return the original buffer since we don't have sharp installed
  // In production, you would use sharp or similar library for proper resizing
  return imageBuffer;
}

