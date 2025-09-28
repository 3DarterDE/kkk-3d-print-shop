"use client";

import { useState } from 'react';
import ProductCard from './ProductCard';

interface TopSellerCarouselProps {
  products: any[];
  showNavigation?: boolean | "left" | "right";
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

export default function TopSellerCarousel({ products, showNavigation = true, currentIndex: externalCurrentIndex, onIndexChange }: TopSellerCarouselProps) {
  const [internalCurrentIndex, setInternalCurrentIndex] = useState(0);
  const currentIndex = externalCurrentIndex !== undefined ? externalCurrentIndex : internalCurrentIndex;
  const itemsPerPage = 6;

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Keine Bestseller Produkte gefunden.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(products.length / itemsPerPage);
  const currentProducts = products.slice(currentIndex, currentIndex + itemsPerPage);

  const nextSlide = () => {
    const newIndex = currentIndex + itemsPerPage >= products.length ? 0 : currentIndex + itemsPerPage;
    if (onIndexChange) {
      onIndexChange(newIndex);
    } else {
      setInternalCurrentIndex(newIndex);
    }
  };

  const prevSlide = () => {
    const newIndex = currentIndex - itemsPerPage < 0 ? Math.max(0, products.length - itemsPerPage) : currentIndex - itemsPerPage;
    if (onIndexChange) {
      onIndexChange(newIndex);
    } else {
      setInternalCurrentIndex(newIndex);
    }
  };

  const goToSlide = (index: number) => {
    const newIndex = index * itemsPerPage;
    if (onIndexChange) {
      onIndexChange(newIndex);
    } else {
      setInternalCurrentIndex(newIndex);
    }
  };

  if (showNavigation === "left") {
    // Left navigation button only
    return (
      <>
        {products.length > 1 && (
          <button
            onClick={prevSlide}
            className="w-[45px] h-[25px] bg-gray-400 hover:bg-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-400 flex items-center justify-center rounded-sm"
            aria-label="Vorherige Produkte"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </>
    );
  }

  if (showNavigation === "right") {
    // Right navigation button only
    return (
      <>
        {products.length > 1 && (
          <button
            onClick={nextSlide}
            className="w-[45px] h-[25px] bg-gray-400 hover:bg-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-400 flex items-center justify-center rounded-sm"
            aria-label="Nächste Produkte"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </>
    );
  }

  return (
    <div className="relative">
      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-1 relative z-10">
        {currentProducts.map((product) => (
          <ProductCard key={product._id} product={product} variant="carousel" />
        ))}
      </div>
    </div>
  );
}
