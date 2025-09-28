"use client";

import { useState } from "react";
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFlyingItem, setShowFlyingItem] = useState(false);
  const [flyAnimationStyle, setFlyAnimationStyle] = useState<React.CSSProperties>({});
  
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

  const handleAddToCart = (e: React.MouseEvent) => {
    if (isDisabled) return;
    
    // Start button animation
    setIsAnimating(true);
    
    // Add item to cart
    addItem({ slug, title: displayTitle, price, quantity, variations, image, imageSizes, stockQuantity });
    
    // Get button position for flying animation
    const buttonRect = e.currentTarget.getBoundingClientRect();
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const buttonCenterY = buttonRect.top + buttonRect.height / 2;
    
    // Find the actual cart icon position in the navbar
    const cartIcon = document.querySelector('[data-cart-icon]') || 
                     document.querySelector('svg[class*="shopping"]') || 
                     document.querySelector('button[class*="cart"]') ||
                     document.querySelector('a[href*="cart"]') ||
                     document.querySelector('[aria-label*="cart" i]') ||
                     document.querySelector('[aria-label*="warenkorb" i]');
    
    let targetX, targetY;
    
    if (cartIcon) {
      const cartRect = cartIcon.getBoundingClientRect();
      targetX = cartRect.left + cartRect.width / 2;
      targetY = cartRect.top + cartRect.height / 2;
    } else {
      // Fallback to approximate position if cart icon not found
      const isMobile = window.innerWidth < 768;
      targetX = window.innerWidth - (window.innerWidth * (isMobile ? 0.08 : 0.18));
      targetY = 20;
    }
    
    // Set animation style with calculated positions
    setFlyAnimationStyle({
      '--start-x': `${buttonCenterX}px`,
      '--start-y': `${buttonCenterY}px`,
      '--end-x': `${targetX}px`,
      '--end-y': `${targetY}px`,
    } as React.CSSProperties);
    
    // Start flying animation with calculated positions
    setShowFlyingItem(true);
    
    // Reset animations after duration
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
    
    setTimeout(() => {
      setShowFlyingItem(false);
    }, 1000);
  };
  
  return (
    <div className="relative">
      <button
        onClick={handleAddToCart}
        disabled={isDisabled}
        className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
          isDisabled 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : isAnimating
            ? 'bg-green-600 text-white scale-95'
            : 'bg-black text-white hover:bg-gray-800 hover:scale-105'
        }`}
      >
        {isOutOfStock ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <TiShoppingCart className={`w-5 h-5 transition-transform duration-300 ${isAnimating ? 'scale-110' : ''}`} />
        )}
        <span className={`transition-all duration-300 ${isAnimating ? 'text-green-100' : ''}`}>
          {isAnimating ? 'Hinzugefügt!' : getDisabledMessage()}
        </span>
      </button>

      {/* Flying item animation */}
      {showFlyingItem && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div 
            className="animate-fly-to-cart"
            style={flyAnimationStyle}
          >
            <TiShoppingCart className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      )}
    </div>
  );
}