import { connectToDatabase } from "@/lib/mongodb";
import Brand from "@/lib/models/Brand";
import ShopPage from "../../page";

export const dynamic = 'force-dynamic';

export default async function ShopBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Check if slug matches a brand
  await connectToDatabase();
  const brandDoc = await Brand.findOne({ slug }).lean();
  
  if (brandDoc) {
    // It's a brand, show shop with this brand
    return <ShopPage searchParams={Promise.resolve({ brand: slug })} />;
  }

  // If not a brand, return 404
  return <div>Brand not found</div>;
}
