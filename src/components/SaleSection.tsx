"use client";

import { useState } from 'react';
import TopSellerCarousel from './TopSellerCarousel';

interface SaleSectionProps {
  products: any[];
}

export default function SaleSection({ products }: SaleSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <section className="bg-white py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-8">
          <div className="flex items-center">
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className="flex items-center gap-4 mx-4">
              <TopSellerCarousel 
                products={products} 
                showNavigation="left" 
                currentIndex={currentIndex}
                onIndexChange={setCurrentIndex}
              />
              <h2 className="text-3xl font-bold text-gray-900">Im Angebot</h2>
              <TopSellerCarousel 
                products={products} 
                showNavigation="right" 
                currentIndex={currentIndex}
                onIndexChange={setCurrentIndex}
              />
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>
        </div>
        <TopSellerCarousel 
          products={products} 
          showNavigation={false} 
          currentIndex={currentIndex}
          onIndexChange={setCurrentIndex}
        />
      </div>
      <div className="mt-8">
        <div className="h-px bg-gray-300 w-full"></div>
      </div>
    </section>
  );
}
