"use client";

import { useState, useEffect } from 'react';
import { Filter } from '@/lib/models/Filter';

interface DynamicFiltersProps {
  categoryId?: string;
  selectedFilters: Record<string, string[]>;
  onFilterChange: (filterId: string, values: string[]) => void;
  productFilters?: Record<string, any[]>;
  allProducts?: any[];
  currentCategoryProducts?: any[];
  priceRange?: { min: number; max: number };
  showTopSellers?: boolean;
  showSaleItems?: boolean;
  showNewItems?: boolean;
  showAvailableOnly?: boolean;
  specialFilter?: string; // 'topseller' | 'sale' | 'neu' | undefined
}

export default function DynamicFilters({ 
  categoryId, 
  selectedFilters, 
  onFilterChange,
  productFilters = {},
  allProducts = [],
  currentCategoryProducts = [],
  priceRange = { min: 0, max: 1000 },
  showTopSellers = false,
  showSaleItems = false,
  showNewItems = false,
  showAvailableOnly = false,
  specialFilter
}: DynamicFiltersProps) {
  const [filters, setFilters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allFilters, setAllFilters] = useState<any[]>([]);
  const [originalRangeValues, setOriginalRangeValues] = useState<Record<string, { min: number; max: number }>>({});
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({});
  const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});
  const [initialProducts, setInitialProducts] = useState<any[]>([]);
  // Snapshot der ursprünglichen productFilters damit Counts stabil bleiben
  const [initialProductFilters, setInitialProductFilters] = useState<Record<string, any[]>>({});
  // Entfernt: basePriceRange Snapshot, damit Counter stets den aktuellen Preisbereich berücksichtigen

  // Toggle filter expansion
  const toggleFilter = (filterId: string) => {
    setExpandedFilters(prev => ({
      ...prev,
      [filterId]: !(prev[filterId] ?? false)
    }));
  };

  // Toggle options expansion for multiselect filters
  const toggleOptionsExpansion = (filterId: string) => {
    setExpandedOptions(prev => ({
      ...prev,
      [filterId]: !(prev[filterId] ?? false)
    }));
  };

  // Helper function to get effective price (same as in shop page)
  const getEffectivePrice = (product: any) => {
    return product.isOnSale && product.offerPrice ? product.offerPrice : product.price;
  };

  useEffect(() => {
    const fetchFilters = async () => {
      setLoading(true);
      try {
        // Get all available filters
        const response = await fetch('/api/shop/filters');
        if (response.ok) {
          const fetchedFilters = await response.json();
          setAllFilters(Array.isArray(fetchedFilters) ? fetchedFilters : []);
        } else {
          console.error('Failed to fetch filters:', response.status);
          setAllFilters([]);
        }
      } catch (error) {
        console.error('Failed to fetch filters:', error);
        setAllFilters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFilters();
  }, []); // Only run once on mount

  // Hinweis: Kein Price-Range-Snapshot mehr – Counter folgen immer dem aktuellen Preisbereich

  // Reset initial products snapshot when view/category changes
  useEffect(() => {
    setInitialProducts([]);
    setInitialProductFilters({});
  }, [categoryId]);

  // Take a one-time snapshot of the initial product set for the current view
  useEffect(() => {
    if (initialProducts.length === 0 && currentCategoryProducts.length > 0) {
      setInitialProducts(currentCategoryProducts);
      // Snapshot der Filter-Mapping Struktur zum selben Zeitpunkt sichern
      if (Object.keys(initialProductFilters).length === 0 && Object.keys(productFilters).length > 0) {
        // Deep Clone damit spätere Mutationen nicht die ursprüngliche Facet-Basis verändern
        try {
          const cloned: Record<string, any[]> = {};
          for (const [pid, list] of Object.entries(productFilters)) {
            cloned[pid] = list.map(item => ({ ...item, values: Array.isArray(item.values) ? [...item.values] : item.values }));
          }
          setInitialProductFilters(cloned);
        } catch {
          setInitialProductFilters(JSON.parse(JSON.stringify(productFilters)));
        }
      }
    }
  }, [currentCategoryProducts, initialProducts.length]);

  // Determine which filters to show based on the initial snapshot only (stable while user toggles filters)
  useEffect(() => {
    if (allFilters.length === 0) return;

    const timeoutId = setTimeout(() => {
      if (initialProducts.length > 0 && Object.keys(productFilters).length > 0) {
        const relevantFilters = allFilters.filter((filter: any) => {
          return initialProducts.some(product => {
            const productFilterList = productFilters[product._id] || [];
            return productFilterList.some(pf => pf.filterId === filter._id?.toString());
          });
        });
        setFilters(relevantFilters);
      } else {
        setFilters([]);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [productFilters, allFilters, initialProducts, initialProductFilters]);

  // Auto-expand top 3 filters with most products
  useEffect(() => {
    if (filters.length === 0) return;

    // Calculate product count for each filter
    const filterProductCounts = filters.map(filter => {
      const filterId = String(filter._id);
      let count = 0;
      
      initialProducts.forEach(product => {
        const productFilterList = productFilters[product._id] || [];
        const hasFilter = productFilterList.some(pf => pf.filterId === filterId);
        if (hasFilter) count++;
      });
      
      return { filterId, count };
    });

    // Sort by count (descending) and get top 3
    const top3Filters = filterProductCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(f => f.filterId);

    // Set expansion state: top 3 expanded, others collapsed
    const newExpandedState: Record<string, boolean> = {};
    filters.forEach(filter => {
      const filterId = String(filter._id);
      newExpandedState[filterId] = top3Filters.includes(filterId);
    });
    
    setExpandedFilters(newExpandedState);
  }, [filters, initialProducts, productFilters]);

  // Function to count products for each filter option
  const getProductCountForOption = (filterId: string, optionValue: string) => {
    // Use initial snapshot for the current view (global or category), fallback to allProducts
    const productsToCheck = initialProducts.length > 0 ? initialProducts : allProducts;
    if (!productsToCheck || productsToCheck.length === 0) return 0;

    // Verwende Snapshot der ursprünglichen productFilters falls vorhanden, sonst aktuelle
    const productFiltersSource = Object.keys(initialProductFilters).length > 0 ? initialProductFilters : productFilters;

  const filterIdStr = String(filterId);
  const filterMeta = allFilters.find(f => String(f._id) === filterIdStr);
  const filterType = filterMeta?.type;
  const currentVals = selectedFilters[filterIdStr] || [];
  const isOptionSelected = currentVals.includes(optionValue);

    // Andere Filter ohne diesen
    const otherFilters: Record<string, string[]> = {};
    for (const [fid, vals] of Object.entries(selectedFilters)) {
      if (fid !== filterIdStr) otherFilters[fid] = vals;
    }

    // Produkte, die alle aktuellen Filter (inkl. OR innerhalb eines Filters) erfüllen (für ausgewählte Optionen Anzeige der aktuellen Treffer)
    let displayedProductsCache: any[] | null = null;
    const getDisplayedProducts = () => {
      if (displayedProductsCache) return displayedProductsCache;
      displayedProductsCache = productsToCheck.filter(p => {
        const effectivePrice = getEffectivePrice(p);
        if (effectivePrice < priceRange.min || effectivePrice > priceRange.max) return false;
        if (specialFilter) {
          if (specialFilter === 'topseller' && !p.isTopSeller) return false;
          if (specialFilter === 'sale' && !p.isOnSale) return false;
          if (specialFilter === 'neu') {
            const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            const productDate = new Date(p.createdAt || p.updatedAt); if (productDate < twoWeeksAgo) return false;
          }
        }
        if (showTopSellers && !p.isTopSeller) return false;
        if (showSaleItems && !p.isOnSale) return false;
        if (showAvailableOnly && !isProductAvailable(p)) return false;
        return passesFilters(p, selectedFilters, productFiltersSource);
      });
      return displayedProductsCache;
    };

    // Wichtig: Zählung innerhalb des gleichen Filters ignoriert immer die aktuelle Auswahl
    // (Counter sollen innerhalb des Facets stabil bleiben), aber respektiert Preis & andere Filter

    const filteredProducts = productsToCheck.filter(product => {
      // Apply price filter first – immer aktuellen Bereich nutzen
      const pr = priceRange;
      const effectivePrice = getEffectivePrice(product);
      if (effectivePrice < pr.min || effectivePrice > pr.max) {
        return false;
      }

      // Apply special URL filter (topseller, sale, neu)
      if (specialFilter) {
        switch (specialFilter) {
          case 'topseller':
            if (!product.isTopSeller) return false;
            break;
          case 'sale':
            if (!product.isOnSale) return false;
            break;
          case 'neu':
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            const productDate = new Date(product.createdAt || product.updatedAt);
            if (productDate < twoWeeksAgo) return false;
            break;
        }
      }

      // Apply standard toggles
      if (showTopSellers && !product.isTopSeller) return false;
      if (showSaleItems && !product.isOnSale) return false;
      if (showAvailableOnly && !isProductAvailable(product)) return false;

      // Nur andere Filter prüfen (dieses Filter bewusst auslassen für stabile Facet-Counts)
      if (!passesFilters(product, otherFilters, productFiltersSource)) return false;
  const pfl = productFiltersSource[product._id] || [];
  const pf = pfl.find((pf: any) => String(pf.filterId) === filterIdStr);
      if (!pf) return false;
      if (filterType === 'range') return false;
      return pf.values.includes(optionValue);
    });
    const count = filteredProducts.length;
    return count;
  };

  // Prüft ob ein Produkt alle angegebenen Filter (OR innerhalb eines Filters, AND zwischen Filtern) erfüllt
  const passesFilters = (product: any, filtersToApply: Record<string, string[]>, source: Record<string, any[]>) => {
    for (const [fidRaw, vals] of Object.entries(filtersToApply)) {
      const fid = String(fidRaw);
      if (!vals || vals.length === 0) continue;
      const meta = allFilters.find(f => String(f._id) === fid);
      const pfl = source[product._id] || [];
      const pf = pfl.find((pf: any) => String(pf.filterId) === fid);
      if (!pf) return false;
      if (meta?.type === 'range') {
        const minValue = parseFloat(vals[0]);
        const maxValue = parseFloat(vals[1]);
        const hasInRange = pf.values.some((v: string) => {
          const n = parseFloat(v); return !isNaN(n) && n >= minValue && n <= maxValue;
        });
        if (!hasInRange) return false;
      } else {
        const hasAny = vals.some(v => pf.values.includes(v));
        if (!hasAny) return false;
      }
    }
    return true;
  };

  // Variante von isFilterOptionAvailable die eine bestimmte productFilters-Quelle nutzt
  const isFilterOptionAvailableWithSource = (product: any, filterId: string, optionValue: string, source: Record<string, any[]>) => {
    const productFilterList = source[product._id] || [];
    const productFilter = productFilterList.find((pf: any) => pf.filterId === filterId);
    if (!productFilter) return false;
    const hasOption = productFilter.values.includes(optionValue);
    if (!hasOption) return false;
    if (showAvailableOnly && product.variations && product.variations.length > 0) {
      return product.variations.some((variation: any) => 
        variation.options && variation.options.some((option: any) => 
          option.value === optionValue && 
          (option.inStock === true || (option.stockQuantity && option.stockQuantity > 0))
        )
      );
    }
    return true;
  };

  // Availability check similar to shop page
  const isProductAvailable = (product: any) => {
    if (product.inStock) return true;
    if (product.variations && product.variations.length > 0) {
      return product.variations.some((variation: any) => 
        variation.options && variation.options.some((option: any) => 
          option.inStock === true || (option.stockQuantity && option.stockQuantity > 0)
        )
      );
    }
    return false;
  };

  // Check if a specific filter option is available for a product
  const isFilterOptionAvailable = (product: any, filterId: string, optionValue: string) => {
    // Get the product's filter data
    const productFilterList = productFilters[product._id] || [];
    const productFilter = productFilterList.find((pf: any) => pf.filterId === filterId);
    
    if (!productFilter) return false;
    
    // Check if the product has this specific option value
    const hasOption = productFilter.values.includes(optionValue);
    if (!hasOption) return false;
    
    // If "Auf Lager" filter is active, check if that specific variation is available
    if (showAvailableOnly && product.variations && product.variations.length > 0) {
      // Check if any variation with this option value is available
      return product.variations.some((variation: any) => 
        variation.options && variation.options.some((option: any) => 
          option.value === optionValue && 
          (option.inStock === true || (option.stockQuantity && option.stockQuantity > 0))
        )
      );
    }
    
    // If "Auf Lager" filter is not active, or for non-variation filters, 
    // if the product has the option, it's available
    return true;
  };

  // Function to get min/max values for range filters
  const getRangeValues = (filterId: string) => {
    // Return original range values if they exist, otherwise calculate them
    if (originalRangeValues[filterId]) {
      return originalRangeValues[filterId];
    }
    
    if (!currentCategoryProducts || currentCategoryProducts.length === 0) return { min: 0, max: 100 };
    
    const values: number[] = [];
    currentCategoryProducts.forEach(product => {
      const productFilterList = productFilters[product._id] || [];
      productFilterList.forEach(pf => {
        if (pf.filterId === filterId) {
          pf.values.forEach((value: string) => {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              values.push(numValue);
            }
          });
        }
      });
    });
    
    if (values.length === 0) return { min: 0, max: 100 };
    
    const rangeValues = {
      min: Math.round(Math.min(...values)),
      max: Math.round(Math.max(...values))
    };
    
    // Store original range values
    setOriginalRangeValues(prev => ({
      ...prev,
      [filterId]: rangeValues
    }));
    
    return rangeValues;
  };

  if (loading || filters.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {filters
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map((filter) => {
  const filterKey = String(filter._id!);
  const isExpanded = expandedFilters[filterKey] ?? false; // Default to collapsed
  const hasActiveFilter = (selectedFilters[filterKey] || []).length > 0;
        
        return (
          <div key={filterKey} className={`border-b border-gray-200 ${isExpanded ? 'pb-2' : 'pb-0'}`}>
            <button
              onClick={() => toggleFilter(filterKey)}
              className="flex items-center justify-between w-full text-left mb-2 hover:text-blue-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{filter.name}</h3>
                {filter.type === 'range' && hasActiveFilter && (() => {
                  const currentValues = selectedFilters[filterKey] || [];
                  const minValue = currentValues[0] ? parseFloat(currentValues[0]) : 0;
                  const maxValue = currentValues[1] ? parseFloat(currentValues[1]) : 0;
                  return (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                      {minValue.toFixed(0)} - {maxValue.toFixed(0)}
                    </span>
                  );
                })()}
                {filter.type !== 'range' && hasActiveFilter && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {(selectedFilters[filterKey] || []).length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <svg
                  className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            {isExpanded && (
              <div className="filter-content">
          
          {filter.type === 'select' && (
            <div className="space-y-1">
              {filter.options
                .map((option: any) => ({
                  ...option,
                  productCount: getProductCountForOption(filter._id!, option.value)
                }))
                .map((option: any) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    name={`filter-${filter._id}`}
                    value={option.value}
                    checked={(selectedFilters[String(filter._id!)] || []).includes(option.value)}
                    onChange={(e) => {
                      const newValues = e.target.checked ? [option.value] : [];
                      onFilterChange(String(filter._id!), newValues);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                    <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                      <span>{option.name}</span>
                    </span>
                </label>
              ))}
            </div>
          )}
          
          {filter.type === 'multiselect' && (() => {
            const optionsWithCounts = filter.options
              .map((option: any) => ({
                ...option,
                productCount: getProductCountForOption(String(filter._id!), option.value)
              }));
            
            const isExpanded = expandedOptions[filterKey] ?? false;
            const hasMoreThanFive = optionsWithCounts.length > 5;
            const visibleOptions = hasMoreThanFive && !isExpanded 
              ? optionsWithCounts.slice(0, 5) 
              : optionsWithCounts;
            
            return (
              <div className="space-y-1">
                {visibleOptions.map((option: any) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={(selectedFilters[String(filter._id!)] || []).includes(option.value)}
                      onChange={(e) => {
                        const currentValues = selectedFilters[String(filter._id!)] || [];
                        const newValues = e.target.checked
                          ? [...currentValues, option.value]
                          : currentValues.filter(v => v !== option.value);
                        onFilterChange(String(filter._id!), newValues);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                      <span>{option.name}</span>
                    </span>
                  </label>
                ))}
                
                {hasMoreThanFive && (
                  <button
                    onClick={() => toggleOptionsExpansion(filterKey)}
                    className="text-sm text-blue-600 hover:text-blue-800 mt-2 flex items-center"
                  >
                    {isExpanded ? (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Weniger anzeigen
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Mehr anzeigen ({optionsWithCounts.length - 5} weitere)
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })()}

          {filter.type === 'text' && (
            <input
              type="text"
              placeholder={`${filter.name} eingeben...`}
              value={(selectedFilters[String(filter._id!)] || [])[0] || ''}
              onChange={(e) => {
                const newValues = e.target.value ? [e.target.value] : [];
                onFilterChange(String(filter._id!), newValues);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {filter.type === 'number' && (
            <input
              type="number"
              placeholder={`${filter.name} eingeben...`}
              value={(selectedFilters[String(filter._id!)] || [])[0] || ''}
              onChange={(e) => {
                const newValues = e.target.value ? [e.target.value] : [];
                onFilterChange(String(filter._id!), newValues);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {filter.type === 'range' && (() => {
            const rangeValues = getRangeValues(String(filter._id!));
            const currentValues = selectedFilters[String(filter._id!)] || [];
            const minValue = currentValues[0] ? parseFloat(currentValues[0]) : rangeValues.min;
            const maxValue = currentValues[1] ? parseFloat(currentValues[1]) : rangeValues.max;
            
            
            return (
              <div className="space-y-2">
                {/* Range Slider Container */}
                <div className="relative">
                  <div className="relative h-2 bg-gray-200 rounded-lg mx-2">
                    {/* Active range track */}
                    <div 
                      className="absolute h-2 bg-blue-500 rounded-lg"
                      style={{
                        left: `${((minValue - rangeValues.min) / (rangeValues.max - rangeValues.min)) * 100}%`,
                        width: `${((maxValue - minValue) / (rangeValues.max - rangeValues.min)) * 100}%`
                      }}
                    />
                    
                    {/* Min thumb */}
                    <div
                      className="absolute w-4 h-4 bg-blue-500 rounded-full cursor-pointer transform -translate-y-1 -translate-x-2 hover:scale-110 transition-transform"
                      style={{
                        left: `${((minValue - rangeValues.min) / (rangeValues.max - rangeValues.min)) * 100}%`,
                        zIndex: 10
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const startX = e.clientX;
                        const startValue = minValue;
                        const range = rangeValues.max - rangeValues.min;
                        const sliderElement = (e.target as Element).closest('.relative');
                        if (!sliderElement) return;
                        
                        const handleMouseMove = (e: MouseEvent) => {
                          const rect = sliderElement.getBoundingClientRect();
                          
                          // Calculate position as percentage of slider width
                          const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                          const newValue = rangeValues.min + (percent / 100) * range;
                          const clampedValue = Math.max(rangeValues.min, Math.min(maxValue - 1, Math.round(newValue)));
                          
                          // Check if values are back to original range - if so, remove filter
                          if (clampedValue === rangeValues.min && maxValue === rangeValues.max) {
                            onFilterChange(String(filter._id!), []);
                          } else {
                            onFilterChange(String(filter._id!), [clampedValue.toString(), maxValue.toString()]);
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
                        left: `${((maxValue - rangeValues.min) / (rangeValues.max - rangeValues.min)) * 100}%`,
                        zIndex: 10
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const startX = e.clientX;
                        const startValue = maxValue;
                        const range = rangeValues.max - rangeValues.min;
                        const sliderElement = (e.target as Element).closest('.relative');
                        if (!sliderElement) return;
                        
                        const handleMouseMove = (e: MouseEvent) => {
                          const rect = sliderElement.getBoundingClientRect();
                          
                          // Calculate position as percentage of slider width
                          const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                          const newValue = rangeValues.min + (percent / 100) * range;
                          const clampedValue = Math.max(minValue + 1, Math.min(rangeValues.max, Math.round(newValue)));
                          
                          // Check if values are back to original range - if so, remove filter
                          if (minValue === rangeValues.min && clampedValue === rangeValues.max) {
                            onFilterChange(String(filter._id!), []);
                          } else {
                            onFilterChange(String(filter._id!), [minValue.toString(), clampedValue.toString()]);
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
                    <span>{rangeValues.min.toFixed(0)}</span>
                    <span>{rangeValues.max.toFixed(0)}</span>
                  </div>
                </div>
                
              </div>
            );
          })()}

          {filter.type === 'color' && (
            <div className="flex flex-wrap gap-2">
              {filter.options
                .map((option: any) => ({
                  ...option,
                  productCount: getProductCountForOption(filter._id!, option.value)
                }))
                .map((option: any) => {
                  const isSelected = (selectedFilters[String(filter._id!)] || []).includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        const currentValues = selectedFilters[String(filter._id!)] || [];
                        const newValues = isSelected
                          ? currentValues.filter(v => v !== option.value)
                          : [...currentValues, option.value];
                        onFilterChange(String(filter._id!), newValues);
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                        isSelected 
                          ? 'border-gray-800 shadow-lg' 
                          : 'border-gray-300 hover:border-gray-500'
                      }`}
                      style={{ backgroundColor: option.color || '#000000' }}
                      title={option.name}
                    />
                  );
                })}
            </div>
          )}

                {/* Clear filter button */}
                {(selectedFilters[String(filter._id!)] || []).length > 0 && (
                  <button
                    onClick={() => onFilterChange(String(filter._id!), [])}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}