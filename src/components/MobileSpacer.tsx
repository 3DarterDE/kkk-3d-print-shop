"use client";

import { usePathname } from "next/navigation";

export default function MobileSpacer() {
  const pathname = usePathname();
  
  // Add extra space on mobile for search bar, except on checkout pages
  const shouldAddSpace = !pathname.includes('/checkout');
  
  if (!shouldAddSpace) {
    return null;
  }
  
  return (
    <div className="h-16 md:hidden" />
  );
}
