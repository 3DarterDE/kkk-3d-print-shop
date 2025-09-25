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
      <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl p-6 shadow-lg">
        <div>
          {/* Content */}
          <div>
            <h2 className="text-sm font-medium text-slate-800 mb-1">
              {isCategory ? 'Über diese Kategorie' : 'Über diese Marke'}: {displayData?.name}
            </h2>
            
            {displayData?.description ? (
              <div className="text-gray-600 text-sm leading-tight [&_p]:mb-0.5 [&_p]:text-sm [&_h1]:text-sm [&_h1]:mb-0.5 [&_h1+ul]:mt-0 [&_h1+ol]:mt-0 [&_h2]:text-sm [&_h2]:mb-0.5 [&_h2+ul]:mt-0 [&_h2+ol]:mt-0 [&_h3]:text-sm [&_h3]:mb-0.5 [&_h3+ul]:mt-0 [&_h3+ol]:mt-0 [&_h4]:text-sm [&_h4]:mb-0.5 [&_h4+ul]:mt-0 [&_h4+ol]:mt-0 [&_h5]:text-sm [&_h5]:mb-0.5 [&_h5+ul]:mt-0 [&_h5+ol]:mt-0 [&_h6]:text-sm [&_h6]:mb-0.5 [&_h6+ul]:mt-0 [&_h6+ol]:mt-0 [&_ul]:mb-0.5 [&_ul]:mt-0 [&_ol]:mb-0.5 [&_ol]:mt-0 [&_li]:text-sm [&_li]:mb-0 [&_hr]:my-3 [&_hr]:border-gray-300">
                <MarkdownRenderer content={displayData.description} />
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                {isCategory 
                  ? 'Eine detaillierte Beschreibung für diese Kategorie ist in Arbeit und wird bald verfügbar sein.'
                  : 'Eine detaillierte Beschreibung für diese Marke ist in Arbeit und wird bald verfügbar sein.'
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
