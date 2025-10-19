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
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'return_requested' | 'partially_returned' | 'return_completed';
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
  bonusPointsEarned?: number;
  bonusPointsCredited?: boolean;
  bonusPointsCreditedAt?: string;
  bonusPointsRedeemed?: number;
  bonusPointsDeducted?: number;
  bonusPointsDeductedAt?: string;
  bonusPointsCreditedReturn?: number;
  bonusPointsCreditedReturnAt?: string;
  bonusPointsUnfrozen?: number;
  bonusPointsUnfrozenAt?: string;
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
  const [returnedItems, setReturnedItems] = useState<Record<string, any[]>>({});
  const [showBonusHistory, setShowBonusHistory] = useState(false);
  const [bonusEntries, setBonusEntries] = useState<any[]>([]);
  const [orderEntries, setOrderEntries] = useState<any[]>([]);
  const [reviewEntries, setReviewEntries] = useState<any[]>([]);
  const [returnEntries, setReturnEntries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'reviews' | 'returns'>('orders');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  // Load returned items for orders
  useEffect(() => {
    const loadReturnedItems = async () => {
      if (!userId) return;
      try {
        const response = await fetch(`/api/admin/users/${userId}/returns`);
        if (response.ok) {
          const data = await response.json();
          setReturnedItems(data.returnedItemsByOrder || {});
        }
      } catch (error) {
        console.error('Error loading returned items:', error);
      }
    };

    loadReturnedItems();
  }, [userId]);

  // Build bonus entries separated by type
  useEffect(() => {
    const buildEntries = async () => {
      if (!orders || orders.length === 0) return;
      
      try {
        const orderList: any[] = [];
        const reviewList: any[] = [];
        const returnList: any[] = [];
        const allList: any[] = [];

        // Process orders
        orders.forEach((o: any) => {
          const orderNumber = o.orderNumber;
          const points = o.bonusPointsEarned || 0;
          if (points > 0) {
            if (o.bonusPointsScheduledAt && !o.bonusPointsCredited) {
              const entry = { kind: 'order', orderId: o._id, orderNumber, points, scheduledAt: o.bonusPointsScheduledAt, credited: false };
              orderList.push(entry);
              allList.push(entry);
            }
            if (o.bonusPointsCredited && o.bonusPointsCreditedAt) {
              const entry = { kind: 'order', orderId: o._id, orderNumber, points, credited: true, creditedAt: o.bonusPointsCreditedAt };
              orderList.push(entry);
              allList.push(entry);
            }
          }

          // Process return bonus points
          const returnPoints = o.bonusPointsCreditedReturn || 0;
          if (returnPoints > 0 && o.bonusPointsCreditedReturnAt) {
            const entry = { kind: 'return', orderId: o._id, orderNumber, points: returnPoints, credited: true, creditedAt: o.bonusPointsCreditedReturnAt };
            returnList.push(entry);
            allList.push(entry);
          }
        });

        // Process reviews
        if (orders && orders.length > 0) {
          const orderIds = orders.map((o: any) => o._id);
          const res = await fetch(`/api/reviews?orderId=${orderIds.join(',')}`);
          if (res.ok) {
            const data = await res.json();
            const reviews: any[] = data.reviews || [];
            const idToNumber: Record<string, string> = {};
            for (const o of orders as any[]) idToNumber[o._id] = o.orderNumber;
            reviews.forEach((r) => {
              const pts = r.bonusPointsAwarded || 0;
              if (pts <= 0) return;
              const orderNumber = idToNumber[r.orderId] || r.orderId;
              if (r.bonusPointsScheduledAt && !r.bonusPointsCredited) {
                const entry = { kind: 'review', orderId: r.orderId, reviewId: r._id, orderNumber, points: pts, scheduledAt: r.bonusPointsScheduledAt, credited: false };
                reviewList.push(entry);
                allList.push(entry);
              }
              if (r.bonusPointsCredited && r.bonusPointsCreditedAt) {
                const entry = { kind: 'review', orderId: r.orderId, reviewId: r._id, orderNumber, points: pts, credited: true, creditedAt: r.bonusPointsCreditedAt };
                reviewList.push(entry);
                allList.push(entry);
              }
            });
          }
        }

        // Sort all entries by date (newest first)
        const sortByDate = (list: any[]) => {
          return list.sort((a, b) => {
            const dateA = a.credited ? new Date(a.creditedAt).getTime() : new Date(a.scheduledAt).getTime();
            const dateB = b.credited ? new Date(b.creditedAt).getTime() : new Date(b.scheduledAt).getTime();
            return dateB - dateA; // Newest first
          });
        };

        setOrderEntries(sortByDate(orderList));
        setReviewEntries(sortByDate(reviewList));
        setReturnEntries(sortByDate(returnList));
        setBonusEntries(sortByDate(allList));
      } catch {
        setOrderEntries([]);
        setReviewEntries([]);
        setReturnEntries([]);
        setBonusEntries([]);
      }
    };

    buildEntries();
  }, [orders]);

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

  const downloadCreditNote = async (orderKey: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderKey}/credit-note`);
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Fehler beim Herunterladen der Stornorechnung');
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
      const filename = match ? match[1] : `storno-${orderKey}.pdf`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading credit note:', error);
      alert('Fehler beim Herunterladen der Stornorechnung');
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
      case 'return_requested': return 'bg-amber-100 text-amber-800';
      case 'return_completed': return 'bg-gray-100 text-gray-800';
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
      case 'return_requested': return 'Rücksendung angefordert';
      case 'return_completed': return 'Rückgabe abgeschlossen';
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

  // Helper function to check if an item was returned
  const isItemReturned = (orderId: string, item: any) => {
    const orderReturnedItems = returnedItems[orderId] || [];
    return orderReturnedItems.some(returnedItem => 
      returnedItem.productId === item.productId &&
      JSON.stringify(returnedItem.variations || {}) === JSON.stringify(item.variations || {})
    );
  };

  // Pagination logic for bonus history
  const getCurrentEntries = () => {
    switch (activeTab) {
      case 'orders': return orderEntries;
      case 'reviews': return reviewEntries;
      case 'returns': return returnEntries;
      default: return bonusEntries;
    }
  };

  const currentEntries = getCurrentEntries();
  const totalPages = Math.ceil(currentEntries.length / ITEMS_PER_PAGE);
  const bonusStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const bonusEndIndex = bonusStartIndex + ITEMS_PER_PAGE;
  const paginatedEntries = currentEntries.slice(bonusStartIndex, bonusEndIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

  const handleTabChange = (tab: 'orders' | 'reviews' | 'returns') => {
    setActiveTab(tab);
    resetPagination();
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header - Mobile Optimized */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{getDisplayName(user)}</h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">Benutzerdetails und Bestellhistorie</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* User Information */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-3 sm:px-4 py-4 sm:py-5 lg:p-6">
                <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900 mb-3 sm:mb-4">
                  Benutzerinformationen
                </h3>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">E-Mail</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900 break-all">{user.email || 'Nicht angegeben'}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Name</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900">{getDisplayName(user)}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1 flex flex-wrap gap-1 sm:gap-2">
                      {user.isAdmin && (
                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Admin
                        </span>
                      )}
                      {user.isVerified && (
                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verifiziert
                        </span>
                      )}
                      {user.newsletterSubscribed && (
                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Newsletter
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Registriert am</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900">{formatDate(user.createdAt)}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Bonuspunkte</label>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <span className="text-base sm:text-lg font-semibold text-yellow-600">{user.bonusPoints}</span>
                        <span className="text-xs text-gray-500">Punkte</span>
                      </div>
                      <button
                        onClick={() => setShowBonusHistory(true)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Verlauf
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            {(user.address || user.billingAddress) && (
              <div className="bg-white shadow rounded-lg mt-4 sm:mt-6">
                <div className="px-3 sm:px-4 py-4 sm:py-5 lg:p-6">
                  <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900 mb-3 sm:mb-4">
                    Adressen
                  </h3>
                  
                  {user.address && (
                    <div className="mb-3 sm:mb-4">
                      <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Lieferadresse</h4>
                      <div className="text-xs sm:text-sm text-gray-900">
                        <p>{user.address.street} {user.address.houseNumber}</p>
                        {user.address.addressLine2 && <p>{user.address.addressLine2}</p>}
                        <p>{user.address.postalCode} {user.address.city}</p>
                        <p>{user.address.country}</p>
                      </div>
                    </div>
                  )}
                  
                  {user.billingAddress && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Rechnungsadresse</h4>
                      <div className="text-xs sm:text-sm text-gray-900">
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
              <div className="bg-white shadow rounded-lg mt-4 sm:mt-6">
                <div className="px-3 sm:px-4 py-4 sm:py-5 lg:p-6">
                  <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900 mb-3 sm:mb-4">
                    Zahlungsinformationen
                  </h3>
                  
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Bevorzugte Zahlungsmethode</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900 capitalize">{user.paymentMethod}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Newsletter Information */}
            <div className="bg-white shadow rounded-lg mt-4 sm:mt-6">
              <div className="px-3 sm:px-4 py-4 sm:py-5 lg:p-6">
                <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900 mb-3 sm:mb-4">
                  Newsletter
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium text-gray-500">Newsletter abonniert</span>
                    <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.newsletterSubscribed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.newsletterSubscribed ? 'Ja' : 'Nein'}
                    </span>
                  </div>
                  
                  {user.newsletterSubscribed && user.newsletterSubscribedAt && (
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-500">Abonniert seit</label>
                      <p className="mt-1 text-xs sm:text-sm text-gray-900">{formatDate(user.newsletterSubscribedAt)}</p>
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
              <div className="bg-white shadow rounded-lg mb-4 sm:mb-6">
                <div className="px-3 sm:px-4 py-4 sm:py-5 lg:p-6">
                  <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900 mb-3 sm:mb-4">
                    Bestellstatistiken
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{orderStats.totalOrders}</p>
                      <p className="text-xs sm:text-sm text-gray-500">Bestellungen</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(orderStats.totalSpent)}</p>
                      <p className="text-xs sm:text-sm text-gray-500">Gesamtausgaben</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(orderStats.averageOrderValue)}</p>
                      <p className="text-xs sm:text-sm text-gray-500">Durchschnittswert</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Orders List */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-3 sm:px-4 py-4 sm:py-5 lg:p-6">
                <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900 mb-3 sm:mb-4">
                  Bestellhistorie ({orders?.length || 0})
                </h3>
                
                {!orders || orders.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 text-sm">Keine Bestellungen vorhanden</p>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {currentOrders.map((order) => {
                      const isExpanded = expandedOrders.has(order._id);
                      return (
                        <div key={order._id} className="border border-gray-200 rounded-lg">
                          <button
                            onClick={() => toggleOrderExpansion(order._id)}
                            className="w-full p-3 sm:p-4 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                                <h4 className="text-xs sm:text-sm font-medium text-gray-900">
                                  Bestellung #{order.orderNumber}
                                </h4>
                                <div className="flex flex-wrap gap-1 sm:gap-2">
                                  <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                    {getStatusText(order.status)}
                                  </span>
                                  {order.paymentStatus && (
                                    <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                                      {getPaymentStatusText(order.paymentStatus)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                                <div className="text-left sm:text-right">
                                  <p className="text-xs sm:text-sm font-medium text-gray-900">{formatCurrency(order.total)}</p>
                                  <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                                </div>
                                <svg
                                  className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                            <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-200">
                              <div className="text-xs sm:text-sm text-gray-600">
                                <p><strong>Artikel:</strong> {order.items?.length || 0} Produkt{(order.items?.length || 0) !== 1 ? 'e' : ''}</p>
                                
                                {/* Produktliste */}
                                {order.items && order.items.length > 0 && (
                                  <div className="mt-2 mb-3">
                                    <p className="font-medium text-gray-700 mb-1 text-xs sm:text-sm">Produkte:</p>
                                    <div className="space-y-1">
                                      {order.items.map((item, index) => (
                                        <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 p-2 rounded text-xs sm:text-sm">
                                          <div className="flex-1 mb-1 sm:mb-0">
                                            <p className="font-medium text-gray-900">{item.name}</p>
                                            {isItemReturned(order._id, item) && (
                                              <div className="text-xs text-red-600 mt-1 font-medium">
                                                Zurückgegeben
                                              </div>
                                            )}
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
                                          <div className="text-right sm:text-right">
                                            <p className="font-medium text-gray-900">{item.quantity}x</p>
                                            <p className="text-xs sm:text-sm text-gray-600">{formatCurrency(item.price / 100)}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Bestellübersicht */}
                                <div className="mt-3 mb-3 p-2 sm:p-3 bg-blue-50 rounded-lg">
                                  <p className="font-medium text-gray-700 mb-2 text-xs sm:text-sm">Bestellübersicht:</p>
                                  <div className="space-y-1 text-xs sm:text-sm">
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
                                    {(order as any).discountCents > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Rabatt{(order as any).discountCode ? ` (${(order as any).discountCode})` : ''}:</span>
                                        <span className="font-medium text-green-600">-{formatCurrency(((order as any).discountCents || 0) / 100)}</span>
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
                                      {(() => {
                                        const hasDiscount = ((order as any).discountCents || 0) > 0;
                                        const hasPoints = ((order as any).bonusPointsRedeemed || 0) > 0;
                                        const showSplitTotals = hasDiscount || hasPoints;
                                        const subtotalPlusShipping = (((order as any).subtotal || order.total) + ((((order as any).shippingCosts || 0)) / 100));
                                        if (showSplitTotals) {
                                          return (
                                            <>
                                              <div className="flex justify-between font-semibold">
                                                <span className="text-gray-800">Gesamtbetrag (vor Rabatt):</span>
                                                <span className="text-gray-800">{formatCurrency(subtotalPlusShipping)}</span>
                                              </div>
                                              <div className="flex justify-between font-semibold text-green-700 mt-1">
                                                <span>Endbetrag (nach Rabatt):</span>
                                                <span>{formatCurrency(order.total)}</span>
                                              </div>
                                            </>
                                          );
                                        }
                                        return (
                                          <div className="flex justify-between font-semibold">
                                            <span className="text-gray-800">Gesamtbetrag:</span>
                                            <span className="text-gray-800">{formatCurrency(order.total)}</span>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    {/* Erweiterte Bonuspunkte-Übersicht */}
                                    {(order.bonusPointsEarned || order.bonusPointsRedeemed || order.bonusPointsDeducted || order.bonusPointsCreditedReturn) && (
                                      <div className="mt-3 p-2 sm:p-3 bg-green-50 rounded-lg">
                                        <p className="font-medium text-gray-700 mb-2 text-xs sm:text-sm">Bonuspunkte-Übersicht:</p>
                                        <div className="space-y-1 text-xs sm:text-sm">
                                          {(order.bonusPointsEarned || 0) > 0 && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Verdiente Punkte:</span>
                                              <span className="font-medium text-green-600">+{order.bonusPointsEarned}</span>
                                            </div>
                                          )}
                                          {(order.bonusPointsRedeemed || 0) > 0 && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Eingelöste Punkte:</span>
                                              <span className="font-medium text-red-600">-{order.bonusPointsRedeemed}</span>
                                            </div>
                                          )}
                                          {(order.bonusPointsDeducted || 0) > 0 && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Abgezogene Punkte (Rücksendung):</span>
                                              <span className="font-medium text-red-600">-{order.bonusPointsDeducted}</span>
                                            </div>
                                          )}
                                          {(order.bonusPointsCreditedReturn || 0) > 0 && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Gutgeschriebene Punkte (Rücksendung):</span>
                                              <span className="font-medium text-green-600">+{order.bonusPointsCreditedReturn}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between border-t pt-1 mt-1">
                                            <span className="text-gray-600">Status:</span>
                                            {order.bonusPointsCredited ? (
                                              <span className="font-medium text-green-600">✅ Gutgeschrieben</span>
                                            ) : (order.bonusPointsEarned || 0) > 0 ? (
                                              <span className="font-medium text-yellow-600">⏳ Ausstehend</span>
                                            ) : (
                                              <span className="font-medium text-gray-600">-</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs sm:text-sm"><strong>Lieferadresse:</strong> {getDisplayName(user)} - {order.shippingAddress.street} {order.shippingAddress.houseNumber}, {order.shippingAddress.postalCode} {order.shippingAddress.city}</p>
                                  {order.paymentMethod && (
                                    <p className="text-xs sm:text-sm"><strong>Zahlungsmethode:</strong> {order.paymentMethod}</p>
                                  )}
                                </div>
                                {order.trackingInfo && order.trackingInfo.length > 0 && (
                                  <div className="mt-3">
                                    <p className="font-medium text-gray-700 mb-1 text-xs sm:text-sm">Tracking:</p>
                                    <div className="space-y-1">
                                      {order.trackingInfo.map((tracking, index) => (
                                        <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 p-2 rounded text-xs sm:text-sm">
                                          <div className="flex-1 mb-1 sm:mb-0">
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
                                          <div className="text-right sm:text-right">
                                            <span className="text-xs sm:text-sm text-gray-600 capitalize">{tracking.shippingProvider}</span>
                                            <p className="text-xs text-gray-500">{formatDate(tracking.addedAt)}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Action Buttons */}
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    {order.status === 'delivered' || order.status === 'partially_returned' || order.status === 'return_completed' ? (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            downloadInvoice(order.orderNumber);
                                          }}
                                          className="px-3 py-2 text-xs sm:text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors flex items-center justify-center gap-1"
                                          title="Rechnung herunterladen"
                                        >
                                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <span className="hidden sm:inline">Rechnung herunterladen</span>
                                          <span className="sm:hidden">Rechnung</span>
                                        </button>
                                        {order.status === 'return_completed' && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              downloadCreditNote(order.orderNumber);
                                            }}
                                            className="px-3 py-2 text-xs sm:text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                                            title="Stornorechnung herunterladen"
                                          >
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="hidden sm:inline">Stornorechnung herunterladen</span>
                                            <span className="sm:hidden">Stornorechnung</span>
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <div className="px-3 py-2 text-xs sm:text-sm text-gray-500 bg-gray-50 rounded-md flex items-center justify-center gap-1" title="Rechnung verfügbar nach Lieferung">
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="hidden sm:inline">Rechnung nach Lieferung verfügbar</span>
                                        <span className="sm:hidden">Rechnung später verfügbar</span>
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

        {/* Bonus History Modal */}
        {showBonusHistory && (
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowBonusHistory(false)}
          >
            <div 
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-100 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900">Bonuspunkte-Verlauf - {getDisplayName(user)}</h3>
                <button 
                  onClick={() => setShowBonusHistory(false)} 
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="p-4 sm:p-6">

                  {/* Tabs - Mobile Optimized */}
                  <div className="mb-6">
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => handleTabChange('orders')}
                        className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                          activeTab === 'orders'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        <span className="hidden sm:inline">Bestellungen</span>
                        <span className="sm:hidden">Bestell.</span>
                        <span className="ml-1">({orderEntries.length})</span>
                      </button>
                      <button
                        onClick={() => handleTabChange('reviews')}
                        className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                          activeTab === 'reviews'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        <span className="hidden sm:inline">Bewertungen</span>
                        <span className="sm:hidden">Bewert.</span>
                        <span className="ml-1">({reviewEntries.length})</span>
                      </button>
                      <button
                        onClick={() => handleTabChange('returns')}
                        className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                          activeTab === 'returns'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        <span className="hidden sm:inline">Rücksendungen</span>
                        <span className="sm:hidden">Rücksend.</span>
                        <span className="ml-1">({returnEntries.length})</span>
                      </button>
                    </div>
                  </div>

                  {currentEntries.length === 0 ? (
                    <div className="p-6 bg-slate-50 rounded-xl text-slate-600 text-center">
                      <div className="text-4xl mb-2">📊</div>
                      <div className="text-sm">Keine Einträge vorhanden.</div>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card View for Entries */}
                      <div className="space-y-3">
                        {paginatedEntries.map((entry, idx) => (
                          <div key={bonusStartIndex + idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-2">
                                  {entry.kind === 'order' && (
                                    <div className="bg-blue-100 rounded-full p-1.5">
                                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                      </svg>
                                    </div>
                                  )}
                                  {entry.kind === 'review' && (
                                    <div className="bg-yellow-100 rounded-full p-1.5">
                                      <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                      </svg>
                                    </div>
                                  )}
                                  {entry.kind === 'return' && (
                                    <div className="bg-purple-100 rounded-full p-1.5">
                                      <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-slate-700">
                                    {entry.kind === 'order' ? 'Bestellung' : entry.kind === 'review' ? 'Bewertung' : 'Rücksendung'}
                                    {entry.orderNumber && (
                                      <span className="ml-2 text-slate-500">#{entry.orderNumber}</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {entry.credited ? (
                                      <span className="text-green-700 flex items-center">
                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        Gutgeschrieben am {new Date(entry.creditedAt).toLocaleDateString('de-DE', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                      </span>
                                    ) : (
                                      <span className="text-blue-700 flex items-center">
                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                        </svg>
                                        Geplante Gutschrift am {new Date(entry.scheduledAt).toLocaleDateString('de-DE', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className={`text-lg font-bold ${entry.credited ? 'text-green-600' : 'text-yellow-600'}`}>
                                +{entry.points}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                          <div className="text-sm text-slate-600">
                            Zeige {bonusStartIndex + 1}-{Math.min(bonusEndIndex, currentEntries.length)} von {currentEntries.length} Einträgen
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Mobile Pagination */}
                            <div className="sm:hidden flex items-center space-x-1">
                              <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <span className="px-3 py-1 text-sm font-medium text-slate-700">
                                {currentPage} / {totalPages}
                              </span>
                              <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                            
                            {/* Desktop Pagination */}
                            <div className="hidden sm:flex items-center space-x-1">
                              <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Zurück
                              </button>
                              
                              <div className="flex items-center space-x-1">
                                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                                  const pageNum = Math.max(1, Math.min(totalPages - 2, currentPage - 1)) + i;
                                  if (pageNum > totalPages) return null;
                                  
                                  return (
                                    <button
                                      key={pageNum}
                                      onClick={() => handlePageChange(pageNum)}
                                      className={`px-3 py-1 text-sm rounded-lg ${
                                        pageNum === currentPage
                                          ? 'bg-blue-600 text-white'
                                          : 'text-slate-600 hover:bg-slate-100'
                                      }`}
                                    >
                                      {pageNum}
                                    </button>
                                  );
                                })}
                              </div>
                              
                              <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Weiter
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
