"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getStockQuantityForVariations, isVariationInStock } from "@/lib/variation-stock";

export type CartItem = { 
  slug: string; 
  title: string; 
  price: number; 
  quantity: number;
  variations?: Record<string, string>;
  image?: string;
  imageSizes?: {
    main: string;
    thumb: string;
    small: string;
  }[];
  stockQuantity?: number;
};

export type ProductValidationResult = {
  slug: string;
  exists: boolean;
  product: any | null;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (slug: string, variations?: Record<string, string>) => void;
  updateQuantity: (slug: string, variations: Record<string, string> | undefined, newQuantity: number) => void;
  clear: () => void;
  validateItems: () => Promise<void>;
  updateItemPrice: (slug: string, newPrice: number) => void;
  removeInvalidItems: (invalidSlugs: string[]) => void;
  syncFromStorage: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      return {
        items: [],
        addItem: (item) => {
          // Debug logging
          console.log('Adding item to cart:', item);
          
          // Create a unique key that includes variations for comparison
          const itemKey = `${item.slug}-${JSON.stringify(item.variations || {})}`;
          const exists = get().items.find((i) => 
            `${i.slug}-${JSON.stringify(i.variations || {})}` === itemKey
          );
          
          if (exists) {
            // Check if adding this quantity would exceed stock
            const currentQuantity = exists.quantity;
            const newQuantity = currentQuantity + item.quantity;
            const maxAllowed = exists.stockQuantity || 0;
            
            // Only adjust if maxAllowed is greater than 0 and newQuantity exceeds it
            if (maxAllowed > 0 && newQuantity > maxAllowed) {
              // Adjust to maximum allowed quantity
              set({
                items: get().items.map((i) =>
                  `${i.slug}-${JSON.stringify(i.variations || {})}` === itemKey 
                    ? { ...i, quantity: maxAllowed } 
                    : i
                ),
              });
            } else if (maxAllowed === 0) {
              // If no stock limit, just add the quantity
              set({
                items: get().items.map((i) =>
                  `${i.slug}-${JSON.stringify(i.variations || {})}` === itemKey 
                    ? { ...i, quantity: newQuantity } 
                    : i
                ),
              });
            } else {
              // Normal case: add quantity
              set({
                items: get().items.map((i) =>
                  `${i.slug}-${JSON.stringify(i.variations || {})}` === itemKey 
                    ? { ...i, quantity: newQuantity } 
                    : i
                ),
              });
            }
          } else {
            // Add new item with the correct price (already calculated with variations)
            set({ items: [...get().items, item] });
          }
          
          // Debug logging
          console.log('Cart after adding item:', get().items);
        },
        removeItem: (slug, variations) => {
          if (variations) {
            // Remove specific item with specific variations
            set({ 
              items: get().items.filter((i) => 
                !(i.slug === slug && JSON.stringify(i.variations) === JSON.stringify(variations))
              ) 
            });
          } else {
            // Remove all items with this slug
            set({ items: get().items.filter((i) => i.slug !== slug) });
          }
        },
        updateQuantity: (slug, variations, newQuantity) => {
          if (newQuantity <= 0) {
            // Remove item if quantity is 0 or negative
            get().removeItem(slug, variations);
            return;
          }
          
          set({
            items: get().items.map((item) => {
              if (item.slug === slug && JSON.stringify(item.variations) === JSON.stringify(variations)) {
                // Check if new quantity exceeds stock
                const maxAllowed = item.stockQuantity || 0;
                // Only limit if maxAllowed is greater than 0
                const adjustedQuantity = maxAllowed > 0 ? Math.min(newQuantity, maxAllowed) : newQuantity;
                return { ...item, quantity: adjustedQuantity };
              }
              return item;
            })
          });
        },
        clear: () => set({ items: [] }),
        validateItems: async () => {
          const items = get().items;
          if (items.length === 0) return;

          try {
            const slugs = items.map(item => item.slug);
            const response = await fetch('/api/shop/validate-products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slugs })
            });

            if (!response.ok) {
              console.error('Failed to validate products');
              return;
            }

            const { results } = await response.json();
            const invalidSlugs: string[] = [];
            const itemsToUpdate: CartItem[] = [];

            // Helper function to calculate price with variations
            const calculatePriceWithVariations = (product: any, variations: Record<string, string> = {}) => {
              let basePrice = product.isOnSale && product.offerPrice 
                ? product.offerPrice 
                : product.price;
              
              if (product.variations && variations) {
                product.variations.forEach((variation: any) => {
                  const selectedOption = variation.options.find((option: any) => 
                    option.value === variations[variation.name]
                  );
                  if (selectedOption && selectedOption.priceAdjustment) {
                    basePrice += selectedOption.priceAdjustment;
                  }
                });
              }
              
              return basePrice;
            };

            results.forEach((result: ProductValidationResult) => {
              if (!result.exists) {
                invalidSlugs.push(result.slug);
              } else if (result.product) {
                // Find all items with this slug (there might be multiple with different variations)
                const itemsWithThisSlug = items.filter(item => item.slug === result.slug);
                
                itemsWithThisSlug.forEach(currentItem => {
                  const correctPrice = calculatePriceWithVariations(result.product, currentItem.variations);
                  
                  // Check stock availability - use variation-specific stock if available
                  const availableStock = getStockQuantityForVariations(result.product, currentItem.variations || {});
                  const isOutOfStock = !isVariationInStock(result.product, currentItem.variations || {});
                  
                  // If out of stock, mark for removal
                  if (isOutOfStock) {
                    invalidSlugs.push(result.slug);
                    return;
                  }
                  
                  // If quantity exceeds available stock, adjust quantity
                  let adjustedQuantity = currentItem.quantity;
                  if (currentItem.quantity > availableStock) {
                    adjustedQuantity = availableStock;
                  }
                  
                  // Always update price to ensure it's current (handles price changes, sales, etc.)
                  // This ensures prices stay up-to-date even if product prices change
                  itemsToUpdate.push({
                    ...currentItem,
                    price: correctPrice,
                    title: result.product.title,
                    image: currentItem.image || result.product.images?.[0],
                    imageSizes: currentItem.imageSizes || result.product.imageSizes,
                    stockQuantity: availableStock,
                    quantity: adjustedQuantity
                  });
                });
              }
            });

            // Remove invalid items and update prices
            set({
              items: get().items
                .filter(item => !invalidSlugs.includes(item.slug))
                .map(item => {
                  const updatedItem = itemsToUpdate.find(updated => 
                    updated.slug === item.slug && 
                    JSON.stringify(updated.variations) === JSON.stringify(item.variations)
                  );
                  return updatedItem || item;
                })
            });

            // Show notification for removed items
            if (invalidSlugs.length > 0) {
              console.warn(`Removed ${invalidSlugs.length} invalid items from cart`);
              console.warn('Invalid slugs:', invalidSlugs);
            }

            // Show notification for price updates
            if (itemsToUpdate.length > 0) {
              console.warn(`Updated prices for ${itemsToUpdate.length} items in cart`);
            }

          } catch (error) {
            console.error('Error validating cart items:', error);
          }
        },
        updateItemPrice: (slug, newPrice) => {
          set({
            items: get().items.map(item =>
              item.slug === slug ? { ...item, price: newPrice } : item
            )
          });
        },
        removeInvalidItems: (invalidSlugs) => {
          set({
            items: get().items.filter(item => !invalidSlugs.includes(item.slug))
          });
        },
        syncFromStorage: () => {
          try {
            const stored = localStorage.getItem("cart");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.state && parsed.state.items) {
                set({ items: parsed.state.items });
              }
            }
          } catch (error) {
            console.error("Error syncing from storage:", error);
          }
        }
      };
    },
    { 
      name: "cart",
      onRehydrateStorage: () => (state) => {
        // Set up storage event listener for cross-tab synchronization
        if (typeof window !== "undefined") {
          const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "cart" && e.newValue) {
              try {
                const newData = JSON.parse(e.newValue);
                if (newData.state && newData.state.items) {
                  // Use the store's setState method directly
                  useCartStore.setState({ items: newData.state.items });
                }
              } catch (error) {
                console.error("Error parsing storage data:", error);
              }
            }
          };

          window.addEventListener("storage", handleStorageChange);
          
          // Cleanup function
          return () => {
            window.removeEventListener("storage", handleStorageChange);
          };
        }
      }
    }
  )
);