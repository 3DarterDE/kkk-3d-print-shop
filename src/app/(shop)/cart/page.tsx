"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";
import { getOptimizedImageUrl, getContextualImageSize } from "@/lib/image-utils";
import { useUserData } from "@/lib/contexts/UserDataContext";
import ProductCard from "@/components/ProductCard";
import ApplyDiscountInput from "../../../components/ApplyDiscountInput";
import { withCursorPointer } from '@/lib/cursor-utils';

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const discountCode = useCartStore((s) => s.discountCode);
  const discountCents = useCartStore((s) => s.discountCents);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const clearDiscount = useCartStore((s) => s.clearDiscount);
  const redeemPoints = useCartStore((s) => s.redeemPoints);
  const pointsToRedeem = useCartStore((s) => s.pointsToRedeem);
  const setRedeemPoints = useCartStore((s) => s.setRedeemPoints);
  const clearRedeemPoints = useCartStore((s) => s.clearRedeemPoints);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clear = useCartStore((state) => state.clear);
  const validateItems = useCartStore((state) => state.validateItems);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [randomProducts, setRandomProducts] = useState<any[]>([]);
  const [cartInitialized, setCartInitialized] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { user, loading: userLoading } = useUserData();
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
      if (bestDiscount && pointsToRedeem !== bestDiscount.points) {
        setRedeemPoints(true, bestDiscount.points);
      }
    }
  }, [redeemPoints, availablePoints, total]);

  // Bonuspunkte deaktivieren wenn Benutzer sich ausloggt
  useEffect(() => {
    if (!user && redeemPoints) {
      clearRedeemPoints();
    }
  }, [user, redeemPoints, clearRedeemPoints]);

  // Berechne Gesamtbetrag inklusive Versandkosten für Bonuspunkte-Berechnung
  const totalWithShipping = total + (total < 8000 ? 495 : 0);
  const pointsDiscountInCents = redeemPoints && pointsToRedeem > 0 ? getPointsDiscount(pointsToRedeem, totalWithShipping) : 0;
  
  // Versandkosten berechnen: unter 80€ = 4,95€, ab 80€ kostenlos
  const shippingCosts = total < 8000 ? 495 : 0; // 8000 Cent = 80€, 495 Cent = 4,95€
  const subtotalAfterDiscount = Math.max(0, total - pointsDiscountInCents);
  // Entweder-oder Logik: Nur eine Rabattart kann angewendet werden
  const finalTotal = Math.max(0, totalWithShipping - Math.max(discountCents, pointsDiscountInCents));

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

  // Load random products
  const loadRandomProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/shop/products?limit=20&random=true&inStock=true');
      if (response.ok) {
        const data = await response.json();
        // Filter out products already in cart (API already handles stock availability)
        const cartProductSlugs = items.map(item => item.slug);
        const availableProducts = data.products.filter((product: any) => 
          !cartProductSlugs.includes(product.slug)
        );
        const shuffled = availableProducts.sort(() => 0.5 - Math.random());
        setRandomProducts(shuffled.slice(0, 6));
      }
    } catch (error) {
      console.error('Error loading random products:', error);
    }
  }, [items]);

  // Track cart initialization and loading state
  useEffect(() => {
    setCartInitialized(true);
    // Set loading to false after a short delay to ensure store is hydrated
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Validation is handled globally by CartValidationProvider/useCartSync

  // Load random products after cart is initialized (only once)
  useEffect(() => {
    if (cartInitialized && !productsLoaded) {
      loadRandomProducts();
      setProductsLoaded(true);
    }
  }, [cartInitialized, productsLoaded, loadRandomProducts]);


  // Only reload random products on initial load, not when cart changes
  // Products stay in the list even when added to cart

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 py-2 px-4 sm:px-6 lg:px-4 max-w-7xl mx-auto">
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 py-8">

        
        {isLoading ? (
          /* Loading State */
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Warenkorb wird geladen...</h2>
            <p className="text-gray-600">Bitte warten Sie einen Moment</p>
          </div>
        ) : items.length === 0 ? (
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
              className={withCursorPointer("inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors")}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Jetzt einkaufen
            </Link>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cart Items - Links */}
              <div className="lg:col-span-2 lg:border-r lg:border-gray-200 lg:pr-6">
                {/* Desktop Table Header */}
                <div className="hidden lg:grid grid-cols-12 gap-4 py-3 border-b border-gray-200 text-sm font-medium text-gray-600">
                  <div className="col-span-5">Produkt / Variation</div>
                  <div className="col-span-2 text-center">Einzelpreis</div>
                  <div className="col-span-2 text-center">Menge</div>
                  <div className="col-span-2 text-center">Summe</div>
                  <div className="col-span-1"></div>
                </div>
                
                {/* Cart Items */}
                <div className="space-y-4 lg:space-y-0">
                  {items.map((i, index) => (
                    <div key={`${i.slug}-${index}`} className="lg:grid lg:grid-cols-12 lg:gap-4 lg:py-4 lg:items-center">
                      {/* Mobile Layout */}
                      <div className="lg:col-span-5">
                        <div className="flex items-start space-x-3 lg:items-center">
                          <Link href={`/${i.slug}`} className="block">
                            <div className={withCursorPointer("w-12 h-12 lg:w-16 lg:h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 hover:opacity-80 transition-opacity")}>
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
                          <div className="min-w-0 flex-1">
                            {/* Mobile Title and Price Row */}
                            <div className="flex items-start justify-between lg:block">
                              <div className="flex-1">
                                <Link href={`/${i.slug}`}>
                                  <h3 className={withCursorPointer("text-base lg:text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors")}>{i.title}</h3>
                                </Link>
                                
                                {/* Mobile Quantity Controls */}
                                <div className="flex items-center space-x-2 mt-0.5 lg:hidden">
                                  <span className="text-sm text-gray-600">Menge:</span>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => updateQuantity(i.slug, i.variations, i.quantity - 1)}
                                      disabled={i.quantity <= 1}
                                      className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                                        i.quantity <= 1
                                          ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                          : withCursorPointer('text-gray-600 hover:text-gray-800 hover:bg-gray-200')
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
                                          : withCursorPointer('text-gray-600 hover:text-gray-800 hover:bg-gray-200')
                                      }`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Variations */}
                                {i.variations && Object.keys(i.variations).length > 0 && (
                                  <div className="text-sm text-gray-600 mt-0.5">
                                    {Object.entries(i.variations).map(([key, value]) => (
                                      <span key={key}>
                                        {key}: {value}
                                        {Object.keys(i.variations || {}).length > 1 && Object.keys(i.variations || {}).indexOf(key) < Object.keys(i.variations || {}).length - 1 && ', '}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {/* Mobile Total Price and Delete */}
                              <div className="lg:hidden ml-3 text-right">
                                <div className="text-sm font-semibold text-gray-900">
                                  {((i.price * i.quantity) / 100).toFixed(2)} €
                                </div>
                                <button
                                  onClick={() => removeItem(i.slug, i.variations)}
                                  className={withCursorPointer("text-blue-600 hover:text-red-800 transition-colors mt-1 p-1")}
                                  title="Entfernen"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            
                          </div>
                        </div>
                      </div>
                      
                      {/* Desktop Einzelpreis */}
                      <div className="hidden lg:block lg:col-span-2 text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {(i.price / 100).toFixed(2)} €
                        </div>
                      </div>
                      
                      {/* Desktop Menge */}
                      <div className="hidden lg:block lg:col-span-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => updateQuantity(i.slug, i.variations, i.quantity - 1)}
                            disabled={i.quantity <= 1}
                            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                              i.quantity <= 1
                                ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                : withCursorPointer('text-gray-600 hover:text-gray-800 hover:bg-gray-200')
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
                                : withCursorPointer('text-gray-600 hover:text-gray-800 hover:bg-gray-200')
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Desktop Summe */}
                      <div className="hidden lg:block lg:col-span-2 text-center">
                        <div className="text-sm font-bold text-gray-900">
                          {((i.price * i.quantity) / 100).toFixed(2)} €
                        </div>
                      </div>
                      
                      {/* Desktop Entfernen Button */}
                      <div className="hidden lg:block lg:col-span-1 text-center">
                        <button
                          onClick={() => removeItem(i.slug, i.variations)}
                          className={withCursorPointer("text-blue-600 hover:text-red-800 hover:bg-red-50 rounded-lg p-1 transition-colors")}
                          title="Entfernen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      {/* Trennstrich zwischen Produkten */}
                      <div className="col-span-12 mt-2">
                        <hr className="border-gray-200" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary - Rechts */}
              <div className="lg:col-span-1">
                <div className="sticky top-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    Bestellübersicht
                  </h3>
                  
                  <div className="space-y-4 mb-6">
                    
                    {/* Warnung wenn beide Rabattarten aktiv sind */}
                    {redeemPoints && discountCents > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-sm text-orange-800 font-medium">
                            Hinweis: Es kann nur eine Rabattart angewendet werden. Der höhere Rabatt wird automatisch verwendet.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Bonuspunkte Einlösen */}
                    {availablePoints >= 1000 && (
                      <div className="bg-yellow-50 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-sm text-yellow-800 font-medium">
                              Verfügbare Bonuspunkte: {availablePoints}
                            </span>
                            {discountCents > 0 && (
                              <span className="text-xs text-yellow-600 ml-2">
                                
                              </span>
                            )}
                          </div>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={redeemPoints}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const totalWithShipping = total + (total < 8000 ? 495 : 0);
                                  const bestDiscount = getBestAvailableDiscount(availablePoints, totalWithShipping);
                                  if (bestDiscount) {
                                    setRedeemPoints(true, bestDiscount.points);
                                  } else {
                                    setRedeemPoints(true, 0);
                                  }
                                } else {
                                  clearRedeemPoints();
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
                        
                        {redeemPoints && pointsToRedeem > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-sm text-yellow-800">
                              <div className="flex items-center gap-2">
                                <span>Du löst {pointsToRedeem} Punkte für {(pointsDiscountInCents / 100).toFixed(2)}€ ein</span>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  ✓ Optimaler Rabatt
                                </span>
                              </div>
                              {pointsDiscountInCents < getPointsDiscount(pointsToRedeem, Infinity) && (
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
                        {redeemPoints && (
                          <span className="text-xs text-gray-500 ml-2">
                            
                          </span>
                        )}
                      </label>
                      {user ? (
                        <ApplyDiscountInput
                          items={items}
                          discountCode={discountCode}
                          discountCents={discountCents}
                          onApplied={async (code: string, cents: number) => {
                            setDiscount(code, cents);
                          }}
                          onCleared={async () => {
                            clearDiscount();
                          }}
                          redeemPoints={redeemPoints}
                        />
                      ) : userLoading ? null : (
                        <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md p-3">
                          Rabattcodes sind nur für angemeldete Kunden verfügbar. Bitte melden Sie sich an, um einen Rabattcode einzulösen.
                        </div>
                      )}
                    </div>
                    
                    {/* Modern Price Summary - wie in Checkout */}
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600">Zwischensumme</span>
                        <span className="text-sm font-semibold text-slate-800">€{(total / 100).toFixed(2)}</span>
                      </div>
                      
                      {/* Rabattcode-Abzug */}
                      {discountCents > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-green-600">Rabatt{discountCode ? ` (${discountCode})` : ''}</span>
                          <span className="text-sm font-semibold text-green-600">-€{(discountCents / 100).toFixed(2)}</span>
                        </div>
                      )}
                      
                      {/* Bonuspunkte-Rabatt */}
                      {redeemPoints && pointsToRedeem > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-green-600">Bonuspunkte-Rabatt ({pointsToRedeem} Punkte)</span>
                          <span className="text-sm font-semibold text-green-600">-€{(pointsDiscountInCents / 100).toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600">Versand</span>
                        <span className={`text-sm font-semibold ${shippingCosts > 0 ? "text-slate-800" : "text-green-600"}`}>
                          {shippingCosts > 0 ? `€${(shippingCosts / 100).toFixed(2)}` : "Kostenlos"}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="relative group">
                            <svg className="w-4 h-4 mr-1 cursor-help text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 max-w-[80vw] sm:max-w-xs whitespace-normal break-words text-center">
                              Alle Preise sind Endpreise zzgl. Versandkosten. Gemäß § 19 UStG wird keine Umsatzsteuer erhoben und ausgewiesen.
                              {/* Tooltip arrow */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-slate-600">Preisinformationen</span>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-slate-900">Gesamt</span>
                          <span className="text-lg font-bold text-blue-600">€{(((total + (total < 8000 ? 495 : 0)) - Math.max(discountCents, pointsDiscountInCents)) / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Versandkosten-Hinweis */}
                    {shippingCosts > 0 && (
                      <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                        💡 Füge noch {((8000 - total) / 100).toFixed(2)}€ hinzu für kostenlosen Versand
                      </div>
                    )}
                    
                    {/* Bonuspunkte Hinweis - nach der Preis-Zusammenfassung */}
                    {user ? (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center">
                          <span className="text-sm text-blue-800 font-medium">
                            Du erhältst {Math.floor(total / 100 * 3.5)} Bonuspunkte für diese Bestellung
                          </span>
                          <div className="relative group ml-2">
                            <svg className="w-4 h-4 text-blue-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 max-w-[80vw] sm:max-w-xs whitespace-normal break-words text-center">
                              Du erhältst weitere Bonuspunkte für das Bewerten der Produkte nach der Lieferung
                              {/* Tooltip arrow */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : userLoading ? null : (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center">
                          <span className="text-sm text-blue-800 font-medium">
                            Melde dich an oder 
                            <button
                              onClick={() => {
                                const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
                                const popup = window.open(`/api/auth/login?screen_hint=signup&prompt=login&max_age=0&returnTo=${returnTo}`, 'auth', 'width=500,height=600,scrollbars=yes,resizable=yes');
                                if (!popup) {
                                  window.location.assign(`/api/auth/login?screen_hint=signup&prompt=login&max_age=0&returnTo=${returnTo}`);
                                  return;
                                }
                                const onMessage = async (event: MessageEvent) => {
                                  if (event.origin !== window.location.origin) return;
                                  if (event.data.type === 'auth:popup-complete') {
                                    window.removeEventListener('message', onMessage);
                                    window.location.reload();
                                  }
                                };
                                window.addEventListener('message', onMessage);
                              }}
                              className={withCursorPointer("text-blue-600 hover:text-blue-800 underline bg-transparent border-none p-0 ml-1")}
                            >
                              erstelle ein Konto
                            </button> um Bonuspunkte für diese Bestellung zu erhalten
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Link 
                      href={`/checkout?redeemPoints=${redeemPoints}&pointsToRedeem=${pointsToRedeem}`}
                          className={withCursorPointer("w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors")}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Bestellung
                    </Link>
                    
                    <button
                      onClick={validateCart}
                      disabled={isValidating}
                      className={`w-full flex items-center justify-center px-6 py-3 border border-blue-300 text-blue-700 font-medium rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors ${isValidating ? 'cursor-not-allowed' : withCursorPointer('')}`}
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
        )}
        
        {/* Weiter einkaufen Link */}
        {items.length > 0 && (
          <div className="mt-8 mb-4">
            <Link 
              href="/shop" 
              className={withCursorPointer("text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors")}
            >
              ← Weiter einkaufen
            </Link>
            <div className="mt-4 border-t border-gray-200"></div>
          </div>
        )}

        {/* Zufällige Produkte */}
        {randomProducts.length > 0 && (
          <div className="mt-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Das könnte dich auch interessieren</h3>
              <p className="text-gray-600">Entdecke weitere Produkte aus unserem Sortiment</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              {randomProducts.map((product, index) => (
                <ProductCard 
                  key={product._id || index}
                  product={{
                    _id: product._id?.toString() || index.toString(),
                    slug: product.slug,
                    title: product.title,
                    price: product.price,
                    offerPrice: product.offerPrice,
                    isOnSale: product.isOnSale,
                    isTopSeller: product.isTopSeller || false,
                    inStock: product.inStock,
                    stockQuantity: product.stockQuantity,
                    images: product.images || [],
                    imageSizes: (product.imageSizes || []).map((imgSize: any) => ({
                      main: imgSize.main,
                      thumb: imgSize.thumb,
                      small: imgSize.small
                    })),
                    tags: product.tags || [],
                    variations: product.variations || [],
                    reviews: product.reviews || null
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


