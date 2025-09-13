"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getOptimizedImageUrl, getContextualImageSize } from "@/lib/image-utils";
import { isVariationInStock } from "@/lib/variation-stock";

interface ProductCardProps {
  product: {
    _id: string;
    slug: string;
    title: string;
    price: number;
    offerPrice?: number;
    isOnSale: boolean;
    isTopSeller: boolean;
    inStock?: boolean;
    stockQuantity?: number;
    images: string[];
    imageSizes?: Array<{ main: string; thumb: string; small: string }>;
    tags?: string[];
    variations?: Array<{
      name: string;
      options: Array<{
        value: string;
        inStock?: boolean;
        stockQuantity?: number;
      }>;
    }>;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [hasStartedCycling, setHasStartedCycling] = useState(false);

  const images = product.images || [];
  const hasMultipleImages = images.length > 1;
  const imageCount = images.length;

  // Start cycling through images on hover
  useEffect(() => {
    if (isHovered && hasMultipleImages && imageCount > 0) {
      // First image change after 500ms (longer delay to avoid click conflicts)
      const firstTimeout = setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % imageCount);
        setHasStartedCycling(true);
        
        // Then continue with 1.5 second intervals (slower to reduce conflicts)
        const id = setInterval(() => {
          setCurrentImageIndex((prev) => (prev + 1) % imageCount);
        }, 1500);
        setIntervalId(id);
      }, 500);

      return () => {
        clearTimeout(firstTimeout);
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    } else {
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      setCurrentImageIndex(0); // Reset to first image when not hovering
      setHasStartedCycling(false);
    }
  }, [isHovered, hasMultipleImages, imageCount]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Check if product is out of stock (considering variations)
  const isOutOfStock = () => {
    // If no variations, use main product stock
    if (!product.variations || product.variations.length === 0) {
      return !product.inStock || (product.stockQuantity || 0) <= 0;
    }
    
    // If variations exist, check if any variation option is available
    // A product is available if at least one variation option is in stock
    const hasAvailableVariation = product.variations.some((variation: any) => 
      variation.options && variation.options.some((option: any) => {
        // Check if this option is in stock
        const optionInStock = option.inStock !== undefined ? option.inStock : true; // Default to true if not specified
        const optionStock = option.stockQuantity !== undefined ? option.stockQuantity : 0; // Default to 0 if not specified
        return optionInStock && optionStock > 0;
      })
    );
    
    return !hasAvailableVariation;
  };
  

  const handleClick = (e: React.MouseEvent) => {
    // Let the Link handle navigation for all products, even out of stock ones
    // The product page will handle the out of stock display
  };

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="block border rounded-lg overflow-hidden transition-all duration-200 border-gray-200 hover:shadow-md hover:border-gray-300"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {images.length > 0 ? (
          <>
            {images.map((image, index) => (
              <img
                key={`image-${index}`}
                src={getOptimizedImageUrl(
                  image, 
                  getContextualImageSize('shop-listing'), 
                  product.imageSizes, 
                  index
                )}
                alt={product.title}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-in-out ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
              />
            ))}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
        
        {/* Image indicator dots */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {images.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentImageIndex 
                    ? 'bg-white shadow-md' 
                    : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Sale badge */}
        {product.isOnSale && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
            Sale
          </div>
        )}


        {/* Out of stock badge */}
        {isOutOfStock() && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
            Nicht verfügbar
          </div>
        )}

      </div>
      
      <div className="p-4">
        <div className="font-semibold text-gray-900 mb-1 line-clamp-2">
          {product.title}
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-2 mb-2">
          {product.isOnSale && product.offerPrice ? (
            <>
              <span className="text-red-600 font-semibold">
                {(product.offerPrice / 100).toFixed(2)} €
              </span>
              <span className="line-through text-gray-400">
                {(product.price / 100).toFixed(2)} €
              </span>
            </>
          ) : (
            <span>{(product.price / 100).toFixed(2)} €</span>
          )}
        </div>
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.tags.slice(0, 3).map((tag: string, index: number) => (
              <span
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
