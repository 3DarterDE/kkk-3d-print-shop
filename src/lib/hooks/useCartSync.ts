"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/store/cart";

// Helper to build a unique key for merging items across devices
function cartKey(slug: string, variations?: Record<string, string>) {
  return `${slug}-${JSON.stringify(variations || {})}`;
}

export function useCartSync() {
  const syncFromStorage = useCartStore((state) => state.syncFromStorage);

  // Hydrate from local storage on mount
  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);
}
