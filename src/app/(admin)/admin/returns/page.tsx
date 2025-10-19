"use client";

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';

type ReturnItem = {
  productId: string;
  name: string;
  quantity: number;
  variations?: Record<string, string>;
  accepted?: boolean;
  image?: string;
  frozenBonusPoints?: number;
  refundPercentage?: number;
  notReturned?: boolean;
};

type ReturnRequest = {
  _id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  customer?: { name?: string; email?: string };
  items: ReturnItem[];
  status: 'received'|'processing'|'completed'|'rejected';
  createdAt: string;
  updatedAt: string;
  notes?: string; // customer return reason
  refund?: { method?: string; reference?: string; amount?: number };
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    received: { color: 'bg-blue-100 text-blue-800', icon: '📦', label: 'Eingegangen' },
    processing: { color: 'bg-yellow-100 text-yellow-800', icon: '⚙️', label: 'In Bearbeitung' },
    completed: { color: 'bg-green-100 text-green-800', icon: '✅', label: 'Abgeschlossen' },
    rejected: { color: 'bg-red-100 text-red-800', icon: '❌', label: 'Abgelehnt' }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.received;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
};

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast, ToastContainer } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<ReturnRequest | null>(null);
  const [updating, setUpdating] = useState(false);
  const [orderForReturn, setOrderForReturn] = useState<any | null>(null);
  const [alreadyReturnedItems, setAlreadyReturnedItems] = useState<any[]>([]);

  useEffect(() => {
    fetchList();
  }, [statusFilter]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ ...(statusFilter !== 'all' && { status: statusFilter }) });
      const res = await fetch(`/api/admin/returns?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Laden');
      setReturns(data.returns || []);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id: string) => {
    const res = await fetch(`/api/admin/returns/${id}`);
    const data = await res.json();
    if (res.ok) {
      setSelected(data.returnRequest);
      // Set the order data directly from the API response
      setOrderForReturn(data.order);
      
      // Load already returned items for this order
      if (data.order) {
        await fetchAlreadyReturnedItems(data.order._id);
      }
    } else {
      alert(data.error || 'Fehler beim Laden');
    }
  };

  const fetchAlreadyReturnedItems = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/returns?orderId=${orderId}&status=completed`);
      const data = await res.json();
      if (res.ok) {
        const returnedItems: any[] = [];
        data.returns.forEach((returnDoc: any) => {
          returnDoc.items.forEach((item: any) => {
            if (item.accepted) {
              returnedItems.push({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                variations: item.variations,
                returnRequestId: returnDoc._id,
                returnedAt: returnDoc.updatedAt
              });
            }
          });
        });
        setAlreadyReturnedItems(returnedItems);
      }
    } catch (error) {
      console.error('Error fetching already returned items:', error);
      setAlreadyReturnedItems([]);
    }
  };

  const toggleAccepted = (productId: string) => {
    if (!selected) return;
    setSelected({
      ...selected,
      items: selected.items.map(it => it.productId === productId ? { ...it, accepted: !it.accepted } : it)
    });
  };

  const toggleNotReturned = (productId: string) => {
    if (!selected) return;
    setSelected({
      ...selected,
      items: selected.items.map(it => {
        if (it.productId === productId) {
          const newNotReturned = !it.notReturned;
          return { 
            ...it, 
            notReturned: newNotReturned,
            accepted: newNotReturned ? false : it.accepted, // If not returned, can't be accepted
            refundPercentage: newNotReturned ? 0 : it.refundPercentage
          };
        }
        return it;
      })
    });
  };

  const updateRefundPercentage = (productId: string, percentage: number) => {
    if (!selected) return;
    setSelected({
      ...selected,
      items: selected.items.map(it => 
        it.productId === productId 
          ? { ...it, refundPercentage: percentage, notReturned: percentage === 0 }
          : it
      )
    });
  };

  const completeReturn = async () => {
    if (!selected) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/admin/returns/${selected._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selected.items.map(it => ({ 
            productId: it.productId, 
            accepted: !!it.accepted,
            refundPercentage: it.refundPercentage || 100,
            notReturned: !!it.notReturned
          })),
          status: 'completed',
          notes: selected.notes || undefined,
          refund: selected.refund || undefined,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Aktualisieren');
      setSelected(null);
      setOrderForReturn(null);
      setAlreadyReturnedItems([]);
      await fetchList();
      showToast('Rücksendung abgeschlossen. Lagerbestand aktualisiert und E-Mail versendet.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Fehler beim Aktualisieren', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Load original order for selected return to compute refund preview
  useEffect(() => {
    const fetchOrder = async () => {
      if (!selected) {
        setOrderForReturn(null);
        return;
      }
      try {
        // Use the order data that was already loaded from the return API
        // This ensures we have the most up-to-date returnedItems
        if (orderForReturn) {
          return; // Already loaded from the return API
        }
        
        const res = await fetch(`/api/admin/orders?search=${encodeURIComponent(selected.orderNumber)}`);
        if (!res.ok) return;
        const data = await res.json();
        const found = Array.isArray(data.orders)
          ? data.orders.find((o: any) => String(o.orderNumber) === String(selected.orderNumber))
          : null;
        setOrderForReturn(found || null);
      } catch {
        setOrderForReturn(null);
      }
    };
    fetchOrder();
  }, [selected, orderForReturn]);

  // Helpers to compute prorated refund based on order discount and bonus points
  const getPointsDiscountAmount = (points: number) => {
    if (points >= 5000) return 50; // 50€
    if (points >= 4000) return 35; // 35€
    if (points >= 3000) return 20; // 20€
    if (points >= 2000) return 10; // 10€
    if (points >= 1000) return 5;  // 5€
    return 0;
  };

  const computeEffectiveUnitCents = (retItem: any) => {
    if (!orderForReturn) return Number(retItem.price) || 0;
    const orderItems = Array.isArray(orderForReturn.items) ? orderForReturn.items : [];
    const orderSubtotalCents = orderItems.reduce((s: number, it: any) => s + (Number(it.price) * Number(it.quantity)), 0);
    const orderDiscountCents = Number(orderForReturn.discountCents || 0);
    const pointsDiscountCents = Number(getPointsDiscountAmount(Number(orderForReturn.bonusPointsRedeemed || 0)) * 100);
    const findOriginal = (name: string, variations?: any) => {
      return orderItems.find((oi: any) => {
        const sameName = oi.name === name;
        const sameVar = JSON.stringify(oi.variations || {}) === JSON.stringify(variations || {});
        return sameName && sameVar;
      });
    };
    const orig = findOriginal(retItem.name, retItem.variations);
    if (!orig || orderSubtotalCents <= 0) return Number(retItem.price) || 0;
    const origLineTotal = Number(orig.price) * Number(orig.quantity);
    const share = Math.min(1, Math.max(0, origLineTotal / orderSubtotalCents));
    const proratedDiscount = Math.round(orderDiscountCents * share);
    const proratedPoints = Math.round(pointsDiscountCents * share);
    const perUnitDeduction = Math.round(proratedDiscount / Number(orig.quantity)) + Math.round(proratedPoints / Number(orig.quantity));
    const unitPrice = Number(retItem.price) || 0;
    return Math.max(0, unitPrice - perUnitDeduction);
  };

  const computeAcceptedRefundTotalCents = () => {
    if (!selected) return 0;
    
    // Calculate refund for accepted items (considering refund percentage)
    const itemsRefundCents = selected.items.reduce((sum, it: any) => {
      if (!it.accepted) return sum;
      const eff = computeEffectiveUnitCents(it);
      const qty = Number(it.quantity) || 0;
      const refundPercentage = it.refundPercentage || 100;
      return sum + (eff * qty * (refundPercentage / 100));
    }, 0);
    
    // Add shipping costs if all items are being returned
    if (orderForReturn) {
      const totalSelectedQuantity = selected.items
        .filter(it => it.accepted)
        .reduce((sum, it) => sum + Number(it.quantity), 0);
      const totalOrderQuantity = orderForReturn.items.reduce((sum: number, it: any) => sum + Number(it.quantity), 0);
      
      // Calculate total returned quantity across all previous returns
      let previousReturnedQuantity = 0;
      
      // Check against alreadyReturnedItems (from API)
      previousReturnedQuantity += alreadyReturnedItems.reduce((sum: number, item: any) => sum + Number(item.quantity), 0);
      
      // Also check against orderForReturn.returnedItems (from order model)
      if (orderForReturn.returnedItems && orderForReturn.returnedItems.length > 0) {
        previousReturnedQuantity += orderForReturn.returnedItems.reduce((sum: number, item: any) => sum + Number(item.quantity), 0);
      }
      
      const totalReturnedQuantity = previousReturnedQuantity + totalSelectedQuantity;
      const isFullReturn = totalReturnedQuantity >= totalOrderQuantity;
      
      const shippingCents = Number(orderForReturn.shippingCosts || 0);
      let totalRefundCents = itemsRefundCents + (isFullReturn ? shippingCents : 0);
      
      // Simple cap: ensure we don't exceed the original order total
      const originalOrderTotalCents = Math.round(orderForReturn.total * 100);
      totalRefundCents = Math.min(totalRefundCents, originalOrderTotalCents);
      
      return totalRefundCents;
    }
    
    return itemsRefundCents;
  };

  if (loading && returns.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600 text-lg">Lade Rücksendungen...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <div className="text-gray-700 text-lg">{error}</div>
          <button 
            onClick={fetchList}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">📦</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rücksendungen verwalten</h1>
                <p className="text-gray-600 text-sm mt-1">Verwalten Sie alle Rücksendungsanfragen</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="text-sm text-gray-500">
                {returns.length} Rücksendung{returns.length !== 1 ? 'en' : ''} gefunden
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
              >
                <option value="all">Alle Status</option>
                <option value="received">Eingegangen</option>
                <option value="processing">In Bearbeitung</option>
                <option value="completed">Abgeschlossen</option>
                <option value="rejected">Abgelehnt</option>
              </select>
            </div>
          </div>
        </div>

        {/* Returns Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {returns.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="text-gray-400 text-4xl sm:text-6xl mb-4">📦</div>
              <div className="text-gray-500 text-base sm:text-lg mb-2">Keine Rücksendungen gefunden</div>
              <div className="text-gray-400 text-sm">Es wurden keine Rücksendungen für den gewählten Filter gefunden.</div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <span>📋</span>
                          Bestellung
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <span>👤</span>
                          Kunde
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <span>📦</span>
                          Artikel
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <span>💬</span>
                          Rücksendegrund
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <span>🏷️</span>
                          Status
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          Datum
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {returns.map((r) => (
                      <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-blue-100 rounded text-blue-600 text-xs font-medium">
                              #{r.orderNumber}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-600 text-sm">👤</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{r.customer?.name || 'Unbekannt'}</div>
                              <div className="text-xs text-gray-500">{r.customer?.email || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">{r.items.length}</span>
                            <span className="text-xs text-gray-500">Artikel</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            {r.notes ? (
                              <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg border">
                                <div className="flex items-start gap-2">
                                  <span className="text-gray-500 text-xs mt-0.5">💬</span>
                                  <span className="line-clamp-2">{r.notes}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Kein Grund angegeben</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(r.createdAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => openDetail(r._id)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <span>👁️</span>
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden">
                <div className="divide-y divide-gray-200">
                  {returns.map((r) => (
                    <div key={r._id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-600">👤</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{r.customer?.name || 'Unbekannt'}</div>
                            <div className="text-xs text-gray-500">{r.customer?.email || ''}</div>
                          </div>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">📋</span>
                          <div className="p-1 bg-blue-100 rounded text-blue-600 text-xs font-medium">
                            #{r.orderNumber}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">📦</span>
                          <span className="text-sm text-gray-700">{r.items.length} Artikel</span>
                        </div>
                      </div>
                      
                      {/* Return Reason */}
                      {r.notes && (
                        <div className="mb-3">
                          <div className="flex items-start gap-2">
                            <span className="text-gray-500 text-sm mt-0.5">💬</span>
                            <div className="flex-1">
                              <div className="text-xs text-gray-500 mb-1">Rücksendegrund:</div>
                              <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg border">
                                {r.notes}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          📅 {new Date(r.createdAt).toLocaleDateString('de-DE')}
                        </div>
                        <button
                          onClick={() => openDetail(r._id)}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <span>👁️</span>
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl flex-shrink-0">
                    <span className="text-blue-600 text-xl sm:text-2xl">📦</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Rücksendung #{selected.orderNumber}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                      <div className="text-sm text-gray-600 truncate">
                        <span className="font-medium">{selected.customer?.name}</span>
                        <span className="hidden sm:inline mx-2">•</span>
                        <span className="block sm:inline">{selected.customer?.email}</span>
                      </div>
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelected(null); setOrderForReturn(null); setAlreadyReturnedItems([]); }} 
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
            </div>
            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
              {/* Customer Return Reason */}
              {selected.notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className="text-blue-600 text-lg">💬</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">Rücksendegrund des Kunden</h4>
                      <div className="text-sm text-blue-700 bg-white p-3 rounded-lg border border-blue-100">
                        {selected.notes}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Items Section */}
              {/* Already Returned Items */}
              {alreadyReturnedItems && alreadyReturnedItems.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <span>✅</span>
                    Bereits zurückgesendete Artikel
                  </h4>
                  <div className="space-y-2">
                    {alreadyReturnedItems.map((returnedItem: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex-shrink-0">
                          <span className="text-green-600 text-lg">✅</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{returnedItem.name}</div>
                          {returnedItem.variations && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(returnedItem.variations).map(([k,v]) => (
                                <span key={k} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-200 text-gray-700">
                                  {k}: {String(v)}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="text-sm text-gray-600 mt-1">
                            Menge: {returnedItem.quantity} • Zurückgesendet: {new Date(returnedItem.returnedAt).toLocaleDateString('de-DE')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="space-y-3">
                  {selected.items.map((it) => (
                    <div key={it.productId} className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 border-2 rounded-xl p-3 sm:p-4 transition-all ${
                      it.accepted ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                    }`}>
                      <div className="flex items-center gap-3 sm:flex-shrink-0">
                        <div className="flex-shrink-0">
                          {it.image ? (
                            <img src={it.image} alt={it.name} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border border-gray-200" />
                          ) : (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-lg sm:text-2xl">📦</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-base sm:text-lg">{it.name}</div>
                          {it.variations && (
                            <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                              {Object.entries(it.variations).map(([k,v]) => (
                                <span key={k} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 sm:gap-4 mt-1 sm:mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <span>📊</span>
                              Menge: <span className="font-medium">{it.quantity}</span>
                            </span>
                            {it.frozenBonusPoints && it.frozenBonusPoints > 0 && (
                              <span className="flex items-center gap-1 text-blue-600">
                                <span>🧊</span>
                                {it.frozenBonusPoints} Punkte eingefroren
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            {orderForReturn ? (
                              <div className="space-y-2">
                                <div className="text-gray-600">
                                  Erstattung/Stück: <span className="font-semibold text-green-700">€{(computeEffectiveUnitCents(it) / 100).toFixed(2)}</span>
                                </div>
                                {!!it.accepted && (
                                  <div className="text-gray-600">
                                    Erstattung gesamt: <span className="font-semibold text-green-700">€{((computeEffectiveUnitCents(it) * (Number(it.quantity) || 0)) / 100).toFixed(2)}</span>
                                  </div>
                                )}
                                
                                {/* Refund Percentage Dropdown */}
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-500">Erstattung:</label>
                                  <select
                                    value={it.refundPercentage || 100}
                                    onChange={(e) => updateRefundPercentage(it.productId, Number(e.target.value))}
                                    disabled={!!it.notReturned}
                                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                  >
                                    <option value={100}>100%</option>
                                    <option value={60}>60% (Beschädigt)</option>
                                    <option value={0}>0%</option>
                                  </select>
                                </div>
                                
                                {/* Not Returned Checkbox */}
                                <div className="flex items-center gap-2">
                                  <label className="inline-flex items-center gap-1 text-xs">
                                    <input 
                                      type="checkbox" 
                                      checked={!!it.notReturned} 
                                      onChange={() => toggleNotReturned(it.productId)}
                                      className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-gray-600">Nicht zurückgegeben</span>
                                  </label>
                                  {it.notReturned && (
                                    <span className="text-xs text-blue-600 font-medium">
                                      🧊 Punkte werden freigegeben und dokumentiert
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-400 flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                Bestellinformationen werden geladen…
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <label className={`inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 cursor-pointer transition-all ${
                            it.accepted 
                              ? 'bg-green-100 border-green-300 text-green-800' 
                              : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                          } ${it.notReturned ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <input 
                              type="checkbox" 
                              checked={!!it.accepted} 
                              onChange={() => toggleAccepted(it.productId)}
                              disabled={!!it.notReturned}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className="font-medium text-sm sm:text-base">
                              {it.accepted ? '✅ Akzeptiert' : '⏳ Akzeptieren'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Refund Summary */}
              {orderForReturn && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 text-lg">💰</span>
                      <span className="text-green-800 font-semibold text-lg">Voraussichtliche Rückerstattung</span>
                    </div>
                    <span className="text-green-800 font-bold text-xl">€{(computeAcceptedRefundTotalCents() / 100).toFixed(2)}</span>
                  </div>
                  {(() => {
                    const hasDiscount = Number(orderForReturn.discountCents || 0) > 0;
                    const hasPoints = Number(orderForReturn.bonusPointsRedeemed || 0) > 0;
                    const shippingCents = Number(orderForReturn.shippingCosts || 0);
                    
                    // Check if all items are being returned (for shipping refund)
                    // This includes all previous returns plus current return
                    const totalSelectedQuantity = selected.items
                      .filter(it => it.accepted)
                      .reduce((sum, it) => sum + Number(it.quantity), 0);
                    const totalOrderQuantity = orderForReturn.items.reduce((sum: number, it: any) => sum + Number(it.quantity), 0);
                    
                    // Calculate total returned quantity across all previous returns
                    let previousReturnedQuantity = 0;
                    
                    // Check against alreadyReturnedItems (from API)
                    previousReturnedQuantity += alreadyReturnedItems.reduce((sum: number, item: any) => sum + Number(item.quantity), 0);
                    
                    // Also check against orderForReturn.returnedItems (from order model)
                    if (orderForReturn.returnedItems && orderForReturn.returnedItems.length > 0) {
                      previousReturnedQuantity += orderForReturn.returnedItems.reduce((sum: number, item: any) => sum + Number(item.quantity), 0);
                    }
                    
                    const totalReturnedQuantity = previousReturnedQuantity + totalSelectedQuantity;
                    
                    const isFullReturn = totalReturnedQuantity >= totalOrderQuantity;
                    const includesShipping = isFullReturn && shippingCents > 0;
                    
                    const details = [];
                    if (hasDiscount || hasPoints) {
                      details.push(`anteiligem ${hasDiscount ? 'Rabatt' : ''}${hasDiscount && hasPoints ? ' und ' : ''}${hasPoints ? 'Bonuspunkte-Rabatt' : ''}`);
                    }
                    if (includesShipping) {
                      details.push('Versandkosten');
                    }
                    
                    if (details.length > 0) {
                      return (
                        <div className="text-sm text-green-700 flex items-center gap-1">
                          <span>ℹ️</span>
                          inkl. {details.join(' und ')}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Bonuspunkte-Status für diese Bestellung */}
                  {(orderForReturn.bonusPointsEarned || orderForReturn.bonusPointsDeducted) && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-blue-600 text-lg">🧊</span>
                        <span className="text-blue-800 font-semibold text-sm">Bonuspunkte-Status</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        {orderForReturn.bonusPointsEarned > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Aktuelle Punkte:</span>
                            <span className="font-medium text-green-600">+{orderForReturn.bonusPointsEarned}</span>
                          </div>
                        )}
                        {orderForReturn.bonusPointsDeducted > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Abgezogen (Rücksendungen):</span>
                            <span className="font-medium text-red-600">-{orderForReturn.bonusPointsDeducted}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Refund Details */}
              <div>
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <span>💳</span>
                  Rückerstattungsdetails
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rückerstattungsmethode</label>
                    <input 
                      value={selected.refund?.method || ''} 
                      onChange={(e) => setSelected({ ...selected, refund: { ...(selected.refund || {}), method: e.target.value } })} 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      placeholder="PayPal, Klarna, Bank..." 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Referenz/Transaktions-ID</label>
                    <input 
                      value={selected.refund?.reference || ''} 
                      onChange={(e) => setSelected({ ...selected, refund: { ...(selected.refund || {}), reference: e.target.value } })} 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      placeholder="z.B. PAY-123456789" 
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Betrag (Cent)</label>
                    <input 
                      type="number" 
                      value={selected.refund?.amount ?? ''} 
                      onChange={(e) => setSelected({ ...selected, refund: { ...(selected.refund || {}), amount: Number(e.target.value) || 0 } })} 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      placeholder="z. B. 2599" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button 
                onClick={() => { setSelected(null); setOrderForReturn(null); setAlreadyReturnedItems([]); }} 
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                disabled={updating} 
                onClick={completeReturn} 
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Wird verarbeitet...
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    Rücksendung abschließen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}


