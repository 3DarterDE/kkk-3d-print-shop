"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { withCursorPointer } from '@/lib/cursor-utils';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  subcategories?: Category[];
  image?: string;
  imageSizes?: {
    main: string;
    thumb: string;
    small: string;
  };
}

interface CategoryNavigationProps {
  className?: string;
  onTopSellerToggle?: () => void;
  onSaleToggle?: () => void;
  onNewToggle?: () => void;
  showTopSellers?: boolean;
  showSaleItems?: boolean;
  showNewItems?: boolean;
}

export default function CategoryNavigation({ 
  className = "",
  onTopSellerToggle,
  onSaleToggle,
  onNewToggle,
  showTopSellers = false,
  showSaleItems = false,
  showNewItems = false
}: CategoryNavigationProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBrandsHovered, setIsBrandsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const [brands, setBrands] = useState<Array<{ _id: string; name: string; image?: string; imageSizes?: { thumb?: string; main?: string; small?: string }; slug: string }>>([]);

  // Set mounted state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        const res = await fetch('/api/shop/brands');
        if (res.ok) {
          const data = await res.json();
          setBrands(Array.isArray(data) ? data : []);
        }
      } catch {}
    };
    loadBrands();
  }, []);
  

  // Check if we're on shop page or in a category/brand
  const isOnShopPage = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    return path === '/shop' || path.startsWith('/shop/');
  };

  // Toggle functions that handle both URL navigation and callback
  const handleTopSellerToggle = () => {
    if (onTopSellerToggle) {
      onTopSellerToggle();
    } else if (isOnShopPage()) {
      // On shop page - dispatch event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shop-toggle-filter', { detail: { filter: 'topseller', action: 'toggle' } }));
      }
    } else {
      // Not on shop page - navigate to shop and activate filter
      if (typeof window !== 'undefined') {
        // Store filter in sessionStorage for activation after navigation
        sessionStorage.setItem('activateFilter', 'topseller');
        window.location.href = '/shop';
      }
    }
  };

  const handleSaleToggle = () => {
    if (onSaleToggle) {
      onSaleToggle();
    } else if (isOnShopPage()) {
      // On shop page - dispatch event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shop-toggle-filter', { detail: { filter: 'sale', action: 'toggle' } }));
      }
    } else {
      // Not on shop page - navigate to shop and activate filter
      if (typeof window !== 'undefined') {
        // Store filter in sessionStorage for activation after navigation
        sessionStorage.setItem('activateFilter', 'sale');
        window.location.href = '/shop';
      }
    }
  };

  const handleNewToggle = () => {
    if (onNewToggle) {
      onNewToggle();
    } else if (isOnShopPage()) {
      // On shop page - dispatch event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shop-toggle-filter', { detail: { filter: 'neu', action: 'toggle' } }));
      }
    } else {
      // Not on shop page - navigate to shop and activate filter
      if (typeof window !== 'undefined') {
        // Store filter in sessionStorage for activation after navigation
        sessionStorage.setItem('activateFilter', 'neu');
        window.location.href = '/shop';
      }
    }
  };



  // Fetch categories
  useEffect(() => {
    
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/shop/categories');
        
        if (response.ok) {
          const data = await response.json();
          const categoriesArray = Array.isArray(data.categories) ? data.categories : [];
          setCategories(categoriesArray);
        } else {
          console.error('Failed to fetch categories:', response.status);
          setCategories([]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle scroll visibility
  useEffect(() => {
    if (!mounted) return;
    
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY ? 'down' : 'up';
      
      if (scrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [mounted]);

  const handleCategoryClick = (category: Category) => {
    router.push(`/shop/${category.slug}`);
    setIsHovered(false);
    setHoveredCategory(null);
  };

  const handleSubcategoryClick = (subcategory: Category, parentCategory: Category) => {
    router.push(`/shop/${parentCategory.slug}/${subcategory.slug}`);
    setIsHovered(false);
    setHoveredCategory(null);
  };




  return (
    <div className={`hidden md:block sticky top-16 z-30 bg-white border-b border-gray-300 transition-opacity duration-300 ${!mounted || !isVisible ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'} ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
        <div className="flex items-center justify-between">
          {/* Left side - Categories and Brands dropdowns */}
          <div className="flex items-center gap-4">
            {/* Categories dropdown */}
            <div className="relative">
            <button
              onMouseEnter={() => !isLoading && setIsHovered(true)}
              onMouseLeave={() => {
                // Delay to allow mouse to move to dropdown
                setTimeout(() => {
                  if (!document.querySelector('.category-dropdown:hover')) {
                    setIsHovered(false);
                    setHoveredCategory(null);
                  }
                }, 100);
              }}
              className={withCursorPointer("relative flex items-center gap-2 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors overflow-hidden group")}
            >
              <span className="font-medium">Alle Kategorien</span>
              <svg 
                className={`w-4 h-4 transition-transform ${isHovered ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              
              {/* Animated blue line */}
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left"></div>
            </button>

            {/* Dropdown menu */}
          {isHovered && !isLoading && (
            <div 
              className="category-dropdown absolute top-full left-0 bg-white border border-gray-200 rounded-md shadow-xl z-50 opacity-100 min-w-[600px]"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => {
                setIsHovered(false);
                setHoveredCategory(null);
              }}
            >
              <div className="flex">
                {/* Categories list - 300px fixed width */}
                <div className="w-[300px] border-r border-gray-200">

                      <h3 className="text-lg font-semibold text-gray-900 px-3 py-4 border-b border-gray-100">
                        Kategorien
                      </h3>
                      <div className="max-h-[500px] overflow-y-auto">
                        {/* Alle Produkte Option */}
                        <button
                          onClick={() => router.push('/shop')}
                          className={withCursorPointer("w-full text-left px-4 py-3 text-base hover:bg-gray-50 rounded-md transition-colors font-semibold text-blue-600")}
                        >
                          Alle Produkte
                        </button>
                        
                        {categories && categories.length > 0 ? categories.map((category) => (
                          <button
                            key={category._id}
                            onMouseEnter={() => setHoveredCategory(category._id)}
                            onClick={() => handleCategoryClick(category)}
                            className={`w-full text-left px-4 py-2 text-base hover:bg-gray-50 rounded-md transition-colors ${withCursorPointer('')} ${
                              hoveredCategory === category._id ? 'bg-gray-50' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {category.imageSizes?.small && (
                                  <img
                                    src={category.imageSizes.small}
                                    alt={category.name}
                                    className="w-8 h-8 object-cover rounded"
                                  />
                                )}
                                <span className="text-gray-700 text-base font-medium">{category.name}</span>
                              </div>
                              {category.subcategories && category.subcategories.length > 0 && (
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </div>
                          </button>
                        )) : (
                          <div className="p-4 text-center text-gray-500">
                            <p className="text-sm">Kategorien werden geladen...</p>
                          </div>
                        )}
                      </div>
                  </div>

                  {/* Subcategories panel - takes remaining space */}
                  {hoveredCategory && (
                    <div className="w-[300px]">
                      <div className="max-h-[500px] overflow-y-auto">
                        {(() => {
                          const category = categories.find(cat => cat._id === hoveredCategory);
                          if (!category || !category.subcategories || category.subcategories.length === 0) {
                            return (
                              <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">Keine Unterkategorien verfügbar</p>
                              </div>
                            );
                          }
                          
                          return (
                            <>
                              <h3 className="text-lg font-semibold text-gray-900 px-3 py-4 border-b border-gray-100">
                                {category.name}
                              </h3>
                              <div className="grid grid-cols-1 gap-1">
                                {category.subcategories.map((subcategory) => (
                                  <button
                                    key={subcategory._id}
                                    onClick={() => handleSubcategoryClick(subcategory, category)}
                                    className={withCursorPointer("text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors")}
                                  >
                                    <div className="flex items-center gap-3">
                                      {subcategory.imageSizes?.small && (
                                        <img
                                          src={subcategory.imageSizes.small}
                                          alt={subcategory.name}
                                          className="w-6 h-6 object-cover rounded"
                                        />
                                      )}
                                      <span className="text-sm font-medium">{subcategory.name}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
          )}
          </div>

            {/* Brands dropdown */}
            <div className="relative">
              <button
                onMouseEnter={() => setIsBrandsHovered(true)}
                onMouseLeave={() => {
                  // Delay to allow mouse to move to dropdown
                  setTimeout(() => {
                    if (!document.querySelector('.brands-dropdown:hover')) {
                      setIsBrandsHovered(false);
                    }
                  }, 100);
                }}
                className={withCursorPointer("relative flex items-center gap-2 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors overflow-hidden group")}
              >
                <span className="font-medium">Marken</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${isBrandsHovered ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                
                {/* Animated blue line */}
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left"></div>
              </button>

              {/* Brands dropdown menu */}
              {isBrandsHovered && (
                <div 
                  className="brands-dropdown absolute top-full left-0 bg-white border border-gray-200 rounded-md shadow-xl z-50 opacity-100 min-w-[400px]"
                  onMouseEnter={() => setIsBrandsHovered(true)}
                  onMouseLeave={() => {
                    setIsBrandsHovered(false);
                  }}
                >
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Marken
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {brands.map((brand) => (
                        <button
                          key={brand._id}
                          onClick={() => {
                            router.push(`/shop/marke/${brand.slug}`);
                            setIsBrandsHovered(false);
                          }}
                          className={withCursorPointer("flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-md transition-colors")}
                        >
                          <div className="w-8 h-8 flex items-center justify-center">
                            {brand.image || brand.imageSizes?.thumb ? (
                              <img src={brand.imageSizes?.thumb || brand.image!} alt={brand.name} className="max-w-full max-h-full object-contain" />
                            ) : (
                              <span className="text-xs text-gray-400">{brand.name[0]}</span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-700">{brand.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Special filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTopSellerToggle}
              className={withCursorPointer("flex items-center gap-1 py-2 px-3 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="font-medium">Bestseller</span>
            </button>

            <button
              onClick={handleSaleToggle}
              className={withCursorPointer("flex items-center gap-1 py-2 px-3 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="font-medium">Sale</span>
            </button>

            <button
              onClick={handleNewToggle}
              className={withCursorPointer("flex items-center gap-1 py-2 px-3 text-sm text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="font-medium">Neu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
