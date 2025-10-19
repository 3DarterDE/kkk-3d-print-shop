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

export function slugifyName(name: string) {
  const base = (name || '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '') // drop extension
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || 'file';
}

export function extractPublicIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const idx = parts.findIndex((p) => p === 'upload');
    if (idx === -1) return null;
    const rest = parts.slice(idx + 1); // could be v123..., folder, name.ext
    // Drop version if present
    const afterVersion = rest[0]?.startsWith('v') ? rest.slice(1) : rest;
    if (afterVersion.length === 0) return null;
    const joined = afterVersion.join('/');
    return joined.replace(/\.[a-z0-9]+$/i, '');
  } catch {
    return null;
  }
}


