import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import ShopPage from "../page";

export const dynamic = 'force-dynamic';

export default async function ShopCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Check if slug matches a category
  await connectToDatabase();
  const categoryDoc = await Category.findOne({ slug }).lean();
  
  if (categoryDoc) {
    // It's a category, show shop with this category
    return <ShopPage searchParams={{ category: slug } as any} />;
  }

  // If not a category, return 404
  return <div>Category not found</div>;
}
