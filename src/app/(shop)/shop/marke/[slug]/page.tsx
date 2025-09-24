import { connectToDatabase } from "@/lib/mongodb";
import Brand from "@/lib/models/Brand";
import ShopPage from "../../page";

export const dynamic = 'force-dynamic';

export default async function ShopBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  console.log('Brand page - slug:', slug);

  // Check if slug matches a brand
  await connectToDatabase();
  const brandDoc = await Brand.findOne({ slug }).lean();
  
  console.log('Brand page - brandDoc:', brandDoc);
  
  if (brandDoc) {
    // It's a brand, show shop with this brand
    console.log('Brand page - showing shop with brand:', slug);
    return <ShopPage searchParams={Promise.resolve({ brand: slug })} />;
  }

  // If not a brand, return 404
  console.log('Brand page - brand not found for slug:', slug);
  return <div>Brand not found</div>;
}
