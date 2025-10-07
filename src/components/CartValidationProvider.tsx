"use client";

import { useCartValidation } from "@/lib/hooks/useCartValidation";
import { useCartSync } from "@/lib/hooks/useCartSync";
import { useDiscountValidation } from "@/lib/hooks/useDiscountValidation";

export default function CartValidationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useCartValidation();
  useCartSync();
  useDiscountValidation();
  
  return <>{children}</>;
}
