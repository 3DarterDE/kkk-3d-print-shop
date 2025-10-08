"use client";

import { useEffect, useRef } from 'react';
import { useCartStore } from '@/lib/store/cart';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePathname } from 'next/navigation';

export function useDiscountValidation() {
  const items = useCartStore((s) => s.items);
  const discountCode = useCartStore((s) => s.discountCode);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const clearDiscount = useCartStore((s) => s.clearDiscount);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const pathname = usePathname();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSigRef = useRef<string>("__init__");
  const guestClearedRef = useRef(false);

  // As Gast: wenn ein Code existiert, zeige ihn nicht (kann nicht validiert werden)
  useEffect(() => {
    const onCartOrCheckout = Boolean(pathname && (pathname.startsWith('/cart') || pathname.startsWith('/checkout')));
    if (!onCartOrCheckout) return;
    if (authLoading) return;
    if (isAuthenticated) return;
    if (!discountCode) return;
    if (guestClearedRef.current) return;
    guestClearedRef.current = true;
    clearDiscount();
  }, [pathname, isAuthenticated, authLoading, discountCode, clearDiscount]);

  useEffect(() => {
    const onCartOrCheckout = Boolean(pathname && (pathname.startsWith('/cart') || pathname.startsWith('/checkout')));
    if (!onCartOrCheckout) return;
    if (authLoading || !isAuthenticated) return; // server validation requires user
    if (!discountCode) return; // nothing to validate
    if (!Array.isArray(items) || items.length === 0) return; // empty cart => ignore

    const sig = (() => {
      try {
        return JSON.stringify({
          code: String(discountCode).trim().toUpperCase(),
          items: items.map((it) => ({ p: Number(it.price) || 0, q: Number(it.quantity) || 0 }))
        });
      } catch {
        return Math.random().toString();
      }
    })();

    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Kein optimistisches Löschen mehr; erst nach Validergebnis clearn

    // Debounce to reduce API load when quantities change rapidly
    timerRef.current = setTimeout(async () => {
      try {
        const payload = {
          code: String(discountCode).trim().toUpperCase(),
          items: items.map((it) => ({ price: Number(it.price) || 0, quantity: Number(it.quantity) || 0 })),
        };
        const res = await fetch('/api/discounts/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          clearDiscount();
          return;
        }
        const data = await res.json();
        if (data?.valid && typeof data.discountCents === 'number') {
          setDiscount(String(data.code || discountCode), Number(data.discountCents));
          
        } else {
          clearDiscount();
        }
      } catch {
        // On error, don't clear silently; leave current discount as UI state
      }
    }, 300);

    // done

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pathname, isAuthenticated, authLoading, discountCode, items, setDiscount, clearDiscount]);

  return null;
}


