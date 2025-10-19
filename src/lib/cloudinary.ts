import { v2 as cloudinary } from 'cloudinary';

// Configure from CLOUDINARY_URL or individual vars
cloudinary.config({
  secure: true,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export function getCloudinaryFolderForType(type: 'image' | 'video' | 'thumbnail' | 'brand' | 'category') {
  switch (type) {
    case 'video':
      return 'uploads/videos';
    case 'thumbnail':
      return 'uploads/thumbnails';
    case 'brand':
      return 'uploads/brands';
    case 'category':
      return 'uploads/categories';
    default:
      return 'uploads/images';
  }
}

export function getImageEagerTransforms() {
  return [
    { width: 800, height: 800, crop: 'limit', fetch_format: 'webp', quality: 'auto' },
    { width: 400, height: 400, crop: 'limit', fetch_format: 'webp', quality: 'auto' },
    { width: 200, height: 200, crop: 'limit', fetch_format: 'webp', quality: 'auto' },
  ];
}


