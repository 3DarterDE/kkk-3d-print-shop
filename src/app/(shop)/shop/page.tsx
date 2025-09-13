"use client";

import Link from "next/link";
import CategoryTree from "@/components/CategoryTree";
import ProductCard from "@/components/ProductCard";
import ManufacturerFilter from "@/components/ManufacturerFilter";
import { getOptimizedImageUrl, getContextualImageSize } from "@/lib/image-utils";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  subcategories?: Category[];
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const url = `/api/shop/categories`;
    const response = await fetch(url, {
      cache: 'no-store', // Always fetch fresh categories to reflect changes immediately
      next: { revalidate: 0 } // No cache for categories
    });
    
    if (!response.ok) {
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}



export default function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string; subcategory?: string }> }) {
  const router = useRouter();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
  const [resolvedSearchParams, setResolvedSearchParams] = useState<{ category?: string; subcategory?: string }>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'default' | 'newest' | 'oldest' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc'>('default');
  const [topSellerPage, setTopSellerPage] = useState(0);
  const [categoryTopSellerPage, setCategoryTopSellerPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });

  // Resolve search params using both methods
  useEffect(() => {
    const getSearchParams = async () => {
      // Always try URLSearchParams first for client-side navigation
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const params = {
          category: urlParams.get('category') || undefined,
          subcategory: urlParams.get('subcategory') || undefined,
        };
        console.log('Resolved search params from URL:', params);
        setResolvedSearchParams(params);
        return;
      }
      
      // Fallback to Next.js searchParams for server-side rendering
      try {
        const params = await searchParams;
        console.log('Resolved search params from Next.js:', params);
        setResolvedSearchParams(params || {});
      } catch (error) {
        console.log('Next.js searchParams failed:', error);
        setResolvedSearchParams({});
      }
    };
    
    getSearchParams();
  }, [searchParams]);

  // Listen for URL changes (for client-side navigation)
  useEffect(() => {
    const handleUrlChange = () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const params = {
          category: urlParams.get('category') || undefined,
          subcategory: urlParams.get('subcategory') || undefined,
        };
        console.log('URL changed, new search params:', params);
        setResolvedSearchParams(params);
      }
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleUrlChange);
    
    // Also listen for custom navigation events
    window.addEventListener('pushstate', handleUrlChange);
    window.addEventListener('replacestate', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('pushstate', handleUrlChange);
      window.removeEventListener('replacestate', handleUrlChange);
    };
  }, []);

  // Force re-render when resolvedSearchParams change
  useEffect(() => {
    console.log('Resolved search params changed:', resolvedSearchParams);
  }, [resolvedSearchParams]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load critical data in parallel with proper caching
        const [productsResponse, cats] = await Promise.all([
          fetch('/api/admin/products', { 
            cache: 'no-store', // Always fetch fresh products to reflect stock changes immediately
            next: { revalidate: 0 } // No cache for products
          }),
          fetchCategories()
        ]);
        
        const products = await productsResponse.json();
        
        // Set data immediately
        setAllProducts(products);
        setCategories(cats);
        
        // Initialize price range based on all products
        const calculatedRange = calculatePriceRange(products);
        setPriceRange(calculatedRange);
        
        setLoading(false);
        
      } catch (error) {
        console.error('Failed to load shop data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Reset pagination when category, manufacturer filter, search query, or price range changes
  useEffect(() => {
    setTopSellerPage(0);
    setCategoryTopSellerPage(0);
  }, [resolvedSearchParams.category, selectedManufacturers, searchQuery, priceRange]);



  // Helper function to get effective price (offer price if on sale, otherwise regular price)
  const getEffectivePrice = (product: any) => {
    return product.isOnSale && product.offerPrice ? product.offerPrice : product.price;
  };

  // Calculate price range from all products
  const calculatePriceRange = (products: any[]) => {
    if (products.length === 0) return { min: 0, max: 1000 };
    
    const prices = products.map(p => getEffectivePrice(p));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Round to nice numbers
    const roundedMin = Math.floor(minPrice / 100) * 100; // Round down to nearest 100
    const roundedMax = Math.ceil(maxPrice / 100) * 100; // Round up to nearest 100
    
    return { min: roundedMin, max: roundedMax };
  };

  // Filter products by category, subcategory, manufacturer, and search query
  const filteredProducts = allProducts.filter((p: any) => {
    const selectedCategory = resolvedSearchParams.category;
    const selectedSubcategory = resolvedSearchParams.subcategory;
    
    // Debug logging
    if (selectedCategory) {
      console.log('Filtering by category:', selectedCategory, 'Product category:', p.category, 'Product categoryId:', p.categoryId, 'Product title:', p.title);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const titleMatch = p.title.toLowerCase().includes(query);
      if (!titleMatch) return false;
    }
    
    // Price filter
    const effectivePrice = getEffectivePrice(p);
    if (effectivePrice < priceRange.min || effectivePrice > priceRange.max) {
      return false;
    }
    
    // Category filter
    if (selectedCategory) {
      const category = categories.find(c => c.slug === selectedCategory);
      console.log('Looking for category with slug:', selectedCategory, 'Found category:', category);
      if (!category) return false;
      
      // If subcategory is specified, filter by subcategoryId or subcategoryIds
      if (selectedSubcategory) {
        const subcategory = category.subcategories?.find(s => s.slug === selectedSubcategory);
        if (!subcategory) return false;
        const subcategoryMatch = p.subcategoryId === subcategory._id || (p.subcategoryIds && p.subcategoryIds.includes(subcategory._id));
        if (!subcategoryMatch) return false;
      } else {
        // Filter by categoryId (new system) or category slug (old system)
        // Also include products that belong to subcategories of this category
        const isDirectCategoryMatch = p.categoryId === category._id || p.category === selectedCategory;
        const isSubcategoryMatch = category.subcategories?.some(sub => 
          p.subcategoryId === sub._id || (p.subcategoryIds && p.subcategoryIds.includes(sub._id))
        );
        
        console.log(`Product ${p.title}: categoryId=${p.categoryId}, category._id=${category._id}, isDirectMatch=${isDirectCategoryMatch}, isSubMatch=${isSubcategoryMatch}`);
        
        if (!isDirectCategoryMatch && !isSubcategoryMatch) return false;
      }
    }
    
    // Manufacturer filter
    if (selectedManufacturers.length > 0) {
      if (!p.manufacturer || !selectedManufacturers.includes(p.manufacturer)) {
        return false;
      }
    }
    
    return true;
  });

  // Debug: Log filtered products count
  console.log(`Filtered products count: ${filteredProducts.length} out of ${allProducts.length} total products`);

  // Sort products based on selected sort option
  const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
    switch (sortBy) {
      case 'default':
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'price-low':
        return (getEffectivePrice(a) || 0) - (getEffectivePrice(b) || 0);
      case 'price-high':
        return (getEffectivePrice(b) || 0) - (getEffectivePrice(a) || 0);
      case 'name-asc':
        return a.title.localeCompare(b.title);
      case 'name-desc':
        return b.title.localeCompare(a.title);
      default:
        return (a.sortOrder || 0) - (b.sortOrder || 0);
    }
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Shop wird geladen...</h1>
            <p className="text-gray-600">Bitte warten Sie einen Moment</p>
          </div>
        </div>
      </div>
    );
  }

  const products = sortedProducts;

  // Extract top sellers for display at the top (only if manufacturer filter and search allows them)
  const allTopSellers = allProducts.filter((p: any) => {
    if (!(p.isTopSeller || false)) return false;
    
    // Search filter for top sellers
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const titleMatch = p.title.toLowerCase().includes(query);
      if (!titleMatch) return false;
    }
    
    // If no manufacturers are selected, show all top sellers
    if (selectedManufacturers.length === 0) return true;
    
    // If manufacturers are selected, only show top sellers from selected manufacturers
    return p.manufacturer && selectedManufacturers.includes(p.manufacturer);
  });
  const topSellers = allTopSellers.slice(topSellerPage * 4, (topSellerPage + 1) * 4);
  const totalTopSellerPages = Math.ceil(allTopSellers.length / 4);
  
  // Extract category top sellers for display at the top when in category view
  const allCategoryTopSellers = resolvedSearchParams.category 
    ? allProducts.filter((p: any) => {
        // Only show category top sellers that belong to the current category
        const category = categories.find(c => c.slug === resolvedSearchParams.category);
        if (!category) return false;
        
        // Check if product belongs to this category (direct or via subcategory)
        const isDirectCategoryMatch = p.categoryId === category._id || p.category === resolvedSearchParams.category;
        const isSubcategoryMatch = category.subcategories?.some(sub => 
          p.subcategoryId === sub._id || (p.subcategoryIds && p.subcategoryIds.includes(sub._id))
        );
        
        const belongsToCategory = isDirectCategoryMatch || isSubcategoryMatch;
        
        // Check if it's a subcategory view
        const isSubcategoryView = resolvedSearchParams.subcategory !== undefined;
        
        if (isSubcategoryView) {
          // For subcategory view, check if product belongs to the specific subcategory
          const subcategory = category.subcategories?.find(s => s.slug === resolvedSearchParams.subcategory);
          if (!subcategory) return false;
          
          const belongsToSubcategory = p.subcategoryId === subcategory._id || (p.subcategoryIds && p.subcategoryIds.includes(subcategory._id));
          const isSubCategoryTopSeller = p.isSubCategoryTopSeller || false;
          
          if (!belongsToSubcategory || !isSubCategoryTopSeller) return false;
        } else {
          // For main category view, check if product belongs to this specific main category
          const belongsToMainCategory = p.categoryId === category._id || p.category === resolvedSearchParams.category;
          const isCategoryTopSeller = p.isCategoryTopSeller || false;
          
          if (!belongsToMainCategory || !isCategoryTopSeller) return false;
        }
        
        // Search filter for category top sellers
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const titleMatch = p.title.toLowerCase().includes(query);
          if (!titleMatch) return false;
        }
        
        // If no manufacturers are selected, show all category top sellers
        if (selectedManufacturers.length === 0) return true;
        
        // If manufacturers are selected, only show category top sellers from selected manufacturers
        return p.manufacturer && selectedManufacturers.includes(p.manufacturer);
      })
    : [];
  const categoryTopSellers = allCategoryTopSellers.slice(categoryTopSellerPage * 4, (categoryTopSellerPage + 1) * 4);
  const totalCategoryTopSellerPages = Math.ceil(allCategoryTopSellers.length / 4);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Shop</h1>
      
      {/* Search Bar */}
      <div className="mb-6">
        <div className="max-w-md mx-auto xl:mx-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Produkte durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-600">
              {filteredProducts.length} Produkt{filteredProducts.length !== 1 ? 'e' : ''} gefunden für "{searchQuery}"
            </p>
          )}
        </div>
      </div>

      {/* Main Layout: Categories on left, Top Sellers and Products on right */}
      <div className="flex flex-col xl:flex-row gap-8">
        {/* Categories Sidebar */}
        <div className="xl:w-80 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Kategorien</h2>
            <CategoryTree 
              categories={categories}
              selectedCategory={resolvedSearchParams.category}
              selectedSubcategory={resolvedSearchParams.subcategory}
            />
          </div>
          
          <div className="mt-6">
            <ManufacturerFilter
              selectedManufacturers={selectedManufacturers}
              onManufacturerChange={setSelectedManufacturers}
            />
          </div>
          
          {/* Price Filter */}
          <div className="mt-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Preis</h2>
              <div className="space-y-4">
                
                <div className="space-y-4">
                  {/* Range Slider Container */}
                  <div className="relative">
                    <div className="relative h-2 bg-gray-200 rounded-lg">
                      {/* Active range track */}
                      <div 
                        className="absolute h-2 bg-blue-500 rounded-lg"
                        style={{
                          left: `${((priceRange.min - calculatePriceRange(allProducts).min) / (calculatePriceRange(allProducts).max - calculatePriceRange(allProducts).min)) * 100}%`,
                          width: `${((priceRange.max - priceRange.min) / (calculatePriceRange(allProducts).max - calculatePriceRange(allProducts).min)) * 100}%`
                        }}
                      />
                      
                      {/* Min thumb */}
                      <div
                        className="absolute w-4 h-4 bg-blue-500 rounded-full cursor-pointer transform -translate-y-1 -translate-x-2 hover:scale-110 transition-transform"
                        style={{
                          left: `${((priceRange.min - calculatePriceRange(allProducts).min) / (calculatePriceRange(allProducts).max - calculatePriceRange(allProducts).min)) * 100}%`,
                          zIndex: 10
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startValue = priceRange.min;
                          const minPrice = calculatePriceRange(allProducts).min;
                          const maxPrice = calculatePriceRange(allProducts).max;
                          const range = maxPrice - minPrice;
                          
                          const handleMouseMove = (e: MouseEvent) => {
                            const rect = (e.target as Element).closest('.relative')?.getBoundingClientRect();
                            if (!rect) return;
                            
                            const deltaX = e.clientX - startX;
                            const deltaPercent = (deltaX / rect.width) * 100;
                            const deltaValue = (deltaPercent / 100) * range;
                            const newValue = Math.max(minPrice, Math.min(maxPrice, startValue + deltaValue));
                            
                            setPriceRange(prev => ({
                              ...prev,
                              min: Math.min(newValue, prev.max - 100)
                            }));
                          };
                          
                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      />
                      
                      {/* Max thumb */}
                      <div
                        className="absolute w-4 h-4 bg-blue-500 rounded-full cursor-pointer transform -translate-y-1 -translate-x-2 hover:scale-110 transition-transform"
                        style={{
                          left: `${((priceRange.max - calculatePriceRange(allProducts).min) / (calculatePriceRange(allProducts).max - calculatePriceRange(allProducts).min)) * 100}%`,
                          zIndex: 10
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startValue = priceRange.max;
                          const minPrice = calculatePriceRange(allProducts).min;
                          const maxPrice = calculatePriceRange(allProducts).max;
                          const range = maxPrice - minPrice;
                          
                          const handleMouseMove = (e: MouseEvent) => {
                            const rect = (e.target as Element).closest('.relative')?.getBoundingClientRect();
                            if (!rect) return;
                            
                            const deltaX = e.clientX - startX;
                            const deltaPercent = (deltaX / rect.width) * 100;
                            const deltaValue = (deltaPercent / 100) * range;
                            const newValue = Math.max(minPrice, Math.min(maxPrice, startValue + deltaValue));
                            
                            setPriceRange(prev => ({
                              ...prev,
                              max: Math.max(newValue, prev.min + 100)
                            }));
                          };
                          
                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      />
                    </div>
                    
                    {/* Min/Max labels */}
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>{(calculatePriceRange(allProducts).min / 100).toFixed(0)} €</span>
                      <span>{(calculatePriceRange(allProducts).max / 100).toFixed(0)} €</span>
                    </div>
                  </div>
                  
                  {/* Current selection display */}
                  <div className="text-center text-sm text-gray-600">
                    <span className="font-medium">{(priceRange.min / 100).toFixed(0)} €</span>
                    <span className="mx-2">-</span>
                    <span className="font-medium">{(priceRange.max / 100).toFixed(0)} €</span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    const range = calculatePriceRange(allProducts);
                    setPriceRange(range);
                  }}
                  className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Filter zurücksetzen
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Top Sellers and Products */}
        <div className={`flex-1 ${(allTopSellers.length > 0 && !resolvedSearchParams.category) || (allCategoryTopSellers.length > 0 && resolvedSearchParams.category) ? 'space-y-8' : ''}`}>
          {/* Top Sellers Section */}
          <div>
            {/* Global Top Sellers Section */}
            {allTopSellers.length > 0 && !resolvedSearchParams.category && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Top Seller</h2>
                  {totalTopSellerPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setTopSellerPage(Math.max(0, topSellerPage - 1))}
                        disabled={topSellerPage === 0}
                        className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-sm text-gray-600">
                        {topSellerPage + 1} / {totalTopSellerPages}
                      </span>
                      <button
                        onClick={() => setTopSellerPage(Math.min(totalTopSellerPages - 1, topSellerPage + 1))}
                        disabled={topSellerPage >= totalTopSellerPages - 1}
                        className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {topSellers.map((p: any) => (
                    <ProductCard 
                      key={p._id.toString()} 
                      product={{
                        _id: p._id.toString(),
                        slug: p.slug,
                        title: p.title,
                        price: p.price,
                        offerPrice: p.offerPrice,
                        isOnSale: p.isOnSale,
                        isTopSeller: true,
                        inStock: p.inStock,
                        stockQuantity: p.stockQuantity,
                        images: p.images || [],
                        imageSizes: (p.imageSizes || []).map((imgSize: any) => ({
                          main: imgSize.main,
                          thumb: imgSize.thumb,
                          small: imgSize.small
                        })),
                        tags: p.tags || [],
                        variations: p.variations || []
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Category Top Sellers Section */}
            {allCategoryTopSellers.length > 0 && resolvedSearchParams.category && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Top Seller in {categories.find(c => c.slug === resolvedSearchParams.category)?.name || 'Kategorie'}
                  </h2>
                  {totalCategoryTopSellerPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCategoryTopSellerPage(Math.max(0, categoryTopSellerPage - 1))}
                        disabled={categoryTopSellerPage === 0}
                        className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-sm text-gray-600">
                        {categoryTopSellerPage + 1} / {totalCategoryTopSellerPages}
                      </span>
                      <button
                        onClick={() => setCategoryTopSellerPage(Math.min(totalCategoryTopSellerPages - 1, categoryTopSellerPage + 1))}
                        disabled={categoryTopSellerPage >= totalCategoryTopSellerPages - 1}
                        className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {categoryTopSellers.map((p: any) => (
                    <ProductCard 
                      key={p._id.toString()} 
                      product={{
                        _id: p._id.toString(),
                        slug: p.slug,
                        title: p.title,
                        price: p.price,
                        offerPrice: p.offerPrice,
                        isOnSale: p.isOnSale,
                        isTopSeller: true,
                        inStock: p.inStock,
                        stockQuantity: p.stockQuantity,
                        images: p.images || [],
                        imageSizes: (p.imageSizes || []).map((imgSize: any) => ({
                          main: imgSize.main,
                          thumb: imgSize.thumb,
                          small: imgSize.small
                        })),
                        tags: p.tags || [],
                        variations: p.variations || []
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Products Section */}
          <div className={allTopSellers.length === 0 && allCategoryTopSellers.length === 0 ? "min-h-[400px]" : ""}>
        {/* Category Products */}
        <div className="bg-white rounded-lg shadow p-6 h-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-xl font-semibold mb-2 sm:mb-0">
              {resolvedSearchParams.subcategory 
                ? categories.find(c => c.slug === resolvedSearchParams.category)?.subcategories?.find(s => s.slug === resolvedSearchParams.subcategory)?.name || 'Unterkategorie'
                : resolvedSearchParams.category 
                  ? categories.find(c => c.slug === resolvedSearchParams.category)?.name || 'Kategorie'
                  : 'Alle Produkte'
              }
              {selectedManufacturers.length > 0 && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  (gefiltert nach {selectedManufacturers.length} Hersteller{selectedManufacturers.length > 1 ? 'n' : ''})
                </span>
              )}
            </h2>
            
            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2">
              <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
                Sortieren nach:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="default">Standard</option>
                <option value="newest">Neueste zuerst</option>
                <option value="oldest">Älteste zuerst</option>
                <option value="price-low">Niedrigster Preis</option>
                <option value="price-high">Höchster Preis</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedProducts.map((p: any) => {
                // Determine if this product should show as top seller
                let isTopSeller = false;
                
                if (resolvedSearchParams.category) {
                  // In category view: check if it's a subcategory view
                  const isSubcategoryView = resolvedSearchParams.subcategory !== undefined;
                  
                  if (isSubcategoryView) {
                    // In subcategory view: check if product belongs to this specific subcategory
                    const category = categories.find(c => c.slug === resolvedSearchParams.category);
                    const subcategory = category?.subcategories?.find(s => s.slug === resolvedSearchParams.subcategory);
                    
                    if (subcategory) {
                      const belongsToSubcategory = p.subcategoryId === subcategory._id || (p.subcategoryIds && p.subcategoryIds.includes(subcategory._id));
                      isTopSeller = belongsToSubcategory && (p.isSubCategoryTopSeller || false);
                    }
                  } else {
                    // In main category view: check if product belongs to this specific main category
                    const category = categories.find(c => c.slug === resolvedSearchParams.category);
                    const belongsToMainCategory = category && (p.categoryId === category._id || p.category === resolvedSearchParams.category);
                    isTopSeller = belongsToMainCategory && (p.isCategoryTopSeller || false);
                  }
                } else {
                  // In "all products" view: only show global top sellers
                  isTopSeller = p.isTopSeller || false;
                }
              
              return (
                <ProductCard 
                  key={p._id.toString()} 
                  product={{
                    _id: p._id.toString(),
                    slug: p.slug,
                    title: p.title,
                    price: p.price,
                    offerPrice: p.offerPrice,
                    isOnSale: p.isOnSale,
                    isTopSeller: isTopSeller,
                    inStock: p.inStock,
                    stockQuantity: p.stockQuantity,
                    images: p.images || [],
                    imageSizes: (p.imageSizes || []).map((imgSize: any) => ({
                      main: imgSize.main,
                      thumb: imgSize.thumb,
                      small: imgSize.small
                    })),
                    tags: p.tags || [],
                    variations: p.variations || []
                  }}
                />
              );
            })}
          </div>
        </div>
        </div>
        </div>
    
      </div>
    </div>
  );
}


