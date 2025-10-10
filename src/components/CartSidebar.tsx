"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";
import { getOptimizedImageUrl, getContextualImageSize } from "@/lib/image-utils";
import { withCursorPointer } from '@/lib/cursor-utils';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clear = useCartStore((state) => state.clear);
  const validateItems = useCartStore((state) => state.validateItems);
  const [isValidating, setIsValidating] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState('100%');

  useEffect(() => {
    const updateWidth = () => {
      if (window.innerWidth >= 768) {
        setSidebarWidth('434px');
      } else {
        setSidebarWidth('100%');
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  
  // Versandkosten berechnen: unter 80€ = 4,95€, ab 80€ kostenlos
  const shippingCosts = total < 8000 ? 495 : 0; // 8000 Cent = 80€, 495 Cent = 4,95€
  const finalTotal = total + shippingCosts;

  // Validate items on mount and when items change
  useEffect(() => {
    if (items.length > 0) {
      validateItems();
    }
  }, [items.length, validateItems]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when sidebar is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleValidateCart = async () => {
    if (items.length === 0) return;
    
    setIsValidating(true);
    try {
      await validateItems();
    } catch (error) {
      console.error('Error validating cart:', error);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: sidebarWidth }}
      >
        {/* Einfahren Button - links von der Sidebar (nur auf Desktop) */}
        {isOpen && (
          <button
            onClick={onClose}
            className={withCursorPointer("hidden md:flex absolute left-[-60px] top-1/2 transform -translate-y-1/2 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-l-lg shadow-lg transition-colors duration-200 items-center justify-center")}
            aria-label="Warenkorb einfahren"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase">Warenkorb</h2>
          <button
            onClick={onClose}
            className={withCursorPointer("text-white hover:text-gray-200 transition-colors")}
            aria-label="Warenkorb schließen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full relative">
          {items.length === 0 ? (
            /* Empty Cart */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Warenkorb ist leer</h3>
              <p className="text-gray-600 text-sm mb-4">Füge Artikel zu deinem Warenkorb hinzu</p>
              <Link 
                href="/shop" 
                onClick={onClose}
                className={withCursorPointer("inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors")}
              >
                Jetzt einkaufen
              </Link>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {items.map((item, index) => (
                  <div key={`${item.slug}-${index}`}>
                     <div className="flex items-start space-x-3 py-3">
                       {/* Product Image */}
                       <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                         {item.image ? (
                           <img
                             src={getOptimizedImageUrl(item.image, getContextualImageSize('thumbnail'), item.imageSizes, 0)}
                             alt={item.title}
                             className="w-full h-full object-cover"
                             loading="lazy"
                           />
                         ) : (
                           <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                             <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                             </svg>
                           </div>
                         )}
                       </div>
                       
                       {/* Product Details */}
                       <div className="flex-1 min-w-0">
                         <Link href={`/${item.slug}`} onClick={onClose} className="hover:opacity-80 transition-opacity">
                           <h3 
                             className="text-base font-semibold text-gray-900 mb-1 leading-tight truncate hover:text-blue-600 transition-colors"
                             title={item.title}
                           >
                             {item.title}
                           </h3>
                         </Link>
                         
                         <div className="flex items-center space-x-2 mb-1">
                           <span className="text-sm text-gray-600">Menge:</span>
                           <div className="flex items-center space-x-1">
                             <button
                               onClick={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 updateQuantity(item.slug, item.variations, item.quantity - 1);
                               }}
                               disabled={item.quantity <= 1}
                               className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                                 item.quantity <= 1
                                   ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                   : withCursorPointer('text-gray-600 hover:text-gray-800 hover:bg-gray-200')
                               }`}
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                               </svg>
                             </button>
                             <span className="text-sm font-medium text-gray-900 min-w-[20px] text-center">
                               {item.quantity}
                             </span>
                             <button
                               onClick={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 updateQuantity(item.slug, item.variations, item.quantity + 1);
                               }}
                               disabled={(item.stockQuantity || 0) > 0 ? item.quantity >= (item.stockQuantity || 0) : true}
                               className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                                 (item.stockQuantity || 0) > 0 && item.quantity >= (item.stockQuantity || 0)
                                   ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                   : withCursorPointer('text-gray-600 hover:text-gray-800 hover:bg-gray-200')
                               }`}
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                               </svg>
                             </button>
                           </div>
                         </div>
                         
                         {item.variations && Object.keys(item.variations).length > 0 && (
                           <div className="text-sm text-gray-600 mb-1">
                             {Object.entries(item.variations).map(([key, value]) => (
                               <span key={key}>
                                 {key}: {value}
                                 {Object.keys(item.variations!).length > 1 && Object.keys(item.variations!).indexOf(key) < Object.keys(item.variations!).length - 1 && ', '}
                               </span>
                             ))}
                           </div>
                         )}
                       </div>
                      
                      {/* Price and Remove Button */}
                      <div className="flex flex-col items-end space-y-1">
                        <div className="text-base font-bold text-gray-900">
                          {((item.price * item.quantity) / 100).toFixed(2)} €
                        </div>
                        <button
                          onClick={() => removeItem(item.slug, item.variations)}
                          className={withCursorPointer("text-blue-600 hover:text-red-800 transition-colors p-1")}
                          title="Entfernen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {/* Trennstrich zwischen Produkten */}
                    {index < items.length - 1 && (
                      <hr className="border-gray-200" />
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 mb-45">
                <div className="space-y-2">
                  <div className="flex justify-between text-base text-gray-600">
                    <span>Zwischensumme</span>
                    <span>{(total / 100).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-base text-gray-600">
                    <span>Versandkosten</span>
                    <span className={shippingCosts > 0 ? "text-gray-600" : "text-green-600 font-medium"}>
                      {shippingCosts > 0 ? `${(shippingCosts / 100).toFixed(2)} €` : "Kostenlos"}
                    </span>
                  </div>
                  
                  {/* Versandkosten-Hinweis */}
                  {shippingCosts > 0 && (
                    <div className="text-xs text-gray-500 bg-gray-100 rounded p-2">
                      💡 Füge noch {((8000 - total) / 100).toFixed(2)}€ hinzu für kostenlosen Versand
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-xl font-bold text-gray-900">
                    <div className="flex items-center space-x-2">
                      <span>Insgesamt</span>
                      <div className="relative group">
                        <svg className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-sm rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          <div className="text-center">
                            Alle Preise sind Endpreise zzgl. Versandkosten. Gemäß § 19 UStG wird keine Umsatzsteuer erhoben und ausgewiesen.
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                    <span>{(finalTotal / 100).toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* Checkout Buttons - Positioned above taskbar */}
              <div className="absolute bottom-16 left-4 right-4 bg-white border-t border-gray-200 pt-4 space-y-2 shadow-lg rounded-lg">
                <button
                  onClick={() => {
                    onClose();
                    window.location.href = '/cart';
                  }}
                  className={withCursorPointer("w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors uppercase text-base")}
                >
                  Zum Warenkorb
                </button>
                <button
                  onClick={() => {
                    onClose();
                    window.location.href = '/checkout';
                  }}
                  className={withCursorPointer("w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors uppercase text-base")}
                >
                  Bestellung
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
