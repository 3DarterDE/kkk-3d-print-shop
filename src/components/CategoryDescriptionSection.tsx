"use client";

import { useState, useEffect } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  imageSizes?: {
    main: string;
    thumb: string;
    small: string;
  };
}

interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

interface CategoryDescriptionSectionProps {
  currentCategory?: Category | null;
  currentBrand?: Brand | null;
}

export default function CategoryDescriptionSection({ 
  currentCategory, 
  currentBrand 
}: CategoryDescriptionSectionProps) {
  const [categoryData, setCategoryData] = useState<Category | null>(null);
  const [brandData, setBrandData] = useState<Brand | null>(null);

  useEffect(() => {
    if (currentCategory) {
      setCategoryData(currentCategory);
    }
    if (currentBrand) {
      setBrandData(currentBrand);
    }
  }, [currentCategory, currentBrand]);

  // Don't render if no category or brand data
  if (!categoryData && !brandData) {
    return null;
  }

  const displayData = categoryData || brandData;
  const isCategory = !!categoryData;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Trennstrich */}
      <div className="border-t border-gray-300 mb-8"></div>
      
      {/* Beschreibung mit schönerem Design */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <div className="flex items-start space-x-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              {displayData?.name}
            </h2>
            
            {displayData?.description ? (
              <div className="text-gray-700 leading-relaxed [&_p]:mb-3 [&_p]:text-sm [&_h1]:text-base [&_h1]:mb-3 [&_h1]:font-semibold [&_h1+ul]:mt-0 [&_h1+ol]:mt-0 [&_h2]:text-sm [&_h2]:mb-2 [&_h2]:font-semibold [&_h2+ul]:mt-0 [&_h2+ol]:mt-0 [&_h3]:text-sm [&_h3]:mb-2 [&_h3]:font-semibold [&_h3+ul]:mt-0 [&_h3+ol]:mt-0 [&_h4]:text-sm [&_h4]:mb-2 [&_h4]:font-semibold [&_h4+ul]:mt-0 [&_h4+ol]:mt-0 [&_h5]:text-sm [&_h5]:mb-2 [&_h5]:font-semibold [&_h5+ul]:mt-0 [&_h5+ol]:mt-0 [&_h6]:text-sm [&_h6]:mb-2 [&_h6]:font-semibold [&_h6+ul]:mt-0 [&_h6+ol]:mt-0 [&_ul]:mb-3 [&_ul]:mt-0 [&_ol]:mb-3 [&_ol]:mt-0 [&_li]:text-sm [&_li]:mb-1 [&_hr]:my-4 [&_hr]:border-gray-300">
                <MarkdownRenderer content={displayData.description} />
              </div>
            ) : (
              <div className="text-gray-600 italic bg-white/50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">
                    {isCategory 
                      ? 'Eine detaillierte Beschreibung für diese Kategorie ist in Arbeit und wird bald verfügbar sein.'
                      : 'Eine detaillierte Beschreibung für diese Marke ist in Arbeit und wird bald verfügbar sein.'
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
