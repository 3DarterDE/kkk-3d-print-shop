import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import ScrollAnimation from "@/components/ScrollAnimation";
import ProductCard from "@/components/ProductCard";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/lib/models/Product";
import TopSellerCarousel from "@/components/TopSellerCarousel";
import TopSellerSection from "@/components/TopSellerSection";
import SaleSection from "@/components/SaleSection";
import BrandsCarousel from "@/components/BrandsCarousel";
import { headers } from "next/headers";

export default async function Home() {
  // Lade Top Seller Produkte mit allen benötigten Feldern
  await connectToDatabase();
  const allProducts = await Product.find({ 
    isActive: true, 
    isTopSeller: true 
  })
    .select('_id slug title price offerPrice isOnSale isTopSeller images imageSizes tags categoryId subcategoryId subcategoryIds sortOrder createdAt updatedAt inStock stockQuantity variations')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();
  
  const topSellerProducts = allProducts
    .filter((product: any) => {
      // Nur Produkte anzeigen, die verfügbar sind
      if (product.variations && product.variations.length > 0) {
        // Bei Produkten mit Variationen: mindestens eine Variation muss verfügbar sein
        return product.variations.some((variation: any) => 
          variation.options && variation.options.some((option: any) => 
            option.inStock && option.stockQuantity > 0
          )
        );
      } else {
        // Bei Produkten ohne Variationen: direktes inStock und stockQuantity prüfen
        return product.inStock && product.stockQuantity > 0;
      }
    })
    .sort(() => Math.random() - 0.5) // Zufällige Reihenfolge
    .map((product: any) => ({
      _id: product._id.toString(),
      slug: product.slug,
      title: product.title,
      price: product.price,
      offerPrice: product.offerPrice,
      isOnSale: product.isOnSale,
      isTopSeller: product.isTopSeller,
      inStock: product.inStock,
      stockQuantity: product.stockQuantity,
      images: product.images || [],
      imageSizes: product.imageSizes?.map((img: any) => ({
        main: img.main,
        thumb: img.thumb,
        small: img.small
      })),
      tags: product.tags || [],
      variations: product.variations?.map((variation: any) => ({
        name: variation.name,
        options: variation.options?.map((option: any) => ({
          value: option.value,
          priceAdjustment: option.priceAdjustment || 0,
          inStock: option.inStock,
          stockQuantity: option.stockQuantity || 0
        }))
      })) || [],
      categoryId: product.categoryId?.toString(),
      subcategoryId: product.subcategoryId?.toString(),
      subcategoryIds: product.subcategoryIds?.map((id: any) => id.toString()),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

  // Lade Angebot-Produkte
  const saleProducts = await Product.find({ 
    isActive: true, 
    isOnSale: true 
  })
    .select('_id slug title price offerPrice isOnSale isTopSeller images imageSizes tags categoryId subcategoryId subcategoryIds sortOrder createdAt updatedAt inStock stockQuantity variations')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();
  
  const filteredSaleProducts = saleProducts
    .filter((product: any) => {
      // Nur Produkte anzeigen, die verfügbar sind
      if (product.variations && product.variations.length > 0) {
        // Bei Produkten mit Variationen: mindestens eine Variation muss verfügbar sein
        return product.variations.some((variation: any) => 
          variation.options && variation.options.some((option: any) => 
            option.inStock && option.stockQuantity > 0
          )
        );
      } else {
        // Bei Produkten ohne Variationen: direktes inStock und stockQuantity prüfen
        return product.inStock && product.stockQuantity > 0;
      }
    })
    .sort(() => Math.random() - 0.5) // Zufällige Reihenfolge
    .map((product: any) => ({
      _id: product._id.toString(),
      slug: product.slug,
      title: product.title,
      price: product.price,
      offerPrice: product.offerPrice,
      isOnSale: product.isOnSale,
      isTopSeller: product.isTopSeller,
      inStock: product.inStock,
      stockQuantity: product.stockQuantity,
      images: product.images || [],
      imageSizes: product.imageSizes?.map((img: any) => ({
        main: img.main,
        thumb: img.thumb,
        small: img.small
      })),
      tags: product.tags || [],
      variations: product.variations?.map((variation: any) => ({
        name: variation.name,
        options: variation.options?.map((option: any) => ({
          value: option.value,
          priceAdjustment: option.priceAdjustment || 0,
          inStock: option.inStock,
          stockQuantity: option.stockQuantity || 0
        }))
      })) || [],
      categoryId: product.categoryId?.toString(),
      subcategoryId: product.subcategoryId?.toString(),
      subcategoryIds: product.subcategoryIds?.map((id: any) => id.toString()),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

  const hdrs = await headers();
  const proto = hdrs.get('x-forwarded-proto') || 'http';
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host') || 'localhost:3000';
  const origin = `${proto}://${host}`;
  const popularBrands = await fetch(`${origin}/api/shop/brands`, { cache: 'no-store' }).then(async (r) => r.ok ? r.json() : []);

  return (
    <>
      {/* Hero Section mit Header-Bild */}
      <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        {/* Hintergrund-Bild */}
        <div className="absolute inset-0 z-0">
          <div 
            className="w-full h-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/images/hero/background.webp')`
            }}
          ></div>
          {/* Animierter Overlay für bessere Lesbarkeit */}
          <div className="absolute inset-0 bg-black/70 animate-fade-to-light"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-20 text-center text-white max-w-4xl mx-auto px-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up hover:scale-105 transition-transform duration-300">
            Dart & Autodarts
            <span className="block text-blue-200">Spezialist</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto animate-fade-in-up delay-200 hover:scale-105 transition-transform duration-300">
            Professionelle Dart-Ausrüstung und Autodarts Konfiguration mit modernster Technologie
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-400">
            <Link href="/shop" className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:scale-105 transition-all duration-300 text-lg font-semibold shadow-lg hover:shadow-xl">
              Zum Shop
            </Link>
            <Link href="/kontakt" className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-900 hover:scale-105 transition-all duration-300 text-lg font-semibold">
              Kontakt
            </Link>
          </div>
        </div>
      </section>

      {/* Informationsleiste */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              <span><strong>Versand</strong> innerhalb 1-2 Tagen</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              <span><strong>Kostenloser Versand</strong> ab 80€</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              <span>Zahlung mit <strong>PayPal, Stripe, Vorkasse</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              <span><strong>Rabatte</strong> für <strong>Kunden</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex text-yellow-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
              </div>
              <span className="text-gray-700">4.8 • 150+ Bewertungen</span>
            </div>
          </div>
        </div>
      </section>

      {/* Top Seller Produkte */}
      <TopSellerSection products={topSellerProducts} />

      {/* Beliebte Marken */}
      <BrandsCarousel brands={popularBrands.map((b: any) => ({ id: b._id, name: b.name, logo: b.imageSizes?.main || b.image || '/images/brands/red-dragon.png', url: `/shop/marke/${b.slug}` }))} />

      {/* Im Angebot Produkte */}
      <SaleSection products={filteredSaleProducts} />

      {/* Hauptinhalt */}
      <section className="max-w-7xl mx-auto px-6 py-2">
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fade-in-up">
            <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
            <div className="p-8 text-center">
              <h3 className="font-semibold text-gray-900 text-xl mb-3">Premium Dart-Ausrüstung</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                Hochwertige Dartpfeile, Boards und Zubehör für jeden Spielertyp
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '200ms'}}>
            <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
            <div className="p-8 text-center">
              <h3 className="font-semibold text-gray-900 text-xl mb-3">Individuelle Beratung</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                Persönliche Unterstützung bei der Auswahl der perfekten Dart-Ausrüstung
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '400ms'}}>
            <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
            <div className="p-8 text-center">
              <h3 className="font-semibold text-gray-900 text-xl mb-3">Autodarts Expertise</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                Professionelle Beratung und Support bei der Konfiguration Ihres Autodarts Systems
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '600ms'}}>
            <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
            <div className="p-8 text-center">
              <h3 className="font-semibold text-gray-900 text-xl mb-3">Qualitätsprodukte</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                Sorgfältig ausgewählte Dart-Produkte für Ihr optimales Spielerlebnis
              </p>
            </div>
          </div>
        </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScrollAnimation delay={0}>
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
            <div className="p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Dart-Ausrüstung</h3>
              <p className="text-gray-600 mb-6">
                Professionelle Dart-Ausrüstung für Anfänger bis Profis. Von Dartpfeilen bis zu elektronischen Boards - alles für Ihr perfektes Spiel.

              </p>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Dartpfeile aller Gewichtsklassen
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Elektronische & Steeldart Boards
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Kostenlose Beratung
                </li>
              </ul>
              <Link href="/shop" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Zur Dart-Ausrüstung
              </Link>
            </div>
          </div>
        </ScrollAnimation>

        <ScrollAnimation delay={0}>
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
            <div className="p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Autodarts Konfiguration</h3>
              <p className="text-gray-600 mb-6">
                Professionelle Autodarts Systeme und Zubehör. Individuelle Konfiguration nach Ihren Wünschen.
              </p>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Komplette Systeme
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Professionelle Beratung
            </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Qualitätskomponenten
            </li>
              </ul>
              <Link href="/shop" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Zur Autodarts Konfiguration
              </Link>
            </div>
          </div>
        </ScrollAnimation>
      </div>

       
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Dart-Ausrüstung",
          url: (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000")) + "/",
        }}
      />
    </>
  );
}