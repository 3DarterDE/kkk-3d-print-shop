import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import ShopPage from "../../page";

export const dynamic = 'force-dynamic';

export default async function ShopCategorySubcategoryPage({ params }: { params: Promise<{ category: string; subcategory: string }> }) {
  const { category, subcategory } = await params;

  // Optional: verify slugs exist to avoid rendering invalid combos
  try {
    await connectToDatabase();
    const parent = await Category.findOne({ slug: category }).lean();
    if (!parent) {
      return <ShopPage searchParams={Promise.resolve({ category })} />;
    }
    const child = await Category.findOne({ slug: subcategory, parentId: (parent as any)._id }).lean();
    if (!child) {
      return <ShopPage searchParams={Promise.resolve({ category })} />;
    }
  } catch {}

  return <ShopPage searchParams={Promise.resolve({ category, subcategory })} />;
}


