"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useUserData } from "@/lib/contexts/UserDataContext";

type Order = {
  _id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
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
    street: string;
    houseNumber: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod?: string;
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
  const { orders, loading, error } = useUserData();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [returnModalOrderId, setReturnModalOrderId] = useState<string | null>(null);
  const [returnSelections, setReturnSelections] = useState<Record<string, number>>({});
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Orders werden bereits vom Context geladen, kein useEffect nötig

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
          text: 'Rücksendung abgeschlossen',
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading && orders.length === 0) {
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
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
                <a href="#" className="flex items-center px-4 py-3 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                  <div className="w-2 h-2 bg-slate-300 rounded-full mr-3 group-hover:bg-blue-500 transition-colors"></div>
                  Mein Wunschzettel
                </a>
                <a href="#" className="flex items-center px-4 py-3 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                  <div className="w-2 h-2 bg-slate-300 rounded-full mr-3 group-hover:bg-blue-500 transition-colors"></div>
                  Newsletter
                </a>
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
                <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
                        <tr>
                          <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Bestellung #</th>
                          <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Datum</th>
                          <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">Senden an</th>
                          <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Bestellwert</th>
                          <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                          <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/50 divide-y divide-slate-200">
                        {orders.map((order) => {
                          const statusInfo = getStatusInfo(order.status);
                          const isExpanded = expandedOrder === order._id;
                          
                          return (
                            <React.Fragment key={order._id}>
                              <tr className="hover:bg-blue-50/50 transition-colors">
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <span className="text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 px-2 sm:px-3 py-1 rounded-full">
                                    {order.orderNumber}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-600 hidden sm:table-cell">
                                  {formatDate(order.createdAt)}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-600 hidden md:table-cell">
                                  {order.shippingAddress.street} {order.shippingAddress.houseNumber}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-800">
                                  €{order.total.toFixed(2)}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                                    {statusInfo.text}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <button
                                    onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                                    className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium hover:underline flex items-center"
                                  >
                                    {isExpanded ? 'Weniger anzeigen' : 'Details anzeigen'}
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
                                        {/* Status Description */}
                                        <div className="bg-white rounded-lg p-4">
                                          <h4 className="font-semibold text-slate-800 mb-2">Bestellstatus</h4>
                                          <p className="text-slate-600">{statusInfo.description}</p>
                                        </div>

                                        {/* Order Items */}
                                        <div className="bg-white rounded-lg p-4">
                                          <h4 className="font-semibold text-slate-800 mb-4">Bestellte Artikel</h4>
                                          <div className="space-y-4">
                                            {order.items.map((item, index) => (
                                              <div key={`${item.productId}-${index}`} className="flex items-center space-x-4">
                                                {item.image && (
                                                  <img 
                                                    src={item.image} 
                                                    alt={item.name}
                                                    className="w-16 h-16 object-cover rounded-lg"
                                                  />
                                                )}
                                                <div className="flex-1">
                                                  <h5 className="font-medium text-slate-800">{item.name}</h5>
                                                  {item.variations && Object.keys(item.variations).length > 0 && (
                                                    <div className="mt-1">
                                                      {Object.entries(item.variations).map(([key, value]) => (
                                                        <span key={key} className="inline-block mr-3 text-sm text-slate-600">
                                                          {key}: {value}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  )}
                                                  <p className="text-sm text-slate-600">Menge: {item.quantity}</p>
                                                </div>
                                                <div className="text-right">
                                                  <p className="font-semibold text-slate-800">
                                                    €{(item.price * item.quantity).toFixed(2)}
                                                  </p>
                                                  <p className="text-sm text-slate-600">
                                                    €{item.price.toFixed(2)} pro Stück
                                                  </p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Order Details */}
                                        <div className="grid md:grid-cols-2 gap-6">
                                          <div className="bg-white rounded-lg p-4">
                                            <h4 className="font-semibold text-slate-800 mb-3">Lieferadresse</h4>
                                            <div className="text-sm text-slate-600 space-y-1">
                                              <p>{order.shippingAddress.street} {order.shippingAddress.houseNumber}</p>
                                              <p>{order.shippingAddress.postalCode} {order.shippingAddress.city}</p>
                                              <p>{order.shippingAddress.country}</p>
                                            </div>
                                          </div>
                                          
                                          <div className="bg-white rounded-lg p-4">
                                            <h4 className="font-semibold text-slate-800 mb-3">Zahlungsmethode</h4>
                                            <p className="text-sm text-slate-600">{getPaymentMethodText(order.paymentMethod)}</p>
                                          </div>
                                        </div>

                                        {/* Order Actions */}
                                        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                                          {order.status === 'delivered' && (
                                            <button className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                                              Erneut bestellen
                                            </button>
                                          )}
                                          {order.status === 'pending' && (
                                            <button className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                                              Bestellung stornieren
                                            </button>
                                          )}
                                          {order.status === 'shipped' && (
                                            <button
                                              onClick={() => {
                                                setReturnModalOrderId(order._id);
                                                // init selections by line index to support same product with different variations
                                                const init: Record<string, number> = {};
                                                order.items.forEach((_, idx) => { init[String(idx)] = 0; });
                                                setReturnSelections(init);
                                              }}
                                              className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                                            >
                                              Artikel zurücksenden
                                            </button>
                                          )}
                                          <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                            Bestellung drucken
                                          </button>
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
              )}
            </div>

            {/* Alle Bestellungen werden angezeigt, keine Pagination nötig */}
          </div>
        </div>
      </div>

      {/* Return Modal */}
      {returnModalOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-800">Artikel zurücksenden</h3>
              <button
                onClick={() => { setReturnModalOrderId(null); setReturnError(null); }}
                className="text-slate-500 hover:text-slate-700"
                aria-label="Schließen"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {orders.filter(o => o._id === returnModalOrderId).map(order => (
                <div key={order._id} className="space-y-4">
                  {order.items.map((item, index) => {
                    const key = String(index);
                    const selectedQty = returnSelections[key] ?? 0;
                    return (
                      <div key={`${item.productId}-${index}`} className="flex items-center gap-4 border rounded-xl p-3">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded-lg" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 truncate">{item.name}</div>
                          {item.variations && Object.keys(item.variations).length > 0 && (
                            <div className="text-xs text-slate-500">
                              {Object.entries(item.variations).map(([k,v]) => (
                                <span key={k} className="mr-2">{k}: {v}</span>
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-slate-500">Gekauft: {item.quantity}×</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-600">Menge:</label>
                          <select
                            className="border rounded-lg px-2 py-1 text-sm"
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
                    );
                  })}
                  <div>
                    {returnError && (
                      <div className="text-sm text-red-600 mb-2">{returnError}</div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setReturnModalOrderId(null); setReturnError(null); }}
                        className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                      >
                        Abbrechen
                      </button>
                      <button
                        disabled={returnSubmitting}
                        onClick={async () => {
                          setReturnError(null);
                          const payloadItems = order.items
                            .map((it, idx) => ({ productId: it.productId, quantity: returnSelections[String(idx)] || 0, variations: it.variations || undefined }))
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
                              body: JSON.stringify({ orderId: order._id, items: payloadItems })
                            });
                            const data = await res.json();
                            if (!res.ok) {
                              setReturnError(data.error || 'Fehler beim Absenden der Rücksendung');
                            } else {
                              setReturnModalOrderId(null);
                              alert('Rücksendung eingereicht. Du erhältst eine Bestätigungs-E-Mail.');
                            }
                          } catch (e) {
                            setReturnError('Netzwerkfehler. Bitte erneut versuchen.');
                          } finally {
                            setReturnSubmitting(false);
                          }
                        }}
                        className="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        {returnSubmitting ? 'Sende...' : 'Rücksendung absenden'}
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
