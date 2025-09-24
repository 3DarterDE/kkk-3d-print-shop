import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import ShopPage from "../../page";

export const dynamic = 'force-dynamic';

export default async function ShopCategorySubcategoryPage({ params }: { params: Promise<{ slug: string; subslug: string }> }) {
  const { slug, subslug } = await params;

  // Check if parent category exists and subcategory exists
  try {
    await connectToDatabase();
    const parent = await Category.findOne({ slug }).lean();
    if (!parent) {
      return <div>Category not found</div>;
    }
    
    const child = await Category.findOne({ slug: subslug, parentId: (parent as any)._id }).lean();
    if (!child) {
      return <div>Subcategory not found</div>;
    }

    // It's a valid category/subcategory combination, show shop with both
    return <ShopPage searchParams={{ category: slug, subcategory: subslug } as any} />;
  } catch (error) {
    return <div>Error loading category</div>;
  }
}
