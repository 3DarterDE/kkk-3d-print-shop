"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Brand {
  id: string;
  name: string;
  logo: string;
  url: string;
}

interface BrandsCarouselProps {
  brands: Brand[];
}

export default function BrandsCarousel({ brands }: BrandsCarouselProps) {
  const [translateX, setTranslateX] = useState(0);

  // Automatisches Scrollen von rechts nach links (pixelweise)
  useEffect(() => {
    if (brands.length <= 6) return; // Nur scrollen wenn mehr als 6 Marken

    const interval = setInterval(() => {
      setTranslateX((prev) => {
        const brandWidth = 200; // Breite einer Marke inkl. Gap
        const newTranslateX = prev - 0.5; // 0.5 Pixel nach links für flüssigere Bewegung
        
        // Kontinuierliches Scrollen - springe zurück wenn wir 1/3 der Gesamtbreite durchgescrollt haben
        // Da wir 3x die gleichen Marken haben, ist der Sprung unsichtbar
        const totalWidth = brands.length * brandWidth; // Breite aller ursprünglichen Marken
        if (Math.abs(newTranslateX) >= totalWidth) {
          return 0;
        }
        
        return newTranslateX;
      });
    }, 16); // Alle 16ms für 60fps flüssige Bewegung

    return () => clearInterval(interval);
  }, [brands.length]);

  if (brands.length === 0) {
    return null;
  }

  // Erstelle eine erweiterte Liste für nahtloses Scrollen nur wenn genug Marken vorhanden sind
  const extendedBrands = brands.length > 6 ? [...brands, ...brands, ...brands] : brands;

  return (
    <section className="bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-8">
          <div className="flex items-center">
            <div className="flex-1 h-px bg-gray-300"></div>
            <h2 className="text-3xl font-bold text-gray-900 mx-4">Beliebte Marken</h2>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>
        </div>
        
        <div className="relative overflow-hidden">
          <div 
            className="flex gap-4"
            style={{
              transform: `translateX(${translateX}px)`,
              width: `${extendedBrands.length * 200}px`, // Gesamtbreite
              transition: 'none' // Keine CSS-Transition für flüssige Animation
            }}
          >
            {extendedBrands.map((brand, index) => (
              <Link
                key={`${brand.id}-${index}`}
                href={brand.url}
                className="flex-shrink-0 w-48 h-20 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex items-center justify-center border border-gray-200 hover:border-gray-300"
              >
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="max-w-full max-h-full object-contain p-2"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
