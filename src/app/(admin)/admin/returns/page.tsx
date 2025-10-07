"use client";

import React, { useEffect, useState } from 'react';

type ReturnItem = {
  productId: string;
  name: string;
  quantity: number;
  variations?: Record<string, string>;
  accepted?: boolean;
  image?: string;
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
  notes?: string;
  refund?: { method?: string; reference?: string; amount?: number };
};

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<ReturnRequest | null>(null);
  const [updating, setUpdating] = useState(false);
  const [orderForReturn, setOrderForReturn] = useState<any | null>(null);

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
    if (res.ok) setSelected(data.returnRequest);
    else alert(data.error || 'Fehler beim Laden');
  };

  const toggleAccepted = (productId: string) => {
    if (!selected) return;
    setSelected({
      ...selected,
      items: selected.items.map(it => it.productId === productId ? { ...it, accepted: !it.accepted } : it)
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
          items: selected.items.map(it => ({ productId: it.productId, accepted: !!it.accepted })),
          status: 'completed',
          notes: selected.notes || undefined,
          refund: selected.refund || undefined,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Aktualisieren');
      setSelected(null);
      await fetchList();
      alert('Rücksendung abgeschlossen. Lagerbestand aktualisiert und E-Mail versendet.');
    } catch (e: any) {
      alert(e.message || 'Fehler beim Aktualisieren');
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
  }, [selected]);

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
    const proratedDiscount = Math.floor(orderDiscountCents * share);
    const proratedPoints = Math.floor(pointsDiscountCents * share);
    const perUnitDeduction = Math.floor(proratedDiscount / Number(orig.quantity)) + Math.floor(proratedPoints / Number(orig.quantity));
    const unitPrice = Number(retItem.price) || 0;
    return Math.max(0, unitPrice - perUnitDeduction);
  };

  const computeAcceptedRefundTotalCents = () => {
    if (!selected) return 0;
    return selected.items.reduce((sum, it: any) => {
      if (!it.accepted) return sum;
      const eff = computeEffectiveUnitCents(it);
      const qty = Number(it.quantity) || 0;
      return sum + eff * qty;
    }, 0);
  };

  if (loading && returns.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Lade Rücksendungen...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-3">⚠️</div>
          <div className="text-gray-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Rücksendungen verwalten</h1>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-md px-2 py-1"
          >
            <option value="all">Alle</option>
            <option value="received">Eingegangen</option>
            <option value="processing">In Bearbeitung</option>
            <option value="completed">Abgeschlossen</option>
            <option value="rejected">Abgelehnt</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {returns.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Keine Rücksendungen gefunden.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bestellung</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kunde</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artikel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returns.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{r.orderNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{r.customer?.name || 'Unbekannt'}</div>
                      <div className="text-xs text-gray-500">{r.customer?.email || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.items.length}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{r.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => openDetail(r._id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Rücksendung {selected.orderNumber}</h3>
                <div className="text-xs text-gray-500">{selected.customer?.name} • {selected.customer?.email}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {selected.items.map((it) => (
                <div key={it.productId} className="flex items-center gap-4 border rounded-xl p-3">
                  {it.image && <img src={it.image} alt={it.name} className="w-14 h-14 object-cover rounded-lg" />}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{it.name}</div>
                    {it.variations && (
                      <div className="text-xs text-gray-500">
                        {Object.entries(it.variations).map(([k,v]) => (
                          <span key={k} className="mr-2">{k}: {v}</span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">Menge: {it.quantity}</div>
                    <div className="mt-1 text-xs">
                      {orderForReturn ? (
                        <>
                          <div className="text-gray-600">
                            Erstattung/Stück: <span className="font-medium text-green-700">€{(computeEffectiveUnitCents(it) / 100).toFixed(2)}</span>
                          </div>
                          {!!it.accepted && (
                            <div className="text-gray-600">
                              Erstattung gesamt: <span className="font-medium text-green-700">€{((computeEffectiveUnitCents(it) * (Number(it.quantity) || 0)) / 100).toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-400">Bestellinformationen werden geladen…</div>
                      )}
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={!!it.accepted} onChange={() => toggleAccepted(it.productId)} />
                    Akzeptieren
                  </label>
                </div>
              ))}
              {orderForReturn && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-800 font-medium">Voraussichtliche Rückerstattung (rabattiert)</span>
                    <span className="text-green-800 font-semibold">€{(computeAcceptedRefundTotalCents() / 100).toFixed(2)}</span>
                  </div>
                  {(() => {
                    const hasDiscount = Number(orderForReturn.discountCents || 0) > 0;
                    const hasPoints = Number(orderForReturn.bonusPointsRedeemed || 0) > 0;
                    if (hasDiscount || hasPoints) {
                      return (
                        <div className="mt-1 text-xs text-green-700">
                          inkl. anteiligem {hasDiscount ? 'Rabatt' : ''}{hasDiscount && hasPoints ? ' und ' : ''}{hasPoints ? 'Bonuspunkte-Rabatt' : ''}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Rückerstattungsmethode</label>
                  <input value={selected.refund?.method || ''} onChange={(e) => setSelected({ ...selected, refund: { ...(selected.refund || {}), method: e.target.value } })} className="w-full border rounded-md px-2 py-1 text-sm" placeholder="paypal/klarna/bank" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Referenz</label>
                  <input value={selected.refund?.reference || ''} onChange={(e) => setSelected({ ...selected, refund: { ...(selected.refund || {}), reference: e.target.value } })} className="w-full border rounded-md px-2 py-1 text-sm" placeholder="Transaktions-ID oder Notiz" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Betrag (Cent)</label>
                  <input type="number" value={selected.refund?.amount ?? ''} onChange={(e) => setSelected({ ...selected, refund: { ...(selected.refund || {}), amount: Number(e.target.value) || 0 } })} className="w-full border rounded-md px-2 py-1 text-sm" placeholder="z. B. 2599" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Abbrechen</button>
                <button disabled={updating} onClick={completeReturn} className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Abschließen</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


