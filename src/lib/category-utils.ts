import { connectToDatabase } from '@/lib/mongodb';
import Category, { type CategoryDocument } from '@/lib/models/Category';
import { fetchProductBySlug } from '@/lib/products';

export interface ResolvedCategoryChainItem {
  _id: string;
  slug: string;
  name: string;
  parentId?: string | null;
}

/**
 * Build the full ancestor chain (root -> leaf) for a given category id.
 */
export async function getCategoryChainById(categoryId: string): Promise<ResolvedCategoryChainItem[]> {
  if (!categoryId) return [];
  await connectToDatabase();
  const chain: ResolvedCategoryChainItem[] = [];
  let current = await Category.findById(categoryId).lean<CategoryDocument | null>();
  const safety = 10; // prevent infinite loops
  let guard = 0;
  while (current && guard < safety) {
    chain.push({
      _id: (current as any)._id.toString(),
      slug: (current as any).slug,
      name: (current as any).name,
      parentId: (current as any).parentId ? (current as any).parentId.toString() : null
    });
    if (!(current as any).parentId) break;
    current = await Category.findById((current as any).parentId).lean<CategoryDocument | null>();
    guard++;
  }
  return chain.reverse();
}

/**
 * Attempt to resolve a sequence of category slugs into a valid chain.
 * Returns array root->leaf if fully matched; otherwise empty array.
 */
export async function resolveCategoryPath(slugs: string[]): Promise<ResolvedCategoryChainItem[]> {
  if (!slugs || slugs.length === 0) return [];
  await connectToDatabase();
  // Fast path: single slug top-level category
  if (slugs.length === 1) {
    const direct = await Category.findOne({ slug: slugs[0] }).lean<CategoryDocument | null>();
    if (direct) {
      return [{
        _id: (direct as any)._id.toString(),
        slug: (direct as any).slug,
        name: (direct as any).name,
        parentId: (direct as any).parentId ? (direct as any).parentId.toString() : null
      }];
    }
  }
  let parentId: string | null = null;
  const chain: ResolvedCategoryChainItem[] = [];
  for (const slug of slugs) {
    let match: CategoryDocument | null = null;
    if (parentId) {
      match = await Category.findOne({ slug, parentId }).lean<CategoryDocument | null>();
    } else {
      // top-level: accept parentId null or missing
      match = await Category.findOne({ slug, $or: [ { parentId: null }, { parentId: { $exists: false } } ] }).lean<CategoryDocument | null>();
      // fallback: if still not found, attempt without parentId constraint (last resort)
      if (!match) {
        match = await Category.findOne({ slug }).lean<CategoryDocument | null>();
      }
    }
    if (!match) {
      if (process.env.NEXT_PUBLIC_DEBUG_CATEGORIES === 'true') {
        console.warn('[resolveCategoryPath] no match for slug', slug, 'parentId', parentId);
      }
      return [];
    }
    chain.push({
      _id: (match as any)._id.toString(),
      slug: (match as any).slug,
      name: (match as any).name,
      parentId: (match as any).parentId ? (match as any).parentId.toString() : null
    });
    parentId = (match as any)._id.toString();
  }
  return chain;
}

/**
 * Given a product slug, compute its canonical category path (array of slugs) + product slug.
 * Uses deepest subcategory (first in subcategoryIds if present) else primary categoryId.
 */
export async function getCanonicalProductPathSegments(productSlug: string): Promise<string[] | null> {
  const product = await fetchProductBySlug(productSlug);
  if (!product) return null;
  const deepCategoryId = (product as any).subcategoryIds?.[0] || (product as any).subcategoryId || (product as any).categoryId;
  if (!deepCategoryId) return [product.slug];
  const chain = await getCategoryChainById(deepCategoryId);
  const categorySlugs = chain.map(c => c.slug);
  return [...categorySlugs, product.slug];
}

/**
 * Quick check if a slug corresponds to a product.
 */
export async function isProductSlug(slug: string): Promise<boolean> {
  const product = await fetchProductBySlug(slug);
  return !!product;
}
