"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";
import Logo from "./Logo";
import SearchBar from "./SearchBar";
import { useState, useEffect } from "react";
import { TiShoppingCart } from "react-icons/ti";

export default function Navbar() {
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
          {/* Logo Section - bleibt unverändert */}
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

          {/* Cart & Mobile Menu */}
          <div className="flex items-center gap-6">
            {/* Cart Button - clean design */}
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

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-white hover:text-blue-200 transition-all duration-300 hover:drop-shadow-[0_0_6px_rgba(173,216,230,0.6)]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 bg-black/95 backdrop-blur-sm">
            {/* Mobile Search Bar */}
            <div className="px-4 py-4 border-b border-blue-200/50">
              <SearchBar 
                placeholder="Luke Littler, Dartpfeile..."
                maxResults={4}
              />
            </div>
            
            <nav className="px-4 py-4 space-y-1">
              {[
                { href: "/", label: "Startseite" },
                { href: "/shop", label: "Shop" },
                { href: "/blog", label: "Blog" },
                { href: "/kontakt", label: "Kontakt" }
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 text-white hover:text-blue-200 hover:bg-white/10 rounded-lg transition-all duration-300 hover:text-shadow-[0_0_6px_rgba(173,216,230,0.6)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}