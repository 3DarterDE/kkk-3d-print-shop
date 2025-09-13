/**
 * Utility functions for handling variation-specific stock quantities
 */

export interface VariationOption {
  value: string;
  priceAdjustment?: number;
  inStock?: boolean;
  stockQuantity?: number;
}

export interface Variation {
  name: string;
  options: VariationOption[];
}

/**
 * Get the stock quantity for a specific variation combination
 * @param product - The product object
 * @param selectedVariations - The currently selected variations
 * @returns The stock quantity for the selected variations, or the main product stock if no variation-specific stock
 */
export function getStockQuantityForVariations(
  product: { stockQuantity: number; variations?: Variation[] },
  selectedVariations: Record<string, string>
): number {
  // If no variations are selected, return main product stock
  if (!product.variations || product.variations.length === 0) {
    return product.stockQuantity || 0;
  }

  // If variations exist, only use variation-specific stock
  for (const variation of product.variations) {
    const selectedValue = selectedVariations[variation.name];
    
    if (selectedValue) {
      const selectedOption = variation.options.find(option => option.value === selectedValue);
      
      if (selectedOption && selectedOption.stockQuantity !== undefined) {
        return selectedOption.stockQuantity;
      }
    }
  }

  // If no variation-specific stock found and variations exist, return 0
  return 0;
}

/**
 * Check if a specific variation combination is in stock
 * @param product - The product object
 * @param selectedVariations - The currently selected variations
 * @returns True if the selected variations are in stock
 */
export function isVariationInStock(
  product: { inStock: boolean; stockQuantity: number; variations?: Variation[] },
  selectedVariations: Record<string, string>
): boolean {
  // If no variations are selected, return main product stock status
  if (!product.variations || product.variations.length === 0) {
    return product.inStock && (product.stockQuantity || 0) > 0;
  }

  // If variations exist, only check variation-specific stock
  for (const variation of product.variations) {
    const selectedValue = selectedVariations[variation.name];
    if (selectedValue) {
      const selectedOption = variation.options.find(option => option.value === selectedValue);
      if (selectedOption) {
        // If this option has specific stock settings, use them
        if (selectedOption.stockQuantity !== undefined) {
          return selectedOption.stockQuantity > 0;
        }
        // If this option has specific inStock setting, use it
        if (selectedOption.inStock !== undefined) {
          return selectedOption.inStock;
        }
      }
    } else {
      // If no variation is selected, return false
      return false;
    }
  }

  // If no variation-specific settings found and variations exist, return false
  return false;
}

/**
 * Get all available variation options with their stock information
 * @param product - The product object
 * @returns Array of variations with stock information
 */
export function getVariationsWithStockInfo(product: { stockQuantity: number; variations?: Variation[] }): Variation[] {
  if (!product.variations) return [];

  return product.variations.map(variation => ({
    ...variation,
    options: variation.options.map(option => ({
      ...option,
      // If no specific stock quantity is set, use 0 (variations must have specific stock)
      stockQuantity: option.stockQuantity !== undefined ? option.stockQuantity : 0,
      // If no specific inStock is set, use false (variations must have specific stock)
      inStock: option.inStock !== undefined ? option.inStock : false
    }))
  }));
}
