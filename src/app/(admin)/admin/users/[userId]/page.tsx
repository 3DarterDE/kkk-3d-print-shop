"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface User {
  _id: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: {
    street?: string;
    houseNumber?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  billingAddress?: {
    street?: string;
    houseNumber?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  paymentMethod?: 'card' | 'paypal' | 'bank';
  newsletterSubscribed?: boolean;
  newsletterSubscribedAt?: string;
  isAdmin: boolean;
  isVerified?: boolean;
  bonusPoints: number;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    variations?: Record<string, string>;
  }>;
  shippingAddress: {
    street: string;
    houseNumber: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    street: string;
    houseNumber: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  trackingInfo: Array<{
    trackingNumber: string;
    shippingProvider: string;
    addedAt: string;
    notes?: string;
    emailSent?: boolean;
    emailSentAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface OrderStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string | null;
  totalShippingCosts: number;
  totalBonusPointsEarned: number;
  totalBonusPointsRedeemed: number;
}

interface UserDetailsResponse {
  success: boolean;
  data: {
    user: User;
    orders: Order[];
    orderStats: OrderStats;
  };
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentOrderPage, setCurrentOrderPage] = useState(1);
  const ordersPerPage = 10;
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`);
      const result: UserDetailsResponse = await response.json();
      
      if (result.success) {
        setUser(result.data.user);
        setOrders(result.data.orders);
        setOrderStats(result.data.orderStats);
      } else {
        setError('Benutzer nicht gefunden');
      }
    } catch (err) {
      setError('Fehler beim Laden der Benutzerdaten');
      console.error('User details fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadInvoice = async (orderKey: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderKey}/invoice`);
      
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
      // Prefer filename from response header
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getDisplayName = (user: User) => {
    if (user.name) return user.name;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    return 'Unbekannt';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'processing': return 'In Bearbeitung';
      case 'shipped': return 'Versendet';
      case 'delivered': return 'Geliefert';
      case 'cancelled': return 'Storniert';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'paid': return 'Bezahlt';
      case 'failed': return 'Fehlgeschlagen';
      case 'refunded': return 'Erstattet';
      default: return status;
    }
  };

  // Pagination logic for orders
  const totalOrderPages = Math.ceil((orders?.length || 0) / ordersPerPage);
  const startIndex = (currentOrderPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = orders?.slice(startIndex, endIndex) || [];

  // Toggle order expansion
  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Benutzerdaten...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error || 'Benutzer nicht gefunden'}</p>
          <Link
            href="/admin/users"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Zurück zur Benutzerliste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{getDisplayName(user)}</h1>
              <p className="mt-2 text-gray-600">Benutzerdetails und Bestellhistorie</p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/admin/users"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Zurück zur Benutzerliste
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Information */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Benutzerinformationen
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">E-Mail</label>
                    <p className="mt-1 text-sm text-gray-900">{user.email || 'Nicht angegeben'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{getDisplayName(user)}</p>
                  </div>
                  
                  {user.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Telefon</label>
                      <p className="mt-1 text-sm text-gray-900">{user.phone}</p>
                    </div>
                  )}
                  
                  {user.dateOfBirth && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Geburtsdatum</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(user.dateOfBirth).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {user.isAdmin && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Admin
                        </span>
                      )}
                      {user.isVerified && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verifiziert
                        </span>
                      )}
                      {user.newsletterSubscribed && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Newsletter
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Registriert am</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(user.createdAt)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Bonuspunkte</label>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-lg font-semibold text-yellow-600">{user.bonusPoints}</span>
                      <span className="text-xs text-gray-500">Punkte</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            {(user.address || user.billingAddress) && (
              <div className="bg-white shadow rounded-lg mt-6">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Adressen
                  </h3>
                  
                  {user.address && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Lieferadresse</h4>
                      <div className="text-sm text-gray-900">
                        <p>{user.address.street} {user.address.houseNumber}</p>
                        {user.address.addressLine2 && <p>{user.address.addressLine2}</p>}
                        <p>{user.address.postalCode} {user.address.city}</p>
                        <p>{user.address.country}</p>
                      </div>
                    </div>
                  )}
                  
                  {user.billingAddress && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Rechnungsadresse</h4>
                      <div className="text-sm text-gray-900">
                        <p>{user.billingAddress.street} {user.billingAddress.houseNumber}</p>
                        {user.billingAddress.addressLine2 && <p>{user.billingAddress.addressLine2}</p>}
                        <p>{user.billingAddress.postalCode} {user.billingAddress.city}</p>
                        <p>{user.billingAddress.country}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Information */}
            {user.paymentMethod && (
              <div className="bg-white shadow rounded-lg mt-6">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Zahlungsinformationen
                  </h3>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Bevorzugte Zahlungsmethode</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{user.paymentMethod}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Newsletter Information */}
            <div className="bg-white shadow rounded-lg mt-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Newsletter
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Newsletter abonniert</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.newsletterSubscribed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.newsletterSubscribed ? 'Ja' : 'Nein'}
                    </span>
                  </div>
                  
                  {user.newsletterSubscribed && user.newsletterSubscribedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Abonniert seit</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(user.newsletterSubscribedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Orders and Statistics */}
          <div className="lg:col-span-2">
            {/* Order Statistics */}
            {orderStats && (
              <div className="bg-white shadow rounded-lg mb-6">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Bestellstatistiken
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{orderStats.totalOrders}</p>
                      <p className="text-sm text-gray-500">Bestellungen</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(orderStats.totalSpent)}</p>
                      <p className="text-sm text-gray-500">Gesamtausgaben</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(orderStats.averageOrderValue)}</p>
                      <p className="text-sm text-gray-500">Durchschnittswert</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Orders List */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Bestellhistorie ({orders?.length || 0})
                </h3>
                
                {!orders || orders.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Keine Bestellungen vorhanden</p>
                ) : (
                  <div className="space-y-4">
                    {currentOrders.map((order) => {
                      const isExpanded = expandedOrders.has(order._id);
                      return (
                        <div key={order._id} className="border border-gray-200 rounded-lg">
                          <button
                            onClick={() => toggleOrderExpansion(order._id)}
                            className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <h4 className="text-sm font-medium text-gray-900">
                                  Bestellung #{order.orderNumber}
                                </h4>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                  {getStatusText(order.status)}
                                </span>
                                {order.paymentStatus && (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                                    {getPaymentStatusText(order.paymentStatus)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">{formatCurrency(order.total)}</p>
                                  <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                                </div>
                                <svg
                                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-200">
                              <div className="text-sm text-gray-600">
                                <p><strong>Artikel:</strong> {order.items?.length || 0} Produkt{(order.items?.length || 0) !== 1 ? 'e' : ''}</p>
                                
                                {/* Produktliste */}
                                {order.items && order.items.length > 0 && (
                                  <div className="mt-2 mb-3">
                                    <p className="font-medium text-gray-700 mb-1">Produkte:</p>
                                    <div className="space-y-1">
                                      {order.items.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                          <div className="flex-1">
                                            <p className="font-medium text-gray-900">{item.name}</p>
                                            {item.variations && Object.keys(item.variations).length > 0 && (
                                              <div className="text-xs text-gray-600 mt-1">
                                                {Object.entries(item.variations).map(([key, value]) => (
                                                  <span key={key} className="mr-2">
                                                    <strong>{key}:</strong> {value}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <p className="font-medium text-gray-900">{item.quantity}x</p>
                                            <p className="text-sm text-gray-600">{formatCurrency(item.price / 100)}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Bestellübersicht */}
                                <div className="mt-3 mb-3 p-3 bg-blue-50 rounded-lg">
                                  <p className="font-medium text-gray-700 mb-2">Bestellübersicht:</p>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Zwischensumme:</span>
                                      <span className="font-medium">{formatCurrency((order as any).subtotal || order.total)}</span>
                                    </div>
                                    {(order as any).shippingCosts > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Versandkosten:</span>
                                        <span className="font-medium">{formatCurrency((order as any).shippingCosts / 100)}</span>
                                      </div>
                                    )}
                                    {(order as any).shippingCosts === 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Versandkosten:</span>
                                        <span className="font-medium text-green-600">Kostenlos</span>
                                      </div>
                                    )}
                                    {(order as any).bonusPointsRedeemed > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Bonuspunkte-Rabatt:</span>
                                        <span className="font-medium text-green-600">
                                          -{formatCurrency((order as any).bonusPointsRedeemed >= 5000 ? 50 : 
                                                         (order as any).bonusPointsRedeemed >= 4000 ? 35 :
                                                         (order as any).bonusPointsRedeemed >= 3000 ? 20 :
                                                         (order as any).bonusPointsRedeemed >= 2000 ? 10 :
                                                         (order as any).bonusPointsRedeemed >= 1000 ? 5 : 0)}
                                        </span>
                                      </div>
                                    )}
                                    <div className="border-t border-gray-300 pt-1">
                                      <div className="flex justify-between font-semibold">
                                        <span className="text-gray-800">Gesamtbetrag:</span>
                                        <span className="text-gray-800">{formatCurrency(order.total)}</span>
                                      </div>
                                    </div>
                                    {(order as any).bonusPointsEarned > 0 && (
                                      <div className="text-xs text-yellow-600 mt-2">
                                        <span className="font-medium">Bonuspunkte erhalten: {(order as any).bonusPointsEarned}</span>
                                        {(order as any).bonusPointsRedeemed > 0 && (
                                          <span className="block">Bonuspunkte eingelöst: {(order as any).bonusPointsRedeemed}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <p><strong>Lieferadresse:</strong> {getDisplayName(user)} - {order.shippingAddress.street} {order.shippingAddress.houseNumber}, {order.shippingAddress.postalCode} {order.shippingAddress.city}</p>
                                {order.paymentMethod && (
                                  <p><strong>Zahlungsmethode:</strong> {order.paymentMethod}</p>
                                )}
                                {order.trackingInfo && order.trackingInfo.length > 0 && (
                                  <div>
                                    <p className="font-medium text-gray-700 mb-1">Tracking:</p>
                                    <div className="space-y-1">
                                      {order.trackingInfo.map((tracking, index) => (
                                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                          <div className="flex-1">
                                            <a 
                                              href={`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${tracking.trackingNumber}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 underline font-medium"
                                            >
                                              {tracking.trackingNumber}
                                            </a>
                                            {tracking.notes && (
                                              <p className="text-xs text-gray-600 mt-1">{tracking.notes}</p>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <span className="text-sm text-gray-600 capitalize">{tracking.shippingProvider}</span>
                                            <p className="text-xs text-gray-500">{formatDate(tracking.addedAt)}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Action Buttons */}
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                  <div className="flex gap-2">
                                    {order.status === 'delivered' ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          downloadInvoice(order.orderNumber);
                                        }}
                                        className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors flex items-center gap-1"
                                        title="Rechnung herunterladen"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Rechnung herunterladen
                                      </button>
                                    ) : (
                                      <div className="px-3 py-1 text-xs text-gray-500 bg-gray-50 rounded-md flex items-center gap-1" title="Rechnung verfügbar nach Lieferung">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Rechnung nach Lieferung verfügbar
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination for orders */}
                {orders && orders.length > ordersPerPage && (
                  <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentOrderPage(Math.max(1, currentOrderPage - 1))}
                        disabled={currentOrderPage === 1}
                        className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Zurück
                      </button>
                      <button
                        onClick={() => setCurrentOrderPage(Math.min(totalOrderPages, currentOrderPage + 1))}
                        disabled={currentOrderPage === totalOrderPages}
                        className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Weiter
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Zeige{' '}
                          <span className="font-medium">{startIndex + 1}</span>
                          {' '}bis{' '}
                          <span className="font-medium">{Math.min(endIndex, orders.length)}</span>
                          {' '}von{' '}
                          <span className="font-medium">{orders.length}</span>
                          {' '}Bestellungen
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentOrderPage(Math.max(1, currentOrderPage - 1))}
                            disabled={currentOrderPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Zurück</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                            </svg>
                          </button>
                          
                          {Array.from({ length: Math.min(5, totalOrderPages) }, (_, i) => {
                            const page = i + 1;
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentOrderPage(page)}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                  currentOrderPage === page
                                    ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => setCurrentOrderPage(Math.min(totalOrderPages, currentOrderPage + 1))}
                            disabled={currentOrderPage === totalOrderPages}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Weiter</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
