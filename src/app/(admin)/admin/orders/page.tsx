"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTrackingUrl, getTrackingProviderName } from '@/lib/tracking-urls';

interface TrackingInfo {
  _id?: string;
  trackingNumber: string;
  shippingProvider: 'dhl' | 'dpd' | 'ups' | 'fedex' | 'hermes' | 'gls' | 'other';
  addedAt: string;
  notes?: string;
}

interface Order {
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
  trackingNumber?: string; // Legacy field
  shippingProvider?: 'dhl' | 'dpd' | 'ups' | 'fedex' | 'hermes' | 'gls' | 'other'; // Legacy field
  trackingInfo: TrackingInfo[];
  isEmailSent?: boolean;
  emailSentAt?: string;
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
  userName?: string;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newTrackingInfo, setNewTrackingInfo] = useState<{
    trackingNumber: string;
    shippingProvider: string;
    notes: string;
  }>({ trackingNumber: '', shippingProvider: 'dhl', notes: '' });
  const [sendingEmail, setSendingEmail] = useState(false);

  const limit = 20;

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/api/admin/orders?${params}`);
      const data: OrdersResponse = await response.json();
      
      if (response.ok) {
        setOrders(data.orders);
        setTotalOrders(data.total);
        setTotalPages(Math.ceil(data.total / limit));
      } else {
        setError(data.error || 'Fehler beim Laden der Bestellungen');
      }
    } catch (err) {
      setError('Fehler beim Laden der Bestellungen');
      console.error('Orders fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update local state
        setOrders(prev => prev.map(order => 
          order._id === orderId ? { ...order, status: newStatus as any } : order
        ));
      } else {
        const data = await response.json();
        alert(data.error || 'Fehler beim Aktualisieren des Status');
      }
    } catch (err) {
      alert('Fehler beim Aktualisieren des Status');
      console.error('Status update error:', err);
    }
  };

  const openTrackingModal = (order: Order) => {
    setSelectedOrder(order);
    setTrackingModalOpen(true);
    setNewTrackingInfo({ trackingNumber: '', shippingProvider: 'dhl', notes: '' });
  };

  const closeTrackingModal = () => {
    setTrackingModalOpen(false);
    setSelectedOrder(null);
    setNewTrackingInfo({ trackingNumber: '', shippingProvider: 'dhl', notes: '' });
  };

  const addTrackingInfo = async () => {
    if (!selectedOrder || !newTrackingInfo.trackingNumber.trim()) {
      alert('Bitte geben Sie eine Sendungsnummer ein');
      return;
    }

    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder._id}/tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTrackingInfo),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update the selectedOrder with the new tracking info
        if (selectedOrder) {
          const updatedOrder = {
            ...selectedOrder,
            trackingInfo: [...(selectedOrder.trackingInfo || []), result.trackingInfo]
          };
          setSelectedOrder(updatedOrder);
        }
        
        // Also refresh the orders list
        await fetchOrders();
        
        setNewTrackingInfo({ trackingNumber: '', shippingProvider: 'dhl', notes: '' });
      } else {
        const data = await response.json();
        alert(data.error || 'Fehler beim Hinzufügen der Sendungsnummer');
      }
    } catch (err) {
      alert('Fehler beim Hinzufügen der Sendungsnummer');
      console.error('Add tracking error:', err);
    }
  };

  const removeTrackingInfo = async (orderId: string, trackingId: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/tracking/${trackingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update the selectedOrder by removing the tracking info
        if (selectedOrder && selectedOrder._id === orderId) {
          const updatedOrder = {
            ...selectedOrder,
            trackingInfo: selectedOrder.trackingInfo.filter(tracking => {
              const trackingIdStr = tracking._id ? tracking._id.toString() : '';
              return trackingIdStr !== trackingId;
            })
          };
          setSelectedOrder(updatedOrder);
        }
        
        // Also refresh the orders list
        await fetchOrders();
      } else {
        const data = await response.json();
        alert(data.error || 'Fehler beim Löschen der Sendungsnummer');
      }
    } catch (err) {
      alert('Fehler beim Löschen der Sendungsnummer');
      console.error('Remove tracking error:', err);
    }
  };

  const sendTrackingEmail = async () => {
    if (!selectedOrder) return;

    setSendingEmail(true);
    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder._id}/send-tracking-email`, {
        method: 'POST',
      });

      if (response.ok) {
        // Update the selectedOrder with new status and email sent info
        const now = new Date();
        const updatedOrder = {
          ...selectedOrder,
          status: 'shipped' as const,
          isEmailSent: true,
          emailSentAt: now.toISOString(),
          trackingInfo: selectedOrder.trackingInfo.map(tracking => ({
            ...tracking,
            emailSent: true,
            emailSentAt: now
          }))
        };
        setSelectedOrder(updatedOrder);
        
        // Also refresh the orders list
        await fetchOrders();
        
        alert('E-Mail wurde erfolgreich versendet und Status auf "Versandt" gesetzt!');
      } else {
        const data = await response.json();
        alert(data.error || 'Fehler beim Versenden der E-Mail');
      }
    } catch (err) {
      alert('Fehler beim Versenden der E-Mail');
      console.error('Send email error:', err);
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          text: 'Ausstehend',
          color: 'text-amber-600',
          bg: 'bg-amber-100',
          icon: '⏳'
        };
      case 'processing':
        return {
          text: 'In Bearbeitung',
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          icon: '⚙️'
        };
      case 'shipped':
        return {
          text: 'Versandt',
          color: 'text-purple-600',
          bg: 'bg-purple-100',
          icon: '🚚'
        };
      case 'delivered':
        return {
          text: 'Geliefert',
          color: 'text-green-600',
          bg: 'bg-green-100',
          icon: '✅'
        };
      case 'cancelled':
        return {
          text: 'Storniert',
          color: 'text-red-600',
          bg: 'bg-red-100',
          icon: '❌'
        };
      default:
        return {
          text: status,
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          icon: '❓'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrders();
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Bestellungen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Fehler beim Laden</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchOrders}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Erneut versuchen
          </button>
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
              <h1 className="text-3xl font-bold text-gray-900">Bestellungen verwalten</h1>
              <p className="mt-2 text-gray-600">
                {totalOrders} Bestellungen gefunden
                {statusFilter !== 'all' && ` (Status: ${getStatusInfo(statusFilter).text})`}
              </p>
            </div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Zurück zum Dashboard
            </Link>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <form onSubmit={handleSearch} className="md:col-span-2">
              <div className="flex">
                <input
                  type="text"
                  placeholder="Suche nach Bestellnummer, Kunde oder E-Mail..."
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
                >
                  Suchen
                </button>
              </div>
            </form>
            
            <div>
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alle Bestellungen</option>
                <option value="pending">Nur ausstehende</option>
                <option value="processing">In Bearbeitung</option>
                <option value="shipped">Versandt</option>
                <option value="delivered">Geliefert</option>
                <option value="cancelled">Storniert</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Bestellungen gefunden</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Versuchen Sie andere Suchkriterien.' 
                  : 'Es wurden noch keine Bestellungen aufgegeben.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bestellung
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kunde
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Betrag
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sendung
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => {
                    const statusInfo = getStatusInfo(order.status);
                    const isExpanded = expandedOrder === order._id;
                    
                    return (
                      <React.Fragment key={order._id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {order.orderNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.items.length} Artikel
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {order.userName || 'Unbekannt'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.userEmail || 'Keine E-Mail'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                              {statusInfo.icon} {statusInfo.text}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="space-y-1">
                              {order.trackingInfo && order.trackingInfo.length > 0 ? (
                                <div>
                                   <div className="text-xs font-medium text-gray-900 flex items-center space-x-2">
                                     <span>
                                       {order.trackingInfo.length} Sendung{order.trackingInfo.length > 1 ? 'en' : ''}
                                     </span>
                                   {(order.isEmailSent || order.trackingInfo.some(t => t.emailSent)) && (
                                       <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                         <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                         </svg>
                                         E-Mail
                                       </span>
                                     )}
                                   </div>
                                   <div className="text-xs text-gray-500">
                                     {getTrackingProviderName(order.trackingInfo[0].shippingProvider || 'other')}
                                   </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">Keine Sendungen</div>
                              )}
                              <button
                                onClick={() => openTrackingModal(order)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Verwalten
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                {isExpanded ? 'Weniger' : 'Details'}
                              </button>
                              <select
                                value={order.status}
                                onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                                className="text-xs border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="pending">Ausstehend</option>
                                <option value="processing">In Bearbeitung</option>
                                <option value="shipped">Versandt</option>
                                <option value="delivered">Geliefert</option>
                                <option value="cancelled">Storniert</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded Details */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-0 py-0">
                              <div className="bg-gray-50 border-t border-gray-200">
                                <div className="p-6 space-y-6">
                                  {/* Order Items */}
                                  <div>
                                    <h4 className="text-lg font-medium text-gray-900 mb-4">Bestellte Artikel</h4>
                                    <div className="space-y-4">
                                      {order.items.map((item, index) => (
                                        <div key={index} className="flex items-center space-x-4 bg-white p-4 rounded-lg">
                                          {item.image && (
                                            <img 
                                              src={item.image} 
                                              alt={item.name}
                                              className="w-16 h-16 object-cover rounded-lg"
                                            />
                                          )}
                                          <div className="flex-1">
                                            <h5 className="font-medium text-gray-900">{item.name}</h5>
                                            {item.variations && Object.keys(item.variations).length > 0 && (
                                              <div className="mt-1">
                                                {Object.entries(item.variations).map(([key, value]) => (
                                                  <span key={key} className="inline-block mr-3 text-sm text-gray-600">
                                                    {key}: {value}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                            <p className="text-sm text-gray-600">Menge: {item.quantity}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-semibold text-gray-900">
                                              {formatCurrency(item.price * item.quantity)}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                              {formatCurrency(item.price)} pro Stück
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                        {/* Order Details */}
                                        <div className="grid md:grid-cols-3 gap-6">
                                          <div className="bg-white p-4 rounded-lg">
                                            <h4 className="font-medium text-gray-900 mb-3">Lieferadresse</h4>
                                            <div className="text-sm text-gray-600 space-y-1">
                                              <p>{order.shippingAddress.street} {order.shippingAddress.houseNumber}</p>
                                              <p>{order.shippingAddress.postalCode} {order.shippingAddress.city}</p>
                                              <p>{order.shippingAddress.country}</p>
                                            </div>
                                          </div>
                                          
                                          <div className="bg-white p-4 rounded-lg">
                                            <h4 className="font-medium text-gray-900 mb-3">Zahlungsmethode</h4>
                                            <p className="text-sm text-gray-600">
                                              {order.paymentMethod === 'card' && 'Kreditkarte / Debitkarte'}
                                              {order.paymentMethod === 'paypal' && 'PayPal'}
                                              {order.paymentMethod === 'bank' && 'Banküberweisung'}
                                              {!order.paymentMethod && 'Nicht angegeben'}
                                            </p>
                                          </div>

                                          <div className="bg-white p-4 rounded-lg">
                                            <h4 className="font-medium text-gray-900 mb-3">Sendungsverfolgung</h4>
                                            <div className="space-y-3">
                                              {order.trackingInfo && order.trackingInfo.length > 0 ? (
                                                <div className="space-y-2">
                                                  {order.trackingInfo.map((tracking, index) => (
                                                    <div key={tracking._id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                      <div className="flex-1">
                                                        <div className="flex items-center space-x-2">
                                                          <div className="text-sm font-medium text-gray-900">
                                                            {tracking.trackingNumber}
                                                          </div>
                                                          {tracking.emailSent && (
                                                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                          )}
                                                        </div>
                                                         <div className="text-xs text-gray-500 capitalize">
                                                           {getTrackingProviderName(tracking.shippingProvider || 'other')}
                                                           {tracking.emailSent && (
                                                             <span className="ml-2 text-green-600 font-medium">
                                                               • E-Mail gesendet
                                                             </span>
                                                           )}
                                                         </div>
                                                        {tracking.notes && (
                                                          <div className="text-xs text-gray-400 italic">
                                                            {tracking.notes}
                                                          </div>
                                                        )}
                                                      </div>
                                                       <div className="flex space-x-1">
                                                         {(() => {
                                                           const trackingUrl = getTrackingUrl(tracking.shippingProvider || 'other', tracking.trackingNumber);
                                                           return trackingUrl ? (
                                                             <a
                                                               href={trackingUrl}
                                                               target="_blank"
                                                               rel="noopener noreferrer"
                                                               className="p-1 text-blue-600 hover:text-blue-800"
                                                               title="Sendung verfolgen"
                                                             >
                                                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                               </svg>
                                                             </a>
                                                           ) : null;
                                                         })()}
                                                        <button
                                                          onClick={() => removeTrackingInfo(order._id, tracking._id!)}
                                                          className="p-1 text-red-600 hover:text-red-800"
                                                          title="Löschen"
                                                        >
                                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                          </svg>
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="text-sm text-gray-400 italic">
                                                  Keine Sendungsnummern hinterlegt
                                                </div>
                                              )}
                                              <button
                                                onClick={() => openTrackingModal(order)}
                                                className="w-full px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:ring-2 focus:ring-blue-500"
                                              >
                                                {order.trackingInfo && order.trackingInfo.length > 0 ? 'Sendungen verwalten' : 'Sendungsnummer hinzufügen'}
                                              </button>
                                            </div>
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
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Zurück
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Weiter
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Zeige{' '}
                  <span className="font-medium">{(currentPage - 1) * limit + 1}</span>
                  {' '}bis{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * limit, totalOrders)}
                  </span>
                  {' '}von{' '}
                  <span className="font-medium">{totalOrders}</span>
                  {' '}Ergebnissen
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Zurück
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Weiter
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tracking Modal */}
      {trackingModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Sendungsverfolgung - {selectedOrder.orderNumber}
              </h3>
              <button
                onClick={closeTrackingModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Existing Tracking Info */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Aktuelle Sendungen</h4>
              {selectedOrder.trackingInfo && selectedOrder.trackingInfo.length > 0 ? (
                <div className="space-y-3">
                  {selectedOrder.trackingInfo.map((tracking, index) => (
                    <div key={tracking._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="text-sm font-medium text-gray-900">
                            {tracking.trackingNumber}
                          </div>
                           <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                             {getTrackingProviderName(tracking.shippingProvider || 'other')}
                           </span>
                          {tracking.emailSent && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              E-Mail gesendet
                            </span>
                          )}
                        </div>
                        {tracking.notes && (
                          <div className="text-xs text-gray-500 mt-1">
                            {tracking.notes}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          Hinzugefügt: {new Date(tracking.addedAt).toLocaleDateString('de-DE')}
                          {tracking.emailSentAt && (
                            <span className="ml-2 text-green-600">
                              • E-Mail: {new Date(tracking.emailSentAt).toLocaleDateString('de-DE')} {new Date(tracking.emailSentAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                       <div className="flex space-x-2">
                         {(() => {
                           const trackingUrl = getTrackingUrl(tracking.shippingProvider || 'other', tracking.trackingNumber);
                           return trackingUrl ? (
                             <a
                               href={trackingUrl}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                               title="Sendung verfolgen"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                               </svg>
                             </a>
                           ) : null;
                         })()}
                        <button
                          onClick={() => removeTrackingInfo(selectedOrder._id, tracking._id!)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          title="Löschen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg">
                  Noch keine Sendungsnummern hinzugefügt
                </div>
              )}
            </div>

            {/* Send Email Button */}
            {selectedOrder.trackingInfo && selectedOrder.trackingInfo.length > 0 && (
              <div className="border-t pt-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-md font-medium text-gray-900">E-Mail senden</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Sendungsbenachrichtigung an den Kunden versenden
                    </p>
                  </div>
                  <button
                    onClick={sendTrackingEmail}
                    disabled={sendingEmail}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingEmail ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Wird gesendet...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        E-Mail senden
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Add New Tracking Info */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Neue Sendungsnummer hinzufügen</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sendungsnummer
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. 1234567890"
                    value={newTrackingInfo.trackingNumber}
                    onChange={(e) => setNewTrackingInfo(prev => ({ ...prev, trackingNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Versanddienstleister
                  </label>
                  <select
                    value={newTrackingInfo.shippingProvider}
                    onChange={(e) => setNewTrackingInfo(prev => ({ ...prev, shippingProvider: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="dhl">DHL</option>
                    <option value="dpd">DPD</option>
                    <option value="ups">UPS</option>
                    <option value="fedex">FedEx</option>
                    <option value="hermes">Hermes</option>
                    <option value="gls">GLS</option>
                    <option value="other">Andere</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notizen (optional)
                  </label>
                  <textarea
                    placeholder="z.B. Express-Versand, Paket 1 von 2..."
                    value={newTrackingInfo.notes}
                    onChange={(e) => setNewTrackingInfo(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeTrackingModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={addTrackingInfo}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
