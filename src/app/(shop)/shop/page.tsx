"use client";

import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import DynamicFilters from "@/components/DynamicFilters";
import Breadcrumb from "@/components/Breadcrumb";
import SearchBar from "@/components/SearchBar";
import CategoryDescriptionSection from "@/components/CategoryDescriptionSection";
import { getOptimizedImageUrl, getContextualImageSize } from "@/lib/image-utils";
import { useState, useEffect, useRef } from "react";
import { useShopData } from '@/lib/contexts/ShopDataContext';
import { useRouter } from "next/navigation";


export const dynamic = 'force-dynamic';

// Category interface removed - now using ShopDataContext types

// Helper function for flexible search matching
function flexibleSearchMatch(text: string, query: string): boolean {
  if (!text || !query) return false;
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // First try exact match
  if (textLower.includes(queryLower)) return true;
  
  // Only use flexible search for specific short queries to avoid false positives
  if (queryLower !== 'steel') return false;
  
  // Then try flexible match (allowing max 1 character between letters)
  // This prevents too many false positives
  const flexiblePattern = queryLower.replace(/(.)/g, '$1.{0,1}');
  const flexibleRegex = new RegExp(flexiblePattern, 'i');
  return flexibleRegex.test(textLower);
}

// fetchCategories and fetchBrands functions removed - now using ShopDataContext

async function fetchBrand(slug: string): Promise<any | null> {
  try {
    const url = `/api/brands/${slug}`;
    const response = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const brand = await response.json();
    return brand || null;
  } catch (error) {
    console.error('Failed to fetch brand:', error);
    return null;
  }
}



