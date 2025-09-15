"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface BreadcrumbProps {
  className?: string;
  category?: string;
  subcategory?: string;
  productName?: string;
}

export default function Breadcrumb({ className = "", category: propCategory, subcategory: propSubcategory, productName }: BreadcrumbProps) {
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(true);
  const category = propCategory || searchParams.get('category');
  const subcategory = propSubcategory || searchParams.get('subcategory');
  const filter = searchParams.get('filter');

  // Handle scroll visibility
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY ? 'down' : 'up';
      
      if (scrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
      href: `/shop?category=${category}` 
    });
  }

  // Add subcategory if present
  if (subcategory) {
    breadcrumbs.push({ 
      name: getSubcategoryName(subcategory), 
      href: `/shop?category=${category}&subcategory=${subcategory}` 
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
    <div className={`sticky top-[112px] z-20 bg-gray-50 border-b border-gray-200 py-3 transition-opacity duration-300 ${!isVisible ? 'opacity-0' : 'opacity-100'} ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center space-x-2 text-sm pl-4">
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
    </div>
  );
}
