"use client";

import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import DynamicFilters from "@/components/DynamicFilters";
import Breadcrumb from "@/components/Breadcrumb";
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
    
    const data = await response.json();
    return Array.isArray(data.categories) ? data.categories : [];
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}



export default function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string; subcategory?: string; search?: string; filter?: string }> }) {
  const router = useRouter();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [resolvedSearchParams, setResolvedSearchParams] = useState<{ category?: string; subcategory?: string; search?: string; filter?: string }>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'default' | 'newest' | 'oldest' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc'>('default');
  const [categoryTopSellerPage, setCategoryTopSellerPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [selectedDynamicFilters, setSelectedDynamicFilters] = useState<Record<string, string[]>>({});
  const [productFilters, setProductFilters] = useState<Record<string, any[]>>({});

  // Load product filters for all products
  const loadProductFilters = async (products: any[]) => {
    try {
      const productIds = products.map(p => p._id);
      const response = await fetch('/api/admin/product-filters');
      if (response.ok) {
        const allProductFilters = await response.json();
        
        // Group filters by product ID
        const filtersByProduct: Record<string, any[]> = {};
        allProductFilters.forEach((pf: any) => {
          if (productIds.includes(pf.productId)) {
            if (!filtersByProduct[pf.productId]) {
              filtersByProduct[pf.productId] = [];
            }
            filtersByProduct[pf.productId].push(pf);
          }
        });
        
        setProductFilters(filtersByProduct);
      }
    } catch (error) {
      console.error('Failed to load product filters:', error);
    }
  };

  // Resolve search params using both methods
  useEffect(() => {
    const getSearchParams = async () => {
      // Always try URLSearchParams first for client-side navigation
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const params = {
          category: urlParams.get('category') || undefined,
          subcategory: urlParams.get('subcategory') || undefined,
          search: urlParams.get('search') || undefined,
          filter: urlParams.get('filter') || undefined,
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
          search: urlParams.get('search') || undefined,
          filter: urlParams.get('filter') || undefined,
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
        
        // Load product filters
        await loadProductFilters(products);
        
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

  // Initialize search query from URL params
  useEffect(() => {
    if (resolvedSearchParams.search) {
      setSearchQuery(resolvedSearchParams.search);
    }
  }, [resolvedSearchParams.search]);



  // Reset pagination when category, search query, price range, or dynamic filters change
  useEffect(() => {
    setCategoryTopSellerPage(0);
  }, [resolvedSearchParams.category, searchQuery, priceRange, selectedDynamicFilters]);

  // Reset dynamic filters when category changes
  useEffect(() => {
    setSelectedDynamicFilters({});
  }, [resolvedSearchParams.category]);



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

  // Debug logging for selected filters
  console.log('Selected Dynamic Filters:', selectedDynamicFilters);

  // Filter products by category, subcategory, manufacturer, and search query
  const filteredProducts = allProducts.filter((p: any) => {
    const selectedCategory = resolvedSearchParams.category;
    const selectedSubcategory = resolvedSearchParams.subcategory;
    
    // Search filter - search in multiple fields
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const titleMatch = p.title.toLowerCase().includes(query);
      const descriptionMatch = p.description && p.description.toLowerCase().includes(query);
      const manufacturerMatch = p.manufacturer && p.manufacturer.toLowerCase().includes(query);
      const categoryMatch = p.category && p.category.toLowerCase().includes(query);
      const subcategoryMatch = p.subcategory && p.subcategory.toLowerCase().includes(query);
      const tagsMatch = p.tags && p.tags.some((tag: string) => tag.toLowerCase().includes(query));
      
      // Check if any field matches
      if (!titleMatch && !descriptionMatch && !manufacturerMatch && !categoryMatch && !subcategoryMatch && !tagsMatch) {
        return false;
      }
    }
    
    // Price filter
    const effectivePrice = getEffectivePrice(p);
    if (effectivePrice < priceRange.min || effectivePrice > priceRange.max) {
      return false;
    }
    
    // Category filter
    if (selectedCategory) {
      const category = categories.find(c => c.slug === selectedCategory);
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
        
        if (!isDirectCategoryMatch && !isSubcategoryMatch) return false;
      }
    }
    
    // Dynamic filters - MULTISELECT ONLY
    for (const [filterId, filterValues] of Object.entries(selectedDynamicFilters)) {
      if (filterValues && filterValues.length > 0) {
        const productFilterList = productFilters[p._id] || [];
        
        // Multiselect filter: OR logic - product needs to have at least one of the selected values
        const hasMatchingFilter = productFilterList.some((pf: any) => {
          if (pf.filterId !== filterId) return false;
          return pf.values.some((value: string) => filterValues.includes(value));
        });
        
        
        if (!hasMatchingFilter) {
          return false;
        }
      }
    }
    
    // Special filters
    const filter = resolvedSearchParams.filter;
    if (filter) {
      switch (filter) {
        case 'topseller':
          if (!p.isTopSeller) return false;
          break;
        case 'sale':
          if (!p.isOnSale) return false;
          break;
        case 'neu':
          // Check if product was added within the last 2 weeks
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          const productDate = new Date(p.createdAt || p.updatedAt);
          if (productDate < twoWeeksAgo) return false;
          break;
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
      const descriptionMatch = p.description && p.description.toLowerCase().includes(query);
      const manufacturerMatch = p.manufacturer && p.manufacturer.toLowerCase().includes(query);
      const categoryMatch = p.category && p.category.toLowerCase().includes(query);
      const subcategoryMatch = p.subcategory && p.subcategory.toLowerCase().includes(query);
      const tagsMatch = p.tags && p.tags.some((tag: string) => tag.toLowerCase().includes(query));
      
      if (!titleMatch && !descriptionMatch && !manufacturerMatch && !categoryMatch && !subcategoryMatch && !tagsMatch) {
        return false;
      }
    }
    
    return true;
  });
  
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
          const descriptionMatch = p.description && p.description.toLowerCase().includes(query);
          const manufacturerMatch = p.manufacturer && p.manufacturer.toLowerCase().includes(query);
          const categoryMatch = p.category && p.category.toLowerCase().includes(query);
          const subcategoryMatch = p.subcategory && p.subcategory.toLowerCase().includes(query);
          const tagsMatch = p.tags && p.tags.some((tag: string) => tag.toLowerCase().includes(query));
          
          if (!titleMatch && !descriptionMatch && !manufacturerMatch && !categoryMatch && !subcategoryMatch && !tagsMatch) {
            return false;
          }
        }
        
        return true;
      })
    : [];
  const categoryTopSellers = allCategoryTopSellers.slice(categoryTopSellerPage * 4, (categoryTopSellerPage + 1) * 4);
  const totalCategoryTopSellerPages = Math.ceil(allCategoryTopSellers.length / 4);

  return (
    <>
      {/* Breadcrumb - only show if category is selected, positioned sticky under CategoryNavigation */}
      {resolvedSearchParams.category && <Breadcrumb />}
      
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Search Results Info */}
      {searchQuery && (
        <div className="mb-6">
          <div className="max-w-md mx-auto xl:mx-0">
            <p className="text-sm text-gray-600">
              {filteredProducts.length} Produkt{filteredProducts.length !== 1 ? 'e' : ''} gefunden für "<span className="font-medium">{searchQuery}</span>"
            </p>
          </div>
        </div>
      )}

      {/* Main Layout: Filters on left, Products on right */}
      <div className="flex gap-8">
        {/* Left Sidebar - Filters */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Price Filter */}
            <div>
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
            
            {/* Dynamic Filters */}
            <DynamicFilters
              categoryId={categories.find(c => c.slug === resolvedSearchParams.category)?._id}
              selectedFilters={selectedDynamicFilters}
              onFilterChange={(filterId, values) => {
                setSelectedDynamicFilters(prev => ({
                  ...prev,
                  [filterId]: values
                }));
              }}
              productFilters={productFilters}
              allProducts={allProducts}
              currentCategoryProducts={filteredProducts}
            />
            
          </div>
        </div>

        {/* Right Side: Products */}
        <div className="flex-1">
          {/* Products Section */}
          <div className="min-h-[400px]">
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
    </>
  );
}
