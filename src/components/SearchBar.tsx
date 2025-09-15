"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getOptimizedImageUrl, getContextualImageSize } from '@/lib/image-utils';

interface SearchResult {
  _id: string;
  slug: string;
  title?: string;
  name?: string; // For categories
  price?: number;
  offerPrice?: number;
  isOnSale?: boolean;
  isTopSeller?: boolean;
  inStock?: boolean;
  stockQuantity?: number;
  images?: string[];
  imageSizes?: { main: string; thumb: string; small: string };
  tags?: string[];
  manufacturer?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  type: 'product' | 'category';
}

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  showResults?: boolean;
  maxResults?: number;
}

export default function SearchBar({ 
  className = "", 
  placeholder = "Produkte durchsuchen...",
  showResults = true,
  maxResults = 8
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [categories, setCategories] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setCategories([]);
      setShowDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=${maxResults}`);
        const data = await response.json();
        setResults(data.products || []);
        setCategories(data.categories || []);
        setShowDropdown(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, maxResults]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalResults = results.length + categories.length;
    if (!showDropdown || totalResults === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < totalResults - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : totalResults - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < totalResults) {
          if (selectedIndex < results.length) {
            handleProductClick(results[selectedIndex]);
          } else {
            handleCategoryClick(categories[selectedIndex - results.length]);
          }
        } else if (query.trim()) {
          // Navigate to shop with search query
          router.push(`/shop?search=${encodeURIComponent(query)}`);
          setShowDropdown(false);
          setQuery('');
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleProductClick = (product: SearchResult) => {
    router.push(`/shop/${product.slug}`);
    setShowDropdown(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const handleCategoryClick = (category: SearchResult) => {
    router.push(`/shop?category=${category.slug}`);
    setShowDropdown(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (e.target.value.trim()) {
      setShowDropdown(true);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setCategories([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const getEffectivePrice = (product: SearchResult) => {
    return product.isOnSale && product.offerPrice ? product.offerPrice : (product.price || 0);
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setShowDropdown(true)}
          className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showDropdown && showResults && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {(results.length > 0 || categories.length > 0) ? (
            <>
              {/* Results Header */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                <p className="text-sm text-gray-600">
                  {results.length + categories.length} Ergebnis{(results.length + categories.length) !== 1 ? 'se' : ''} gefunden
                  {query && (
                    <span className="ml-1">
                      für "<span className="font-medium">{query}</span>"
                    </span>
                  )}
                </p>
              </div>

              {/* Results List */}
              <div className="py-1">
                {/* Products Section */}
                {results.length > 0 && (
                  <>
                    {results.length > 1 && (
                      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                        <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                          Produkte ({results.length})
                        </p>
                      </div>
                    )}
                    {results.map((product, index) => (
                      <button
                        key={product._id}
                        onClick={() => handleProductClick(product)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                          index === selectedIndex ? 'bg-blue-50' : ''
                        }`}
                      >
                        {/* Product Image */}
                        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.imageSizes?.thumb || product.images[0]}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {product.title}
                              </h3>
                              {product.category && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {product.category}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0 ml-2 text-right">
                              <div className="text-sm font-semibold text-gray-900">
                                {(getEffectivePrice(product) / 100).toFixed(2)} €
                              </div>
                              {product.isOnSale && product.offerPrice && (
                                <div className="text-xs text-gray-500 line-through">
                                  {((product.price || 0) / 100).toFixed(2)} €
                                </div>
                              )}
                              {!product.inStock && (
                                <div className="text-xs text-red-600 font-medium mt-0.5">
                                  Ausverkauft
                                </div>
                              )}
                              {product.isTopSeller && product.inStock && (
                                <div className="text-xs text-blue-600 font-medium mt-0.5">
                                  Top Seller
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* Categories Section */}
                {categories.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-green-50 border-b border-green-100">
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide">
                        Kategorien ({categories.length})
                      </p>
                    </div>
                    {categories.map((category, index) => (
                      <button
                        key={category._id}
                        onClick={() => handleCategoryClick(category)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                          (results.length + index) === selectedIndex ? 'bg-blue-50' : ''
                        }`}
                      >
                        {/* Category Image */}
                        <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {category.imageSizes?.thumb ? (
                            <img
                              src={category.imageSizes.thumb}
                              alt={category.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          )}
                        </div>

                        {/* Category Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900">
                            {category.name}
                          </h3>
                          {category.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {category.description}
                            </p>
                          )}
                          <div className="text-xs text-green-600 font-medium mt-1">
                            Kategorie durchsuchen →
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* View All Results */}
              {(results.length >= maxResults || categories.length > 0) && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                  <button
                    onClick={() => {
                      router.push(`/shop?search=${encodeURIComponent(query)}`);
                      setShowDropdown(false);
                      setQuery('');
                    }}
                    className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Alle Ergebnisse anzeigen →
                  </button>
                </div>
              )}
            </>
          ) : query.trim() && !isLoading ? (
            <div className="px-4 py-6 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                Keine Produkte gefunden für "<span className="font-medium">{query}</span>"
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Versuchen Sie andere Suchbegriffe
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