export default function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string; subcategory?: string; brand?: string; search?: string; filter?: string }> }) {
  const router = useRouter();
  const { filters: allFiltersFromContext, categories, brands } = useShopData();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [currentBrand, setCurrentBrand] = useState<any | null>(null);
  const [resolvedSearchParams, setResolvedSearchParams] = useState<{ category?: string; subcategory?: string; brand?: string; search?: string; filter?: string }>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'default' | 'newest' | 'oldest' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc'>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [selectedDynamicFilters, setSelectedDynamicFilters] = useState<Record<string, string[]>>({});
  const [productFilters, setProductFilters] = useState<Record<string, any[]>>({});
  const [isPriceFilterModified, setIsPriceFilterModified] = useState(false);
  const [showTopSellers, setShowTopSellers] = useState(false);
  const [showSaleItems, setShowSaleItems] = useState(false);
  const [showNewItems, setShowNewItems] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [initialViewProducts, setInitialViewProducts] = useState<any[]>([]);
  // Cross-filtering state
  const [selectedBrandFilters, setSelectedBrandFilters] = useState<string[]>([]);
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([]);
  // Mobile filter overlay state
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  // Scroll state for mobile breadcrumb
  const [isScrolled, setIsScrolled] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(25);

  // Load product filters for all products
  const loadProductFilters = async (products: any[]) => {
    try {
      const productIds = products.map(p => p._id);
      
      const response = await fetch('/api/shop/product-filters');
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

  // Load all filters - REMOVED: Now using ShopDataContext

  // Helper function to get available brands for a category with counts
  const getAvailableBrandsForCategory = (categorySlug: string) => {
    if (!categorySlug || !allProducts.length || !brands.length) return [];
    
    const category = categories.find(c => c.slug === categorySlug);
    if (!category) return [];
    
    // Get products in this category
    const categoryProducts = allProducts.filter((p: any) => {
      const isDirectCategoryMatch = p.categoryId === category._id || p.category === categorySlug;
      const isSubcategoryMatch = category.subcategories?.some(sub => 
        p.subcategoryId === sub._id || (p.subcategoryIds && p.subcategoryIds.includes(sub._id))
      );
      return isDirectCategoryMatch || isSubcategoryMatch;
    });
    
    // Count products per brand
    const brandCounts: Record<string, number> = {};
    categoryProducts.forEach(product => {
      // Try multiple ways to match brands
      const brandSlug = product.brand || product.brandId;
      if (brandSlug) {
        brandCounts[brandSlug] = (brandCounts[brandSlug] || 0) + 1;
      }
      
      // Also check if brand is in tags
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.forEach((tag: string) => {
          const matchingBrand = brands.find(b => b.slug === tag);
          if (matchingBrand) {
            brandCounts[tag] = (brandCounts[tag] || 0) + 1;
          }
        });
      }
    });
    
    // Return brands with counts, sorted by count (descending)
    return brands
      .filter(brand => brandCounts[brand.slug] > 0)
      .map(brand => ({
        ...brand,
        productCount: brandCounts[brand.slug] || 0
      }))
      .sort((a, b) => b.productCount - a.productCount);
  };

  // Helper function to get available categories for a brand with counts
  const getAvailableCategoriesForBrand = (brandSlug: string) => {
    if (!brandSlug || !allProducts.length || !categories.length) return [];
    
    // Get products from this brand
    const brandProducts = allProducts.filter((p: any) => 
      p.brand === brandSlug || 
      p.brandId === brandSlug ||
      p.tags?.includes(brandSlug)
    );
    
    // Count products per category (avoid double counting)
    const categoryCounts: Record<string, Set<string>> = {};
    
    brandProducts.forEach(product => {
      const productId = product._id;
      
      // Check direct category
      if (product.categoryId) {
        const category = categories.find(c => c._id === product.categoryId);
        if (category) {
          if (!categoryCounts[category.slug]) {
            categoryCounts[category.slug] = new Set();
          }
          categoryCounts[category.slug].add(productId);
        }
      }
      
      // Check subcategories
      if (product.subcategoryId) {
        categories.forEach(category => {
          const subcategory = category.subcategories?.find(sub => sub._id === product.subcategoryId);
          if (subcategory) {
            if (!categoryCounts[category.slug]) {
              categoryCounts[category.slug] = new Set();
            }
            categoryCounts[category.slug].add(productId);
          }
        });
      }
      
      // Check subcategoryIds array
      if (product.subcategoryIds && product.subcategoryIds.length > 0) {
        categories.forEach(category => {
          const hasMatchingSubcategory = category.subcategories?.some(sub => 
            product.subcategoryIds.includes(sub._id)
          );
          if (hasMatchingSubcategory) {
            if (!categoryCounts[category.slug]) {
              categoryCounts[category.slug] = new Set();
            }
            categoryCounts[category.slug].add(productId);
          }
        });
      }
    });
    
    // Convert Sets to counts
    const finalCounts: Record<string, number> = {};
    Object.keys(categoryCounts).forEach(categorySlug => {
      finalCounts[categorySlug] = categoryCounts[categorySlug].size;
    });
    
    // Return categories with counts, sorted by count (descending)
    return categories
      .filter(category => finalCounts[category.slug] > 0)
      .map(category => ({
        ...category,
        productCount: finalCounts[category.slug] || 0
      }))
      .sort((a, b) => b.productCount - a.productCount);
  };

  // Resolve search params using both methods and also support /shop/<category>/<subcategory> path
  useEffect(() => {
    const getSearchParams = async () => {
      // Client-side: prefer URLSearchParams but fall back to path segments
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const pathname = window.location.pathname || '';
        let pathCategory: string | undefined;
        let pathSubcategory: string | undefined;
        let pathBrand: string | undefined;
        
        if (pathname.startsWith('/shop/')) {
          const parts = pathname.split('/').filter(Boolean); // e.g. ['shop','dartpfeile','softdarts']
          if (parts.length >= 2) pathCategory = parts[1];
          if (parts.length >= 3) pathSubcategory = parts[2];
          
          // Check for brand path: /shop/marke/[brand]
          if (parts[1] === 'marke' && parts[2]) {
            pathBrand = parts[2];
            pathCategory = undefined; // Clear category when showing brand
          }
        }
        
        const params = {
          category: urlParams.get('category') || pathCategory || undefined,
          subcategory: urlParams.get('subcategory') || pathSubcategory || undefined,
          brand: urlParams.get('brand') || pathBrand || undefined,
          search: urlParams.get('search') || undefined,
          filter: urlParams.get('filter') || undefined,
        };
        
        setResolvedSearchParams(params);
        return;
      }

      // Server-side fallback
      try {
        const params = await searchParams;
        setResolvedSearchParams(params || {});
      } catch (error) {
        setResolvedSearchParams({});
      }
    };

    getSearchParams();
  }, [searchParams]);

  // Load current brand data when brand parameter changes
  useEffect(() => {
    const loadCurrentBrand = async () => {
      if (resolvedSearchParams.brand) {
        const brandData = await fetchBrand(resolvedSearchParams.brand);
        setCurrentBrand(brandData);
      } else {
        setCurrentBrand(null);
      }
    };

    loadCurrentBrand();
  }, [resolvedSearchParams.brand]);

  // Listen for URL changes (for client-side navigation)
  useEffect(() => {
    const handleUrlChange = () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const params = {
          category: urlParams.get('category') || undefined,
          subcategory: urlParams.get('subcategory') || undefined,
          search: urlParams.get('search') || undefined,
          filter: undefined, // remove URL-based special filter entirely
        };
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


  useEffect(() => {
    const loadData = async () => {
      try {
        // Check if we have a search parameter
        const hasSearch = resolvedSearchParams.search && resolvedSearchParams.search.trim().length >= 2;
        
        let productsResponse;
        
        if (hasSearch) {
          // Use full search API for search queries
          productsResponse = await fetch(`/api/search/full?q=${encodeURIComponent(resolvedSearchParams.search!)}`, { 
            cache: 'no-store',
            next: { revalidate: 0 }
          });
        } else {
          // Use regular products API for category/brand browsing
          productsResponse = await fetch('/api/shop/products', { 
            cache: 'no-store', // Always fetch fresh products to reflect stock changes immediately
            next: { revalidate: 0 } // No cache for products
          });
        }
        
        const productsData = await productsResponse.json();
        const products = productsData.products || productsData;
        
        // Set data immediately - categories and brands come from ShopDataContext
        setAllProducts(products);
        // Initialize price range based on all products (will be updated when category changes)
        const calculatedRange = calculatePriceRange(products);
        setPriceRange(calculatedRange);

        // Allow the page to render products immediately
        setLoading(false);

        // Load filters in the background without blocking initial render
        Promise.all([
          loadProductFilters(products)
        ]).catch((err) => {
          console.error('Failed to load filters (non-blocking):', err);
        });
        
      } catch (error) {
        console.error('Failed to load shop data:', error);
        setLoading(false);
      }
    };

    // Only load data when we have resolved search params
    if (Object.keys(resolvedSearchParams).length > 0) {
      loadData();
    }
  }, [resolvedSearchParams]);

  // Clean URL: if we're showing search results, drop the ?search=... from the address bar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSearch = resolvedSearchParams.search && resolvedSearchParams.search.trim().length >= 2;
      const hasCategory = !!resolvedSearchParams.category || !!resolvedSearchParams.subcategory || !!resolvedSearchParams.brand;
      if (hasSearch && !hasCategory) {
        const url = new URL(window.location.href);
        if (url.searchParams.get('search')) {
          window.history.replaceState({}, '', '/shop');
        }
      }
    }
  }, [resolvedSearchParams.search, resolvedSearchParams.category, resolvedSearchParams.subcategory, resolvedSearchParams.brand]);

  // Product filters are loaded in the main loadData function

  // Load filter from sessionStorage when coming from other pages
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading) {
      const activateFilter = sessionStorage.getItem('activateFilter');
      if (activateFilter) {
        // Clear the sessionStorage immediately
        sessionStorage.removeItem('activateFilter');
        
        // Set the appropriate filter based on the stored value
        switch (activateFilter) {
          case 'topseller':
            setShowTopSellers(true);
            setShowSaleItems(false);
            setShowNewItems(false);
            break;
          case 'sale':
            setShowTopSellers(false);
            setShowSaleItems(true);
            setShowNewItems(false);
            break;
          case 'neu':
            setShowTopSellers(false);
            setShowSaleItems(false);
            setShowNewItems(true);
            break;
        }
      }
    }
  }, [loading]);

  // Initialize search query from URL params
  useEffect(() => {
    if (resolvedSearchParams.search) {
      setSearchQuery(resolvedSearchParams.search);
    }
  }, [resolvedSearchParams.search]);

  // Remove any URL-driven special filter syncing (all local now)

  // Helper functions to update local state only (no URL changes)
  const updateTopSellersFilter = (enabled: boolean) => {
    setShowTopSellers(enabled);
  };

  const updateSaleFilter = (enabled: boolean) => {
    setShowSaleItems(enabled);
  };

  const updateNewItemsFilter = (enabled: boolean) => {
    setShowNewItems(enabled);
  };

  // Listen for top bar events to toggle these local filters
  useEffect(() => {
    const onShopToggleFilter = (e: Event) => {
      const detail = (e as CustomEvent).detail as { filter: 'topseller' | 'sale' | 'neu'; action: 'toggle' };
      if (!detail) return;
      switch (detail.filter) {
        case 'topseller':
          updateTopSellersFilter(!showTopSellers);
          break;
        case 'sale':
          updateSaleFilter(!showSaleItems);
          break;
        case 'neu':
          updateNewItemsFilter(!showNewItems);
          break;
      }
    };
    window.addEventListener('shop-toggle-filter', onShopToggleFilter as EventListener);
    return () => window.removeEventListener('shop-toggle-filter', onShopToggleFilter as EventListener);
  }, [showTopSellers, showSaleItems, showNewItems]);







  // Helper function to get effective price (offer price if on sale, otherwise regular price)
  const getEffectivePrice = (product: any) => {
    let basePrice = product.isOnSale && product.offerPrice ? product.offerPrice : product.price;
    
    // Add variation price adjustments (if variations exist and are selected)
    if (product.variations && product.variations.length > 0) {
      product.variations.forEach((variation: any) => {
        // For price calculation, we need to consider the first available option
        // or the option with the highest price adjustment to get the maximum possible price
        const availableOptions = variation.options.filter((option: any) => option.inStock);
        if (availableOptions.length > 0) {
          // Use the option with the highest price adjustment for price range calculation
          const maxPriceAdjustment = Math.max(...availableOptions.map((option: any) => option.priceAdjustment || 0));
          basePrice += maxPriceAdjustment;
        }
      });
    }
    
    return basePrice;
  };

  // Helper function to check if product or any of its variations are available
  const isProductAvailable = (product: any) => {
    // Check main product stock - both inStock and stockQuantity must be valid
    if (product.inStock && (product.stockQuantity || 0) > 0) return true;
    
    // Check if any variation is available
    if (product.variations && product.variations.length > 0) {
      return product.variations.some((variation: any) => 
        variation.options && variation.options.some((option: any) => 
          option.inStock === true && (option.stockQuantity && option.stockQuantity > 0)
        )
      );
    }
    
    return false;
  };

  // Calculate price range from products (can be all products or filtered products)
  const calculatePriceRange = (products: any[]) => {
    const dbg = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DEBUG_PRICE === 'true';
    if (dbg) console.debug('[PriceRange] calculatePriceRange products:', products.length);
    if (products.length === 0) return { min: 0, max: 1000 };

    const prices = products.map(p => getEffectivePrice(p));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const roundedMin = Math.floor(minPrice / 100) * 100;
    const roundedMax = Math.ceil(maxPrice / 100) * 100;
    if (dbg) console.debug('[PriceRange] raw:', prices, 'min/max:', minPrice, maxPrice, 'rounded:', roundedMin, roundedMax);

    return { min: roundedMin, max: roundedMax };
  };

  // Calculate price range for current filtered products (excluding price filter itself)
  const calculateCurrentPriceRange = () => {
    
    // Get products that match current filters EXCEPT price filter
    const productsWithoutPriceFilter = allProducts.filter((p: any) => {
      const selectedCategory = resolvedSearchParams.category;
      const selectedSubcategory = resolvedSearchParams.subcategory;
      
      // Search filter - only apply if no category is selected and it's not a category search
      if (searchQuery.trim() && !selectedCategory && !isCategorySearch) {
        const query = searchQuery.trim();
        const titleMatch = flexibleSearchMatch(p.title, query);
        const descriptionMatch = p.description && flexibleSearchMatch(p.description, query);
        const categoryMatch = p.category && flexibleSearchMatch(p.category, query);
        const subcategoryMatch = p.subcategory && flexibleSearchMatch(p.subcategory, query);
        const brandMatch = p.brand && flexibleSearchMatch(p.brand, query);
        const tagsMatch = p.tags && p.tags.some((tag: string) => flexibleSearchMatch(tag, query));

        // Consider category/subcategory relation via IDs as match as well (like in filteredProducts)
        let categoryRelationMatch = false;
        try {
          const matchingCats = categories.filter(c =>
            flexibleSearchMatch(c.name, query) || flexibleSearchMatch(c.slug, query)
          );
          const matchingSubIds: string[] = [];
          const matchingParentIds: string[] = [];
          categories.forEach(c => {
            (c.subcategories || []).forEach(sub => {
              if (flexibleSearchMatch(sub.name, query) || flexibleSearchMatch(sub.slug, query)) {
                matchingSubIds.push(String(sub._id));
                matchingParentIds.push(String(c._id));
              }
            });
          });

          if (matchingCats.length > 0) {
            categoryRelationMatch = matchingCats.some(c => String(p.categoryId) === String(c._id))
              || matchingCats.some(c => (c.subcategories || []).some(sub =>
                   String(p.subcategoryId) === String(sub._id) || (p.subcategoryIds && p.subcategoryIds.includes(String(sub._id)))
                 ));
          }
          if (!categoryRelationMatch && (matchingSubIds.length > 0 || matchingParentIds.length > 0)) {
            categoryRelationMatch = matchingSubIds.includes(String(p.subcategoryId))
              || (p.subcategoryIds && p.subcategoryIds.some((sid: any) => matchingSubIds.includes(String(sid))))
              || matchingParentIds.includes(String(p.categoryId));
          }
        } catch {}

        if (!titleMatch && !descriptionMatch && !categoryMatch && !subcategoryMatch && !brandMatch && !tagsMatch && !categoryRelationMatch) {
          return false;
        }
      }
      
      // Category filter
      if (selectedCategory) {
        const category = categories.find(c => c.slug === selectedCategory);
        if (!category) return false;
        
        if (selectedSubcategory) {
          const subcategory = category.subcategories?.find(s => s.slug === selectedSubcategory);
          if (!subcategory) return false;
          const subcategoryMatch = p.subcategoryId === subcategory._id || (p.subcategoryIds && p.subcategoryIds.includes(subcategory._id));
          if (!subcategoryMatch) return false;
        } else {
          const isDirectCategoryMatch = p.categoryId === category._id || p.category === selectedCategory;
          const isSubcategoryMatch = category.subcategories?.some(sub => 
            p.subcategoryId === sub._id || (p.subcategoryIds && p.subcategoryIds.includes(sub._id))
          );
          
          if (!isDirectCategoryMatch && !isSubcategoryMatch) return false;
        }
      }
      
      // Dynamic filters - Handle different filter types
      for (const [filterId, filterValues] of Object.entries(selectedDynamicFilters)) {
        if (filterValues && filterValues.length > 0) {
          const productFilterList = productFilters[p._id] || [];
          const productFilter = productFilterList.find((pf: any) => pf.filterId === filterId);
          
          if (!productFilter) {
            return false; // Product doesn't have this filter at all
          }
          
          // Get filter type from allFiltersFromContext
          const filterType = allFiltersFromContext.find(f => f._id === filterId)?.type;
          
          if (filterType === 'range') {
            // Range filter: check if any product value falls within the selected range
            const minValue = parseFloat(filterValues[0]);
            const maxValue = parseFloat(filterValues[1]);
            
            const hasValueInRange = productFilter.values.some((value: string) => {
              const numValue = parseFloat(value);
              return !isNaN(numValue) && numValue >= minValue && numValue <= maxValue;
            });
            
            if (!hasValueInRange) {
              return false;
            }
          } else {
            // Multiselect filter: OR logic - product needs to have ANY of the selected values
            const hasAnyValue = filterValues.some((selectedValue: string) => 
              productFilter.values.includes(selectedValue)
            );
            
            if (!hasAnyValue) {
              return false;
            }
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
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            const productDate = new Date(p.createdAt || p.updatedAt);
            if (productDate < twoWeeksAgo) return false;
            break;
        }
      }
      
      // Additional filter checkboxes
      if (showTopSellers && !p.isTopSeller) return false;
      if (showSaleItems && !p.isOnSale) return false;
      if (showNewItems) {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const productDate = new Date(p.createdAt || p.updatedAt);
        if (productDate < twoWeeksAgo) return false;
      }
      if (showAvailableOnly && !isProductAvailable(p)) return false;
      
      return true;
    });
    
    
    const result = calculatePriceRange(productsWithoutPriceFilter);
    
    // Directly update priceRange if it's different and price filter hasn't been manually modified
    if (!isPriceFilterModified && (result.min !== priceRange.min || result.max !== priceRange.max)) {
  // debug removed
      setPriceRange(result);
    }
    
    return result;
  };

  // Helper to avoid invalid slider math and clamp percentages to [0,100]
  const toPercent = (value: number, min: number, max: number) => {
    const denom = max - min;
    if (denom <= 0) return 0;
    const pct = ((value - min) / denom) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  // Do not clamp user-selected priceRange when filters change; keep slider domain stable

  // Reset dynamic filters, search query, and price range when category changes
  useEffect(() => {
    setSelectedDynamicFilters({});
    // Clear search query when navigating to a category or to "all products"
    if (resolvedSearchParams.category) {
      setSearchQuery('');
      // Also clear search from URL to prevent it from persisting
      const url = new URL(window.location.href);
      url.searchParams.delete('search');
      window.history.replaceState({}, '', url.toString());
    } else if (!resolvedSearchParams.category && !resolvedSearchParams.search) {
      // Clear search when navigating to "all products" (no category, no search)
      setSearchQuery('');
    }
    
    // Reset filter states when category changes
    setShowTopSellers(false);
    setShowSaleItems(false);
    setShowNewItems(false);
    setShowAvailableOnly(false);
    
    // Reset cross-filters when category/brand changes
    setSelectedBrandFilters([]);
    setSelectedCategoryFilters([]);
    
    // Filters will be reloaded by the main useEffect hook
    setIsPriceFilterModified(false);
  }, [resolvedSearchParams.category, resolvedSearchParams.brand, resolvedSearchParams.search]);

  // Update price range when data is loaded or filters change
  useEffect(() => {
    if (allProducts.length > 0 && categories.length > 0 && !isPriceFilterModified) {
      const newPriceRange = calculateCurrentPriceRange();
  // debug removed
      setPriceRange(newPriceRange);
    }
  }, [allProducts, categories, selectedDynamicFilters, showTopSellers, showSaleItems, showNewItems, showAvailableOnly, isPriceFilterModified]);


  // Check if search query matches a category or subcategory name
  // Only consider it a category search if the query exactly matches a category name or slug
  const isCategorySearch = searchQuery.trim() && categories.some(cat => 
    cat.name.toLowerCase() === searchQuery.trim().toLowerCase() || 
    cat.slug.toLowerCase() === searchQuery.trim().toLowerCase() ||
    (cat.subcategories && cat.subcategories.some(sub => 
      sub.name.toLowerCase() === searchQuery.trim().toLowerCase() || 
      sub.slug.toLowerCase() === searchQuery.trim().toLowerCase()
    ))
  );

  // Get the correct product count for display
  let getDisplayProductCount = () => {
    if (isCategorySearch) {
      // For category search, we need to calculate the count after all filters
      // This will be updated after primaryProducts is calculated
      return 0; // Will be updated below
    }
    return filteredProducts.length;
  };

  // Filter products by category, subcategory, brand, and search query
  const filteredProducts = allProducts.filter((p: any) => {
    const selectedCategory = resolvedSearchParams.category;
    const selectedSubcategory = resolvedSearchParams.subcategory;
    const selectedBrand = resolvedSearchParams.brand;
    
    // Search filter - only apply if no category is selected and it's not a category search
    if (searchQuery.trim() && !selectedCategory && !isCategorySearch) {
      const query = searchQuery.trim();
      const titleMatch = flexibleSearchMatch(p.title, query);
      const descriptionMatch = p.description && flexibleSearchMatch(p.description, query);
      const categoryMatch = p.category && flexibleSearchMatch(p.category, query);
      const subcategoryMatch = p.subcategory && flexibleSearchMatch(p.subcategory, query);
      const tagsMatch = p.tags && p.tags.some((tag: string) => flexibleSearchMatch(tag, query));

      // Also treat products as matched if the query matches a category/subcategory name
      // and this product belongs to that category/subcategory via IDs
      let categoryRelationMatch = false;
      try {
        // Find any categories whose name/slug matches the query
        const matchingCats = categories.filter(c =>
          flexibleSearchMatch(c.name, query) || flexibleSearchMatch(c.slug, query)
        );
        // Find any subcategories whose name/slug matches the query
        const matchingSubIds: string[] = [];
        const matchingParentIds: string[] = [];
        categories.forEach(c => {
          (c.subcategories || []).forEach(sub => {
            if (flexibleSearchMatch(sub.name, query) || flexibleSearchMatch(sub.slug, query)) {
              matchingSubIds.push(String(sub._id));
              matchingParentIds.push(String(c._id));
            }
          });
        });

        // Check direct category match
        if (matchingCats.length > 0) {
          categoryRelationMatch = matchingCats.some(c => String(p.categoryId) === String(c._id))
            || (matchingCats.some(c => (c.subcategories || []).some(sub =>
                  String(p.subcategoryId) === String(sub._id) || (p.subcategoryIds && p.subcategoryIds.includes(String(sub._id)))
                )));
        }
        // Check subcategory match (via IDs or membership in any matching subcategories)
        if (!categoryRelationMatch && (matchingSubIds.length > 0 || matchingParentIds.length > 0)) {
          categoryRelationMatch = matchingSubIds.includes(String(p.subcategoryId))
            || (p.subcategoryIds && p.subcategoryIds.some((sid: any) => matchingSubIds.includes(String(sid))))
            || matchingParentIds.includes(String(p.categoryId));
        }
      } catch {}

      // If none of the fields match and no category relation match, exclude product
      if (!titleMatch && !descriptionMatch && !categoryMatch && !subcategoryMatch && !tagsMatch && !categoryRelationMatch) {
        return false;
      }
    }
    
    // Price filter (apply only when user modified the range)
    if (isPriceFilterModified) {
      const effectivePrice = getEffectivePrice(p);
      if (effectivePrice < priceRange.min || effectivePrice > priceRange.max) {
        return false;
      }
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
    
    // Brand filter
    if (selectedBrand) {
      // Check if product has this brand slug in brand field
      const hasBrand = p.brand === selectedBrand || 
                      p.brandId === selectedBrand ||
                      p.tags?.includes(selectedBrand);
      
      // Debug logging
      if (selectedBrand === 'red-dragon') {
        console.log('Brand filter debug:', {
          productTitle: p.title,
          productBrand: p.brand,
          productBrandId: p.brandId,
          productTags: p.tags,
          selectedBrand,
          hasBrand
        });
      }
      
      if (!hasBrand) return false;
    }
    
    // Cross-filtering: Additional brand filters when on category page
    if (selectedBrandFilters.length > 0) {
      const matchesAnyBrand = selectedBrandFilters.some(brandSlug => 
        p.brand === brandSlug || 
        p.brandId === brandSlug ||
        p.tags?.includes(brandSlug)
      );
      if (!matchesAnyBrand) return false;
    }
    
    // Cross-filtering: Additional category filters when on brand page
    if (selectedCategoryFilters.length > 0) {
      const matchesAnyCategory = selectedCategoryFilters.some(categorySlug => {
        const category = categories.find(c => c.slug === categorySlug);
        if (!category) return false;
        
        // Check direct category match
        const isDirectCategoryMatch = p.categoryId === category._id || p.category === categorySlug;
        
        // Check subcategory match
        const isSubcategoryMatch = category.subcategories?.some(sub => 
          p.subcategoryId === sub._id || (p.subcategoryIds && p.subcategoryIds.includes(sub._id))
        );
        
        return isDirectCategoryMatch || isSubcategoryMatch;
      });
      if (!matchesAnyCategory) return false;
    }
    
    // Dynamic filters - Handle different filter types
    for (const [filterId, filterValues] of Object.entries(selectedDynamicFilters)) {
      if (filterValues && filterValues.length > 0) {
        const productFilterList = productFilters[p._id] || [];
        const productFilter = productFilterList.find((pf: any) => pf.filterId === filterId);
        
        if (!productFilter) {
          return false; // Product doesn't have this filter at all
        }
        
        // Get filter type from allFiltersFromContext
        const filterType = allFiltersFromContext.find(f => f._id === filterId)?.type;
        
        if (filterType === 'range') {
          // Range filter: check if any product value falls within the selected range
          const minValue = parseFloat(filterValues[0]);
          const maxValue = parseFloat(filterValues[1]);
          
          const hasValueInRange = productFilter.values.some((value: string) => {
            const numValue = parseFloat(value);
            return !isNaN(numValue) && numValue >= minValue && numValue <= maxValue;
          });
          
          if (!hasValueInRange) {
            return false;
          }
        } else {
          // Multiselect filter: OR logic - product needs to have ANY of the selected values
          const hasAnyValue = filterValues.some((selectedValue: string) => 
            productFilter.values.includes(selectedValue)
          );
          
          if (!hasAnyValue) {
            return false;
          }
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
    
    // Additional filter checkboxes
    if (showTopSellers && !p.isTopSeller) return false;
    if (showSaleItems && !p.isOnSale) return false;
    if (showNewItems) {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const productDate = new Date(p.createdAt || p.updatedAt);
      if (productDate < twoWeeksAgo) return false;
    }
    if (showAvailableOnly && !isProductAvailable(p)) return false;
    
    return true;
  });


  // Reset initial view snapshot when category or subcategory changes
  useEffect(() => {
    setInitialViewProducts([]);
  }, [resolvedSearchParams.category, resolvedSearchParams.subcategory]);

  // Take a one-time snapshot of the product set for the current view
  useEffect(() => {
    if (initialViewProducts.length === 0 && filteredProducts.length > 0) {
      setInitialViewProducts(filteredProducts);
    }
  }, [filteredProducts, initialViewProducts.length]);

  // Handle scroll to hide breadcrumb behind search bar on mobile
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      // Hide breadcrumb when scrolled more than 20px
      setIsScrolled(scrollTop > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Helper to count products for standard filters with current selections, based on initial snapshot
  const getStandardFilterCount = (type: 'topseller' | 'sale' | 'new' | 'available') => {
    const base = initialViewProducts.length > 0 ? initialViewProducts : allProducts;
    return base.filter((p: any) => {
      // Price filter
      const effectivePrice = getEffectivePrice(p);
      if (effectivePrice < priceRange.min || effectivePrice > priceRange.max) {
        return false;
      }

      // Dynamic filters
      for (const [filterId, filterValues] of Object.entries(selectedDynamicFilters)) {
        if (filterValues && filterValues.length > 0) {
          const productFilterList = productFilters[p._id] || [];
          const productFilter = productFilterList.find((pf: any) => pf.filterId === filterId);
          if (!productFilter) return false;

          const filterType = allFiltersFromContext.find(f => f._id === filterId)?.type;
          if (filterType === 'range') {
            const minValue = parseFloat(filterValues[0]);
            const maxValue = parseFloat(filterValues[1]);
            const hasValueInRange = productFilter.values.some((value: string) => {
              const numValue = parseFloat(value);
              return !isNaN(numValue) && numValue >= minValue && numValue <= maxValue;
            });
            if (!hasValueInRange) return false;
          } else {
            const hasAnyValue = filterValues.some((selectedValue: string) => 
              productFilter.values.includes(selectedValue)
            );
            if (!hasAnyValue) return false;
          }
        }
      }

      // Special filter from URL
      const special = resolvedSearchParams.filter;
      if (special) {
        switch (special) {
          case 'topseller':
            if (!p.isTopSeller) return false;
            break;
          case 'sale':
            if (!p.isOnSale) return false;
            break;
          case 'neu':
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            const productDate = new Date(p.createdAt || p.updatedAt);
            if (productDate < twoWeeksAgo) return false;
            break;
        }
      }

      // Apply other standard toggles except the current one being counted
      if (type !== 'topseller' && showTopSellers && !p.isTopSeller) return false;
      if (type !== 'sale' && showSaleItems && !p.isOnSale) return false;
      if (type !== 'new' && showNewItems) {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const productDate = new Date(p.createdAt || p.updatedAt);
        if (productDate < twoWeeksAgo) return false;
      }
      if (type !== 'available' && showAvailableOnly && !isProductAvailable(p)) return false;

      // Finally, require the attribute for the counted type
      if (type === 'topseller' && !p.isTopSeller) return false;
      if (type === 'sale' && !p.isOnSale) return false;
      if (type === 'new') {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const productDate = new Date(p.createdAt || p.updatedAt);
        if (productDate < twoWeeksAgo) return false;
      }
      if (type === 'available' && !isProductAvailable(p)) return false;

      return true;
    }).length;
  };

  // Separate products into primary matches for search
  let primaryProducts: any[] = [];
  
  if (searchQuery.trim() && !resolvedSearchParams.category && !isCategorySearch) {
    // Generic search: use all filtered products (API already scoped results)
    primaryProducts = filteredProducts;
  } else if (isCategorySearch) {
    // If it's a category search, show all products from that category
    const matchingCategory = categories.find(cat => 
      flexibleSearchMatch(cat.name, searchQuery.trim()) || 
      flexibleSearchMatch(cat.slug, searchQuery.trim())
    );
    
    // Also check if any subcategory matches
    const matchingSubcategoryParent = categories.find(cat => 
      cat.subcategories && cat.subcategories.some(sub => 
        flexibleSearchMatch(sub.name, searchQuery.trim()) || 
        flexibleSearchMatch(sub.slug, searchQuery.trim())
      )
    );
    
    if (matchingCategory) {
      
      // First filter by category
      const categoryProducts = allProducts.filter((p: any) => {
        const matches = p.categoryId === matchingCategory._id || 
               flexibleSearchMatch(p.category, matchingCategory.name) ||
               flexibleSearchMatch(p.category, matchingCategory.slug) ||
               (matchingCategory.subcategories && matchingCategory.subcategories.some(sub => 
                 p.subcategoryId === sub._id || 
                 (p.subcategoryIds && p.subcategoryIds.includes(sub._id)) ||
                 flexibleSearchMatch(p.subcategory, sub.name) ||
                 flexibleSearchMatch(p.subcategory, sub.slug)
               ));
        
        
        return matches;
      });
      
      
      // Then apply the same filters as filteredProducts (price, dynamic filters, etc.)
      primaryProducts = categoryProducts.filter((p: any) => {
        const selectedCategory = resolvedSearchParams.category;
        const selectedSubcategory = resolvedSearchParams.subcategory;
        
        // Price filter
        const effectivePrice = getEffectivePrice(p);
        if (effectivePrice < priceRange.min || effectivePrice > priceRange.max) {
          return false;
        }
        
        // Brand filter
        if (resolvedSearchParams.brand) {
          // Check if product has this brand slug in brand field
          if (p.brand !== resolvedSearchParams.brand && !p.brands?.includes(resolvedSearchParams.brand)) {
            return false;
          }
        }
        
        // Category and subcategory filters (should not apply here as we're in category search)
        // Dynamic filters - Handle different filter types
        for (const [filterId, filterValues] of Object.entries(selectedDynamicFilters)) {
          if (filterValues && filterValues.length > 0) {
            const productFilterList = productFilters[p._id] || [];
            const productFilter = productFilterList.find((pf: any) => pf.filterId === filterId);
            
            if (!productFilter) {
              return false; // Product doesn't have this filter at all
            }
            
            // Get filter type from allFiltersFromContext
            const filterType = allFiltersFromContext.find(f => f._id === filterId)?.type;
            
            if (filterType === 'range') {
              // Range filter: check if any product value falls within the selected range
              const minValue = parseFloat(filterValues[0]);
              const maxValue = parseFloat(filterValues[1]);
              
              const hasValueInRange = productFilter.values.some((value: string) => {
                const numValue = parseFloat(value);
                return !isNaN(numValue) && numValue >= minValue && numValue <= maxValue;
              });
              
              if (!hasValueInRange) {
                return false;
              }
            } else {
              // Multiselect filter: OR logic - product needs to have ANY of the selected values
              const hasAnyValue = filterValues.some((selectedValue: string) => 
                productFilter.values.includes(selectedValue)
              );
              
              if (!hasAnyValue) {
                return false;
              }
            }
          }
        }
        
        // Top seller filter
        if (showTopSellers && !p.isTopSeller) {
          return false;
        }
        
        // Sale filter
        if (showSaleItems && !p.isOnSale) {
          return false;
        }
        
        // New items filter
        if (showNewItems) {
          const productDate = new Date(p.createdAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (productDate < thirtyDaysAgo) {
            return false;
          }
        }
        
        // Available only filter
        if (showAvailableOnly && (!p.inStock || p.stockQuantity <= 0)) {
          return false;
        }
        
        return true;
      });
      
    } else if (matchingSubcategoryParent) {
      
      // First filter by parent category that has matching subcategory
      const categoryProducts = allProducts.filter((p: any) => {
        const matches = p.categoryId === matchingSubcategoryParent._id || 
               flexibleSearchMatch(p.category, matchingSubcategoryParent.name) ||
               flexibleSearchMatch(p.category, matchingSubcategoryParent.slug) ||
               (matchingSubcategoryParent.subcategories && matchingSubcategoryParent.subcategories.some(sub => 
                 (flexibleSearchMatch(sub.name, searchQuery.trim()) || flexibleSearchMatch(sub.slug, searchQuery.trim())) &&
                 (p.subcategoryId === sub._id || 
                  (p.subcategoryIds && p.subcategoryIds.includes(sub._id)) ||
                  flexibleSearchMatch(p.subcategory, sub.name) ||
                  flexibleSearchMatch(p.subcategory, sub.slug))
               ));
        
        
        return matches;
      });
      
      
      // Then apply the same filters as filteredProducts (price, dynamic filters, etc.)
      primaryProducts = categoryProducts.filter((p: any) => {
        const selectedCategory = resolvedSearchParams.category;
        const selectedSubcategory = resolvedSearchParams.subcategory;
        
        // Price filter
        const effectivePrice = getEffectivePrice(p);
        if (effectivePrice < priceRange.min || effectivePrice > priceRange.max) {
          return false;
        }
        
        // Category filter (should already be applied, but keep for consistency)
        if (selectedCategory) {
          const category = categories.find(c => c.slug === selectedCategory);
          if (!category) return false;
          
          if (selectedSubcategory) {
            const subcategory = category.subcategories?.find(s => s.slug === selectedSubcategory);
            if (!subcategory) return false;
            const subcategoryMatch = p.subcategoryId === subcategory._id || (p.subcategoryIds && p.subcategoryIds.includes(subcategory._id));
            if (!subcategoryMatch) return false;
          } else {
            const isDirectCategoryMatch = p.categoryId === category._id || p.category === selectedCategory;
            const isSubcategoryMatch = category.subcategories?.some(sub => 
              p.subcategoryId === sub._id || (p.subcategoryIds && p.subcategoryIds.includes(sub._id))
            );
            const belongsToCategory = isDirectCategoryMatch || isSubcategoryMatch;
            if (!belongsToCategory) return false;
          }
        }
        
        
        // Dynamic filters - Handle different filter types
        for (const [filterId, filterValues] of Object.entries(selectedDynamicFilters)) {
          if (filterValues && filterValues.length > 0) {
            const productFilterList = productFilters[p._id] || [];
            const productFilter = productFilterList.find((pf: any) => pf.filterId === filterId);
            
            if (!productFilter) {
              return false; // Product doesn't have this filter at all
            }
            
            // Get filter type from allFiltersFromContext
            const filterType = allFiltersFromContext.find(f => f._id === filterId)?.type;
            
            if (filterType === 'range') {
              // Range filter: check if any product value falls within the selected range
              const minValue = parseFloat(filterValues[0]);
              const maxValue = parseFloat(filterValues[1]);
              
              const hasValueInRange = productFilter.values.some((value: string) => {
                const numValue = parseFloat(value);
                return !isNaN(numValue) && numValue >= minValue && numValue <= maxValue;
              });
              
              if (!hasValueInRange) {
                return false;
              }
            } else {
              // Multiselect filter: OR logic - product needs to have ANY of the selected values
              const hasAnyValue = filterValues.some((selectedValue: string) => 
                productFilter.values.includes(selectedValue)
              );
              
              if (!hasAnyValue) {
                return false;
              }
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
      
    } else {
      primaryProducts = filteredProducts;
    }
  } else {
    // If no search query or category is selected, all filtered products are primary
    primaryProducts = filteredProducts;
  }

  // Update display count for category search
  if (isCategorySearch) {
    getDisplayProductCount = () => primaryProducts.length;
  }

  // Sort products based on selected sort option
  const sortedPrimaryProducts = [...primaryProducts].sort((a: any, b: any) => {
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

  // Pagination logic
  const totalProducts = sortedPrimaryProducts.length;
  const totalPages = Math.ceil(totalProducts / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const paginatedProducts = sortedPrimaryProducts.slice(startIndex, endIndex);
  
  

  // Calculate display values for pagination text
  const displayStart = startIndex + 1;
  const displayEnd = Math.min(endIndex, totalProducts);

  // Reset to first page when products per page changes
  const handleProductsPerPageChange = (newProductsPerPage: number) => {
    setProductsPerPage(newProductsPerPage);
    setCurrentPage(1);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [resolvedSearchParams.category, resolvedSearchParams.brand, showTopSellers, showSaleItems, showNewItems, searchQuery, priceRange, selectedDynamicFilters, selectedBrandFilters, selectedCategoryFilters]);

  // Smooth scroll to top when page changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [currentPage]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto pl-3 pr-2 sm:px-4 py-10">
        {/* Skeleton grid while initial data loads (no blocking text) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-100 rounded-lg" />
              <div className="mt-3 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const products = [...sortedPrimaryProducts];

  // Extract top sellers for display at the top (only if search allows them)
  const allTopSellers = allProducts.filter((p: any) => {
    if (!(p.isTopSeller || false)) return false;
    
    // Search filter for top sellers
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      const titleMatch = flexibleSearchMatch(p.title, query);
      const descriptionMatch = p.description && flexibleSearchMatch(p.description, query);
      const categoryMatch = p.category && flexibleSearchMatch(p.category, query);
      const subcategoryMatch = p.subcategory && flexibleSearchMatch(p.subcategory, query);
      const brandMatch = p.brand && flexibleSearchMatch(p.brand, query);
      const tagsMatch = p.tags && p.tags.some((tag: string) => flexibleSearchMatch(tag, query));
      
      if (!titleMatch && !descriptionMatch && !categoryMatch && !subcategoryMatch && !brandMatch && !tagsMatch) {
        return false;
      }
    }
    
    return true;
  });
  

  return (
    <>

      {/* Fixed Mobile Breadcrumb - direkt unter der Suchleiste, verschwindet beim Scrollen */}
      <div className={`fixed top-32 left-0 right-0 z-30 bg-white border-a border-gray-200 md:hidden transition-transform duration-250 ${
        isScrolled ? '-translate-y-full' : 'translate-y-0'
      }`}>
        <Breadcrumb />
      </div>

      {/* Desktop Breadcrumb - normal position */}
      <div className="hidden md:block">
        <Breadcrumb />
      </div>

      
      <div className="max-w-7xl mx-auto px-px py-10 pt-10 md:pt-10 md:px-4">
        {/* Search Results Info - only show if there are products or if we're not in a category */}
      {searchQuery && (filteredProducts.length > 0 || !resolvedSearchParams.category) && (
        <div className="mb-6 px-4 md:px-0">
          <div className="max-w-md mx-auto xl:mx-0">
            <p className="text-sm text-gray-600">
              {getDisplayProductCount()} Produkt{getDisplayProductCount() !== 1 ? 'e' : ''} gefunden für "<span className="font-medium">{searchQuery}</span>"
            </p>
          </div>
        </div>
      )}


      {/* Offcanvas Filter Overlay for Mobile */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay background */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowMobileFilters(false)}></div>
          {/* Offcanvas panel - slides in from left */}
          <div className="relative bg-white w-11/12 max-w-xs h-full shadow-xl p-4 overflow-y-auto animate-slideInLeft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Filter</h2>
              <button onClick={() => setShowMobileFilters(false)} className="text-gray-500 hover:text-gray-700 focus:outline-none">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* All filter content */}
            <div className="space-y-2">
              {/* Price Filter */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Preis</h2>
                    {isPriceFilterModified && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                        {(priceRange.min / 100).toFixed(0)} € - {(priceRange.max / 100).toFixed(0)} €
                      </span>
                    )}
                  </div>
                  {isPriceFilterModified && (
                    <button
                      onClick={() => {
                        const range = calculateCurrentPriceRange();
                        setPriceRange(range);
                        setIsPriceFilterModified(false);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      Filter zurücksetzen
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="space-y-3">
                    {/* Range Slider Container */}
                    <div className="relative">
                      <div className="relative h-2 bg-gray-200 rounded-lg mx-2" style={{ touchAction: 'none' }}>
                        {/* Active range track */}
                      <div 
                          className="absolute h-2 bg-blue-500 rounded-lg"
                          style={{
                          left: `${toPercent(priceRange.min, calculateCurrentPriceRange().min, calculateCurrentPriceRange().max)}%`,
                          width: `${toPercent(priceRange.max, calculateCurrentPriceRange().min, calculateCurrentPriceRange().max) - toPercent(priceRange.min, calculateCurrentPriceRange().min, calculateCurrentPriceRange().max)}%`
                          }}
                        />
                        
                        {/* Min thumb */}
                        <div
                          className="absolute w-4 h-4 bg-blue-500 rounded-full cursor-pointer transform -translate-y-1 -translate-x-2 hover:scale-110 transition-transform"
                          style={{
                            left: `${toPercent(priceRange.min, calculateCurrentPriceRange().min, calculateCurrentPriceRange().max)}%`,
                            zIndex: 10,
                            touchAction: 'none'
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const currentRange = calculateCurrentPriceRange();
                            const minPrice = currentRange.min;
                            const maxPrice = currentRange.max;
                            const range = maxPrice - minPrice;
                            const sliderElement = (e.target as Element).closest('.relative');
                            if (!sliderElement) return;
                            
                            const handleMouseMove = (e: MouseEvent) => {
                              const rect = sliderElement.getBoundingClientRect();
                              
                              // Calculate position as percentage of slider width
                              const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                              const newValue = minPrice + (percent / 100) * range;
                              const clampedValue = Math.max(minPrice, Math.min(priceRange.max - 100, Math.round(newValue)));
                              
                              // Check if values are back to original range - if so, remove filter
                              if (clampedValue === minPrice && priceRange.max === maxPrice) {
                                const originalRange = calculateCurrentPriceRange();
                                setPriceRange(originalRange);
                                setIsPriceFilterModified(false);
                              } else {
                                setPriceRange(prev => ({
                                  ...prev,
                                  min: clampedValue
                                }));
                                setIsPriceFilterModified(true);
                              }
                            };
                            
                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                            };
                            
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            const currentRange = calculateCurrentPriceRange();
                            const minPrice = currentRange.min;
                            const maxPrice = currentRange.max;
                            const range = maxPrice - minPrice;
                            const sliderElement = (e.target as Element).closest('.relative');
                            if (!sliderElement) return;
                            
                            const handleTouchMove = (e: TouchEvent) => {
                              if (e.touches.length === 0) return;
                              const rect = sliderElement.getBoundingClientRect();
                              
                              // Calculate position as percentage of slider width
                              const percent = Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100));
                              const newValue = minPrice + (percent / 100) * range;
                              const clampedValue = Math.max(minPrice, Math.min(priceRange.max - 100, Math.round(newValue)));
                              
                              // Check if values are back to original range - if so, remove filter
                              if (clampedValue === minPrice && priceRange.max === maxPrice) {
                                const originalRange = calculateCurrentPriceRange();
                                setPriceRange(originalRange);
                                setIsPriceFilterModified(false);
                              } else {
                                setPriceRange(prev => ({
                                  ...prev,
                                  min: clampedValue
                                }));
                                setIsPriceFilterModified(true);
                              }
                            };
                            
                            const handleTouchEnd = () => {
                              document.removeEventListener('touchmove', handleTouchMove);
                              document.removeEventListener('touchend', handleTouchEnd);
                            };
                            
                            document.addEventListener('touchmove', handleTouchMove);
                            document.addEventListener('touchend', handleTouchEnd);
                          }}
                        />
                        
                        {/* Max thumb */}
                        <div
                          className="absolute w-4 h-4 bg-blue-500 rounded-full cursor-pointer transform -translate-y-1 -translate-x-2 hover:scale-110 transition-transform"
                          style={{
                            left: `${toPercent(priceRange.max, calculateCurrentPriceRange().min, calculateCurrentPriceRange().max)}%`,
                            zIndex: 10,
                            touchAction: 'none'
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const currentRange = calculateCurrentPriceRange();
                            const minPrice = currentRange.min;
                            const maxPrice = currentRange.max;
                            const range = maxPrice - minPrice;
                            const sliderElement = (e.target as Element).closest('.relative');
                            if (!sliderElement) return;
                            
                            const handleMouseMove = (e: MouseEvent) => {
                              const rect = sliderElement.getBoundingClientRect();
                              
                              // Calculate position as percentage of slider width
                              const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                              const newValue = minPrice + (percent / 100) * range;
                              const clampedValue = Math.max(priceRange.min + 100, Math.min(maxPrice, Math.round(newValue)));
                              
                              // Check if values are back to original range - if so, remove filter
                              if (priceRange.min === minPrice && clampedValue === maxPrice) {
                                const originalRange = calculateCurrentPriceRange();
                                setPriceRange(originalRange);
                                setIsPriceFilterModified(false);
                              } else {
                                setPriceRange(prev => ({
                                  ...prev,
                                  max: clampedValue
                                }));
                                setIsPriceFilterModified(true);
                              }
                            };
                            
                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                            };
                            
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            const currentRange = calculateCurrentPriceRange();
                            const minPrice = currentRange.min;
                            const maxPrice = currentRange.max;
                            const range = maxPrice - minPrice;
                            const sliderElement = (e.target as Element).closest('.relative');
                            if (!sliderElement) return;
                            
                            const handleTouchMove = (e: TouchEvent) => {
                              if (e.touches.length === 0) return;
                              const rect = sliderElement.getBoundingClientRect();
                              
                              // Calculate position as percentage of slider width
                              const percent = Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100));
                              const newValue = minPrice + (percent / 100) * range;
                              const clampedValue = Math.max(priceRange.min + 100, Math.min(maxPrice, Math.round(newValue)));
                              
                              // Check if values are back to original range - if so, remove filter
                              if (priceRange.min === minPrice && clampedValue === maxPrice) {
                                const originalRange = calculateCurrentPriceRange();
                                setPriceRange(originalRange);
                                setIsPriceFilterModified(false);
                              } else {
                                setPriceRange(prev => ({
                                  ...prev,
                                  max: clampedValue
                                }));
                                setIsPriceFilterModified(true);
                              }
                            };
                            
                            const handleTouchEnd = () => {
                              document.removeEventListener('touchmove', handleTouchMove);
                              document.removeEventListener('touchend', handleTouchEnd);
                            };
                            
                            document.addEventListener('touchmove', handleTouchMove);
                            document.addEventListener('touchend', handleTouchEnd);
                          }}
                        />
                      </div>
                      
                      {/* Min/Max labels (show domain min/max under thumbs) */}
                      <div className="flex justify-between text-xs text-gray-500 mt-2 mx-2">
                        <span>{(calculateCurrentPriceRange().min / 100).toFixed(0)} €</span>
                        <span>{(calculateCurrentPriceRange().max / 100).toFixed(0)} €</span>
                      </div>
                    </div>
                    
                  </div>
                  
                  {/* Trennstrich */}
                  <div className="border-b border-gray-200 mt-2"></div>
                </div>
              </div>
              
              {/* Brand Filter - Show when on category page AND brands are available */}
              {resolvedSearchParams.category && (() => {
                const availableBrands = getAvailableBrandsForCategory(resolvedSearchParams.category);
                if (availableBrands.length === 0) return null;
                
                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-semibold">Marke</h2>
                      {selectedBrandFilters.length > 0 && (
                        <button
                          onClick={() => setSelectedBrandFilters([])}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                        >
                          Filter zurücksetzen
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {availableBrands.map((brand) => (
                        <label key={brand._id} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedBrandFilters.includes(brand.slug)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBrandFilters(prev => [...prev, brand.slug]);
                              } else {
                                setSelectedBrandFilters(prev => prev.filter(slug => slug !== brand.slug));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {brand.name}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="border-b border-gray-200 mt-2"></div>
                  </div>
                );
              })()}

              {/* Category Filter - Show when on brand page AND categories are available */}
              {resolvedSearchParams.brand && (() => {
                const availableCategories = getAvailableCategoriesForBrand(resolvedSearchParams.brand);
                if (availableCategories.length === 0) return null;
                
                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-semibold">Kategorie</h2>
                      {selectedCategoryFilters.length > 0 && (
                        <button
                          onClick={() => setSelectedCategoryFilters([])}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                        >
                          Filter zurücksetzen
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {availableCategories.map((category) => (
                        <label key={category._id} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategoryFilters.includes(category.slug)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategoryFilters(prev => [...prev, category.slug]);
                              } else {
                                setSelectedCategoryFilters(prev => prev.filter(slug => slug !== category.slug));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {category.name}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="border-b border-gray-200 mt-2"></div>
                  </div>
                );
              })()}

              {/* Dynamic Filters - Only show if there are products for this brand */}
              {(() => {
                // For brand pages: only show if there are products from this brand
                if (resolvedSearchParams.brand) {
                  const brandProducts = allProducts.filter((p: any) => 
                    p.brand === resolvedSearchParams.brand || 
                    p.brandId === resolvedSearchParams.brand ||
                    p.tags?.includes(resolvedSearchParams.brand)
                  );
                  
                  // If no products for this brand, don't show dynamic filters
                  if (brandProducts.length === 0) {
                    return null;
                  }
                  
                  return (
                    <DynamicFilters
                      categoryId={undefined}
                      selectedFilters={selectedDynamicFilters}
                      onFilterChange={(filterId, values) => {
                        setSelectedDynamicFilters(prev => ({
                          ...prev,
                          [filterId]: values
                        }));
                      }}
                      productFilters={productFilters}
                      allProducts={allProducts}
                      currentCategoryProducts={brandProducts}
                      priceRange={priceRange}
                      showTopSellers={showTopSellers}
                      showSaleItems={showSaleItems}
                      showNewItems={showNewItems}
                      showAvailableOnly={showAvailableOnly}
                      specialFilter={resolvedSearchParams.filter}
                    />
                  );
                }
                
                // For category pages: only show if there are products in this category
                if (resolvedSearchParams.category) {
                  if (filteredProducts.length === 0) {
                    return null; // Hide DynamicFilters if no products in category
                  }
                  
                  return (
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
                      priceRange={priceRange}
                      showTopSellers={showTopSellers}
                      showSaleItems={showSaleItems}
                      showNewItems={showNewItems}
                      showAvailableOnly={showAvailableOnly}
                      specialFilter={resolvedSearchParams.filter}
                    />
                  );
                }
                
                // For other pages: show normally
                return (
                  <DynamicFilters
                    categoryId={undefined}
                    selectedFilters={selectedDynamicFilters}
                    onFilterChange={(filterId, values) => {
                      setSelectedDynamicFilters(prev => ({
                        ...prev,
                        [filterId]: values
                      }));
                    }}
                    productFilters={productFilters}
                    allProducts={allProducts}
                    currentCategoryProducts={allProducts}
                    priceRange={priceRange}
                    showTopSellers={showTopSellers}
                    showSaleItems={showSaleItems}
                    showNewItems={showNewItems}
                    showAvailableOnly={showAvailableOnly}
                    specialFilter={resolvedSearchParams.filter}
                  />
                );
              })()}
              
              {/* Highlights Filter */}
              {(initialViewProducts.some(p => p.isTopSeller) || 
                initialViewProducts.some(p => p.isOnSale) || 
                initialViewProducts.some(p => {
                  const twoWeeksAgo = new Date();
                  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                  const productDate = new Date(p.createdAt || p.updatedAt);
                  return productDate >= twoWeeksAgo;
                }) || 
                initialViewProducts.some(p => isProductAvailable(p))) && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">Highlights</h2>
                  {(showTopSellers || showSaleItems || showNewItems || showAvailableOnly) && (
                    <button
                      onClick={() => {
                        updateTopSellersFilter(false);
                        updateSaleFilter(false);
                        updateNewItemsFilter(false);
                        setShowAvailableOnly(false);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                    >
                      Filter zurücksetzen
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {/* Bestseller */}
                  {initialViewProducts.some(p => p.isTopSeller) && (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showTopSellers}
                        onChange={(e) => updateTopSellersFilter(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                        <span>Bestseller</span>
                      </span>
                    </label>
                  )}
                  
                  {/* Sale */}
                  {initialViewProducts.some(p => p.isOnSale) && (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showSaleItems}
                        onChange={(e) => updateSaleFilter(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                        <span>Im Angebot</span>
                      </span>
                    </label>
                  )}
                  
                  {/* New Items */}
                  {initialViewProducts.some(p => {
                    const twoWeeksAgo = new Date();
                    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                    const productDate = new Date(p.createdAt || p.updatedAt);
                    return productDate >= twoWeeksAgo;
                  }) && (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showNewItems}
                        onChange={(e) => updateNewItemsFilter(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                        <span>Neu (letzte 2 Wochen)</span>
                      </span>
                    </label>
                  )}
                  
                  {/* Verfügbar */}
                  {initialViewProducts.some(p => isProductAvailable(p)) && (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAvailableOnly}
                        onChange={(e) => setShowAvailableOnly(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                        <span>Auf Lager</span>
                      </span>
                    </label>
                  )}
                </div>
                
                {/* Trennstrich */}
                <div className="border-b border-gray-200 mt-2"></div>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Layout: Responsive Filters & Products */}
      <div className="flex flex-col md:flex-row">
        {/* Filterleiste: mobil als Overlay, ab md links */}
        <div className="hidden md:block w-full md:w-80 md:flex-shrink-0 md:pr-8 mb-6 md:mb-0">
          <div className="space-y-2">
            {/* Price Filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Preis</h2>
                  {isPriceFilterModified && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                      {(priceRange.min / 100).toFixed(0)} € - {(priceRange.max / 100).toFixed(0)} €
                    </span>
                  )}
                </div>
                {isPriceFilterModified && (
                  <button
                    onClick={() => {
                      const range = calculateCurrentPriceRange();
                      setPriceRange(range);
                      setIsPriceFilterModified(false);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
              <div className="space-y-2">
                
                <div className="space-y-2">
                  {/* Range Slider Container */}
                  <div className="relative">
                    <div className="relative h-2 bg-gray-200 rounded-lg mx-2">
                      {/* Active range track */}
                      <div 
                        className="absolute h-2 bg-blue-500 rounded-lg"
                        style={{
                          left: `${toPercent(priceRange.min, calculateCurrentPriceRange().min, calculateCurrentPriceRange().max)}%`,
                          width: `${toPercent(priceRange.max, calculateCurrentPriceRange().min, calculateCurrentPriceRange().max) - toPercent(priceRange.min, calculateCurrentPriceRange().min, calculateCurrentPriceRange().max)}%`
                        }}
                      />
                      
                      {/* Min thumb */}
                      <div
                        className="absolute w-4 h-4 bg-blue-500 rounded-full cursor-pointer transform -translate-y-1 -translate-x-2 hover:scale-110 transition-transform"
                        style={{
                          left: `${toPercent(priceRange.min, calculateCurrentPriceRange().min, calculateCurrentPriceRange().max)}%`,
                          zIndex: 10,
                          touchAction: 'none'
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const currentRange = calculateCurrentPriceRange();
                          const minPrice = currentRange.min;
                          const maxPrice = currentRange.max;
                          const range = maxPrice - minPrice;
                          const sliderElement = (e.target as Element).closest('.relative');
                          if (!sliderElement) return;
                          
                          const handleMouseMove = (e: MouseEvent) => {
                            const rect = sliderElement.getBoundingClientRect();
                            
                            // Calculate position as percentage of slider width
                            const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                            const newValue = minPrice + (percent / 100) * range;
                            const clampedValue = Math.max(minPrice, Math.min(priceRange.max - 100, Math.round(newValue)));
                            
                            // Check if values are back to original range - if so, remove filter
                            if (clampedValue === minPrice && priceRange.max === maxPrice) {
                              const originalRange = calculateCurrentPriceRange();
                              setPriceRange(originalRange);
                              setIsPriceFilterModified(false);
                            } else {
                              setPriceRange(prev => ({
                                ...prev,
                                min: clampedValue
                              }));
                              setIsPriceFilterModified(true);
                            }
                          };
                          
                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          const currentRange = calculateCurrentPriceRange();
                          const minPrice = currentRange.min;
                          const maxPrice = currentRange.max;
                          const range = maxPrice - minPrice;
                          const sliderElement = (e.target as Element).closest('.relative');
                          if (!sliderElement) return;
                          
                          const handleTouchMove = (e: TouchEvent) => {
                            if (e.touches.length === 0) return;
                            const rect = sliderElement.getBoundingClientRect();
                            
                            // Calculate position as percentage of slider width
                            const percent = Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100));
                            const newValue = minPrice + (percent / 100) * range;
                            const clampedValue = Math.max(minPrice, Math.min(priceRange.max - 100, Math.round(newValue)));
                            
                            // Check if values are back to original range - if so, remove filter
                            if (clampedValue === minPrice && priceRange.max === maxPrice) {
                              const originalRange = calculateCurrentPriceRange();
                              setPriceRange(originalRange);
                              setIsPriceFilterModified(false);
                            } else {
                              setPriceRange(prev => ({
                                ...prev,
                                min: clampedValue
                              }));
                              setIsPriceFilterModified(true);
                            }
                          };
                          
                          const handleTouchEnd = () => {
                            document.removeEventListener('touchmove', handleTouchMove);
                            document.removeEventListener('touchend', handleTouchEnd);
                          };
                          
                          document.addEventListener('touchmove', handleTouchMove);
                          document.addEventListener('touchend', handleTouchEnd);
                        }}
                      />
                      
                      {/* Max thumb */}
                      <div
                        className="absolute w-4 h-4 bg-blue-500 rounded-full cursor-pointer transform -translate-y-1 -translate-x-2 hover:scale-110 transition-transform"
                        style={{
                          left: `${toPercent(priceRange.max, calculateCurrentPriceRange().min, calculateCurrentPriceRange().max)}%`,
                          zIndex: 10,
                          touchAction: 'none'
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const currentRange = calculateCurrentPriceRange();
                          const minPrice = currentRange.min;
                          const maxPrice = currentRange.max;
                          const range = maxPrice - minPrice;
                          const sliderElement = (e.target as Element).closest('.relative');
                          if (!sliderElement) return;
                          
                          const handleMouseMove = (e: MouseEvent) => {
                            const rect = sliderElement.getBoundingClientRect();
                            
                            // Calculate position as percentage of slider width
                            const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                            const newValue = minPrice + (percent / 100) * range;
                            const clampedValue = Math.max(priceRange.min + 100, Math.min(maxPrice, Math.round(newValue)));
                            
                            // Check if values are back to original range - if so, remove filter
                            if (priceRange.min === minPrice && clampedValue === maxPrice) {
                              const originalRange = calculateCurrentPriceRange();
                              setPriceRange(originalRange);
                              setIsPriceFilterModified(false);
                            } else {
                              setPriceRange(prev => ({
                                ...prev,
                                max: clampedValue
                              }));
                              setIsPriceFilterModified(true);
                            }
                          };
                          
                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          const currentRange = calculateCurrentPriceRange();
                          const minPrice = currentRange.min;
                          const maxPrice = currentRange.max;
                          const range = maxPrice - minPrice;
                          const sliderElement = (e.target as Element).closest('.relative');
                          if (!sliderElement) return;
                          
                          const handleTouchMove = (e: TouchEvent) => {
                            if (e.touches.length === 0) return;
                            const rect = sliderElement.getBoundingClientRect();
                            
                            // Calculate position as percentage of slider width
                            const percent = Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100));
                            const newValue = minPrice + (percent / 100) * range;
                            const clampedValue = Math.max(priceRange.min + 100, Math.min(maxPrice, Math.round(newValue)));
                            
                            // Check if values are back to original range - if so, remove filter
                            if (priceRange.min === minPrice && clampedValue === maxPrice) {
                              const originalRange = calculateCurrentPriceRange();
                              setPriceRange(originalRange);
                              setIsPriceFilterModified(false);
                            } else {
                              setPriceRange(prev => ({
                                ...prev,
                                max: clampedValue
                              }));
                              setIsPriceFilterModified(true);
                            }
                          };
                          
                          const handleTouchEnd = () => {
                            document.removeEventListener('touchmove', handleTouchMove);
                            document.removeEventListener('touchend', handleTouchEnd);
                          };
                          
                          document.addEventListener('touchmove', handleTouchMove);
                          document.addEventListener('touchend', handleTouchEnd);
                        }}
                      />
                    </div>
                    
                    {/* Min/Max labels */}
                    <div className="flex justify-between text-xs text-gray-500 mt-2 mx-2">
                    <span>{(calculateCurrentPriceRange().min / 100).toFixed(0)} €</span>
                    <span>{(calculateCurrentPriceRange().max / 100).toFixed(0)} €</span>
                    </div>
                  </div>
                  
                </div>
                
                {/* Trennstrich */}
                <div className="border-b border-gray-200 mt-2"></div>
              </div>
            </div>
            
            {/* Brand Filter - Show when on category page AND brands are available */}
            {resolvedSearchParams.category && (() => {
              const availableBrands = getAvailableBrandsForCategory(resolvedSearchParams.category);
              if (availableBrands.length === 0) return null;
              
              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Marke</h2>
                    {selectedBrandFilters.length > 0 && (
                      <button
                        onClick={() => setSelectedBrandFilters([])}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                      >
                        Filter zurücksetzen
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {availableBrands.map((brand) => (
                      <label key={brand._id} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBrandFilters.includes(brand.slug)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBrandFilters(prev => [...prev, brand.slug]);
                            } else {
                              setSelectedBrandFilters(prev => prev.filter(slug => slug !== brand.slug));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {brand.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="border-b border-gray-200 mt-2"></div>
                </div>
              );
            })()}

            {/* Category Filter - Show when on brand page AND categories are available */}
            {resolvedSearchParams.brand && (() => {
              const availableCategories = getAvailableCategoriesForBrand(resolvedSearchParams.brand);
              if (availableCategories.length === 0) return null;
              
              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Kategorie</h2>
                    {selectedCategoryFilters.length > 0 && (
                      <button
                        onClick={() => setSelectedCategoryFilters([])}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                      >
                        Filter zurücksetzen
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {availableCategories.map((category) => (
                      <label key={category._id} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategoryFilters.includes(category.slug)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryFilters(prev => [...prev, category.slug]);
                            } else {
                              setSelectedCategoryFilters(prev => prev.filter(slug => slug !== category.slug));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {category.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="border-b border-gray-200 mt-2"></div>
                </div>
              );
            })()}

            {/* Dynamic Filters - Only show if there are products for this brand */}
            {(() => {
              // For brand pages: only show if there are products from this brand
              if (resolvedSearchParams.brand) {
                const brandProducts = allProducts.filter((p: any) => 
                  p.brand === resolvedSearchParams.brand || 
                  p.brandId === resolvedSearchParams.brand ||
                  p.tags?.includes(resolvedSearchParams.brand)
                );
                
                // If no products for this brand, don't show dynamic filters
                if (brandProducts.length === 0) {
                  return null;
                }
                
                return (
                  <DynamicFilters
                    categoryId={undefined}
                    selectedFilters={selectedDynamicFilters}
                    onFilterChange={(filterId, values) => {
                      setSelectedDynamicFilters(prev => ({
                        ...prev,
                        [filterId]: values
                      }));
                    }}
                    productFilters={productFilters}
                    allProducts={allProducts}
                    currentCategoryProducts={brandProducts}
                    priceRange={priceRange}
                    showTopSellers={showTopSellers}
                    showSaleItems={showSaleItems}
                    showNewItems={showNewItems}
                    showAvailableOnly={showAvailableOnly}
                    specialFilter={resolvedSearchParams.filter}
                  />
                );
              }
              
              // For category pages: only show if there are products in this category
              if (resolvedSearchParams.category) {
                if (filteredProducts.length === 0) {
                  return null; // Hide DynamicFilters if no products in category
                }
                
                return (
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
                    priceRange={priceRange}
                    showTopSellers={showTopSellers}
                    showSaleItems={showSaleItems}
                    showNewItems={showNewItems}
                    showAvailableOnly={showAvailableOnly}
                    specialFilter={resolvedSearchParams.filter}
                  />
                );
              }
              
              // For other pages: show normally
              return (
                <DynamicFilters
                  categoryId={undefined}
                  selectedFilters={selectedDynamicFilters}
                  onFilterChange={(filterId, values) => {
                    setSelectedDynamicFilters(prev => ({
                      ...prev,
                      [filterId]: values
                    }));
                  }}
                  productFilters={productFilters}
                  allProducts={allProducts}
                  currentCategoryProducts={allProducts}
                  priceRange={priceRange}
                  showTopSellers={showTopSellers}
                  showSaleItems={showSaleItems}
                  showNewItems={showNewItems}
                  showAvailableOnly={showAvailableOnly}
                  specialFilter={resolvedSearchParams.filter}
                />
              );
            })()}
            
            {/* Highlights Filter - stable visibility and count based on initial view snapshot */}
            {(initialViewProducts.some(p => p.isTopSeller) || 
              initialViewProducts.some(p => p.isOnSale) || 
              initialViewProducts.some(p => {
                const twoWeeksAgo = new Date();
                twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                const productDate = new Date(p.createdAt || p.updatedAt);
                return productDate >= twoWeeksAgo;
              }) || 
              initialViewProducts.some(p => isProductAvailable(p))) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Highlights</h2>
                {(showTopSellers || showSaleItems || showNewItems || showAvailableOnly) && (
                  <button
                    onClick={() => {
                      updateTopSellersFilter(false);
                      updateSaleFilter(false);
                      updateNewItemsFilter(false);
                      setShowAvailableOnly(false);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {/* Bestseller */}
                {initialViewProducts.some(p => p.isTopSeller) && (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTopSellers}
                      onChange={(e) => updateTopSellersFilter(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                      <span>Bestseller</span>
                    </span>
                  </label>
                )}
                
                {/* Sale */}
                {initialViewProducts.some(p => p.isOnSale) && (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSaleItems}
                      onChange={(e) => updateSaleFilter(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                      <span>Im Angebot</span>
                    </span>
                  </label>
                )}
                
                {/* New Items */}
                {initialViewProducts.some(p => {
                  const twoWeeksAgo = new Date();
                  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                  const productDate = new Date(p.createdAt || p.updatedAt);
                  return productDate >= twoWeeksAgo;
                }) && (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showNewItems}
                      onChange={(e) => updateNewItemsFilter(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                      <span>Neu (letzte 2 Wochen)</span>
                    </span>
                  </label>
                )}
                
                {/* Verfügbar */}
                {initialViewProducts.some(p => isProductAvailable(p)) && (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAvailableOnly}
                      onChange={(e) => setShowAvailableOnly(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                      <span>Auf Lager</span>
                    </span>
                  </label>
                )}
              </div>
              
            </div>
            )}
            
          </div>
        </div>

        {/* Trennstrich */}
        <div className="w-px bg-gray-200 flex-shrink-0"></div>

        {/* Right Side: Products */}
        <div className="flex-1 pl-0 md:pl-8">
          {/* Products Section */}
          <div className="min-h-[400px]">
        {/* Category Products */}
        <div className="h-full">
          <div className="flex flex-col mb-4 px-4 md:px-0">
            {/* Active Filter Buttons - separate row */}
            <div className="flex flex-wrap gap-2 mb-4">
                {/* Search Query Chip */}
                {searchQuery && (
                  <div className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-800 border border-gray-200">
                    <span className="mr-2">Suchergebnis: {searchQuery}</span>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setResolvedSearchParams(prev => ({ ...prev, search: undefined }));
                        if (typeof window !== 'undefined') {
                          const url = new URL(window.location.href);
                          url.searchParams.delete('search');
                          const newUrl = url.search ? `${url.pathname}${url.search}` : '/shop';
                          window.history.replaceState({}, '', newUrl);
                        }
                      }}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </div>
                )}
                {/* Dynamic Filter Buttons */}
                {Object.entries(selectedDynamicFilters).map(([filterId, values]) => {
                  if (!values || values.length === 0) return null;
                  
                  const filter = allFiltersFromContext.find(f => f._id === filterId);
                  if (!filter) return null;
                  
                  if (filter.type === 'range') {
                    // Range filter button
                    const minValue = parseFloat(values[0]);
                    const maxValue = parseFloat(values[1]);
                    return (
                      <div
                        key={`${filterId}-range`}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-800 border border-gray-200"
                      >
                        <span className="mr-2">{filter.name}: {minValue} - {maxValue}</span>
                        <button
                          onClick={() => {
                            setSelectedDynamicFilters(prev => {
                              const newFilters = { ...prev };
                              delete newFilters[filterId];
                              return newFilters;
                            });
                          }}
                          className="ml-1 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  } else {
                    // Multiselect and color filter buttons
                    return values.map((value) => {
                      const option = filter.options?.find((opt: any) => opt.value === value);
                      return (
                        <div
                          key={`${filterId}-${value}`}
                          className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-800 border border-gray-200"
                        >
                          <div className="flex items-center mr-2">
                            {filter.type === 'color' && option?.color ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{filter.name}:</span>
                                <div 
                                  className="w-3 h-3 rounded-full border border-gray-300"
                                  style={{ backgroundColor: option.color }}
                                />
                              </div>
                            ) : (
                              <span>{filter.name}: {option?.name || value}</span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              const newValues = values.filter(v => v !== value);
                              if (newValues.length === 0) {
                                // Remove filter completely if no values left
                                setSelectedDynamicFilters(prev => {
                                  const newFilters = { ...prev };
                                  delete newFilters[filterId];
                                  return newFilters;
                                });
                              } else {
                                // Update filter with remaining values
                                setSelectedDynamicFilters(prev => ({
                                  ...prev,
                                  [filterId]: newValues
                                }));
                              }
                            }}
                            className="ml-1 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    });
                  }
                })}
                
                {/* Price Range Filter Button */}
                {isPriceFilterModified && (
                  <div className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-800 border border-gray-200">
                    <span className="mr-2">Preis: {(priceRange.min / 100).toFixed(0)}€ - {(priceRange.max / 100).toFixed(0)}€</span>
                    <button
                      onClick={() => {
                        const range = calculateCurrentPriceRange();
                        setPriceRange(range);
                        setIsPriceFilterModified(false);
                      }}
                      className="ml-1 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {/* Bestseller Filter Button */}
                {showTopSellers && (
                  <div className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-800 border border-gray-200">
                    <span className="mr-2">Bestseller</span>
                    <button
                      onClick={() => updateTopSellersFilter(false)}
                      className="ml-1 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {/* Sale Filter Button */}
                {showSaleItems && (
                  <div className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-800 border border-gray-200">
                    <span className="mr-2">Sale</span>
                    <button
                      onClick={() => updateSaleFilter(false)}
                      className="ml-1 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {/* New Items Filter Button */}
                {showNewItems && (
                  <div className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-800 border border-gray-200">
                    <span className="mr-2">Neu</span>
                    <button
                      onClick={() => updateNewItemsFilter(false)}
                      className="ml-1 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {/* Verfügbar Filter Button */}
                {showAvailableOnly && (
                  <div className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-800 border border-gray-200">
                    <span className="mr-2">Verfügbar</span>
                    <button
                      onClick={() => setShowAvailableOnly(false)}
                      className="ml-1 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Filter Separator - always show */}
              <div className="border-b border-gray-200 mt-2"></div>
            </div>
            
            {/* Products Count and Dropdowns - always on same row */}
            <div className="flex flex-row items-center justify-between gap-2">
              {/* Products Count */}
              <div className="flex flex-col items-start sm:ml-0 ml-4">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-lg">{totalProducts}</span> Artikel
                </p>
                {resolvedSearchParams.category && (
                  <p className="text-sm text-blue-600 mt-1">
                    in Kategorie "{categories.find(c => c.slug === resolvedSearchParams.category)?.name || resolvedSearchParams.category}"
                  </p>
                )}
              </div>
              
              {/* Sort Dropdown and Products Per Page */}
              <div className="flex flex-row items-center gap-2 sm:mr-0 mr-4">
              {/* Products Per Page Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="products-per-page" className="text-sm text-gray-600">
                  Anzeigen:
                </label>
                <select
                  id="products-per-page"
                  value={productsPerPage}
                  onChange={(e) => handleProductsPerPageChange(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  style={{ backgroundImage: 'none' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              
              {/* Sort Dropdown */}
              <select
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
          </div>
          
          {/* Search Results Header */}
          {resolvedSearchParams.search && (
            <div className="mt-6 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Suchergebnisse für "{resolvedSearchParams.search}"
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {filteredProducts.length} Produkt{filteredProducts.length !== 1 ? 'e' : ''} gefunden
              </p>
            </div>
          )}
          
          {/* Spacing between controls and products */}
          <div className="mt-6"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-0 md:gap-y-6 pl-0 pr-0 md:pl-0 md:pr-4">
              {/* Primary Products */}
              {paginatedProducts.map((p: any) => {
                // Determine if this product should show as top seller
                let isTopSeller = false;
                
                // Always use global top seller status
                isTopSeller = p.isTopSeller || false;
              
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
                    // prefer API provided availability if present
                    // @ts-ignore
                    isAvailable: p.isAvailable !== undefined ? p.isAvailable : undefined,
                    stockQuantity: p.stockQuantity,
                    images: p.images || [],
                    imageSizes: (p.imageSizes || []).map((imgSize: any) => ({
                      main: imgSize.main,
                      thumb: imgSize.thumb,
                      small: imgSize.small
                    })),
                    tags: p.tags || [],
                    variations: p.variations || [],
                    reviews: p.reviews || { averageRating: 0, totalReviews: 0 }
                  }}
                />
              );
            })}
            
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Pagination Info */}
              <div className="text-sm text-gray-600">
                Zeige {displayStart} bis {displayEnd} von {totalProducts} Artikeln
              </div>
              
              {/* Pagination Buttons */}
              <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zurück
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>

    {/* Category Description Section */}
    {resolvedSearchParams.category && (
      <CategoryDescriptionSection 
        currentCategory={(() => {
          // Find main category
          const mainCategory = categories.find(c => c.slug === resolvedSearchParams.category);
          
          // If we have a subcategory, find it within the main category
          if (resolvedSearchParams.subcategory && mainCategory?.subcategories) {
            const subcategory = mainCategory.subcategories.find(sub => sub.slug === resolvedSearchParams.subcategory);
            if (subcategory) {
              // Return subcategory as the current category
              return subcategory;
            }
          }
          
          // Otherwise return main category
          return mainCategory || null;
        })() as any}
        currentBrand={null}
      />
    )}

    {/* Brand Description Section */}
    {resolvedSearchParams.brand && (
      <CategoryDescriptionSection 
        currentCategory={null}
        currentBrand={currentBrand}
      />
    )}

    {/* Mobile Filter Button - Fixed Bottom */}
    <div className="md:hidden fixed bottom-4 left-4 z-40">
      <button
        className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-blue-600 text-white font-semibold shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all transform hover:scale-105"
        onClick={() => setShowMobileFilters(true)}
        aria-label="Filter öffnen"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filter
      </button>
    </div>
    </>
  );
}

