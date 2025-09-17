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
  showAvailableOnly = false,
  specialFilter
}: DynamicFiltersProps) {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(false);
  const [allFilters, setAllFilters] = useState<Filter[]>([]);
  const [originalRangeValues, setOriginalRangeValues] = useState<Record<string, { min: number; max: number }>>({});
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({});
  const [initialProducts, setInitialProducts] = useState<any[]>([]);

  // Toggle filter expansion
  const toggleFilter = (filterId: string) => {
    setExpandedFilters(prev => ({
      ...prev,
      [filterId]: !(prev[filterId] ?? true)
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

  // Reset initial products snapshot when view/category changes
  useEffect(() => {
    setInitialProducts([]);
  }, [categoryId]);

  // Take a one-time snapshot of the initial product set for the current view
  useEffect(() => {
    if (initialProducts.length === 0 && currentCategoryProducts.length > 0) {
      setInitialProducts(currentCategoryProducts);
    }
  }, [currentCategoryProducts, initialProducts.length]);

  // Determine which filters to show based on the initial snapshot only (stable while user toggles filters)
  useEffect(() => {
    if (allFilters.length === 0) return;

    const timeoutId = setTimeout(() => {
      if (initialProducts.length > 0 && Object.keys(productFilters).length > 0) {
        const relevantFilters = allFilters.filter((filter: Filter) => {
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
  }, [productFilters, allFilters, initialProducts]);

  // Function to count products for each filter option
  const getProductCountForOption = (filterId: string, optionValue: string) => {
    // Use initial snapshot for the current view (global or category), fallback to allProducts
    const productsToCheck = initialProducts.length > 0 ? initialProducts : allProducts;
    
    if (!productsToCheck || productsToCheck.length === 0) return 0;
    
    // Get all selected filters EXCEPT the current filter
    const otherSelectedFilters = { ...selectedFilters };
    delete otherSelectedFilters[filterId]; // Remove current filter to avoid double filtering
    
    const filteredProducts = productsToCheck.filter(product => {
      // Apply price filter first
      const effectivePrice = getEffectivePrice(product);
      if (effectivePrice < priceRange.min || effectivePrice > priceRange.max) {
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

      // Apply standard toggles (except the current filter which is an attribute-filter, so all apply)
      if (showTopSellers && !product.isTopSeller) return false;
      if (showSaleItems && !product.isOnSale) return false;
      if (showAvailableOnly && !isProductAvailable(product)) return false;

      // Apply all OTHER selected filters (excluding current filter)
      for (const [filterIdToCheck, filterValues] of Object.entries(otherSelectedFilters)) {
        if (filterValues && filterValues.length > 0) {
          const productFilterList = productFilters[product._id] || [];
          const productFilter = productFilterList.find((pf: any) => pf.filterId === filterIdToCheck);
          if (!productFilter) {
            return false; // Product doesn't have this filter at all
          }
          
          // Get filter type
          const filterType = allFilters.find(f => f._id === filterIdToCheck)?.type;
          
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
            // Multiselect filter: Check if product has ANY of the selected values for this filter (OR logic within filter)
            const hasAnyValue = filterValues.some((selectedValue: string) => 
              productFilter.values.includes(selectedValue)
            );
            
            if (!hasAnyValue) {
              return false;
            }
          }
        }
      }
      
      // Now check if this product has the specific option value we're counting
      const productFilterList = productFilters[product._id] || [];
      const productFilter = productFilterList.find((pf: any) => pf.filterId === filterId);
      if (!productFilter) {
        return false; // Product doesn't have this filter at all
      }
      
      // Check if product has this specific option value
      return productFilter.values.includes(optionValue);
    });
    
    return filteredProducts.length;
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
    <div className="space-y-6">
      {filters
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map((filter) => {
        const isExpanded = expandedFilters[filter._id!] ?? true; // Default to expanded
        const hasActiveFilter = (selectedFilters[filter._id!] || []).length > 0;
        
        return (
          <div key={filter._id} className="border-b border-gray-200 pb-4">
            <button
              onClick={() => toggleFilter(filter._id!)}
              className="flex items-center justify-between w-full text-left mb-3 hover:text-blue-600 transition-colors"
            >
              <h3 className="text-lg font-semibold">{filter.name}</h3>
              <div className="flex items-center space-x-2">
                {hasActiveFilter && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {(selectedFilters[filter._id!] || []).length}
                  </span>
                )}
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
                .map((option) => ({
                  ...option,
                  productCount: getProductCountForOption(filter._id!, option.value)
                }))
                .map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    name={`filter-${filter._id}`}
                    value={option.value}
                    checked={(selectedFilters[filter._id!] || []).includes(option.value)}
                    onChange={(e) => {
                      const newValues = e.target.checked ? [option.value] : [];
                      console.log('Select Filter Change:', {
                        filterId: filter._id,
                        filterName: filter.name,
                        optionValue: option.value,
                        checked: e.target.checked,
                        newValues,
                        currentSelectedFilters: selectedFilters[filter._id!] || []
                      });
                      onFilterChange(filter._id!, newValues);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                    <span>{option.name}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center">
                      {getProductCountForOption(filter._id!, option.value)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
          
          {filter.type === 'multiselect' && (
            <div className="space-y-1">
              {filter.options
                .map((option) => ({
                  ...option,
                  productCount: getProductCountForOption(filter._id!, option.value)
                }))
                .map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={(selectedFilters[filter._id!] || []).includes(option.value)}
                    onChange={(e) => {
                      const currentValues = selectedFilters[filter._id!] || [];
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter(v => v !== option.value);
                      console.log('Multiselect Filter Change:', {
                        filterId: filter._id,
                        filterName: filter.name,
                        optionValue: option.value,
                        checked: e.target.checked,
                        currentValues,
                        newValues,
                        allSelectedFilters: selectedFilters
                      });
                      onFilterChange(filter._id!, newValues);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-1 text-sm text-gray-700 flex items-center justify-between w-full">
                    <span>{option.name}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center">
                      {getProductCountForOption(filter._id!, option.value)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {filter.type === 'text' && (
            <input
              type="text"
              placeholder={`${filter.name} eingeben...`}
              value={(selectedFilters[filter._id!] || [])[0] || ''}
              onChange={(e) => {
                const newValues = e.target.value ? [e.target.value] : [];
                onFilterChange(filter._id!, newValues);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {filter.type === 'number' && (
            <input
              type="number"
              placeholder={`${filter.name} eingeben...`}
              value={(selectedFilters[filter._id!] || [])[0] || ''}
              onChange={(e) => {
                const newValues = e.target.value ? [e.target.value] : [];
                onFilterChange(filter._id!, newValues);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {filter.type === 'range' && (() => {
            const rangeValues = getRangeValues(filter._id!);
            const currentValues = selectedFilters[filter._id!] || [];
            const minValue = currentValues[0] ? parseFloat(currentValues[0]) : rangeValues.min;
            const maxValue = currentValues[1] ? parseFloat(currentValues[1]) : rangeValues.max;
            
            
            return (
              <div className="space-y-3">
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
                            onFilterChange(filter._id!, []);
                          } else {
                            onFilterChange(filter._id!, [clampedValue.toString(), maxValue.toString()]);
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
                            onFilterChange(filter._id!, []);
                          } else {
                            onFilterChange(filter._id!, [minValue.toString(), clampedValue.toString()]);
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
                
                {/* Current selection display */}
                <div className="text-center text-sm text-gray-600">
                  <span className="font-medium">{minValue.toFixed(0)}</span>
                  <span className="mx-2">-</span>
                  <span className="font-medium">{maxValue.toFixed(0)}</span>
                </div>
              </div>
            );
          })()}

          {filter.type === 'color' && (
            <div className="flex flex-wrap gap-2">
              {filter.options
                .map((option) => ({
                  ...option,
                  productCount: getProductCountForOption(filter._id!, option.value)
                }))
                .map((option) => {
                  const isSelected = (selectedFilters[filter._id!] || []).includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        const currentValues = selectedFilters[filter._id!] || [];
                        const newValues = isSelected
                          ? currentValues.filter(v => v !== option.value)
                          : [...currentValues, option.value];
                        console.log('Color Filter Change:', {
                          filterId: filter._id,
                          filterName: filter.name,
                          optionValue: option.value,
                          isSelected,
                          currentValues,
                          newValues,
                          allSelectedFilters: selectedFilters
                        });
                        onFilterChange(filter._id!, newValues);
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                        isSelected 
                          ? 'border-gray-800 shadow-lg' 
                          : 'border-gray-300 hover:border-gray-500'
                      }`}
                      style={{ backgroundColor: option.color || '#000000' }}
                      title={`${option.name} (${getProductCountForOption(filter._id!, option.value)})`}
                    />
                  );
                })}
            </div>
          )}

                {/* Clear filter button */}
                {(selectedFilters[filter._id!] || []).length > 0 && (
                  <button
                    onClick={() => onFilterChange(filter._id!, [])}
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
