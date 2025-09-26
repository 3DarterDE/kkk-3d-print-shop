"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";
import { getOptimizedImageUrl, getContextualImageSize } from "@/lib/image-utils";
import { useUserData } from "@/lib/contexts/UserDataContext";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clear = useCartStore((state) => state.clear);
  const validateItems = useCartStore((state) => state.validateItems);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [selectedPointsToRedeem, setSelectedPointsToRedeem] = useState(0);

  const { user } = useUserData();
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  // Bonuspunkte-Berechnung: 1000 Punkte = 5€
  const availablePoints = user?.bonusPoints || 0;
  const maxRedeemablePoints = Math.floor(availablePoints / 1000) * 1000; // Nur in 1000er-Schritten
  const redeemableAmount = Math.floor(maxRedeemablePoints / 1000) * 5; // 5€ pro 1000 Punkte
  
  // Bonuspunkte-Rabatt berechnen: Automatisch höchsten verfügbaren Rabatt nehmen
  const getPointsDiscount = (points: number, orderTotal: number) => {
    const maxDiscount = orderTotal - 1; // Mindestens 1 Cent zu bezahlen
    
    // Prüfe von höchstem zu niedrigstem Rabatt
    if (points >= 5000 && 50 * 100 <= maxDiscount) return 50 * 100; // 50€
    if (points >= 4000 && 35 * 100 <= maxDiscount) return 35 * 100; // 35€
    if (points >= 3000 && 20 * 100 <= maxDiscount) return 20 * 100; // 20€
    if (points >= 2000 && 10 * 100 <= maxDiscount) return 10 * 100; // 10€
    if (points >= 1000 && 5 * 100 <= maxDiscount) return 5 * 100;   // 5€
    
    return 0;
  };
  
  // Prüfe ob noch mehr Punkte eingelöst werden könnten
  const getRemainingPointsInfo = (availablePoints: number, orderTotal: number) => {
    const maxDiscount = orderTotal - 1; // Mindestens 1 Cent zu bezahlen
    
    // Finde den höchsten möglichen Rabatt für den aktuellen Bestellwert
    let maxPossibleDiscount = 0;
    if (availablePoints >= 5000 && 50 * 100 <= maxDiscount) maxPossibleDiscount = 50 * 100;
    else if (availablePoints >= 4000 && 35 * 100 <= maxDiscount) maxPossibleDiscount = 35 * 100;
    else if (availablePoints >= 3000 && 20 * 100 <= maxDiscount) maxPossibleDiscount = 20 * 100;
    else if (availablePoints >= 2000 && 10 * 100 <= maxDiscount) maxPossibleDiscount = 10 * 100;
    else if (availablePoints >= 1000 && 5 * 100 <= maxDiscount) maxPossibleDiscount = 5 * 100;
    
    // Prüfe ob höhere Rabattstufen verfügbar sind
    if (availablePoints >= 5000 && 50 * 100 > maxDiscount) {
      const neededAmount = (50 * 100 - maxDiscount) / 100;
      return { 
        hasMore: true, 
        neededAmount: neededAmount,
        message: `Füge noch ${neededAmount.toFixed(2)}€ zum Warenkorb hinzu, um 5000 Punkte (50€ Rabatt) einzulösen`
      };
    }
    if (availablePoints >= 4000 && 35 * 100 > maxDiscount) {
      const neededAmount = (35 * 100 - maxDiscount) / 100;
      return { 
        hasMore: true, 
        neededAmount: neededAmount,
        message: `Füge noch ${neededAmount.toFixed(2)}€ zum Warenkorb hinzu, um 4000 Punkte (35€ Rabatt) einzulösen`
      };
    }
    if (availablePoints >= 3000 && 20 * 100 > maxDiscount) {
      const neededAmount = (20 * 100 - maxDiscount) / 100;
      return { 
        hasMore: true, 
        neededAmount: neededAmount,
        message: `Füge noch ${neededAmount.toFixed(2)}€ zum Warenkorb hinzu, um 3000 Punkte (20€ Rabatt) einzulösen`
      };
    }
    if (availablePoints >= 2000 && 10 * 100 > maxDiscount) {
      const neededAmount = (10 * 100 - maxDiscount) / 100;
      return { 
        hasMore: true, 
        neededAmount: neededAmount,
        message: `Füge noch ${neededAmount.toFixed(2)}€ zum Warenkorb hinzu, um 2000 Punkte (10€ Rabatt) einzulösen`
      };
    }
    
    return { hasMore: false };
  };
  
  // Automatisch den besten verfügbaren Rabatt ermitteln
  const getBestAvailableDiscount = (availablePoints: number, orderTotal: number) => {
    const maxDiscount = orderTotal - 1; // Mindestens 1 Cent zu bezahlen
    
    if (availablePoints >= 5000 && 50 * 100 <= maxDiscount) return { points: 5000, amount: 50 };
    if (availablePoints >= 4000 && 35 * 100 <= maxDiscount) return { points: 4000, amount: 35 };
    if (availablePoints >= 3000 && 20 * 100 <= maxDiscount) return { points: 3000, amount: 20 };
    if (availablePoints >= 2000 && 10 * 100 <= maxDiscount) return { points: 2000, amount: 10 };
    if (availablePoints >= 1000 && 5 * 100 <= maxDiscount) return { points: 1000, amount: 5 };
    
    return null;
  };
  
  // Automatisch den besten Rabatt auswählen, wenn Bonuspunkte aktiviert werden
  useEffect(() => {
    if (redeemPoints && availablePoints >= 1000) {
      // Berechne Gesamtbetrag inklusive Versandkosten für Bonuspunkte-Berechnung
      const totalWithShipping = total + (total < 8000 ? 495 : 0);
      const bestDiscount = getBestAvailableDiscount(availablePoints, totalWithShipping);
      if (bestDiscount && selectedPointsToRedeem !== bestDiscount.points) {
        setSelectedPointsToRedeem(bestDiscount.points);
      }
    }
  }, [redeemPoints, availablePoints, total]);

  // Berechne Gesamtbetrag inklusive Versandkosten für Bonuspunkte-Berechnung
  const totalWithShipping = total + (total < 8000 ? 495 : 0);
  const pointsDiscountInCents = redeemPoints && selectedPointsToRedeem > 0 ? getPointsDiscount(selectedPointsToRedeem, totalWithShipping) : 0;
  
  // Versandkosten berechnen: unter 80€ = 4,95€, ab 80€ kostenlos
  const shippingCosts = total < 8000 ? 495 : 0; // 8000 Cent = 80€, 495 Cent = 4,95€
  const subtotalAfterDiscount = Math.max(0, total - pointsDiscountInCents);
  const finalTotal = Math.max(0, totalWithShipping - pointsDiscountInCents);

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
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 py-2 px-4 max-w-7xl mx-auto">
        <nav className="flex items-center space-x-2 text-sm">
          <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
            Startseite
          </Link>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-medium">Warenkorb</span>
        </nav>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">

        
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
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-0">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cart Items - Links */}
              <div className="lg:col-span-2 lg:border-r lg:border-gray-200 lg:pr-6">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 py-3 border-b border-gray-200 text-sm font-medium text-gray-600">
                  <div className="col-span-5">Produkt / Variation</div>
                  <div className="col-span-2 text-center">Einzelpreis</div>
                  <div className="col-span-2 text-center">Menge</div>
                  <div className="col-span-2 text-center">Summe</div>
                  <div className="col-span-1"></div>
                </div>
                
                {/* Table Body */}
                <div className="space-y-0">
                  {items.map((i, index) => (
                    <div key={`${i.slug}-${index}`} className="grid grid-cols-12 gap-4 py-4 items-center">
                      {/* Product / Variation */}
                      <div className="col-span-5">
                        <div className="flex items-center space-x-3">
                          <Link href={`/${i.slug}`} className="block">
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 hover:opacity-80 transition-opacity cursor-pointer">
                              {i.image ? (
                                <img
                                  src={getOptimizedImageUrl(i.image, getContextualImageSize('thumbnail'), i.imageSizes, 0)}
                                  alt={i.title}
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
                          </Link>
                          <div className="min-w-0">
                            <Link href={`/${i.slug}`}>
                              <h3 className="text-sm font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors cursor-pointer">{i.title}</h3>
                            </Link>
                            {i.variations && Object.keys(i.variations).length > 0 && (
                              <div className="text-xs text-gray-600">
                                {Object.entries(i.variations).map(([key, value]) => (
                                  <span key={key}>
                                    {key}: {value}
                                    {Object.keys(i.variations || {}).length > 1 && Object.keys(i.variations || {}).indexOf(key) < Object.keys(i.variations || {}).length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Einzelpreis */}
                      <div className="col-span-2 text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {(i.price / 100).toFixed(2)} €
                        </div>
                      </div>
                      
                      {/* Menge */}
                      <div className="col-span-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => updateQuantity(i.slug, i.variations, i.quantity - 1)}
                            disabled={i.quantity <= 1}
                            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                              i.quantity <= 1
                                ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="text-sm font-medium text-gray-900 min-w-[20px] text-center">
                            {i.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(i.slug, i.variations, i.quantity + 1)}
                            disabled={(i.stockQuantity || 0) > 0 ? i.quantity >= (i.stockQuantity || 0) : true}
                            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                              (i.stockQuantity || 0) > 0 && i.quantity >= (i.stockQuantity || 0)
                                ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Summe */}
                      <div className="col-span-2 text-center">
                        <div className="text-sm font-bold text-gray-900">
                          {((i.price * i.quantity) / 100).toFixed(2)} €
                        </div>
                      </div>
                      
                      {/* Entfernen Button */}
                      <div className="col-span-1 text-center">
                        <button
                          onClick={() => removeItem(i.slug, i.variations)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg p-1 transition-colors cursor-pointer"
                          title="Entfernen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      {/* Trennstrich zwischen Produkten */}
                      {index < items.length - 1 && (
                        <div className="col-span-12">
                          <hr className="border-gray-200" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary - Rechts */}
              <div className="lg:col-span-1">
                <div className="sticky top-6">
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
                    
                    {/* Bonuspunkte Hinweis */}
                    <div className="bg-blue-50 rounded-lg p-3 mb-4">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <span className="text-sm text-blue-800 font-medium">
                          Du erhältst {Math.floor(total / 100 * 3.5)} Bonuspunkte für diese Bestellung
                        </span>
                      </div>
                    </div>

                    {/* Bonuspunkte Einlösen */}
                    {availablePoints >= 1000 && (
                      <div className="bg-yellow-50 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            <span className="text-sm text-yellow-800 font-medium">
                              Verfügbare Bonuspunkte: {availablePoints}
                            </span>
                          </div>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={redeemPoints}
                              onChange={(e) => {
                                setRedeemPoints(e.target.checked);
                                if (e.target.checked && selectedPointsToRedeem === 0) {
                                  setSelectedPointsToRedeem(1000); // Standard: 1000 Punkte einlösen
                                } else if (!e.target.checked) {
                                  setSelectedPointsToRedeem(0);
                                }
                              }}
                              className="sr-only"
                            />
                            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              redeemPoints ? 'bg-yellow-600' : 'bg-gray-200'
                            }`}>
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                redeemPoints ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </div>
                          </label>
                        </div>
                        
                        {redeemPoints && selectedPointsToRedeem > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-sm text-yellow-800">
                              <div className="flex items-center gap-2">
                                <span>Du löst {selectedPointsToRedeem} Punkte für {(pointsDiscountInCents / 100).toFixed(2)}€ ein</span>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  ✓ Optimaler Rabatt
                                </span>
                              </div>
                              {pointsDiscountInCents < getPointsDiscount(selectedPointsToRedeem, Infinity) && (
                                <div className="text-xs text-yellow-600 mt-1">
                                  ⚠️ Rabatt begrenzt - mindestens 0,01€ zu bezahlen (für Zahlungsabwicklung)
                                </div>
                              )}
                            </div>
                            
                            {/* Hinweis für mehr Punkte */}
                            {(() => {
                              // Berechne Gesamtbetrag inklusive Versandkosten für Hinweise
                              const totalWithShipping = total + (total < 8000 ? 495 : 0);
                              const remainingInfo = getRemainingPointsInfo(availablePoints, totalWithShipping);
                              return remainingInfo.hasMore && (
                                <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="text-xs text-blue-800">
                                      <div className="font-medium mb-1">💡 Mehr sparen möglich!</div>
                                      <div>{remainingInfo.message}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Rabattcode Eingabe */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rabattcode
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Code eingeben..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <button className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                          Einlösen
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-gray-600">
                      <span>Versandkosten</span>
                      <span className={shippingCosts > 0 ? "text-gray-600" : "text-green-600 font-medium"}>
                        {shippingCosts > 0 ? `${(shippingCosts / 100).toFixed(2)} €` : "Kostenlos"}
                      </span>
                    </div>
                    
                    {/* Versandkosten-Hinweis */}
                    {shippingCosts > 0 && (
                      <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                        💡 Füge noch {((8000 - total) / 100).toFixed(2)}€ hinzu für kostenlosen Versand
                      </div>
                    )}
                    
                    {/* Bonuspunkte-Rabatt */}
                    {redeemPoints && selectedPointsToRedeem > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Bonuspunkte-Rabatt ({selectedPointsToRedeem} Punkte)</span>
                        <span className="font-medium">-{(pointsDiscountInCents / 100).toFixed(2)} €</span>
                      </div>
                    )}
                    
                    <div className="border-t pt-4">
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

                  <div className="space-y-3">
                    <Link 
                      href={`/checkout?redeemPoints=${redeemPoints}&pointsToRedeem=${selectedPointsToRedeem}`}
                      className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Bestellung
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
            </div>
          </div>
        )}
        
        {/* Weiter einkaufen Leiste */}
        {items.length > 0 && (
          <div className="mt-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Weiter einkaufen</h3>
                <Link 
                  href="/shop" 
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Zum Shop
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    
  );
}


