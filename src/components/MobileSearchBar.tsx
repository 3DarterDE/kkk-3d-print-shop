"use client";

import { usePathname } from "next/navigation";
import SearchBar from "./SearchBar";

export default function MobileSearchBar() {
  const pathname = usePathname();
  
  // Hide search bar only on checkout pages
  const shouldHide = pathname.includes('/checkout');
  
  if (shouldHide) {
    return null;
  }
  
  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 md:hidden">
      <SearchBar 
        placeholder="Luke Littler, Dartpfeile..."
        maxResults={10}
      />
    </div>
  );
}
