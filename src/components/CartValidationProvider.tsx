"use client";

import { useCartValidation } from "@/lib/hooks/useCartValidation";
import { useCartSync } from "@/lib/hooks/useCartSync";

export default function CartValidationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useCartValidation();
  useCartSync();
  
  return <>{children}</>;
}
