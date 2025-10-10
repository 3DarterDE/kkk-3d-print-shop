"use client";

import { useState } from 'react';
import { withCursorPointer } from '@/lib/cursor-utils';

type CartLine = { price: number; quantity: number };

export default function ApplyDiscountInput({
  items,
  discountCode,
  discountCents,
  onApplied,
  onCleared,
}: {
  items: CartLine[];
  discountCode: string | null;
  discountCents: number;
  onApplied: (code: string, cents: number) => void;
  onCleared: () => void;
}) {
  const [code, setCode] = useState<string>(discountCode || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const apply = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setMessage('Bitte Code eingeben');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, items }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setMessage(data.reason || data.error || 'Ungültiger Code');
        return;
      }
      onApplied(data.code, data.discountCents);
      setMessage('Code angewendet');
    } catch (e) {
      setMessage('Fehler bei der Prüfung');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setCode('');
    onCleared();
    setMessage(null);
  };

  return (
    <div>
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Code eingeben..."
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        {discountCents > 0 ? (
          <button onClick={clear} className={withCursorPointer("px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors")}>
            Entfernen
          </button>
        ) : (
          <button disabled={loading} onClick={apply} className={`px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 ${loading ? 'cursor-not-allowed' : withCursorPointer('')}`}>
            {loading ? 'Prüfe…' : 'Einlösen'}
          </button>
        )}
      </div>
      {message && (
        <div className={`mt-2 text-xs ${discountCents > 0 ? 'text-green-700' : 'text-gray-600'}`}>{message}</div>
      )}
    </div>
  );
}


