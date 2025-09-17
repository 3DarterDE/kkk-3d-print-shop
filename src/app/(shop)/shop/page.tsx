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
  const [allFilters, setAllFilters] = useState<any[]>([]);
  const [isPriceFilterModified, setIsPriceFilterModified] = useState(false);
  const [showTopSellers, setShowTopSellers] = useState(false);
  const [showSaleItems, setShowSaleItems] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [initialViewProducts, setInitialViewProducts] = useState<any[]>([]);

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

  // Load all filters
  const loadAllFilters = async () => {
    try {
      const response = await fetch('/api/shop/filters');
      if (response.ok) {
        const filters = await response.json();
        setAllFilters(Array.isArray(filters) ? filters : []);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
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
        setResolvedSearchParams(params);
        return;
      }
      
      // Fallback to Next.js searchParams for server-side rendering
      try {
        const params = await searchParams;
        setResolvedSearchParams(params || {});
      } catch (error) {
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
        
        // Load product filters and all filters
        await Promise.all([
          loadProductFilters(products),
          loadAllFilters()
        ]);
        
        // Initialize price range based on all products (will be updated when category changes)
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




  // Helper function to get effective price (offer price if on sale, otherwise regular price)
  const getEffectivePrice = (product: any) => {
    return product.isOnSale && product.offerPrice ? product.offerPrice : product.price;
  };

  // Helper function to check if product or any of its variations are available
  const isProductAvailable = (product: any) => {
    // Check main product stock
    if (product.inStock) return true;
    
    // Check if any variation is available
    if (product.variations && product.variations.length > 0) {
      return product.variations.some((variation: any) => 
        variation.options && variation.options.some((option: any) => 
          option.inStock === true || (option.stockQuantity && option.stockQuantity > 0)
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
          
          // Get filter type from allFilters
          const filterType = allFilters.find(f => f._id === filterId)?.type;
          
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
    
    setIsPriceFilterModified(false);
  }, [resolvedSearchParams.category, resolvedSearchParams.search]);

  // Update price range when data is loaded or filters change
  useEffect(() => {
    if (allProducts.length > 0 && categories.length > 0 && !isPriceFilterModified) {
      const newPriceRange = calculateCurrentPriceRange();
  // debug removed
      setPriceRange(newPriceRange);
    }
  }, [resolvedSearchParams, allProducts, categories, selectedDynamicFilters, showTopSellers, showSaleItems, showAvailableOnly, isPriceFilterModified]);

  // Check if search query matches a category name
  const isCategorySearch = searchQuery.trim() && categories.some(cat => 
    cat.name.toLowerCase() === searchQuery.toLowerCase().trim() || 
    cat.slug.toLowerCase() === searchQuery.toLowerCase().trim()
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

  // Filter products by category, subcategory, manufacturer, and search query
  const filteredProducts = allProducts.filter((p: any) => {
    const selectedCategory = resolvedSearchParams.category;
    const selectedSubcategory = resolvedSearchParams.subcategory;
    
    // Search filter - only apply if no category is selected and it's not a category search
    if (searchQuery.trim() && !selectedCategory && !isCategorySearch) {
      const query = searchQuery.toLowerCase().trim();
      const titleMatch = p.title.toLowerCase().includes(query);
      const descriptionMatch = p.description && p.description.toLowerCase().includes(query);
      const manufacturerMatch = p.manufacturer && p.manufacturer.toLowerCase().includes(query);
      const categoryMatch = p.category && p.category.toLowerCase().includes(query);
      const subcategoryMatch = p.subcategory && p.subcategory.toLowerCase().includes(query);
      const tagsMatch = p.tags && p.tags.some((tag: string) => tag.toLowerCase().includes(query));
      
      // Check if any field matches (but exclude recommended products)
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
    
    // Dynamic filters - Handle different filter types
    for (const [filterId, filterValues] of Object.entries(selectedDynamicFilters)) {
      if (filterValues && filterValues.length > 0) {
        const productFilterList = productFilters[p._id] || [];
        const productFilter = productFilterList.find((pf: any) => pf.filterId === filterId);
        
        if (!productFilter) {
          return false; // Product doesn't have this filter at all
        }
        
        // Get filter type from allFilters
        const filterType = allFilters.find(f => f._id === filterId)?.type;
        
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

  // Helper to count products for standard filters with current selections, based on initial snapshot
  const getStandardFilterCount = (type: 'topseller' | 'sale' | 'available') => {
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

          const filterType = allFilters.find(f => f._id === filterId)?.type;
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
      if (type !== 'available' && showAvailableOnly && !isProductAvailable(p)) return false;

      // Finally, require the attribute for the counted type
      if (type === 'topseller' && !p.isTopSeller) return false;
      if (type === 'sale' && !p.isOnSale) return false;
      if (type === 'available' && !isProductAvailable(p)) return false;

      return true;
    }).length;
  };

  // Separate products into primary matches for search
  let primaryProducts: any[] = [];
  
  if (searchQuery.trim() && !resolvedSearchParams.category && !isCategorySearch) {
    const query = searchQuery.toLowerCase().trim();
    
    // First, check if there's a category with this exact name
    const matchingCategory = categories.find(cat => 
      cat.name.toLowerCase() === query || cat.slug.toLowerCase() === query
    );
    
    if (matchingCategory) {
      // If there's a matching category, show all products from that category
      
      primaryProducts = filteredProducts.filter((p: any) => {
        const matches = p.categoryId === matchingCategory._id || 
               p.category === matchingCategory.name ||
               p.category === matchingCategory.slug ||
               (matchingCategory.subcategories && matchingCategory.subcategories.some(sub => 
                 p.subcategoryId === sub._id || 
                 (p.subcategoryIds && p.subcategoryIds.includes(sub._id))
               ));
        
        
        return matches;
      });
      
    } else {
      // No matching category, use normal search logic
      filteredProducts.forEach((p: any) => {
        const titleMatch = p.title.toLowerCase().includes(query);
        const descriptionMatch = p.description && p.description.toLowerCase().includes(query);
        const manufacturerMatch = p.manufacturer && p.manufacturer.toLowerCase().includes(query);
        const categoryMatch = p.category && p.category.toLowerCase().includes(query);
        const subcategoryMatch = p.subcategory && p.subcategory.toLowerCase().includes(query);
        const tagsMatch = p.tags && p.tags.some((tag: string) => tag.toLowerCase().includes(query));
        
        
        // Primary matches (title, tags, manufacturer, category, subcategory, description)
        // Include description in primary matches to avoid duplicates
        const primaryMatch = titleMatch || manufacturerMatch || categoryMatch || subcategoryMatch || tagsMatch || descriptionMatch;
        
        // No description-only matches needed since description is now included in primary matches
        if (primaryMatch) {
          primaryProducts.push(p);
        }
      });
    }
  } else if (isCategorySearch) {
    // If it's a category search, show all products from that category
    const matchingCategory = categories.find(cat => 
      cat.name.toLowerCase() === searchQuery.toLowerCase().trim() || 
      cat.slug.toLowerCase() === searchQuery.toLowerCase().trim()
    );
    
    if (matchingCategory) {
      
      // First filter by category
      const categoryProducts = allProducts.filter((p: any) => {
        const matches = p.categoryId === matchingCategory._id || 
               p.category === matchingCategory.name ||
               p.category === matchingCategory.slug ||
               (matchingCategory.subcategories && matchingCategory.subcategories.some(sub => 
                 p.subcategoryId === sub._id || 
                 (p.subcategoryIds && p.subcategoryIds.includes(sub._id))
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
        
        // Manufacturer filter - check URL params directly
        const urlParams = new URLSearchParams(window.location.search);
        const manufacturerParam = urlParams.get('manufacturer');
        if (manufacturerParam) {
          if (p.manufacturer !== manufacturerParam) return false;
        }
        
        // Dynamic filters - Handle different filter types
        for (const [filterId, filterValues] of Object.entries(selectedDynamicFilters)) {
          if (filterValues && filterValues.length > 0) {
            const productFilterList = productFilters[p._id] || [];
            const productFilter = productFilterList.find((pf: any) => pf.filterId === filterId);
            
            if (!productFilter) {
              return false; // Product doesn't have this filter at all
            }
            
            // Get filter type from allFilters
            const filterType = allFilters.find(f => f._id === filterId)?.type;
            
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

  const products = [...sortedPrimaryProducts];

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
      {/* Breadcrumb - show if category or filter is selected, positioned sticky under CategoryNavigation */}
      {(resolvedSearchParams.category || resolvedSearchParams.filter) && <Breadcrumb />}
      
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Search Results Info - only show if there are products or if we're not in a category */}
      {searchQuery && (filteredProducts.length > 0 || !resolvedSearchParams.category) && (
        <div className="mb-6">
          <div className="max-w-md mx-auto xl:mx-0">
            <p className="text-sm text-gray-600">
              {getDisplayProductCount()} Produkt{getDisplayProductCount() !== 1 ? 'e' : ''} gefunden für "<span className="font-medium">{searchQuery}</span>"
            </p>
          </div>
        </div>
      )}


      {/* Main Layout: Responsive Filters & Products */}
      <div className="flex flex-col md:flex-row">
        {/* Filterleiste: mobil oben, ab md links */}
        <div className="w-full md:w-80 md:flex-shrink-0 md:pr-8 mb-6 md:mb-0">
          <div className="space-y-4">
            {/* Price Filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Preis</h2>
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
                    <div className="relative h-2 bg-gray-200 rounded-lg mx-2">
                      {/* Active range track */}
                      <div 
                        className="absolute h-2 bg-blue-500 rounded-lg"
                        style={{
                          left: `${((priceRange.min - calculateCurrentPriceRange().min) / (calculateCurrentPriceRange().max - calculateCurrentPriceRange().min)) * 100}%`,
                          width: `${((priceRange.max - priceRange.min) / (calculateCurrentPriceRange().max - calculateCurrentPriceRange().min)) * 100}%`
                        }}
                      />
                      
                      {/* Min thumb */}
                      <div
                        className="absolute w-4 h-4 bg-blue-500 rounded-full cursor-pointer transform -translate-y-1 -translate-x-2 hover:scale-110 transition-transform"
                        style={{
                          left: `${((priceRange.min - calculateCurrentPriceRange().min) / (calculateCurrentPriceRange().max - calculateCurrentPriceRange().min)) * 100}%`,
                          zIndex: 10
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startValue = priceRange.min;
                          const currentRange = calculateCurrentPriceRange();
                          const minPrice = currentRange.min;
                          const maxPrice = currentRange.max;
                          const range = maxPrice - minPrice;
                          
                          const handleMouseMove = (e: MouseEvent) => {
                            const rect = (e.target as Element).closest('.relative')?.getBoundingClientRect();
                            if (!rect) return;
                            
                            const deltaX = e.clientX - startX;
                            const deltaPercent = (deltaX / rect.width) * 100;
                            const deltaValue = (deltaPercent / 100) * range;
                            const newValue = Math.max(minPrice, Math.min(maxPrice, startValue + deltaValue));
                            const clampedValue = Math.min(newValue, priceRange.max - 100);
                            
                            // Check if values are back to original range - if so, reset filter
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
                      />
                      
                      {/* Max thumb */}
                      <div
                        className="absolute w-4 h-4 bg-blue-500 rounded-full cursor-pointer transform -translate-y-1 -translate-x-2 hover:scale-110 transition-transform"
                        style={{
                          left: `${((priceRange.max - calculateCurrentPriceRange().min) / (calculateCurrentPriceRange().max - calculateCurrentPriceRange().min)) * 100}%`,
                          zIndex: 10
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startValue = priceRange.max;
                          const currentRange = calculateCurrentPriceRange();
                          const minPrice = currentRange.min;
                          const maxPrice = currentRange.max;
                          const range = maxPrice - minPrice;
                          
                          const handleMouseMove = (e: MouseEvent) => {
                            const rect = (e.target as Element).closest('.relative')?.getBoundingClientRect();
                            if (!rect) return;
                            
                            const deltaX = e.clientX - startX;
                            const deltaPercent = (deltaX / rect.width) * 100;
                            const deltaValue = (deltaPercent / 100) * range;
                            const newValue = Math.max(minPrice, Math.min(maxPrice, startValue + deltaValue));
                            const clampedValue = Math.max(newValue, priceRange.min + 100);
                            
                            // Check if values are back to original range - if so, reset filter
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
                      />
                    </div>
                    
                    {/* Min/Max labels */}
                    <div className="flex justify-between text-xs text-gray-500 mt-2 mx-2">
                      <span>{(priceRange.min / 100).toFixed(0)} €</span>
                      <span>{(priceRange.max / 100).toFixed(0)} €</span>
                    </div>
                  </div>
                  
                  {/* Current selection display */}
                  <div className="text-center text-sm text-gray-600 mt-2">
                    <span className="font-medium">{(priceRange.min / 100).toFixed(0)} €</span>
                    <span className="mx-2">-</span>
                    <span className="font-medium">{(priceRange.max / 100).toFixed(0)} €</span>
                  </div>
                </div>
                
                {/* Trennstrich */}
                <div className="border-b border-gray-200 mt-4"></div>
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
              priceRange={priceRange}
              showTopSellers={showTopSellers}
              showSaleItems={showSaleItems}
              showAvailableOnly={showAvailableOnly}
              specialFilter={resolvedSearchParams.filter}
            />
            
            {/* Top Seller Filter - stable visibility and count based on initial view snapshot */}
            {initialViewProducts.some(p => p.isTopSeller) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Top Seller</h2>
                {showTopSellers && (
                  <button
                    onClick={() => setShowTopSellers(false)}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showTopSellers}
                    onChange={(e) => setShowTopSellers(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                    <span>Nur Top Seller anzeigen</span>
                    <span className="text-xs text-gray-500 bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center">
                      {getStandardFilterCount('topseller')}
                    </span>
                  </span>
                </label>
              </div>
              
              {/* Trennstrich */}
              <div className="border-b border-gray-200 mt-4"></div>
            </div>
            )}
            
            {/* Sale Filter - stable visibility and count based on initial view snapshot */}
            {initialViewProducts.some(p => p.isOnSale) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Sale</h2>
                {showSaleItems && (
                  <button
                    onClick={() => setShowSaleItems(false)}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showSaleItems}
                    onChange={(e) => setShowSaleItems(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                    <span>Im Angebot</span>
                    <span className="text-xs text-gray-500 bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center">
                      {getStandardFilterCount('sale')}
                    </span>
                  </span>
                </label>
              </div>
              
              {/* Trennstrich */}
              <div className="border-b border-gray-200 mt-4"></div>
            </div>
            )}
            
            {/* Verfügbar Filter - stable visibility and count based on initial view snapshot */}
            {initialViewProducts.some(p => isProductAvailable(p)) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Verfügbar</h2>
                {showAvailableOnly && (
                  <button
                    onClick={() => setShowAvailableOnly(false)}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showAvailableOnly}
                    onChange={(e) => setShowAvailableOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                    <span>Auf Lager</span>
                    <span className="text-xs text-gray-500 bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center">
                      {getStandardFilterCount('available')}
                    </span>
                  </span>
                </label>
              </div>
            </div>
            )}
            
          </div>
        </div>

        {/* Trennstrich */}
        <div className="w-px bg-gray-200 flex-shrink-0"></div>

        {/* Right Side: Products */}
        <div className="flex-1 pl-8">
          {/* Products Section */}
          <div className="min-h-[400px]">
        {/* Category Products */}
        <div className="h-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex flex-col space-y-2 mb-2 sm:mb-0">
              {/* Active Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {/* Dynamic Filter Buttons */}
                {Object.entries(selectedDynamicFilters).map(([filterId, values]) => {
                  if (!values || values.length === 0) return null;
                  
                  const filter = allFilters.find(f => f._id === filterId);
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
                
                {/* Top Seller Filter Button */}
                {showTopSellers && (
                  <div className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-800 border border-gray-200">
                    <span className="mr-2">Top Seller</span>
                    <button
                      onClick={() => setShowTopSellers(false)}
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
                      onClick={() => setShowSaleItems(false)}
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
              
              {/* Products Count */}
              <div className="mt-3">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-lg">{sortedPrimaryProducts.length}</span> Artikel
                  {resolvedSearchParams.category && (
                    <span className="ml-2 text-blue-600">
                      in Kategorie "{categories.find(c => c.slug === resolvedSearchParams.category)?.name || resolvedSearchParams.category}"
                    </span>
                  )}
                </p>
              </div>
            </div>
            
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
          <div className="grid grid-cols-3 gap-0.5">
              {/* Primary Products */}
              {sortedPrimaryProducts.map((p: any) => {
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
