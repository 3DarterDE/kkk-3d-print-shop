"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/store/cart";

export function useCartValidation() {
  const validateItems = useCartStore((state) => state.validateItems);
  const items = useCartStore((state) => state.items);

  useEffect(() => {
    // Only validate if there are items in the cart
    if (items.length > 0) {
      validateItems();
    }
  }, []); // Only run once on mount

  return { validateItems };
}
