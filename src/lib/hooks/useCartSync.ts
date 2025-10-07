"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/lib/store/cart";
import { useAuth } from "@/lib/hooks/useAuth";

// Helper to build a unique key for merging items across devices
function cartKey(slug: string, variations?: Record<string, string>) {
  return `${slug}-${JSON.stringify(variations || {})}`;
}

export function useCartSync() {
  const syncFromStorage = useCartStore((state) => state.syncFromStorage);
  const items = useCartStore((s) => s.items);
  const discountCode = useCartStore((s) => s.discountCode);
  const discountCents = useCartStore((s) => s.discountCents);
  const validateItems = useCartStore((s) => s.validateItems);
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Avoid double-running merge on first auth resolution
  const mergedOnceRef = useRef(false);
  // Debounce timer for auto-save
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedFingerprintRef = useRef<string>("__init__");

  // Always hydrate from local storage on mount
  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  // On login, one-time sync: prefer local if it has items, otherwise load from server.
  useEffect(() => {
    const run = async () => {
      if (authLoading) return;
      if (!isAuthenticated) {
        mergedOnceRef.current = false;
        return;
      }
      if (mergedOnceRef.current) return;
      // Mark immediately to prevent duplicate GETs while validations update items
      mergedOnceRef.current = true;

      try {
        const localHasItems = (items?.length || 0) > 0;
        if (localHasItems) {
          // Overwrite server with local snapshot
          await fetch('/api/cart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, discountCode, discountCents })
          });
          // Let normal autosave continue next
          return;
        }

        // Local empty: load server and apply if present
        const res = await fetch('/api/cart', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const saved = data?.savedCart || {};
          const serverItems = Array.isArray(saved.items) ? saved.items : [];
          const serverDiscountCode = typeof saved.discountCode === 'string' ? saved.discountCode : null;
          const serverDiscountCents = typeof saved.discountCents === 'number' ? saved.discountCents : 0;

          if (serverItems.length > 0) {
            useCartStore.setState({ items: serverItems, discountCode: serverDiscountCode, discountCents: serverDiscountCents });
            await validateItems();
          }
        }
      } catch (e) {
        console.warn('Cart sync on login failed:', e);
      }
    };
    run();
  }, [isAuthenticated, authLoading]);

  // Auto-save to server when authenticated and cart changes (debounced)
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    // Compute fingerprint to avoid redundant PUTs caused by local validations
    const fingerprint = (() => {
      try {
        const sortable = (items || []).map((it) => ({
          ...it,
          _k: cartKey(it.slug, it.variations)
        }))
        .sort((a, b) => a._k.localeCompare(b._k))
        .map(({ _k, ...rest }) => rest);
        return JSON.stringify({ items: sortable, discountCode: discountCode || null, discountCents: discountCents || 0 });
      } catch {
        return Math.random().toString();
      }
    })();

    if (fingerprint === lastSavedFingerprintRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    // Throttle saves to at most once every 2s while changes are happening
    saveTimerRef.current = setTimeout(() => {
      lastSavedFingerprintRef.current = fingerprint;
      fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, discountCode, discountCents })
      }).catch(() => {});
    }, 2000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [items, discountCode, discountCents, isAuthenticated, authLoading]);
}
