"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/store/cart";

export function useCartSync() {
  const syncFromStorage = useCartStore((state) => state.syncFromStorage);

  useEffect(() => {
    // Sync cart from storage when component mounts
    syncFromStorage();
  }, [syncFromStorage]);
}
