"use client";
import React from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

interface BreadcrumbProps {
  className?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  productName?: string;
}

export default function Breadcrumb({ className = "", category: propCategory, subcategory: propSubcategory, brand: propBrand, productName }: BreadcrumbProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Derive category/subcategory from props, query, or path (/shop/<cat>/<subcat>)
  let pathCategory: string | null = null;
  let pathSubcategory: string | null = null;
  if (pathname && pathname.startsWith('/shop/')) {
    const parts = pathname.split('/').filter(Boolean); // ["shop", "cat", "subcat?"]
    if (parts.length >= 2) pathCategory = parts[1];
    if (parts.length >= 3) pathSubcategory = parts[2];
  }

  const category = propCategory || searchParams.get('category') || pathCategory || null;
  const subcategory = propSubcategory || searchParams.get('subcategory') || pathSubcategory || null;
  const brand = propBrand || searchParams.get('brand') || null;
  const filter = searchParams.get('filter');

  // Get category name from URL or use slug
  const getCategoryName = (slug: string) => {
    // This would ideally fetch from API, but for now we'll use the slug
    const categoryNames: { [key: string]: string } = {
      'autodarts': 'Autodarts',
      'dartpfeile': 'Dartpfeile',
      'dartboards': 'Dartboards',
      'zubehor': 'Zubehör',
      'bekleidung': 'Bekleidung'
    };
    return categoryNames[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
  };

  const getSubcategoryName = (slug: string) => {
    // This would ideally fetch from API, but for now we'll use the slug
    const subcategoryNames: { [key: string]: string } = {
      'elektronische-dartboards': 'Elektronische Dartboards',
      'steel-dartboards': 'Steel Dartboards',
      'soft-dartboards': 'Soft Dartboards',
      'dartpfeile-steel': 'Steel Dartpfeile',
      'dartpfeile-soft': 'Soft Dartpfeile'
    };
    return subcategoryNames[slug] || slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  };

  const getFilterName = (filterValue: string) => {
    const filterNames: { [key: string]: string } = {
      'topseller': 'Top Seller',
      'sale': 'Sale',
      'neu': 'Neu'
    };
    return filterNames[filterValue] || filterValue;
  };

  const breadcrumbs = [
    { name: 'Startseite', href: '/' }
  ];

  // Add "Alle Produkte" for shop pages
  breadcrumbs.push({ name: 'Alle Produkte', href: '/shop' });

  // Add category if present
  if (category) {
    breadcrumbs.push({ 
      name: getCategoryName(category), 
      href: `/shop/${category}` 
    });
  }

  // Add subcategory if present
  if (subcategory) {
    breadcrumbs.push({ 
      name: getSubcategoryName(subcategory), 
      href: `/shop/${category}/${subcategory}` 
    });
  }

  // Add brand if present
  if (brand) {
    // First add "Marken" link
    breadcrumbs.push({ 
      name: "Marken", 
      href: "/shop/marke" 
    });
    
    // Then add specific brand
    breadcrumbs.push({ 
      name: brand.charAt(0).toUpperCase() + brand.slice(1).replace(/-/g, ' '), 
      href: `/shop/marke/${brand}` 
    });
  }

  // Add filter if present
  if (filter) {
    breadcrumbs.push({ 
      name: getFilterName(filter), 
      href: `/shop?filter=${filter}` 
    });
  }

  // Add product name if present (for product pages)
  if (productName) {
    breadcrumbs.push({ 
      name: productName, 
      href: '#' // No link for current page
    });
  }

  return (
    <div className={`bg-white border-b border-gray-200 py-2 px-4 max-w-7xl mx-auto ${className}`}>
      <nav className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((breadcrumb, index) => (
          <React.Fragment key={breadcrumb.href}>
            {index > 0 && (
              <svg 
                className="w-4 h-4 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="text-gray-900 font-medium">
                {breadcrumb.name}
              </span>
            ) : (
              <Link 
                href={breadcrumb.href}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                {breadcrumb.name}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
}
