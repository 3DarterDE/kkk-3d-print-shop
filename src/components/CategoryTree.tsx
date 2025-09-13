"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  subcategories?: Category[];
}

interface CategoryTreeProps {
  categories: Category[];
  selectedCategory?: string;
  selectedSubcategory?: string;
}

export default function CategoryTree({ categories, selectedCategory, selectedSubcategory }: CategoryTreeProps) {
  const router = useRouter();

  const handleCategoryClick = (categorySlug?: string, subcategorySlug?: string) => {
    let url = '/shop';
    if (categorySlug) {
      url += `?category=${categorySlug}`;
      if (subcategorySlug) {
        url += `&subcategory=${subcategorySlug}`;
      }
    }
    
    // Use router.push to update URL and trigger re-render
    router.push(url);
  };

  return (
    <nav className="space-y-2">
      <button
        onClick={() => handleCategoryClick()}
        className={`w-full text-left block px-3 py-2 rounded-md text-sm ${
          !selectedCategory
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        Alle Produkte
      </button>
      
      {categories.map((category) => (
        <div key={category._id}>
          <div className="flex items-center">
            <button
              onClick={() => handleCategoryClick(category.slug)}
              className={`flex-1 text-left px-3 py-2 rounded-md text-sm ${
                selectedCategory === category.slug
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category.name}
            </button>
          </div>
          
          {/* Subcategories - Show when category is selected */}
          {selectedCategory === category.slug && category.subcategories && category.subcategories.length > 0 && (
            <div className="ml-6 mt-1 space-y-1">
              {category.subcategories.map((subcategory) => (
                <button
                  key={subcategory._id}
                  onClick={() => handleCategoryClick(category.slug, subcategory.slug)}
                  className={`w-full text-left block px-3 py-2 rounded-md text-sm ${
                    selectedSubcategory === subcategory.slug
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {subcategory.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
