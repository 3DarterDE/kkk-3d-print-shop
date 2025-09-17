import { fetchProductBySlug, fetchRecommendedProducts } from "@/lib/products";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/lib/models/Category";
import JsonLd from "@/components/JsonLd";
import { notFound } from "next/navigation";
import { remark } from "remark";
import remarkHtml from "remark-html";
import ProductDisplay from "./ProductDisplay";

export const revalidate = 60; // Cache for 1 minute
export const dynamic = 'force-dynamic';

// Remove generateStaticParams to avoid unnecessary fetchAllProducts calls
// export async function generateStaticParams() {
//   const products = await fetchAllProducts();
//   return products.map((p: any) => ({ slug: p.slug }));
// }

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) return notFound();

  // Load category data for breadcrumb
  let categoryData = null;
  let subcategoryData = null;
  if (product.categoryId) {
    await connectToDatabase();
    categoryData = await Category.findById(product.categoryId).lean();
    
    // Load subcategory data if product has subcategoryIds
    if (product.subcategoryIds && product.subcategoryIds.length > 0) {
      // Find subcategory by ID directly
      const subcategoryId = product.subcategoryIds[0];
      subcategoryData = await Category.findById(subcategoryId).lean();
    }
  }

  // Serialize MongoDB object to plain object
  const serializedProduct = {
    _id: product._id.toString(),
    slug: product.slug,
    title: product.title,
    description: product.description,
    price: product.price,
    offerPrice: product.offerPrice,
    isOnSale: product.isOnSale,
    images: product.images,
    videos: product.videos,
    videoThumbnails: product.videoThumbnails,
    imageSizes: product.imageSizes?.map((imgSize: any) => ({
      _id: imgSize._id?.toString(),
      main: imgSize.main,
      thumb: imgSize.thumb,
      small: imgSize.small
    })) || [],
    tags: product.tags,
    category: product.category,
    properties: product.properties?.map((prop: any) => ({
      _id: prop._id?.toString(),
      name: prop.name,
      value: prop.value
    })) || [],
    variations: product.variations?.map((variation: any) => ({
      _id: variation._id?.toString(),
      name: variation.name,
      options: variation.options?.map((option: any) => ({
        _id: option._id?.toString(),
        value: option.value,
        priceAdjustment: option.priceAdjustment,
        inStock: option.inStock,
        stockQuantity: option.stockQuantity
      })) || []
    })) || [],
    recommendedProducts: product.recommendedProducts,
    inStock: product.inStock,
    stockQuantity: product.stockQuantity,
    sortOrder: product.sortOrder,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };

  // Load recommended products if any
  let recommendedProductsData: any[] = [];
  if (product.recommendedProducts && product.recommendedProducts.length > 0) {
    const recommendedProducts = await fetchRecommendedProducts(product.recommendedProducts);
    // Sort recommended products in the same order as stored in the database
    const recommendedProductsMap = new Map(recommendedProducts.map(p => [p._id.toString(), p]));
    recommendedProductsData = product.recommendedProducts
      .map(id => recommendedProductsMap.get(id.toString()))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .map(p => ({
        _id: p._id.toString(),
        slug: p.slug,
        title: p.title,
        price: p.price,
        offerPrice: p.offerPrice,
        isOnSale: p.isOnSale,
        inStock: p.inStock,
        stockQuantity: p.stockQuantity,
        images: p.images,
        imageSizes: p.imageSizes?.map((imgSize: any) => ({
          _id: imgSize._id?.toString(),
          main: imgSize.main,
          thumb: imgSize.thumb,
          small: imgSize.small
        })) || [],
        tags: p.tags || [],
        variations: p.variations?.map((variation: any) => ({
          _id: variation._id?.toString(),
          name: variation.name,
          options: variation.options?.map((option: any) => ({
            _id: option._id?.toString(),
            value: option.value,
            priceAdjustment: option.priceAdjustment,
            inStock: option.inStock,
            stockQuantity: option.stockQuantity
          })) || []
        })) || []
      }));
  }

  // Render description: if HTML provided (from WYSIWYG), use as-is; else render Markdown
  // If description is empty, show placeholder text
  const hasDescription = product.description && 
    product.description.trim() !== "" && 
    product.description !== "<br>" && 
    product.description !== "<div><br></div>";
  
  const descriptionHtml = hasDescription 
    ? (() => {
        const isHtml = /<\w+[\s\S]*>/m.test(product.description || "");
        return isHtml
          ? product.description
          : remark().use(remarkHtml).processSync(product.description || "").toString();
      })()
    : '<p class="text-gray-500 italic">Eine detaillierte Beschreibung für dieses Produkt ist in Arbeit und wird bald verfügbar sein.</p>';
  
  // Serialize category data
  const serializedCategory = categoryData && !Array.isArray(categoryData) ? {
    _id: (categoryData as any)._id.toString(),
    name: (categoryData as any).name,
    slug: (categoryData as any).slug
  } : null;

  // Serialize subcategory data
  const serializedSubcategory = subcategoryData && !Array.isArray(subcategoryData) ? {
    _id: (subcategoryData as any)._id.toString(),
    name: (subcategoryData as any).name,
    slug: (subcategoryData as any).slug
  } : null;


  return (
    <>
      <ProductDisplay 
        product={serializedProduct} 
        descriptionHtml={descriptionHtml} 
        recommendedProducts={recommendedProductsData}
        category={serializedCategory}
        subcategory={serializedSubcategory}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description: product.description,
          offers: {
            "@type": "Offer",
            availability: product.inStock ? "InStock" : "OutOfStock",
            price: (product.price / 100).toFixed(2),
            priceCurrency: "EUR",
          },
        }}
      />
    </>
  );
}