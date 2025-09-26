"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";
import Logo from "./Logo";
import SearchBar from "./SearchBar";
import CustomerButton from "./CustomerButton";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from '@/lib/hooks/useAuth';
import { TiShoppingCart } from "react-icons/ti";
import { useRouter } from "next/navigation";
import CartSidebar from "./CartSidebar";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  subcategories?: Category[];
}

export default function Navbar() {
  const { isAdmin } = useAuth();
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const router = useRouter();

  // Memoized Logo component to prevent re-renders
  const MemoizedLogo = useMemo(() => (
    <Logo variant="navbar" className="mb-0 transition-transform duration-300 group-hover:rotate-12 scale-125" />
  ), []);

  // Optimized event handlers
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const toggleAdminMenu = useCallback(() => {
    setIsAdminMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const closeAdminMenu = useCallback(() => {
    setIsAdminMenuOpen(false);
  }, []);

  const toggleCart = useCallback(() => {
    setIsCartOpen(prev => !prev);
  }, []);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close admin menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isAdminMenuOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-admin-menu]')) {
          setIsAdminMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAdminMenuOpen]);

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


  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 shadow-md"
      style={{
        background: 'linear-gradient(115deg, #1E40AF 0%,rgb(52, 120, 230) 10%,rgb(75, 142, 224) 25%,rgb(14, 43, 187) 60%,rgb(3, 27, 148) 73.9%,rgb(0, 0, 0) 74%,rgb(0, 0, 0) 100%)',
        boxShadow: isScrolled ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
        <div className="h-16 flex items-center justify-between">
          {/* Mobile: Hamburger Menu + Logo zusammen */}
          <div className="md:hidden flex items-center gap-3">
            <button 
              onClick={toggleMobileMenu}
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
                {MemoizedLogo}
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
              {MemoizedLogo}
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
              maxResults={10}
            />
          </div>

          {/* Auth, Cart, Admin (if any) */}
          <div className="flex items-center gap-2">
            <CustomerButton />
            <button 
              onClick={toggleCart}
              className="relative flex items-center text-white hover:text-blue-200 transition-all duration-300 group"
              aria-label="Warenkorb öffnen"
            >
              <div className="relative group-hover:drop-shadow-[0_0_6px_rgba(173,216,230,0.6)] transition-all duration-300">
                <TiShoppingCart className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 py-0.5 shadow-sm">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
            </button>

            {isAdmin && (
              <div className="relative" data-admin-menu>
                <button
                  onClick={toggleAdminMenu}
                  className="p-2 text-white hover:text-blue-200 transition-all duration-300 group"
                  title="Admin-Bereich"
                  aria-label="Admin-Menü öffnen"
                >
                  {/* Hamburger icon for admin menu */}
                  <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>
                {isAdminMenuOpen && (
                  <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      href="/admin/dashboard"
                      onClick={closeAdminMenu}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Dashboard
                    </Link>
                    <Link
                      href="/admin/products"
                      onClick={closeAdminMenu}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Produkte
                    </Link>
                    <Link
                      href="/admin/categories"
                      onClick={closeAdminMenu}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Kategorien
                    </Link>
                    <Link
                      href="/admin/brands"
                      onClick={closeAdminMenu}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Marken
                    </Link>
                    <Link
                      href="/admin/orders"
                      onClick={closeAdminMenu}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Bestellungen
                    </Link>
                    <Link
                      href="/admin/returns"
                      onClick={closeAdminMenu}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 11-16 0" />
                      </svg>
                      Rücksendungen
                    </Link>
                    <Link
                      href="/admin/users"
                      onClick={closeAdminMenu}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      Benutzer
                    </Link>
                    <Link
                      href="/admin/filters"
                      onClick={closeAdminMenu}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      Filter
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>

          {/* Mobile Menu - Slide-in Kategorien */}
          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex">
              {/* Overlay */}
              <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
                onClick={closeMobileMenu}
              ></div>
              
              {/* Slide-in Panel */}
              <div className="relative bg-white w-80 h-full shadow-xl transform transition-transform duration-300 ease-in-out">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Kategorien</h3>
                  <button
                    onClick={closeMobileMenu}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-4">
                  {/* Mobile Auth Button */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <CustomerButton />
                  </div>
                  
                  <nav className="space-y-1">
                    <Link
                      href="/shop"
                      onClick={closeMobileMenu}
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
                            router.push(`/shop/${category.slug}`);
                            closeMobileMenu();
                          }}
                          className="w-full text-left px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300 font-medium"
                        >
                          <div className="flex items-center gap-3">
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

        {/* Cart Sidebar */}
        <CartSidebar isOpen={isCartOpen} onClose={closeCart} />
    </header>
  );
}