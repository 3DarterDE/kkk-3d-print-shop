"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";
import { getOptimizedImageUrl, getContextualImageSize } from "@/lib/image-utils";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clear = useCartStore((state) => state.clear);
  const validateItems = useCartStore((state) => state.validateItems);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  // Create a stable validation function
  const validateCart = useCallback(async () => {
    if (items.length === 0) return;
    
    setIsValidating(true);
    setValidationMessage("Überprüfe Produktverfügbarkeit...");
    
    try {
      await validateItems();
      setValidationMessage("");
    } catch (error) {
      setValidationMessage("Fehler bei der Validierung der Produkte");
    } finally {
      setIsValidating(false);
    }
  }, [items.length, validateItems]);

  // Silent validation on mount (no UI feedback)
  useEffect(() => {
    if (items.length > 0) {
      validateItems();
    }
  }, []); // Only run once on mount

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Warenkorb</h1>
                <p className="text-gray-600">Verwalte deine ausgewählten Artikel</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Artikel im Warenkorb</div>
              <div className="text-2xl font-bold text-blue-600">{totalQuantity}</div>
            </div>
          </div>
        </div>

        
        {items.length === 0 ? (
          /* Empty Cart */
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Dein Warenkorb ist leer</h2>
            <p className="text-gray-600 mb-8">Entdecke unsere Produkte und füge Artikel zu deinem Warenkorb hinzu</p>
            <Link 
              href="/shop" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Jetzt einkaufen
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((i, index) => (
                <div key={`${i.slug}-${index}`} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-start space-x-4">
                    {/* Product Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      {i.image ? (
                        <img
                          src={getOptimizedImageUrl(i.image, getContextualImageSize('thumbnail'), i.imageSizes, 0)}
                          alt={i.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{i.title}</h3>
                      
                      {i.variations && Object.keys(i.variations).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {Object.entries(i.variations).map(([key, value]) => (
                            <span 
                              key={key} 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600 font-medium">Menge:</span>
                          <div className="flex items-center border border-gray-300 rounded-lg">
                            <button
                              onClick={() => updateQuantity(i.slug, i.variations, i.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-l-lg transition-colors cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                            <div className="w-12 h-8 flex items-center justify-center text-sm font-medium text-gray-900 bg-white border-x border-gray-300">
                              {i.quantity}
                            </div>
                            <button
                              onClick={() => updateQuantity(i.slug, i.variations, i.quantity + 1)}
                              disabled={(i.stockQuantity || 0) > 0 ? i.quantity >= (i.stockQuantity || 0) : true}
                              className={`w-8 h-8 flex items-center justify-center rounded-r-lg transition-colors ${
                                (i.stockQuantity || 0) > 0 && i.quantity >= (i.stockQuantity || 0)
                                  ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 cursor-pointer'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Price and Actions */}
                    <div className="flex flex-col items-end space-y-3">
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          {((i.price * i.quantity) / 100).toFixed(2)} €
                        </div>
                        <div className="text-sm text-gray-500">
                          {(i.price / 100).toFixed(2)} € pro Stück
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeItem(i.slug, i.variations)}
                        className="flex items-center px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Entfernen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Bestellübersicht
                </h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Zwischensumme ({totalQuantity} Artikel)</span>
                    <span>{(total / 100).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Versandkosten</span>
                    <span className="text-green-600 font-medium">Kostenlos</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>Gesamt</span>
                      <span>{(total / 100).toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link 
                    href="/checkout" 
                    className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Zur Kasse gehen
                  </Link>
                  
                  <button
                    onClick={validateCart}
                    disabled={isValidating}
                    className="w-full flex items-center justify-center px-6 py-3 border border-blue-300 text-blue-700 font-medium rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isValidating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                        {validationMessage || "Überprüfe..."}
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Aktualisieren
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={clear}
                    className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Warenkorb leeren
                  </button>
                </div>

                {/* Security Info */}
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-sm text-green-800 font-medium">Sichere Bezahlung</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">SSL-verschlüsselt und sicher</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


