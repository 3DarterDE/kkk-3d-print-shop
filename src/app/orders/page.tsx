"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useUserData } from "@/lib/contexts/UserDataContext";
import { withCursorPointer } from '@/lib/cursor-utils';

type Order = {
  _id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'return_requested' | 'return_completed';
  total: number;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    variations?: Record<string, string>;
  }[];
  shippingAddress: {
    firstName?: string;
    lastName?: string;
    company?: string;
    street: string;
    houseNumber: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    street: string;
    houseNumber: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod?: string;
  bonusPointsEarned: number;
  bonusPointsCredited?: boolean;
  bonusPointsCreditedAt?: string;
  bonusPointsScheduledAt?: string;
  discountCode?: string;
  discountCents?: number;
  createdAt: string;
  updatedAt: string;
};

type OrdersResponse = {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
};

export default function OrdersPage() {
  const { orders, loading, error, ordersLoaded, refetchOrders } = useUserData();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [returnModalOrderId, setReturnModalOrderId] = useState<string | null>(null);
  const [returnSelections, setReturnSelections] = useState<Record<string, number>>({});
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState<string>('');
  const [reviewModalOrderId, setReviewModalOrderId] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewAttemptedSubmit, setReviewAttemptedSubmit] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, { rating: number; title: string; comment: string; isAnonymous: boolean; selected: boolean }>>({});
  const [existingReviews, setExistingReviews] = useState<Record<string, any>>({});
  const [returnedItems, setReturnedItems] = useState<Record<string, any[]>>({});

  // Load existing reviews for orders
  useEffect(() => {
    const loadExistingReviews = async () => {
      if (orders.length === 0) return;
      
      try {
        const orderIds = orders.map(o => o._id);
        const response = await fetch(`/api/reviews?orderId=${orderIds.join(',')}`);
        if (response.ok) {
          const data = await response.json();
          const reviewMap: Record<string, any> = {};
          data.reviews.forEach((review: any) => {
            reviewMap[review.orderId] = reviewMap[review.orderId] || [];
            reviewMap[review.orderId].push(review);
          });
          setExistingReviews(reviewMap);
        }
      } catch (error) {
        console.error('Error loading existing reviews:', error);
      }
    };

    loadExistingReviews();
  }, [orders]);

  // Load returned items for orders
  useEffect(() => {
    const loadReturnedItems = async () => {
      try {
        const response = await fetch('/api/returns/user');
        if (response.ok) {
          const data = await response.json();
          setReturnedItems(data.returnedItemsByOrder || {});
        }
      } catch (error) {
        console.error('Error loading returned items:', error);
      }
    };

    loadReturnedItems();
  }, []);

  // Initialize reviews when review modal opens
  useEffect(() => {
    if (reviewModalOrderId) {
      const order = orders.find(o => o._id === reviewModalOrderId);
      if (order) {
        const uniqueProducts = order.items.reduce((acc: any[], item: any) => {
          const existingItem = acc.find(existing => existing.productId === item.productId);
          if (!existingItem) {
            acc.push(item);
          }
          return acc;
        }, []);
        
        const initialReviews: Record<string, { rating: number; title: string; comment: string; isAnonymous: boolean; selected: boolean }> = {};
        uniqueProducts.forEach((item) => {
          const itemKey = `${order._id}-${item.productId}`;
          if (!reviews[itemKey]) {
            initialReviews[itemKey] = { rating: 5, title: '', comment: '', isAnonymous: false, selected: false };
          }
        });
        
        if (Object.keys(initialReviews).length > 0) {
          setReviews(prev => ({ ...prev, ...initialReviews }));
        }
      }
    }
  }, [reviewModalOrderId, orders, reviews]);

  // Orders werden bereits vom Context geladen, kein useEffect nötig

  const getReviewStatus = (orderId: string) => {
    const orderReviews = existingReviews[orderId] || [];
    const order = orders.find(o => o._id === orderId);
    if (!order) return { allReviewed: false, reviewedCount: 0, totalCount: 0 };
    
    // Get unique products (by productId) to avoid counting same product multiple times
    const uniqueProducts = order.items.reduce((acc: any[], item: any) => {
      const existingItem = acc.find(existing => existing.productId === item.productId);
      if (!existingItem) {
        acc.push(item);
      }
      return acc;
    }, []);
    
    const reviewedProductIds = orderReviews.map((r: any) => r.productId);
    const uniqueReviewedProductIds = [...new Set(reviewedProductIds)]; // Remove duplicates
    const totalProducts = uniqueProducts.length;
    const reviewedCount = uniqueReviewedProductIds.length;
    const allReviewed = reviewedCount === totalProducts;
    
    return { allReviewed, reviewedCount, totalCount: totalProducts };
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          text: 'Ausstehend',
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          icon: '⏳',
          description: 'Ihre Bestellung wurde erhalten und wird bearbeitet'
        };
      case 'processing':
        return {
          text: 'In Bearbeitung',
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          icon: '⚙️',
          description: 'Ihre Bestellung wird vorbereitet'
        };
      case 'shipped':
        return {
          text: 'Versandt',
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          icon: '🚚',
          description: 'Ihre Bestellung ist auf dem Weg'
        };
      case 'delivered':
        return {
          text: 'Geliefert',
          color: 'text-green-600',
          bg: 'bg-green-50',
          icon: '✅',
          description: 'Ihre Bestellung wurde erfolgreich geliefert'
        };
      case 'cancelled':
        return {
          text: 'Storniert',
          color: 'text-red-600',
          bg: 'bg-red-50',
          icon: '❌',
          description: 'Diese Bestellung wurde storniert'
        };
      case 'return_requested':
        return {
          text: 'Rücksendung angefordert',
          color: 'text-amber-700',
          bg: 'bg-amber-50',
          icon: '↩️',
          description: 'Rücksendung wurde angefragt. Wir prüfen deine Rücksendung.'
        };
      case 'return_completed':
        return {
          text: 'Rücksendung\nabgeschlossen',
          color: 'text-purple-700',
          bg: 'bg-purple-50',
          icon: '✅',
          description: 'Rücksendung ist abgeschlossen. Rückerstattung wird/ist veranlasst.'
        };
      default:
        return {
          text: status,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          icon: '❓',
          description: 'Unbekannter Status'
        };
    }
  };

  // Helper function to check if an item was returned
  const isItemReturned = (orderId: string, item: any) => {
    const orderReturnedItems = returnedItems[orderId] || [];
    return orderReturnedItems.some(returnedItem => 
      returnedItem.productId === item.productId &&
      JSON.stringify(returnedItem.variations || {}) === JSON.stringify(item.variations || {})
    );
  };

  // Check if return is still possible (within 14 days of delivery)
  const canReturnOrder = (order: any) => {
    // If return already requested, cannot return again
    if (order.status === 'return_requested') {
      return false;
    }
    
    // Only allow returns for delivered orders
    if (order.status !== 'delivered') {
      return false;
    }
    
    // Check if return is still possible within 14 days of delivery
    const deliveryDate = new Date(order.updatedAt); // When status changed to "delivered"
    const now = new Date();
    const daysSinceDelivery = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysSinceDelivery <= 14;
  };

  // Get return status text
  const getReturnStatusText = (order: any) => {
    if (order.status === 'return_requested') {
      return 'Rücksendung bereits angefordert';
    }
    if (order.status === 'delivered') {
      if (canReturnOrder(order)) {
        return 'Artikel zurücksenden';
      } else {
        return 'Rücksendung (Frist abgelaufen)';
      }
    }
    return 'Rücksendung (nach Lieferung)';
  };

  const getPaymentMethodText = (method?: string) => {
    switch (method) {
      case 'card':
        return 'Kreditkarte / Debitkarte';
      case 'paypal':
        return 'PayPal';
      case 'bank':
        return 'Banküberweisung';
      default:
        return 'Nicht angegeben';
    }
  };

  const downloadCreditNote = async (orderKey: string) => {
    try {
      const response = await fetch(`/api/orders/${orderKey}/credit-note`);
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Fehler beim Herunterladen der Storno-Rechnung');
        return;
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Use filename from response header if present
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match ? match[1] : `storno-${orderKey}.pdf`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading credit note:', error);
      alert('Fehler beim Herunterladen der Storno-Rechnung');
    }
  };

  const downloadInvoice = async (orderKey: string) => {
    try {
      const response = await fetch(`/api/orders/${orderKey}/invoice`);
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Fehler beim Herunterladen der Rechnung');
        return;
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Use filename from response header if present
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match ? match[1] : `rechnung-${orderKey}.pdf`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Fehler beim Herunterladen der Rechnung');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Funktion zur Berechnung des Bonuspunkte-Rabatts
  const getPointsDiscountAmount = (points: number) => {
    if (points >= 5000) return 50; // 50€
    if (points >= 4000) return 35; // 35€
    if (points >= 3000) return 20; // 20€
    if (points >= 2000) return 10; // 10€
    if (points >= 1000) return 5;  // 5€
    return 0;
  };

  if ((loading || !ordersLoaded) && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Sidebar skeleton */}
            <div className="w-full lg:w-72 mt-4 lg:mt-8 self-start bg-white/80 backdrop-blur-sm shadow-lg border border-white/20 rounded-2xl p-6 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-9 bg-gray-100 rounded"></div>
                <div className="h-9 bg-gray-100 rounded"></div>
                <div className="h-9 bg-gray-100 rounded"></div>
              </div>
            </div>

            {/* Main content skeleton */}
            <div className="flex-1 py-4 lg:py-8 animate-pulse">
              <div className="mb-6 lg:mb-10">
                <div className="rounded-2xl p-8 bg-gray-100 h-28"></div>
              </div>

              <div className="bg-white/70 border border-white/30 rounded-2xl p-6 h-72"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 py-8">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Fehler beim Laden</h2>
            <p className="text-gray-600 mb-4">Die Bestellungen konnten nicht geladen werden.</p>
            <button 
              onClick={() => window.location.reload()}
              className={withCursorPointer("bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors")}
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-72 mt-4 lg:mt-8 self-start bg-white/80 backdrop-blur-sm shadow-lg border border-white/20 rounded-2xl">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Mein Konto</h2>
                <div className="w-12 h-1 bg-gradient-to-r from-blue-800 to-blue-500 rounded-full"></div>
              </div>
              <nav className="space-y-2">
                <Link href="/profile" prefetch className="flex items-center px-4 py-3 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                  <div className="w-2 h-2 bg-slate-300 rounded-full mr-3 group-hover:bg-blue-500 transition-colors"></div>
                  Benutzerkonto Übersicht
                </Link>
                <Link href="/orders" prefetch className="flex items-center px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-800 to-blue-600 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  Meine Bestellungen
                </Link>
                <Link href="/bonus" prefetch className="flex items-center px-4 py-3 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                  <div className="w-2 h-2 bg-slate-300 rounded-full mr-3 group-hover:bg-blue-500 transition-colors"></div>
                  Bonuspunkte
                </Link>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 py-4 lg:py-8">
            {/* Header */}
            <div className="mb-6 lg:mb-10">
              <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 lg:mb-3">
                  Meine Bestellungen
                </h1>
                <p className="text-blue-100 text-sm sm:text-base lg:text-lg">
                  Verwalte und verfolge deine Bestellungen.
                </p>
              </div>
            </div>

            {/* Orders Section */}
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 lg:mb-6 gap-4">
                <div className="flex items-center">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Meine Bestellungen</h2>
                  <div className="ml-2 sm:ml-4 w-8 sm:w-16 h-1 bg-gradient-to-r from-blue-800 to-blue-500 rounded-full"></div>
                </div>
              </div>
              
              {orders.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl p-8 text-center shadow-lg">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Noch keine Bestellungen</h3>
                  <p className="text-slate-600 mb-6">Du hast noch keine Bestellungen aufgegeben.</p>
                  <Link 
                    href="/shop" 
                    prefetch
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Jetzt einkaufen
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed divide-y divide-slate-200">
                        <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
                          <tr>
                            <th className="w-28 px-3 sm:px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Bestellung #</th>
                            <th className="w-20 px-3 sm:px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Datum</th>
                            <th className="w-32 px-3 sm:px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">Senden an</th>
                            <th className="w-20 px-3 sm:px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Bestellwert</th>
                            <th className="w-28 px-3 sm:px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                            <th className="w-24 px-3 sm:px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Aktionen</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white/50 divide-y divide-slate-200">
                          {orders.map((order) => {
                            const statusInfo = getStatusInfo(order.status);
                            const isExpanded = expandedOrder === order._id;
                            
                            return (
                              <React.Fragment key={order._id}>
                                <tr className="hover:bg-blue-50/50 transition-colors">
                                  <td className="px-3 sm:px-6 py-4 text-center">
                                    <span className="text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 px-2 sm:px-3 py-1 rounded-full">
                                      {order.orderNumber}
                                    </span>
                                  </td>
                                  <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-slate-600 hidden sm:table-cell text-center">
                                    {formatDate(order.createdAt)}
                                  </td>
                                  <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-slate-600 hidden md:table-cell text-center">
                                    <div className="truncate" title={`${order.shippingAddress.street} ${order.shippingAddress.houseNumber}`}>
                                      {order.shippingAddress.street} {order.shippingAddress.houseNumber}
                                    </div>
                                  </td>
                                  <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-semibold text-slate-800 text-center">
                                    €{(order.total).toFixed(2)}
                                  </td>
                                  <td className="px-3 sm:px-6 py-4">
                                    <div className="whitespace-pre-line text-center">
                                      <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`} title={statusInfo.text}>
                                        {statusInfo.text}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 sm:px-6 py-4 text-center">
                                    <button
                                      onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                                      className={withCursorPointer("text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium hover:underline flex items-center mx-auto")}
                                    >
                                      <span className="truncate">
                                        {isExpanded ? 'Weniger' : 'Details'}
                                      </span>
                                      <svg 
                                        className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              
                              {/* Expanded Details Row */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={6} className="px-0 py-0">
                                    <div className="bg-slate-50/50 border-t border-slate-200">
                                      <div className="p-6 space-y-6">
                                        {/* Order Action Buttons */}
                                        <div className="bg-white rounded-lg p-4">
                                          <h4 className="font-semibold text-slate-800 mb-4">Aktionen</h4>
                                          <div className="flex flex-wrap gap-3">
                                            {/* Credit Note Download Button - Only for completed returns */}
                                            {order.status === 'return_completed' && (
                                              <button 
                                                onClick={() => downloadCreditNote(order.orderNumber)}
                                                className={withCursorPointer("px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 text-red-600 bg-red-50 hover:bg-red-100")}
                                              >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Storno-Rechnung herunterladen
                                              </button>
                                            )}

                                            {/* Invoice Download Button - Always visible */}
                                            <button 
                                              onClick={() => (order.status === 'delivered' || (order as any).status === 'return_completed' || order.status === 'return_requested') ? downloadInvoice(order.orderNumber) : null}
                                              disabled={order.status !== 'delivered' && (order as any).status !== 'return_completed' && order.status !== 'return_requested'}
                                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                                                order.status === 'delivered' || (order as any).status === 'return_completed' || order.status === 'return_requested'
                                                  ? withCursorPointer('text-green-600 bg-green-50 hover:bg-green-100')
                                                  : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                              }`}
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                              </svg>
                                              {order.status === 'delivered' || (order as any).status === 'return_completed' || order.status === 'return_requested' ? 'Rechnung herunterladen' : 'Rechnung (nach Lieferung)'}
                                            </button>

                                            {/* Review Button - Always visible */}
                                            <button 
                                              onClick={() => {
                                                if (order.status === 'delivered' || (order as any).status === 'return_completed' || order.status === 'return_requested') {
                                                  const reviewStatus = getReviewStatus(order._id);
                                                  if (!reviewStatus.allReviewed) {
                                                    setReviewModalOrderId(order._id);
                                                  }
                                                }
                                              }}
                                              disabled={order.status !== 'delivered' && (order as any).status !== 'return_completed' && order.status !== 'return_requested'}
                                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                                                order.status === 'delivered' || (order as any).status === 'return_completed' || order.status === 'return_requested'
                                                  ? getReviewStatus(order._id).allReviewed 
                                                    ? 'text-green-600 bg-green-50 cursor-default' 
                                                    : withCursorPointer('text-yellow-600 bg-yellow-50 hover:bg-yellow-100')
                                                  : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                              }`}
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                              </svg>
                                              {(() => {
                                                if (order.status !== 'delivered' && (order as any).status !== 'return_completed') {
                                                  return 'Bewertung (nach Lieferung)';
                                                }
                                                const reviewStatus = getReviewStatus(order._id);
                                                if (reviewStatus.allReviewed) {
                                                  return `Alle bewertet (${reviewStatus.reviewedCount}/${reviewStatus.totalCount})`;
                                                } else if (reviewStatus.reviewedCount > 0) {
                                                  return `Weiter bewerten (${reviewStatus.reviewedCount}/${reviewStatus.totalCount})`;
                                                } else {
                                                  return 'Bewertung abgeben';
                                                }
                                              })()}
                                            </button>

                                            {/* Return Button - Always visible */}
                                            <button
                                              onClick={() => {
                                                if (canReturnOrder(order)) {
                                                  setReturnModalOrderId(order._id);
                                                  // init selections by line index to support same product with different variations
                                                  const init: Record<string, number> = {};
                                                  order.items.forEach((_, idx) => { init[String(idx)] = 0; });
                                                  setReturnSelections(init);
                                                }
                                              }}
                                              disabled={!canReturnOrder(order)}
                                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                canReturnOrder(order)
                                                  ? withCursorPointer('text-purple-700 bg-purple-50 hover:bg-purple-100')
                                                  : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                              }`}
                                            >
                                              {getReturnStatusText(order)}
                                            </button>
                                          </div>
                                        </div>

                                        {/* Order Items */}
                                        <div className="bg-white rounded-lg p-4">
                                          <h4 className="font-semibold text-slate-800 mb-4">Bestellte Artikel</h4>
                                          <div className="overflow-x-auto">
                                            <table className="w-full divide-y divide-slate-200">
                                              <thead className="bg-slate-50">
                                                <tr>
                                                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-2/5">
                                                    Produkt
                                                  </th>
                                                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/5">
                                                    Variationen
                                                  </th>
                                                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-1/10">
                                                    Menge
                                                  </th>
                                                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-1/10">
                                                    Einzelpreis
                                                  </th>
                                                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-1/10">
                                                    Gesamt
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody className="bg-white divide-y divide-slate-200">
                                                {order.items.map((item, index) => (
                                                  <tr key={`${item.productId}-${index}`} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 w-2/5">
                                                      <div className="text-sm font-medium text-slate-800">{item.name}</div>
                                                      {isItemReturned(order._id, item) && (
                                                        <div className="text-xs text-red-600 mt-1 font-medium">
                                                          Zurückgegeben
                                                        </div>
                                                      )}
                                                    </td>
                                                    <td className="px-4 py-3 w-1/5">
                                                      <div className="text-sm text-slate-600">
                                                        {item.variations && Object.keys(item.variations).length > 0 ? (
                                                          Object.entries(item.variations).map(([key, value]) => (
                                                            <span key={key} className="block">
                                                              {key}: {value}
                                                            </span>
                                                          ))
                                                        ) : (
                                                          <span className="text-slate-400 italic">Keine Variationen</span>
                                                        )}
                                                      </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center w-1/10">
                                                      <span className="text-sm font-medium text-slate-800">{item.quantity}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right w-1/10">
                                                      <span className="text-sm text-slate-600">€{(item.price / 100).toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right w-1/10">
                                                      <span className="text-sm font-semibold text-slate-800">
                                                        €{((item.price * item.quantity) / 100).toFixed(2)}
                                                      </span>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>

                                        {/* Bestellübersicht */}
                                        <div className="bg-white rounded-lg p-4">
                                          <h4 className="font-semibold text-slate-800 mb-4">Bestellübersicht</h4>
                                          <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                              <span className="text-slate-600">Zwischensumme ({order.items.length} Artikel)</span>
                                              <span className="font-medium">€{((order as any).subtotal || order.total).toFixed(2)}</span>
                                            </div>
                                            {(order as any).shippingCosts > 0 && (
                                            <div className="flex justify-between text-sm">
                                              <span className="text-slate-600">Versandkosten</span>
                                              <span className="font-medium">€{(((order as any).shippingCosts || 0) / 100).toFixed(2)}</span>
                                            </div>
                                            )}
                                            {(order as any).shippingCosts === 0 && (
                                              <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Versandkosten</span>
                                                <span className="font-medium text-green-600">Kostenlos</span>
                                              </div>
                                            )}
                                            {(order as any).discountCents > 0 && (
                                              <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Rabatt{(order as any).discountCode ? ` (${(order as any).discountCode})` : ''}</span>
                                                <span className="font-medium text-green-600">-€{(((order as any).discountCents || 0) / 100).toFixed(2)}</span>
                                              </div>
                                            )}
                                            {(order as any).bonusPointsRedeemed > 0 && (
                                              <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Bonuspunkte-Rabatt ({(order as any).bonusPointsRedeemed} Punkte)</span>
                                                <span className="font-medium text-green-600">
                                                  -€{getPointsDiscountAmount((order as any).bonusPointsRedeemed).toFixed(2)}
                                                </span>
                                              </div>
                                            )}
                                            <div className="border-t border-slate-200 pt-2">
                                              {(() => {
                                                const hasDiscount = ((order as any).discountCents || 0) > 0;
                                                const hasPoints = ((order as any).bonusPointsRedeemed || 0) > 0;
                                                const showSplitTotals = hasDiscount || hasPoints;
                                                const subtotalPlusShipping = (((order as any).subtotal || order.total) + ((((order as any).shippingCosts || 0)) / 100));
                                                if (showSplitTotals) {
                                                  return (
                                                    <>
                                                      <div className="flex justify-between text-base font-semibold">
                                                        <span className="text-slate-800">Gesamtbetrag (vor Rabatt)</span>
                                                        <span className="text-slate-800">€{subtotalPlusShipping.toFixed(2)}</span>
                                                      </div>
                                                      <div className="flex justify-between text-base font-semibold text-green-700 mt-2">
                                                        <span>Endbetrag (nach Rabatt)</span>
                                                        <span>€{(order.total as number).toFixed(2)}</span>
                                                      </div>
                                                    </>
                                                  );
                                                }
                                                return (
                                                  <div className="flex justify-between text-base font-semibold">
                                                    <span className="text-slate-800">Gesamtbetrag</span>
                                                    <span className="text-slate-800">€{(order.total as number).toFixed(2)}</span>
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                            <div className="text-sm text-slate-600 bg-blue-50 rounded p-2">
                                              <span className="font-medium">
                                                {(order as any).bonusPointsEarned > 0
                                                  ? `Du hast ${order.bonusPointsEarned} Bonuspunkte für diese Bestellung erhalten`
                                                  : (order.status === 'return_completed'
                                                      ? 'Keine Bonuspunkte, da alle Artikel zurückgesendet wurden.'
                                                      : 'Für diese Bestellung erhältst du keine Bonuspunkte.')}
                                              </span>
                                              {(order as any).bonusPointsRedeemed > 0 && (
                                                <span className="block mt-1">
                                                  und {((order as any).bonusPointsRedeemed)} Punkte eingelöst
                                                </span>
                                              )}
                                              {(order.status === 'delivered' || order.status === 'return_requested' || (order as any).status === 'return_completed')
                                                && (order as any).bonusPointsScheduledAt
                                                && !(order as any).bonusPointsCredited
                                                && (order as any).bonusPointsEarned > 0 && (
                                                <span className="block mt-1 text-blue-700">
                                                  Geplante Gutschrift: {new Date((order as any).bonusPointsScheduledAt).toLocaleDateString('de-DE', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                                </span>
                                              )}
                                              {(order as any).bonusPointsCredited && (order as any).bonusPointsCreditedAt && (
                                                <span className="block mt-1 text-green-700">
                                                  Gutgeschrieben am: {new Date((order as any).bonusPointsCreditedAt).toLocaleDateString('de-DE', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                                </span>
                                              )}
                                              {!(order as any).bonusPointsScheduledAt && order.status !== 'cancelled' && !(order as any).bonusPointsCredited && (order as any).bonusPointsEarned > 0 && (
                                                <span className="block mt-1 text-slate-600">
                                                  Bonuspunkte werden 14 Tage nach der Lieferung gutgeschrieben.
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Order Details */}
                                        <div className="grid md:grid-cols-3 gap-6">
                                          <div className="bg-white rounded-lg p-4">
                                            <h4 className="font-semibold text-slate-800 mb-3">Lieferadresse</h4>
                                            <div className="text-sm text-slate-600 space-y-1">
                                              {(order.shippingAddress as any).company && (
                                                <p className="font-medium text-slate-800">
                                                  {(order.shippingAddress as any).company}
                                                </p>
                                              )}
                                              <p className="font-medium text-slate-800">
                                                {(order.shippingAddress as any).firstName || ''} {(order.shippingAddress as any).lastName || ''}
                                              </p>
                                              <p>{order.shippingAddress.street} {order.shippingAddress.houseNumber}</p>
                                              {(order.shippingAddress as any).addressLine2 && (
                                                <p>{(order.shippingAddress as any).addressLine2}</p>
                                              )}
                                              <p>{order.shippingAddress.postalCode} {order.shippingAddress.city}</p>
                                              <p>{order.shippingAddress.country}</p>
                                            </div>
                                          </div>

                                          <div className="bg-white rounded-lg p-4">
                                            <h4 className="font-semibold text-slate-800 mb-3">Rechnungsadresse</h4>
                                            <div className="text-sm text-slate-600 space-y-1">
                                              {(order as any).billingAddress ? (
                                                <>
                                                  {((order as any).billingAddress as any).company && (
                                                    <p className="font-medium text-slate-800">
                                                      {((order as any).billingAddress as any).company}
                                                    </p>
                                                  )}
                                                  <p className="font-medium text-slate-800">
                                                    {((order as any).billingAddress as any).firstName || ''} {((order as any).billingAddress as any).lastName || ''}
                                                  </p>
                                                  <p>{(order as any).billingAddress.street} {(order as any).billingAddress.houseNumber}</p>
                                                  {((order as any).billingAddress as any).addressLine2 && (
                                                    <p>{((order as any).billingAddress as any).addressLine2}</p>
                                                  )}
                                                  <p>{(order as any).billingAddress.postalCode} {(order as any).billingAddress.city}</p>
                                                  <p>{(order as any).billingAddress.country}</p>
                                                </>
                                              ) : (
                                                <p className="text-slate-500 italic">Gleich wie Lieferadresse</p>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <div className="bg-white rounded-lg p-4">
                                            <h4 className="font-semibold text-slate-800 mb-3">Zahlungsmethode</h4>
                                            <p className="text-sm text-slate-600">{getPaymentMethodText(order.paymentMethod)}</p>
                                          </div>
                                        </div>

                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden">
                  <div className="divide-y divide-slate-200">
                    {orders.map((order) => {
                      const statusInfo = getStatusInfo(order.status);
                      const isExpanded = expandedOrder === order._id;
                      
                      return (
                        <div key={order._id} className="p-4 bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl mb-4 shadow-lg">
                          {/* Card Header - Always visible */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="bg-blue-100 rounded-full p-1.5">
                                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <span className="text-sm font-semibold text-slate-800">
                                {order.orderNumber}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                                {statusInfo.icon} {statusInfo.text}
                              </span>
                              <button
                                onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                                className={withCursorPointer("p-1 text-slate-400 hover:text-slate-600")}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          {/* Expanded Details - Only shown when expanded */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              {/* Mobile Actions */}
                              <div className="mb-4 flex flex-col space-y-2">
                                <div className="flex space-x-2">
                                  {/* Invoice Download Button */}
                                  {order.status === 'delivered' || (order as any).status === 'return_completed' || order.status === 'return_requested' ? (
                                    <button
                                      onClick={() => downloadInvoice(order.orderNumber)}
                                      className={withCursorPointer("flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200")}
                                    >
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      Rechnung
                                    </button>
                                  ) : (
                                    <div className="flex-1 text-xs text-slate-500 px-3 py-2 text-center bg-slate-50 rounded-lg">
                                      Rechnung nach Lieferung
                                    </div>
                                  )}
                                  
                                  {/* Credit Note Download Button - Only for completed returns */}
                                  {order.status === 'return_completed' && (
                                    <button
                                      onClick={() => downloadCreditNote(order.orderNumber)}
                                      className={withCursorPointer("flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200")}
                                    >
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      Storno-Rechnung
                                    </button>
                                  )}
                                </div>
                                
                                <div className="flex space-x-2">
                                  {/* Review Button */}
                                  <button
                                    onClick={() => {
                                      if (order.status === 'delivered' || (order as any).status === 'return_completed' || order.status === 'return_requested') {
                                        const reviewStatus = getReviewStatus(order._id);
                                        if (!reviewStatus.allReviewed) {
                                          setReviewModalOrderId(order._id);
                                        }
                                      }
                                    }}
                                    disabled={order.status !== 'delivered' && (order as any).status !== 'return_completed' && order.status !== 'return_requested'}
                                    className={`flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg transition-colors duration-200 ${
                                      order.status === 'delivered' || (order as any).status === 'return_completed' || order.status === 'return_requested'
                                        ? getReviewStatus(order._id).allReviewed 
                                          ? 'text-green-600 bg-green-50 cursor-default' 
                                          : withCursorPointer('text-yellow-600 bg-yellow-50 hover:bg-yellow-100')
                                        : 'text-slate-500 bg-slate-50 cursor-not-allowed'
                                    }`}
                                  >
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                    {(() => {
                                      if (order.status !== 'delivered' && (order as any).status !== 'return_completed') {
                                        return 'Bewertung (nach Lieferung)';
                                      }
                                      const reviewStatus = getReviewStatus(order._id);
                                      if (reviewStatus.allReviewed) {
                                        return `Alle bewertet`;
                                      } else if (reviewStatus.reviewedCount > 0) {
                                        return `Weiter bewerten`;
                                      } else {
                                        return 'Bewertung abgeben';
                                      }
                                    })()}
                                  </button>

                                  {/* Return Button */}
                                  <button
                                    onClick={() => {
                                      if (canReturnOrder(order)) {
                                        setReturnModalOrderId(order._id);
                                        const init: Record<string, number> = {};
                                        order.items.forEach((_, idx) => { init[String(idx)] = 0; });
                                        setReturnSelections(init);
                                      }
                                    }}
                                    disabled={!canReturnOrder(order)}
                                    className={`flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg transition-colors duration-200 ${
                                      canReturnOrder(order)
                                        ? withCursorPointer('text-purple-700 bg-purple-50 hover:bg-purple-100')
                                        : 'text-slate-500 bg-slate-50 cursor-not-allowed'
                                    }`}
                                  >
                                    {getReturnStatusText(order)}
                                  </button>
                                </div>
                              </div>

                              {/* Order Items */}
                              <div className="mb-6">
                                <h4 className="font-semibold text-slate-800 mb-4">Bestellte Artikel</h4>
                                <div className="space-y-3">
                                  {order.items.map((item, index) => (
                                    <div key={`${item.productId}-${index}`} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                                      {item.image && (
                                        <img
                                          src={item.image}
                                          alt={item.name}
                                          className="w-12 h-12 object-cover rounded-lg"
                                        />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-slate-800 mb-1">{item.name}</div>
                                        {isItemReturned(order._id, item) && (
                                          <div className="text-xs text-red-600 mb-1 font-medium">
                                            Zurückgegeben
                                          </div>
                                        )}
                                        <div className="text-xs text-slate-500">
                                          Menge: {item.quantity} • €{(item.price / 100).toFixed(2)}
                                        </div>
                                        {item.variations && Object.keys(item.variations).length > 0 && (
                                          <div className="text-xs text-slate-500 mt-1">
                                            {Object.entries(item.variations).map(([key, value]) => (
                                              <span key={key}>
                                                {key}: {value}
                                                {Object.keys(item.variations || {}).indexOf(key) < Object.keys(item.variations || {}).length - 1 && ', '}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-sm font-semibold text-slate-800">
                                        €{((item.price * item.quantity) / 100).toFixed(2)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Order Summary */}
                              <div className="mb-6">
                                <h4 className="font-semibold text-slate-800 mb-4">Bestellübersicht</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Zwischensumme ({order.items.length} Artikel)</span>
                                    <span className="font-medium">€{((order as any).subtotal || order.total).toFixed(2)}</span>
                                  </div>
                                  {(order as any).shippingCosts > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-slate-600">Versandkosten</span>
                                      <span className="font-medium">€{(((order as any).shippingCosts || 0) / 100).toFixed(2)}</span>
                                    </div>
                                  )}
                                  {(order as any).shippingCosts === 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-slate-600">Versandkosten</span>
                                      <span className="font-medium text-green-600">Kostenlos</span>
                                    </div>
                                  )}
                                  {(order as any).discountCents > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-slate-600">Rabatt{(order as any).discountCode ? ` (${(order as any).discountCode})` : ''}</span>
                                      <span className="font-medium text-green-600">-€{(((order as any).discountCents || 0) / 100).toFixed(2)}</span>
                                    </div>
                                  )}
                                  {(order as any).bonusPointsRedeemed > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-slate-600">Bonuspunkte-Rabatt ({(order as any).bonusPointsRedeemed} Punkte)</span>
                                      <span className="font-medium text-green-600">
                                        -€{getPointsDiscountAmount((order as any).bonusPointsRedeemed).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="border-t border-slate-200 pt-2">
                                    {(() => {
                                      const hasDiscount = ((order as any).discountCents || 0) > 0;
                                      const hasPoints = ((order as any).bonusPointsRedeemed || 0) > 0;
                                      const showSplitTotals = hasDiscount || hasPoints;
                                      const subtotalPlusShipping = (((order as any).subtotal || order.total) + ((((order as any).shippingCosts || 0)) / 100));
                                      if (showSplitTotals) {
                                        return (
                                          <>
                                            <div className="flex justify-between text-base font-semibold">
                                              <span className="text-slate-800">Gesamtbetrag (vor Rabatt)</span>
                                              <span className="text-slate-800">€{subtotalPlusShipping.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-base font-semibold text-green-700 mt-2">
                                              <span>Endbetrag (nach Rabatt)</span>
                                              <span>€{(order.total as number).toFixed(2)}</span>
                                            </div>
                                          </>
                                        );
                                      }
                                      return (
                                        <div className="flex justify-between text-base font-semibold">
                                          <span className="text-slate-800">Gesamtbetrag</span>
                                          <span className="text-slate-800">€{(order.total as number).toFixed(2)}</span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="text-sm text-slate-600 bg-blue-50 rounded p-2">
                                    <span className="font-medium">
                                      {(order as any).bonusPointsEarned > 0
                                        ? `Du hast ${order.bonusPointsEarned} Bonuspunkte für diese Bestellung erhalten`
                                        : (order.status === 'return_completed'
                                            ? 'Keine Bonuspunkte, da alle Artikel zurückgesendet wurden.'
                                            : 'Für diese Bestellung erhältst du keine Bonuspunkte.')}
                                    </span>
                                    {(order as any).bonusPointsRedeemed > 0 && (
                                      <span className="block mt-1">
                                        und {((order as any).bonusPointsRedeemed)} Punkte eingelöst
                                      </span>
                                    )}
                                    {(order.status === 'delivered' || order.status === 'return_requested' || (order as any).status === 'return_completed')
                                      && (order as any).bonusPointsScheduledAt
                                      && !(order as any).bonusPointsCredited
                                      && (order as any).bonusPointsEarned > 0 && (
                                      <span className="block mt-1 text-blue-700">
                                        Geplante Gutschrift: {new Date((order as any).bonusPointsScheduledAt).toLocaleDateString('de-DE', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                      </span>
                                    )}
                                    {(order as any).bonusPointsCredited && (order as any).bonusPointsCreditedAt && (
                                      <span className="block mt-1 text-green-700">
                                        Gutgeschrieben am: {new Date((order as any).bonusPointsCreditedAt).toLocaleDateString('de-DE', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                      </span>
                                    )}
                                    {!(order as any).bonusPointsScheduledAt && order.status !== 'cancelled' && !(order as any).bonusPointsCredited && (order as any).bonusPointsEarned > 0 && (
                                      <span className="block mt-1 text-slate-600">
                                        Bonuspunkte werden 14 Tage nach der Lieferung gutgeschrieben.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Order Details */}
                              <div className="space-y-4">
                                <div className="bg-white rounded-lg p-4">
                                  <h4 className="font-semibold text-slate-800 mb-3">Lieferadresse</h4>
                                  <div className="text-sm text-slate-600 space-y-1">
                                    {(order.shippingAddress as any).company && (
                                      <p className="font-medium text-slate-800">
                                        {(order.shippingAddress as any).company}
                                      </p>
                                    )}
                                    <p className="font-medium text-slate-800">
                                      {(order.shippingAddress as any).firstName || ''} {(order.shippingAddress as any).lastName || ''}
                                    </p>
                                    <p>{order.shippingAddress.street} {order.shippingAddress.houseNumber}</p>
                                    {(order.shippingAddress as any).addressLine2 && (
                                      <p>{(order.shippingAddress as any).addressLine2}</p>
                                    )}
                                    <p>{order.shippingAddress.postalCode} {order.shippingAddress.city}</p>
                                    <p>{order.shippingAddress.country}</p>
                                  </div>
                                </div>

                                {(order as any).billingAddress && (
                                  <div className="bg-white rounded-lg p-4">
                                    <h4 className="font-semibold text-slate-800 mb-3">Rechnungsadresse</h4>
                                    <div className="text-sm text-slate-600 space-y-1">
                                      {((order as any).billingAddress as any).company && (
                                        <p className="font-medium text-slate-800">
                                          {((order as any).billingAddress as any).company}
                                        </p>
                                      )}
                                      <p className="font-medium text-slate-800">
                                        {((order as any).billingAddress as any).firstName || ''} {((order as any).billingAddress as any).lastName || ''}
                                      </p>
                                      <p>{(order as any).billingAddress.street} {(order as any).billingAddress.houseNumber}</p>
                                      {((order as any).billingAddress as any).addressLine2 && (
                                        <p>{((order as any).billingAddress as any).addressLine2}</p>
                                      )}
                                      <p>{(order as any).billingAddress.postalCode} {(order as any).billingAddress.city}</p>
                                      <p>{(order as any).billingAddress.country}</p>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="bg-white rounded-lg p-4">
                                  <h4 className="font-semibold text-slate-800 mb-3">Zahlungsmethode</h4>
                                  <p className="text-sm text-slate-600">{getPaymentMethodText(order.paymentMethod)}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                </>
              )}
            </div>

            {/* Alle Bestellungen werden angezeigt, keine Pagination nötig */}
          </div>
        </div>
      </div>

      {/* Return Modal */}
      {returnModalOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l-3 3m5-3v6m0 0l3-3m-3 3l-3-3" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">Artikel zurücksenden</h3>
                  <p className="text-sm text-slate-600">Wähle die Artikel aus, die du zurücksenden möchtest</p>
                </div>
              </div>
              <button
                onClick={() => { 
                  setReturnModalOrderId(null); 
                  setReturnError(null); 
                  setReturnReason('');
                  setReturnSelections({});
                }}
                className={withCursorPointer("text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-lg transition-colors")}
                aria-label="Schließen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {orders.filter(o => o._id === returnModalOrderId).map(order => (
                <div key={order._id} className="space-y-6">
                  {/* Order Info */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-slate-800">Bestellung #{order.orderNumber}</h4>
                        <p className="text-sm text-slate-600">Bestellt am {new Date(order.createdAt).toLocaleDateString('de-DE')}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-600">Status</div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {order.status === 'delivered' ? 'Geliefert' : 'Versandt'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Selection */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-800 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Artikel auswählen
                    </h4>
                    
                    {order.items.map((item, index) => {
                      const key = String(index);
                      const selectedQty = returnSelections[key] ?? 0;
                      const isSelected = selectedQty > 0;
                      
                      return (
                        <div key={`${item.productId}-${index}`} className={`border rounded-xl p-4 transition-all duration-200 ${
                          isSelected 
                            ? 'border-purple-200 bg-purple-50 shadow-sm' 
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}>
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-800 mb-1">{item.name}</div>
                              {isItemReturned(order._id, item) && (
                                <div className="text-xs text-red-600 mb-1 font-medium">
                                  Zurückgegeben
                                </div>
                              )}
                              {item.variations && Object.keys(item.variations).length > 0 && (
                                <div className="text-sm text-slate-600 mb-2">
                                  {Object.entries(item.variations).map(([k,v]) => (
                                    <span key={k} className="inline-block bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs mr-2 mb-1">
                                      {k}: {v}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span>Gekauft: {item.quantity}×</span>
                                <span>Preis: €{(item.price / 100).toFixed(2)}</span>
                                {(() => {
                                  const orderSubtotalCents = order.items.reduce((s, it) => s + (it.price * it.quantity), 0);
                                  const discountCents = (order as any).discountCents || 0;
                                  const pointsDiscountCents = ((order as any).bonusPointsRedeemed ? getPointsDiscountAmount((order as any).bonusPointsRedeemed) * 100 : 0);
                                  const origLineTotal = item.price * item.quantity;
                                  const share = orderSubtotalCents > 0 ? Math.min(1, Math.max(0, origLineTotal / orderSubtotalCents)) : 0;
                                  const proratedDiscount = Math.round(discountCents * share);
                                  const proratedPoints = Math.round(pointsDiscountCents * share);
                                  const perUnitDeduction = Math.round(proratedDiscount / item.quantity) + Math.round(proratedPoints / item.quantity);
                                  const effectiveUnitCents = Math.max(0, item.price - perUnitDeduction);
                                  if (effectiveUnitCents !== item.price) {
                                    return (
                                      <span className="text-green-700 font-medium">Erstattung/ Stück: €{(effectiveUnitCents / 100).toFixed(2)}</span>
                                    );
                                  }
                                  return null;
                                })()}
                                {isSelected && (
                                  <span className="text-purple-600 font-medium">
                                    Zurück: {selectedQty}×
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="text-sm font-medium text-slate-700">Menge:</label>
                              <select
                                className={`border rounded-lg px-3 py-2 pr-8 text-sm font-medium transition-colors appearance-none ${
                                  isSelected
                                    ? 'border-purple-300 bg-purple-50 text-purple-700'
                                    : 'border-slate-300 bg-white text-slate-700'
                                }`}
                                value={selectedQty}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value, 10) || 0;
                                  setReturnSelections((prev) => ({ ...prev, [key]: value }));
                                }}
                              >
                                {Array.from({ length: item.quantity + 1 }, (_, i) => i).map(i => (
                                  <option key={i} value={i}>{i}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Return Reason */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-800 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Grund für Rücksendung (optional)
                    </h4>
                    <textarea
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="Bitte beschreibe kurz, warum du die Artikel zurücksendest..."
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                      maxLength={500}
                    />
                    <div className="text-xs text-slate-500 text-right">
                      {returnReason.length}/500 Zeichen
                    </div>
                  </div>

                  {/* Summary */}
                  {(() => {
                    const selectedItems = order.items
                      .map((it, idx) => ({ ...it, returnQty: returnSelections[String(idx)] || 0 }))
                      .filter(it => it.returnQty > 0);
                    
                    if (selectedItems.length === 0) return null;
                    
                    return (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Zusammenfassung
                        </h4>
                        <div className="space-y-2">
                          {selectedItems.map((item, idx) => {
                            const orderSubtotalCents = order.items.reduce((s, it) => s + (it.price * it.quantity), 0);
                            const discountCents = (order as any).discountCents || 0;
                            const pointsDiscountCents = ((order as any).bonusPointsRedeemed ? getPointsDiscountAmount((order as any).bonusPointsRedeemed) * 100 : 0);
                            const origLineTotal = item.price * item.quantity;
                            const share = orderSubtotalCents > 0 ? Math.min(1, Math.max(0, origLineTotal / orderSubtotalCents)) : 0;
                            const proratedDiscount = Math.round(discountCents * share);
                            const proratedPoints = Math.round(pointsDiscountCents * share);
                            const perUnitDeduction = Math.round(proratedDiscount / item.quantity) + Math.round(proratedPoints / item.quantity);
                            const effectiveUnitCents = Math.max(0, item.price - perUnitDeduction);
                            const lineRefundCents = effectiveUnitCents * item.returnQty;
                            return (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-purple-700">{item.name} × {item.returnQty}</span>
                                <span className="text-purple-600 font-medium">
                                  €{(lineRefundCents / 100).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                          <div className="border-t border-purple-200 pt-2 mt-2 space-y-2">
                            {(() => {
                              const orderSubtotalCents = order.items.reduce((s, it) => s + (it.price * it.quantity), 0);
                              const discountCents = (order as any).discountCents || 0;
                              const pointsDiscountCents = ((order as any).bonusPointsRedeemed ? getPointsDiscountAmount((order as any).bonusPointsRedeemed) * 100 : 0);
                              const shippingCents = (order as any).shippingCosts || 0;
                              
                              // Calculate refund for selected items
                              const totalRefundCents = selectedItems.reduce((sum, item) => {
                                const origLineTotal = item.price * item.quantity;
                                const share = orderSubtotalCents > 0 ? Math.min(1, Math.max(0, origLineTotal / orderSubtotalCents)) : 0;
                                const proratedDiscount = Math.round(discountCents * share);
                                const proratedPoints = Math.round(pointsDiscountCents * share);
                                const perUnitDeduction = Math.round(proratedDiscount / item.quantity) + Math.round(proratedPoints / item.quantity);
                                const effectiveUnitCents = Math.max(0, item.price - perUnitDeduction);
                                return sum + (effectiveUnitCents * item.returnQty);
                              }, 0);
                              
                              // Check if all items are being returned
                              const totalSelectedQuantity = selectedItems.reduce((sum, item) => sum + item.returnQty, 0);
                              const totalOrderQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
                              const isFullReturn = totalSelectedQuantity >= totalOrderQuantity;
                              
                              const finalRefundCents = totalRefundCents + (isFullReturn ? shippingCents : 0);
                              
                              return (
                                <>
                                  <div className="flex justify-between text-sm text-purple-700">
                                    <span>Artikel:</span>
                                    <span>€{(totalRefundCents / 100).toFixed(2)}</span>
                                  </div>
                                  {isFullReturn && shippingCents > 0 && (
                                    <div className="flex justify-between text-sm text-purple-700">
                                      <span>Versandkosten:</span>
                                      <span>€{(shippingCents / 100).toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-medium text-purple-800 border-t border-purple-200 pt-2">
                                    <span>Gesamtbetrag:</span>
                                    <span>€{(finalRefundCents / 100).toFixed(2)}</span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Error Message */}
                  {returnError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-red-700 font-medium">Fehler</span>
                      </div>
                      <p className="text-red-600 mt-1">{returnError}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => { 
                        setReturnModalOrderId(null); 
                        setReturnError(null); 
                        setReturnReason(''); 
                        setReturnSelections({});
                      }}
                      className={withCursorPointer("px-6 py-3 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors")}
                    >
                      Abbrechen
                    </button>
                    <button
                      disabled={returnSubmitting || Object.values(returnSelections).every(qty => qty === 0)}
                      onClick={async () => {
                        setReturnError(null);
                        const payloadItems = order.items
                          .map((it, idx) => ({ 
                            productId: it.productId, 
                            quantity: returnSelections[String(idx)] || 0, 
                            variations: it.variations || undefined 
                          }))
                          .filter(it => it.quantity > 0);
                        
                        if (payloadItems.length === 0) {
                          setReturnError('Bitte mindestens einen Artikel auswählen.');
                          return;
                        }
                        
                        try {
                          setReturnSubmitting(true);
                          const res = await fetch('/api/returns', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              orderId: order._id, 
                              items: payloadItems,
                              reason: returnReason.trim() || undefined
                            })
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            setReturnError(data.error || 'Fehler beim Absenden der Rücksendung');
                          } else {
                            setReturnModalOrderId(null);
                            setReturnReason('');
                            setReturnSelections({});
                            // Refresh orders to update the status immediately
                            await refetchOrders();
                            alert('Rücksendung eingereicht. Du erhältst eine Bestätigungs-E-Mail.');
                          }
                        } catch (e) {
                          setReturnError('Netzwerkfehler. Bitte erneut versuchen.');
                        } finally {
                          setReturnSubmitting(false);
                        }
                      }}
                      className={`px-6 py-3 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2 ${returnSubmitting || Object.values(returnSelections).every(qty => qty === 0) ? 'cursor-not-allowed' : withCursorPointer('')}`}
                    >
                      {returnSubmitting ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Sende...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Rücksendung absenden
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-800">Bewertung abgeben</h3>
              <button
                onClick={() => { setReviewModalOrderId(null); setReviewError(null); setReviewAttemptedSubmit(false); }}
                className={withCursorPointer("text-slate-500 hover:text-slate-700")}
                aria-label="Schließen"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {orders.filter(o => o._id === reviewModalOrderId).map(order => (
                <div key={order._id} className="space-y-4">
                  
                  {(() => {
                    // Get unique products (by productId) to avoid showing same product multiple times
                    const uniqueProducts = order.items.reduce((acc: any[], item: any) => {
                      const existingItem = acc.find(existing => existing.productId === item.productId);
                      if (!existingItem) {
                        acc.push(item);
                      }
                      return acc;
                    }, []);
                    
                    
                    return uniqueProducts.map((item, index) => {
                      const itemKey = `${order._id}-${item.productId}`;
                      const currentReview = reviews[itemKey] || { rating: 5, title: '', comment: '', isAnonymous: false };
                      
                      // Check if this product has already been reviewed
                      const existingOrderReviews = existingReviews[order._id] || [];
                      const alreadyReviewed = existingOrderReviews.some((r: any) => r.productId === item.productId);
                      
                      if (alreadyReviewed) {
                        return null; // Don't show already reviewed products
                      }
                      
                      return (
                      <div key={itemKey} className="border rounded-xl p-4 bg-gray-50">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-800">{item.name}</h4>
                            {item.variations && Object.keys(item.variations).length > 0 && (
                              <div className="text-sm text-slate-600 mt-1">
                                {Object.entries(item.variations).map(([key, value]) => (
                                  <span key={key} className="mr-2">{key}: {String(value)}</span>
                                ))}
                              </div>
                            )}
                            <div className="text-sm text-slate-500 mt-1">
                              Preis: €{(item.price / 100).toFixed(2)} | Bonuspunkte: {Math.floor((item.price / 100) * 1.75)}
                            </div>
                          </div>
                          <label className={withCursorPointer("flex items-center gap-2 select-none")}>
                            <input
                              type="checkbox"
                              checked={!!currentReview.selected}
                              onChange={(e) => setReviews(prev => ({
                                ...prev,
                                [itemKey]: { ...prev[itemKey] || { rating: 5, title: '', comment: '', isAnonymous: false, selected: false }, selected: e.target.checked }
                              }))}
                              className={withCursorPointer("w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500")}
                            />
                            <span className="text-sm font-medium text-slate-700">Bewertung schreiben</span>
                          </label>
                        </div>
                        
                        {currentReview.selected && (
                          <div className="space-y-3 mt-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Bewertung (1-5 Sterne) *
                              </label>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() => setReviews(prev => ({
                                      ...prev,
                                      [itemKey]: { ...prev[itemKey] || { rating: 5, title: '', comment: '', isAnonymous: false, selected: false }, rating: star }
                                    }))}
                                    className={withCursorPointer(`text-2xl ${star <= currentReview.rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`)}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Titel (erforderlich)
                              </label>
                              <input
                                type="text"
                                placeholder="z.B. 'Sehr zufrieden!'"
                                value={currentReview.title}
                                onChange={(e) => setReviews(prev => ({
                                  ...prev,
                                  [itemKey]: { ...prev[itemKey] || { rating: 5, title: '', comment: '', isAnonymous: false, selected: false }, title: e.target.value }
                                }))}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${reviewAttemptedSubmit && currentReview.selected && !currentReview.title ? 'border-red-300' : 'border-gray-300'}`}
                                maxLength={100}
                              />
                              {reviewAttemptedSubmit && currentReview.selected && !currentReview.title && (
                                <p className="text-xs text-red-600 mt-1">Titel ist erforderlich.</p>
                              )}
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Kommentar (erforderlich)
                              </label>
                              <textarea
                                placeholder="Teile deine Erfahrung mit anderen Kunden..."
                                value={currentReview.comment}
                                onChange={(e) => setReviews(prev => ({
                                  ...prev,
                                  [itemKey]: { ...prev[itemKey] || { rating: 5, title: '', comment: '', isAnonymous: false, selected: false }, comment: e.target.value }
                                }))}
                                rows={3}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${reviewAttemptedSubmit && currentReview.selected && !currentReview.comment ? 'border-red-300' : 'border-gray-300'}`}
                                maxLength={1000}
                              />
                              {reviewAttemptedSubmit && currentReview.selected && !currentReview.comment && (
                                <p className="text-xs text-red-600 mt-1">Kommentar ist erforderlich.</p>
                              )}
                            </div>
                            
                            <div>
                              <label className={withCursorPointer("flex items-center gap-2")}>
                                <input
                                  type="checkbox"
                                  checked={currentReview.isAnonymous}
                                  onChange={(e) => setReviews(prev => ({
                                    ...prev,
                                    [itemKey]: { ...prev[itemKey] || { rating: 5, title: '', comment: '', isAnonymous: false, selected: false }, isAnonymous: e.target.checked }
                                  }))}
                                  className={withCursorPointer("w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500")}
                                />
                                <span className="text-sm font-medium text-slate-700">
                                  Anonym bewerten
                                </span>
                              </label>
                              <p className="text-xs text-slate-500 mt-1">
                                Wenn aktiviert, wird "Anonymer Kunde" statt deinem Namen angezeigt
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    });
                  })()}
                  
                  <div>
                    {reviewError && (
                      <div className="text-sm text-red-600 mb-2">{reviewError}</div>
                    )}
                    
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mb-4">
                      <p className="text-sm">
                        <strong>💎 Bonuspunkte:</strong> Du erhältst Bonuspunkte für deine Bewertung, die nach 2 Wochen automatisch gutgeschrieben werden. 
                        Dies stellt sicher, dass du mit deinem Kauf zufrieden bist.
                      </p>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setReviewModalOrderId(null); setReviewError(null); setReviewAttemptedSubmit(false); }}
                        className={withCursorPointer("px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200")}
                      >
                        Abbrechen
                      </button>
                      <button
                        disabled={reviewSubmitting}
                        onClick={async () => {
                          setReviewError(null);
                          setReviewAttemptedSubmit(true);
                          const currentOrder = orders.find(o => o._id === reviewModalOrderId);
                          if (!currentOrder) {
                            setReviewError('Bestellung nicht gefunden');
                            return;
                          }
                          
                          const orderReviews = Object.entries(reviews)
                            .filter(([key, review]) => key.startsWith(reviewModalOrderId) && (review as any).selected)
                            .map(([key, review]) => {
                              // Extract productId from key format: "orderId-productId"
                              const productId = key.substring(key.indexOf('-') + 1);
                              // Find the first item with this productId to get the price
                              const item = currentOrder.items.find(i => i.productId === productId);
                              if (!item) {
                                console.error('Item not found for productId:', productId, 'in order:', currentOrder._id);
                                return null;
                              }
                              return {
                                productId: item.productId,
                                orderId: currentOrder._id,
                                rating: (review as any).rating,
                                title: (review as any).title,
                                comment: (review as any).comment,
                                isAnonymous: (review as any).isAnonymous,
                                bonusPointsAwarded: Math.floor((item.price / 100) * 1.75)
                              };
                            })
                            .filter(review => review !== null);
                          
                          if (orderReviews.length === 0) {
                            setReviewError('Bitte wähle mindestens ein Produkt aus und fülle alle Felder aus.');
                            return;
                          }
                          
                          // Validate required fields (title/comment) for selected reviews
                          const invalid = (orderReviews as any[]).some(r => !r.title || !r.comment || !r.rating || r.rating < 1 || r.rating > 5);
                          if (invalid) {
                            setReviewError('Bitte fülle alle erforderlichen Felder für die ausgewählten Produkte aus.');
                            return;
                          }
                          
                          try {
                            setReviewSubmitting(true);
                            const res = await fetch('/api/reviews', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ reviews: orderReviews })
                            });
                            const data = await res.json();
                            if (!res.ok) {
                              setReviewError(data.error || 'Fehler beim Absenden der Bewertungen');
                            } else {
                              // Update existing reviews state
                              const newReviews = data.reviews || [];
                              setExistingReviews(prev => {
                                const updated = { ...prev };
                                newReviews.forEach((review: any) => {
                                  if (!updated[review.orderId]) {
                                    updated[review.orderId] = [];
                                  }
                                  updated[review.orderId].push(review);
                                });
                                return updated;
                              });
                              
                              setReviewModalOrderId(null);
                              setReviewAttemptedSubmit(false);
                              alert('Bewertungen erfolgreich abgegeben! Du erhältst Bonuspunkte nach der Überprüfung.');
                            }
                          } catch (e) {
                            setReviewError('Netzwerkfehler. Bitte erneut versuchen.');
                          } finally {
                            setReviewSubmitting(false);
                          }
                        }}
                        className={`px-4 py-2 text-sm rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50 ${reviewSubmitting ? 'cursor-not-allowed' : withCursorPointer('')}`}
                      >
                        {reviewSubmitting ? 'Sende...' : 'Bewertungen absenden'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
