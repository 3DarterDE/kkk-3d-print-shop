"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";
import Logo from "./Logo";
import SearchBar from "./SearchBar";
import { useState, useEffect } from "react";
import { TiShoppingCart } from "react-icons/ti";
import { useRouter } from "next/navigation";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  subcategories?: Category[];
}

export default function Navbar() {
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load categories for mobile menu
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/shop/categories');
        if (response.ok) {
          const data = await response.json();
          const categoriesArray = Array.isArray(data.categories) ? data.categories : [];
          setCategories(categoriesArray);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Don't render until mounted to avoid hydration issues
  if (!isMounted) {
    return (
      <header 
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 shadow-md border-b border-blue-200/30"
        style={{
          background: 'linear-gradient(135deg, #1E40AF 0%,rgb(52, 120, 230) 10%,rgb(75, 142, 224) 25%,rgb(3, 27, 148) 60%,rgb(15, 3, 83) 100%)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
          <div className="h-16 flex items-center justify-between">
            {/* Logo Section */}
            <Link 
              href="/" 
              className="flex items-center gap-3 group"
            >
              <div className="relative group-hover:drop-shadow-[0_0_8px_rgba(173,216,230,0.6)] transition-all duration-150">
                <Logo variant="navbar" className="mb-0 transition-transform duration-300 group-hover:rotate-12 scale-125" />
              </div>
              <div className="flex flex-col -mt-1">
                <span className="font-bold text-xl text-white group-hover:text-shadow-[0_0_8px_rgba(173,216,230,0.6)] transition-all duration-150">
                  3DarterDE
                </span>
                <span className="text-sm text-white/80 -mt-1 group-hover:text-shadow-[0_0_6px_rgba(173,216,230,0.5)] transition-all duration-150">
                  Dartshop
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {[
                { href: "/", label: "Startseite" },
                { href: "/shop", label: "Shop" },
                { href: "/blog", label: "Blog" },
                { href: "/kontakt", label: "Kontakt" }
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white/90 hover:text-white transition-colors duration-200 font-medium"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Search Bar */}
            <div className="hidden lg:block flex-1 max-w-md mx-8">
              <SearchBar 
                maxResults={6}
              />
            </div>

            {/* Cart and Mobile Menu */}
            <div className="flex items-center space-x-4">
              <Link
                href="/cart"
                className="relative p-2 text-white hover:text-white/80 transition-colors duration-200"
              >
                <TiShoppingCart className="h-6 w-6" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-white hover:text-white/80 transition-colors duration-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 shadow-md border-b border-blue-200/30"
      style={{
        background: 'linear-gradient(135deg, #1E40AF 0%,rgb(52, 120, 230) 10%,rgb(75, 142, 224) 25%,rgb(3, 27, 148) 60%,rgb(15, 3, 83) 100%)',
        boxShadow: isScrolled ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
        <div className="h-16 flex items-center justify-between">
          {/* Mobile: Hamburger Menu + Logo zusammen */}
          <div className="md:hidden flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-white hover:text-blue-200 transition-all duration-300 hover:drop-shadow-[0_0_6px_rgba(173,216,230,0.6)]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
            
            <Link 
              href="/" 
              className="flex items-center gap-3 group"
            >
              <div className="relative group-hover:drop-shadow-[0_0_8px_rgba(173,216,230,0.6)] transition-all duration-150">
                <Logo variant="navbar" className="mb-0 transition-transform duration-300 group-hover:rotate-12 scale-125" />
              </div>
              <div className="flex flex-col -mt-1">
                <span className="font-bold text-xl text-white group-hover:text-shadow-[0_0_8px_rgba(173,216,230,0.6)] transition-all duration-150">
                  3DarterDE
                </span>
                <span className="text-sm text-white/80 -mt-1 group-hover:text-shadow-[0_0_6px_rgba(173,216,230,0.5)] transition-all duration-150">
                  Dartshop
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop: Logo Section */}
          <Link 
            href="/" 
            className="hidden md:flex items-center gap-3 group"
          >
            <div className="relative group-hover:drop-shadow-[0_0_8px_rgba(173,216,230,0.6)] transition-all duration-150">
              <Logo variant="navbar" className="mb-0 transition-transform duration-300 group-hover:rotate-12 scale-125" />
            </div>
            <div className="flex flex-col -mt-1">
              <span className="font-bold text-xl text-white group-hover:text-shadow-[0_0_8px_rgba(173,216,230,0.6)] transition-all duration-150">
                3DarterDE
              </span>
              <span className="text-sm text-white/80 -mt-1 group-hover:text-shadow-[0_0_6px_rgba(173,216,230,0.5)] transition-all duration-150">
                Dartshop
              </span>
            </div>
          </Link>

          {/* Desktop Navigation - minimalistisch */}
          <nav className="hidden md:flex items-center space-x-8">
            {[
              { href: "/", label: "Startseite" },
              { href: "/shop", label: "Shop" },
              { href: "/blog", label: "Blog" },
              { href: "/kontakt", label: "Kontakt" }
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative text-sm font-medium text-white group hover:scale-105 transition-all duration-300 hover:text-shadow-[0_0_6px_rgba(173,216,230,0.6)]"
              >
                {item.label}
                <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></div>
              </Link>
            ))}
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden lg:block flex-1 max-w-md mx-8">
            <SearchBar 
              placeholder="Luke Littler, , Boards..."
              maxResults={6}
            />
          </div>


          {/* Cart Button */}
          <div className="flex items-center">
            <Link 
              href="/cart" 
              className="relative flex items-center gap-2 text-white hover:text-blue-200 transition-all duration-300 group"
            >
              <div className="relative group-hover:drop-shadow-[0_0_6px_rgba(173,216,230,0.6)] transition-all duration-300">
                <TiShoppingCart className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 py-0.5 shadow-sm">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-sm font-medium text-white group-hover:text-shadow-[0_0_6px_rgba(173,216,230,0.6)] transition-all duration-300">Warenkorb</span>
            </Link>
          </div>
        </div>

        {/* Mobile Menu - Slide-in Kategorien */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>
            
            {/* Slide-in Panel */}
            <div className="relative bg-white w-80 h-full shadow-xl transform transition-transform duration-300 ease-in-out">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Kategorien</h3>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-4">
                <nav className="space-y-1">
                  <Link
                    href="/shop"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300 font-medium"
                  >
                    Alle Produkte
                  </Link>
                  
                  {/* Kategorien */}
                  {isLoadingCategories ? (
                    <div className="text-gray-500 px-4 py-2 text-sm">
                      Kategorien werden geladen...
                    </div>
                  ) : (
                    categories.map((category) => (
                      <button
                        key={category._id}
                        onClick={() => {
                          router.push(`/shop?category=${category.slug}`);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300 font-medium"
                      >
                        <div className="flex items-center gap-3">
                          {category.imageSizes?.small && (
                            <img
                              src={category.imageSizes.small}
                              alt={category.name}
                              className="w-6 h-6 object-cover rounded"
                            />
                          )}
                          <span>{category.name}</span>
                        </div>
                      </button>
                    ))
                  )}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}