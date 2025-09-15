"use client";

import { useCartStore } from "@/lib/store/cart";
import { TiShoppingCart } from "react-icons/ti";

export default function AddToCartButton({ 
  slug, 
  title, 
  price, 
  quantity = 1,
  variations = {},
  disabled = false,
  inStock = true,
  stockQuantity = 0,
  image,
  imageSizes
}: { 
  slug: string; 
  title: string; 
  price: number; 
  quantity?: number;
  variations?: Record<string, string>;
  disabled?: boolean;
  inStock?: boolean;
  stockQuantity?: number;
  image?: string;
  imageSizes?: {
    main: string;
    thumb: string;
    small: string;
  }[];
}) {
  const addItem = useCartStore((s) => s.addItem);
  
  // Use the original title without variations
  const displayTitle = title;
  
  // Determine disabled state and message
  const isOutOfStock = inStock === false || (stockQuantity || 0) <= 0;
  const isDisabled = disabled || isOutOfStock || quantity > (stockQuantity || 0);
  const getDisabledMessage = () => {
    if (isOutOfStock) return 'Nicht verfügbar';
    if (quantity > (stockQuantity || 0)) return `Nur ${stockQuantity} verfügbar`;
    if (disabled) return 'Bitte wählen Sie alle Variationen';
    return 'In den Warenkorb';
  };
  
  return (
    <button
      onClick={() => addItem({ slug, title: displayTitle, price, quantity, variations, image, imageSizes, stockQuantity })}
      disabled={isDisabled}
      className={`w-full py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
        isDisabled 
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
          : 'bg-black text-white hover:bg-gray-800'
      }`}
    >
      {isOutOfStock ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <TiShoppingCart className="w-5 h-5" />
      )}
      {getDisabledMessage()}
    </button>
  );
}
