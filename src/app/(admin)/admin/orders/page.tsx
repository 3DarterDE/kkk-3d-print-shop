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
  emailSent?: boolean;
  emailSentAt?: string;
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
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  trackingNumber?: string; // Legacy field
  shippingProvider?: 'dhl' | 'dpd' | 'ups' | 'fedex' | 'hermes' | 'gls' | 'other'; // Legacy field
  trackingInfo: TrackingInfo[];
  isEmailSent?: boolean;
  emailSentAt?: string;
  bonusPointsEarned: number; // Bonuspunkte die bei dieser Bestellung verdient wurden
  bonusPointsCredited: boolean; // Ob die Bonuspunkte bereits gutgeschrieben wurden
  bonusPointsCreditedAt?: string; // Wann die Bonuspunkte gutgeschrieben wurden
  bonusPointsScheduledAt?: string; // Wann die Bonuspunkte geplant sind (für Timer)
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
  userName?: string;
  guestEmail?: string;
  guestName?: string;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  error?: string;
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
  const [deletingGuestData, setDeletingGuestData] = useState(false);

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
            emailSentAt: now.toISOString()
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

  const deleteGuestData = async (order: Order) => {
    if (!order.guestEmail) {
      alert('Dies ist keine Gastbestellung oder bereits gelöscht');
      return;
    }

    if (!confirm(`Möchten Sie die Daten für Gastbestellung ${order.orderNumber} wirklich löschen?\n\nDies wird alle persönlichen Daten anonymisieren.`)) {
      return;
    }

    setDeletingGuestData(true);
    try {
      const response = await fetch(`/api/admin/orders/${order._id}/delete-guest-data`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Gastbestellungsdaten erfolgreich anonymisiert!');
        fetchOrders(); // Refresh orders
      } else {
        const error = await response.json();
        alert(`Fehler beim Löschen der Daten: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting guest data:', error);
      alert('Fehler beim Löschen der Daten');
    } finally {
      setDeletingGuestData(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${label} wurde in die Zwischenablage kopiert!`);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Fehler beim Kopieren in die Zwischenablage');
    }
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
      // Try to derive filename from response headers, fallback to orderKey
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
      case 'return_requested':
        return {
          text: 'Rücksendung angefordert',
          color: 'text-amber-700',
          bg: 'bg-amber-100',
          icon: '↩️'
        };
      case 'return_completed':
        return {
          text: 'Rücksendung abgeschlossen',
          color: 'text-purple-700',
          bg: 'bg-purple-100',
          icon: '✅'
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

  // Funktion zur Berechnung des Bonuspunkte-Rabatts
  const getPointsDiscountAmount = (points: number) => {
    if (points >= 5000) return 50; // 50€
    if (points >= 4000) return 35; // 35€
    if (points >= 3000) return 20; // 20€
    if (points >= 2000) return 10; // 10€
    if (points >= 1000) return 5;  // 5€
    return 0;
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
        {/* Header mit verbessertem Design */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h1 className="text-3xl font-bold text-gray-900">Bestellverwaltung</h1>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <span className="font-semibold text-lg text-blue-600">{totalOrders}</span>
                  <span>Bestellungen</span>
                </div>
                {statusFilter !== 'all' && (
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">Filter:</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                      {getStatusInfo(statusFilter).icon} {getStatusInfo(statusFilter).text}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>
          </div>
        </div>

        {/* Verbesserte Such- und Filter-Sektion */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <form onSubmit={handleSearch} className="lg:col-span-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Suche nach Bestellnummer, Kunde oder E-Mail..."
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </form>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="all">Alle Bestellungen</option>
                <option value="pending">⏳ Ausstehend</option>
                <option value="processing">⚙️ In Bearbeitung</option>
                <option value="shipped">🚚 Versandt</option>
                <option value="delivered">✅ Geliefert</option>
                <option value="cancelled">❌ Storniert</option>
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
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Bestellung</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Kunde</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Datum</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center justify-end space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <span>Betrag</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Status</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>Sendung</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                        <span>Aktionen</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => {
                    const statusInfo = getStatusInfo(order.status);
                    const isExpanded = expandedOrder === order._id;
                    
                    return (
                      <React.Fragment key={order._id}>
                        <tr className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="bg-blue-100 rounded-full p-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {order.orderNumber}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {order.items.length} Artikel{(order.items.length === 1 ? '' : 's')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="bg-gray-100 rounded-full p-2">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {order.userName || 'Unbekannt'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {order.userEmail || 'Keine E-Mail'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm text-gray-900">
                                {formatDate(order.createdAt)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              <div className="text-sm font-semibold text-gray-900">
                                {formatCurrency(order.total)}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center text-xs">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                                {statusInfo.icon} {statusInfo.text}
                              </span>
                              {order.status === 'delivered' && order.bonusPointsScheduledAt && !order.bonusPointsCredited && (
                                <span className="mt-1 text-blue-700">
                                  Punkte am {formatDate(order.bonusPointsScheduledAt)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="space-y-1">
                              {order.trackingInfo && order.trackingInfo.length > 0 ? (
                                <div className="text-center">
                                   <div className="text-xs font-medium text-gray-900">
                                     {order.trackingInfo.length} Sendung{order.trackingInfo.length > 1 ? 'en' : ''}
                                   </div>
                                   {(order.isEmailSent || order.trackingInfo.some(t => t.emailSent)) && (
                                     <div className="mt-1">
                                       <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                         <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                         </svg>
                                         E-Mail
                                       </span>
                                     </div>
                                   )}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">Keine Sendungen</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col space-y-2">
                              <button
                                onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                                className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
                                </svg>
                                {isExpanded ? 'Weniger' : 'Details'}
                              </button>
                              {order.status === 'delivered' ? (
                                <button
                                  onClick={() => downloadInvoice(order.orderNumber)}
                                  className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200"
                                  title="Rechnung herunterladen"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Rechnung
                                </button>
                              ) : (
                                <div className="text-xs text-gray-500 px-2 py-1 text-center" title="Rechnung verfügbar nach Lieferung">
                                  <svg className="w-3 h-3 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Nach Lieferung
                                </div>
                              )}
                              <select
                                value={order.status}
                                onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                                className="text-xs border border-gray-300 rounded px-1 py-1 w-full"
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
                            <td colSpan={7} className="px-0 py-0">
                              <div className="bg-gray-50 border-t border-gray-200">
                                <div className="p-6">
                                  {/* Zwei-Spalten-Layout: Links Bestellte Artikel (50%), Rechts alles andere (50%) */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Linke Spalte: Bestellte Artikel und Bestellübersicht (50%) */}
                                  <div className="space-y-6">
                                    {/* Bestellte Artikel */}
                                    <div>
                                      <h4 className="text-lg font-medium text-gray-900 mb-4">Bestellte Artikel</h4>
                                      <div className="bg-white rounded-lg overflow-hidden">
                                        <div className="overflow-x-auto">
                                          <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                              <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Produkt
                                                </th>
                                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Var.
                                                </th>
                                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Menge
                                                </th>
                                                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Preis
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Gesamt
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                              {order.items.map((item, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                  <td className="px-4 py-3">
                                                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                                  </td>
                                                  <td className="px-3 py-3">
                                                    <div className="text-xs text-gray-600">
                                                      {item.variations && Object.keys(item.variations).length > 0 ? (
                                                        Object.entries(item.variations).map(([key, value]) => (
                                                          <span key={key} className="block">
                                                            {key}: {value}
                                                          </span>
                                                        ))
                                                      ) : (
                                                        <span className="text-gray-400 italic text-xs">Keine</span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="px-3 py-3 text-center">
                                                    <span className="text-sm font-medium text-gray-900">{item.quantity}</span>
                                                  </td>
                                                  <td className="px-3 py-3 text-right">
                                                    <span className="text-xs text-gray-600">{formatCurrency(item.price / 100)}</span>
                                                  </td>
                                                  <td className="px-4 py-3 text-right">
                                                    <span className="text-sm font-semibold text-gray-900">
                                                      {formatCurrency((item.price * item.quantity) / 100)}
                                                    </span>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Bestellübersicht */}
                                    <div className="bg-white p-4 rounded-lg">
                                      <h4 className="font-medium text-gray-900 mb-4">Bestellübersicht</h4>
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                          <span className="text-gray-600">Zwischensumme ({order.items.length} Artikel)</span>
                                          <span className="font-medium">{formatCurrency((order as any).subtotal || order.total)}</span>
                                        </div>
                                        {(order as any).shippingCosts > 0 && (
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Versandkosten</span>
                                            <span className="font-medium">{formatCurrency((order as any).shippingCosts / 100)}</span>
                                          </div>
                                        )}
                                        {(order as any).shippingCosts === 0 && (
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Versandkosten</span>
                                            <span className="font-medium text-green-600">Kostenlos</span>
                                          </div>
                                        )}
                                        {(order as any).bonusPointsRedeemed > 0 && (
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Bonuspunkte-Rabatt ({(order as any).bonusPointsRedeemed} Punkte)</span>
                                            <span className="font-medium text-green-600">
                                              -{formatCurrency(getPointsDiscountAmount((order as any).bonusPointsRedeemed))}
                                            </span>
                                          </div>
                                        )}
                                        <div className="border-t border-gray-200 pt-2">
                                          <div className="flex justify-between text-base font-semibold">
                                            <span className="text-gray-900">Gesamtbetrag (vor Rabatt)</span>
                                            <span className="text-gray-900">{formatCurrency(((order as any).subtotal || order.total) + ((order as any).shippingCosts || 0) / 100)}</span>
                                          </div>
                                          {(order as any).bonusPointsRedeemed > 0 && (
                                            <div className="flex justify-between text-base font-semibold text-green-600 mt-2">
                                              <span>Endbetrag (nach Rabatt)</span>
                                              <span>{formatCurrency(order.total)}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="mt-4 text-sm text-blue-600 bg-blue-50 rounded p-3">
                                          <span className="font-medium">Kunde hat {order.bonusPointsEarned} Bonuspunkte für diese Bestellung erhalten</span>
                                          {(order as any).bonusPointsRedeemed > 0 && (
                                            <span className="block mt-1">
                                              und {((order as any).bonusPointsRedeemed)} Punkte eingelöst
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Rechte Spalte: Bestelldetails (50%) */}
                                  <div className="space-y-6">
                                    {/* Order Details Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="bg-white p-4 rounded-lg">
                                            <h4 className="font-medium text-gray-900 mb-3">Lieferadresse</h4>
                                            <div className="text-sm text-gray-600 space-y-1">
                                              {/* Name */}
                                              {(order.shippingAddress.firstName || order.shippingAddress.lastName) && (
                                                <div className="flex items-center justify-between">
                                                  <p className="font-medium text-gray-900">
                                                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                                                  </p>
                                                  <button
                                                    onClick={() => copyToClipboard(
                                                      `${order.shippingAddress.firstName || ''} ${order.shippingAddress.lastName || ''}`,
                                                      'Name'
                                                    )}
                                                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                    title="Name kopieren"
                                                  >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                  </button>
                                                </div>
                                              )}
                                              
                                              {/* Firma */}
                                              {order.shippingAddress.company && (
                                                <div className="flex items-center justify-between">
                                                  <p className="font-medium text-gray-900">{order.shippingAddress.company}</p>
                                                  <button
                                                    onClick={() => copyToClipboard(
                                                      order.shippingAddress.company!,
                                                      'Firma'
                                                    )}
                                                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                    title="Firma kopieren"
                                                  >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                  </button>
                                                </div>
                                              )}
                                              
                                              {/* Straße + Hausnummer */}
                                              <div className="flex items-center justify-between">
                                                <p>{order.shippingAddress.street} {order.shippingAddress.houseNumber}</p>
                                                <button
                                                  onClick={() => copyToClipboard(
                                                    `${order.shippingAddress.street} ${order.shippingAddress.houseNumber}`,
                                                    'Adresse'
                                                  )}
                                                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                  title="Adresse kopieren"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                  </svg>
                                                </button>
                                              </div>
                                              
                                              {/* Adresszusatz */}
                                              {order.shippingAddress.addressLine2 && (
                                                <div className="flex items-center justify-between">
                                                  <p>{order.shippingAddress.addressLine2}</p>
                                                  <button
                                                    onClick={() => copyToClipboard(
                                                      order.shippingAddress.addressLine2!,
                                                      'Adresszusatz'
                                                    )}
                                                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                    title="Adresszusatz kopieren"
                                                  >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                  </button>
                                                </div>
                                              )}
                                              
                                              {/* PLZ */}
                                              <div className="flex items-center justify-between">
                                                <p>{order.shippingAddress.postalCode}</p>
                                                <button
                                                  onClick={() => copyToClipboard(
                                                    order.shippingAddress.postalCode,
                                                    'PLZ'
                                                  )}
                                                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                  title="PLZ kopieren"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                  </svg>
                                                </button>
                                              </div>
                                              
                                              {/* Stadt */}
                                              <div className="flex items-center justify-between">
                                                <p>{order.shippingAddress.city}</p>
                                                <button
                                                  onClick={() => copyToClipboard(
                                                    order.shippingAddress.city,
                                                    'Stadt'
                                                  )}
                                                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                  title="Stadt kopieren"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                  </svg>
                                                </button>
                                              </div>
                                              
                                              {/* Land */}
                                              <div className="flex items-center justify-between">
                                                <p>{order.shippingAddress.country}</p>
                                                <button
                                                  onClick={() => copyToClipboard(
                                                    order.shippingAddress.country,
                                                    'Land'
                                                  )}
                                                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                  title="Land kopieren"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="bg-white p-4 rounded-lg">
                                            <h4 className="font-medium text-gray-900 mb-3">Rechnungsadresse</h4>
                                            <div className="text-sm text-gray-600 space-y-1">
                                              {order.billingAddress ? (
                                                <>
                                                  {/* Name */}
                                                  {(order.billingAddress.firstName || order.billingAddress.lastName) && (
                                                    <div className="flex items-center justify-between">
                                                      <p className="font-medium text-gray-900">
                                                        {order.billingAddress.firstName} {order.billingAddress.lastName}
                                                      </p>
                                                      <button
                                                        onClick={() => copyToClipboard(
                                                          `${order.billingAddress?.firstName || ''} ${order.billingAddress?.lastName || ''}`,
                                                          'Name (Rechnung)'
                                                        )}
                                                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                        title="Name kopieren"
                                                      >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                      </button>
                                                    </div>
                                                  )}
                                                  
                                                  {/* Firma */}
                                                  {order.billingAddress!.company && (
                                                    <div className="flex items-center justify-between">
                                                      <p className="font-medium text-gray-900">{order.billingAddress.company}</p>
                                                      <button
                                                        onClick={() => copyToClipboard(
                                                          order.billingAddress!.company!,
                                                          'Firma (Rechnung)'
                                                        )}
                                                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                        title="Firma kopieren"
                                                      >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                      </button>
                                                    </div>
                                                  )}
                                                  
                                                  {/* Straße + Hausnummer */}
                                                  <div className="flex items-center justify-between">
                                                    <p>{order.billingAddress.street} {order.billingAddress.houseNumber}</p>
                                                    <button
                                                      onClick={() => copyToClipboard(
                                                        `${order.billingAddress!.street} ${order.billingAddress!.houseNumber}`,
                                                        'Adresse (Rechnung)'
                                                      )}
                                                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                      title="Adresse kopieren"
                                                    >
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                      </svg>
                                                    </button>
                                                  </div>
                                                  
                                                  {/* Adresszusatz */}
                                                  {order.billingAddress!.addressLine2 && (
                                                    <div className="flex items-center justify-between">
                                                      <p>{order.billingAddress.addressLine2}</p>
                                                      <button
                                                        onClick={() => copyToClipboard(
                                                          order.billingAddress!.addressLine2!,
                                                          'Adresszusatz (Rechnung)'
                                                        )}
                                                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                        title="Adresszusatz kopieren"
                                                      >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                      </button>
                                                    </div>
                                                  )}
                                                  
                                                  {/* PLZ */}
                                                  <div className="flex items-center justify-between">
                                                    <p>{order.billingAddress.postalCode}</p>
                                                    <button
                                                      onClick={() => copyToClipboard(
                                                        order.billingAddress!.postalCode,
                                                        'PLZ (Rechnung)'
                                                      )}
                                                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                      title="PLZ kopieren"
                                                    >
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                      </svg>
                                                    </button>
                                                  </div>
                                                  {/* Stadt */}
                                                  <div className="flex items-center justify-between">
                                                    <p>{order.billingAddress.city}</p>
                                                    <button
                                                      onClick={() => copyToClipboard(
                                                        order.billingAddress!.city,
                                                        'Stadt (Rechnung)'
                                                      )}
                                                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                      title="Stadt kopieren"
                                                    >
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                      </svg>
                                                    </button>
                                                  </div>
                                                  
                                                  {/* Land */}
                                                  <div className="flex items-center justify-between">
                                                    <p>{order.billingAddress.country}</p>
                                                    <button
                                                      onClick={() => copyToClipboard(
                                                        order.billingAddress!.country,
                                                        'Land (Rechnung)'
                                                      )}
                                                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                      title="Land kopieren"
                                                    >
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                      </svg>
                                                    </button>
                                                  </div>
                                                </>
                                              ) : (
                                                <p className="text-gray-500 italic">Gleich wie Lieferadresse</p>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <div className="bg-white p-4 rounded-lg">
                                            <h4 className="font-medium text-gray-900 mb-3">Zahlung</h4>
                                            <div className="text-sm text-gray-600">
                                              <p className="font-medium text-gray-900">
                                                {order.paymentMethod === 'card' && '💳 Kreditkarte / Debitkarte'}
                                                {order.paymentMethod === 'paypal' && '🅿️ PayPal'}
                                                {order.paymentMethod === 'bank' && '🏦 Banküberweisung'}
                                                {!order.paymentMethod && '❓ Nicht angegeben'}
                                              </p>
                                              <p className="text-xs text-gray-500 mt-1">
                                                Status: <span className={`font-medium ${
                                                  order.paymentStatus === 'paid' ? 'text-green-600' :
                                                  order.paymentStatus === 'pending' ? 'text-amber-600' :
                                                  order.paymentStatus === 'failed' ? 'text-red-600' :
                                                  'text-gray-600'
                                                }`}>
                                                  {order.paymentStatus === 'paid' && '✅ Bezahlt'}
                                                  {order.paymentStatus === 'pending' && '⏳ Ausstehend'}
                                                  {order.paymentStatus === 'failed' && '❌ Fehlgeschlagen'}
                                                  {order.paymentStatus === 'refunded' && '↩️ Rückerstattet'}
                                                  {!order.paymentStatus && 'Unbekannt'}
                                                </span>
                                              </p>
                                            </div>
                                          </div>

                                          <div className="bg-white p-4 rounded-lg">
                                            <h4 className="font-medium text-gray-900 mb-3">Bonuspunkte</h4>
                                            <div className="space-y-2">
                                              <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Verdiente Punkte:</span>
                                                <span className="text-lg font-semibold text-yellow-600">{order.bonusPointsEarned}</span>
                                              </div>
                                              <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Status:</span>
                                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                  order.bonusPointsCredited 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : order.bonusPointsScheduledAt
                                                      ? 'bg-blue-100 text-blue-800'
                                                      : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                  {order.bonusPointsCredited 
                                                    ? '✅ Gutgeschrieben' 
                                                    : order.bonusPointsScheduledAt
                                                      ? '⏰ Eingeplant'
                                                      : '⏳ Ausstehend'
                                                  }
                                                </span>
                                              </div>
                                              {order.bonusPointsCreditedAt && (
                                                <div className="text-xs text-gray-500">
                                                  Gutgeschrieben: {formatDate(order.bonusPointsCreditedAt)}
                                                </div>
                                              )}
                                              {order.bonusPointsScheduledAt && !order.bonusPointsCredited && (
                                                <div className="text-xs text-blue-600">
                                                  Geplant für: {formatDate(order.bonusPointsScheduledAt)}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="grid md:grid-cols-1 gap-6">
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
                                              {order.guestEmail && (
                                                <button
                                                  onClick={() => deleteGuestData(order)}
                                                  disabled={deletingGuestData}
                                                  className="w-full mt-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100 focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                  {deletingGuestData ? 'Wird gelöscht...' : 'Gastdaten löschen'}
                                                </button>
                                              )}
                                            </div>
                                          </div>
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
