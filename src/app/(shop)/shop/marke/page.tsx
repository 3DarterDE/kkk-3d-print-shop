"use client";

import { connectToDatabase } from "@/lib/mongodb";
import Brand from "@/lib/models/Brand";
import Link from "next/link";
import Image from "next/image";
import Breadcrumb from "@/components/Breadcrumb";
import { useState, useEffect } from "react";

export const dynamic = 'force-dynamic';

export default function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await fetch('/api/shop/brands');
        const data = await response.json();
        setBrands(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load brands:', error);
        setBrands([]);
      } finally {
        setLoading(false);
      }
    };

    loadBrands();
  }, []);

  // Handle scroll to hide breadcrumb behind search bar on mobile
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      // Hide breadcrumb when scrolled more than 20px
      setIsScrolled(scrollTop > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Marken...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Fixed Mobile Breadcrumb - direkt unter der Suchleiste, verschwindet beim Scrollen */}
      <div className={`fixed top-32 left-0 right-0 z-30 bg-white border-a border-gray-200 md:hidden transition-transform duration-250 ${
        isScrolled ? '-translate-y-full' : 'translate-y-0'
      }`}>
        <Breadcrumb />
      </div>

      {/* Desktop Breadcrumb - normal position */}
      <div className="hidden md:block">
        <Breadcrumb />
      </div>

      <div className="max-w-7xl mx-auto px-px md:px-4 py-8 pt-30 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Alle Marken</h1>
          <p className="text-gray-600">Entdecke unsere Partner und Marken</p>
        </div>

        {/* Brands Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {brands.map((brand) => (
            <Link
              key={brand._id}
              href={`/shop/marke/${brand.slug}`}
              className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-4 text-center"
            >
              <div className="aspect-square mb-3 flex items-center justify-center">
                {brand.imageSizes?.thumb || brand.image ? (
                  <Image
                    src={brand.imageSizes?.thumb || brand.image || ''}
                    alt={brand.name}
                    width={80}
                    height={80}
                    className="max-h-16 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-400 text-sm font-medium">
                      {brand.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                {brand.name}
              </h3>
            </Link>
          ))}
        </div>

        {/* Empty state */}
        {brands.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">Keine Marken gefunden</div>
            <p className="text-gray-500">Es sind noch keine Marken verfügbar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
