/**
 * Helper functions for managing product variations
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
 * Add a "Standard" option to variations that refers to the main product stock
 * @param variations - Array of variations
 * @param mainStockQuantity - The main product stock quantity
 * @returns Updated variations with "Standard" options
 */
export function addStandardOptionsToVariations(
  variations: Variation[],
  mainStockQuantity: number
): Variation[] {
  return variations.map(variation => ({
    ...variation,
    options: [
      // Add "Standard" option first
      {
        value: "Standard",
        priceAdjustment: 0,
        inStock: mainStockQuantity > 0,
        stockQuantity: mainStockQuantity
      },
      // Then add existing options
      ...variation.options
    ]
  }));
}

/**
 * Remove "Standard" options from variations (useful for admin editing)
 * @param variations - Array of variations
 * @returns Variations without "Standard" options
 */
export function removeStandardOptionsFromVariations(variations: Variation[]): Variation[] {
  return variations.map(variation => ({
    ...variation,
    options: variation.options.filter(option => option.value !== "Standard")
  }));
}

/**
 * Check if a variation has a "Standard" option
 * @param variation - The variation to check
 * @returns True if the variation has a "Standard" option
 */
export function hasStandardOption(variation: Variation): boolean {
  return variation.options.some(option => option.value === "Standard");
}
