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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-blue-200/50" 
          : "bg-white/90 backdrop-blur-sm shadow-md border-b border-blue-200/30"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Logo Section - bleibt unverändert */}
          <Link 
            href="/" 
            className="flex items-center gap-3 group transition-all duration-300 hover:scale-105"
          >
            <div className="relative">
              <Logo variant="navbar" className="mb-0 transition-transform duration-300 group-hover:rotate-12" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm"></div>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent group-hover:from-blue-500 group-hover:to-blue-400 transition-all duration-300">
              3DarterDE
            </span>
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
                className="relative text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors duration-300 group"
              >
                {item.label}
                <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></div>
              </Link>
            ))}
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden lg:block flex-1 max-w-md mx-8">
            <SearchBar 
              placeholder="Luke Littler, Dartpfeile, Boards..."
              maxResults={6}
            />
          </div>

          {/* Cart & Mobile Menu */}
          <div className="flex items-center gap-6">
            {/* Cart Button - clean design */}
            <Link 
              href="/cart" 
              className="relative flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors duration-300 group"
            >
              <div className="relative">
                <TiShoppingCart className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 py-0.5 shadow-sm">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-sm font-medium">Warenkorb</span>
            </Link>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors duration-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-blue-200/50 bg-white/95 backdrop-blur-sm">
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
                  className="block px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-300"
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