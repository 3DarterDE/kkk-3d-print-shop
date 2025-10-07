"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Discount = {
  _id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
  oneTimeUse: boolean;
  maxGlobalUses?: number;
  globalUses?: number;
  createdAt: string;
  updatedAt: string;
};

export default function AdminDiscountsPage() {
  const [loading, setLoading] = useState(true);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [form, setForm] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed',
    value: 10,
    startsAt: '',
    endsAt: '',
    active: true,
    oneTimeUse: false,
    maxGlobalUses: '' as string | ''
  });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/discounts', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDiscounts(data.discounts || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createDiscount = async () => {
    setSaving(true);
    try {
      const payload: any = {
        code: form.code,
        type: form.type,
        value: Number(form.value),
        active: form.active,
        oneTimeUse: form.oneTimeUse,
      };
      if (form.startsAt) payload.startsAt = form.startsAt;
      if (form.endsAt) payload.endsAt = form.endsAt;
      if (form.maxGlobalUses) payload.maxGlobalUses = Number(form.maxGlobalUses);

      const res = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setForm({ code: '', type: 'percent', value: 10, startsAt: '', endsAt: '', active: true, oneTimeUse: false, maxGlobalUses: '' });
        await fetchData();
      } else {
        console.error('Failed to create discount');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (d: Discount) => {
    const res = await fetch('/api/admin/discounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: d._id, active: !d.active })
    });
    if (res.ok) fetchData();
  };

  const deleteDiscount = async (id: string) => {
    if (!confirm('Diesen Rabattcode wirklich löschen?')) return;
    const res = await fetch(`/api/admin/discounts?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  const filteredDiscounts = discounts.filter((d) =>
    !search.trim() || d.code.toLowerCase().includes(search.trim().toLowerCase())
  );

  const formatDateTime = (val?: string) => {
    if (!val) return '-';
    try { return new Date(val).toLocaleString('de-DE'); } catch { return '-'; }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Rabattcodes verwalten</h1>
              <p className="mt-1 text-gray-600">Erstellen und verwalten Sie Rabattcodes für Kunden</p>
            </div>
          </div>
        </div>

        {/* Create Card */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Neuen Rabattcode erstellen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Code</label>
              <input className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="z. B. SUMMER10" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Typ</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
                <option value="percent">Prozent</option>
                <option value="fixed">Fix (Cent)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Wert</label>
              <input className="w-full border border-gray-300 rounded-md px-3 py-2" type="number" placeholder={form.type === 'percent' ? '% (z.B. 10)' : 'Cent (z.B. 500)'} value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start (optional)</label>
              <input className="w-full border border-gray-300 rounded-md px-3 py-2" type="datetime-local" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Ende (optional)</label>
              <input className="w-full border border-gray-300 rounded-md px-3 py-2" type="datetime-local" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Max. globale Nutzungen (optional)</label>
              <input className="w-full border border-gray-300 rounded-md px-3 py-2" type="number" placeholder="z. B. 100" value={form.maxGlobalUses} onChange={e => setForm({ ...form, maxGlobalUses: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                <input type="checkbox" className="rounded" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Aktiv
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                <input type="checkbox" className="rounded" checked={form.oneTimeUse} onChange={e => setForm({ ...form, oneTimeUse: e.target.checked })} /> Nur einmal pro Kunde
              </label>
            </div>
            <div className="flex items-end">
              <button disabled={saving} onClick={createDiscount} className={`inline-flex items-center px-4 py-2 rounded-md text-white ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}>
                {saving ? 'Speichern…' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>

        {/* List Card */}
        <div className="bg-white rounded-lg shadow border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Alle Rabattcodes</h2>
            <div className="flex items-center gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nach Code suchen…" className="border border-gray-300 rounded-md px-3 py-2 w-64" />
              <span className="text-xs text-gray-500">{filteredDiscounts.length} von {discounts.length}</span>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-gray-600">Lade…</div>
          ) : filteredDiscounts.length === 0 ? (
            <div className="p-6 text-gray-500">Keine Rabattcodes gefunden.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ / Wert</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gültigkeit</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Nutzungen</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDiscounts.map((d) => (
                    <tr key={d._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-gray-900">{d.code}</div>
                        <div className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleDateString('de-DE')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 capitalize">{d.type}</div>
                        <div className="text-xs text-gray-700">{d.type === 'percent' ? `${d.value}%` : `${(d.value/100).toFixed(2)} €`}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-700">Start: {formatDateTime(d.startsAt)}</div>
                        <div className="text-xs text-gray-700">Ende: {formatDateTime(d.endsAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{d.active ? 'Aktiv' : 'Inaktiv'}</span>
                          {d.oneTimeUse && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Einmalig</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900">
                        {(d.globalUses ?? 0)}{d.maxGlobalUses ? ` / ${d.maxGlobalUses}` : ''}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button onClick={() => toggleActive(d)} className={`px-3 py-1 rounded text-xs font-medium ${d.active ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{d.active ? 'Deaktivieren' : 'Aktivieren'}</button>
                          <button onClick={() => deleteDiscount(d._id)} className="px-3 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100">Löschen</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


