import CheckoutClient, { CheckoutFormData } from "./CheckoutClient";
import { requireUser } from "@/lib/auth";

export default async function CheckoutPage() {
  const { user } = await requireUser();

  const initialFormData: CheckoutFormData = {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    shippingAddress: {
      street: user?.address?.street || '',
      houseNumber: user?.address?.houseNumber || '',
      addressLine2: user?.address?.addressLine2 || '',
      city: user?.address?.city || '',
      postalCode: user?.address?.postalCode || '',
      country: user?.address?.country || 'Deutschland',
    },
    billingAddress: {
      street: user?.billingAddress?.street || user?.address?.street || '',
      houseNumber: user?.billingAddress?.houseNumber || user?.address?.houseNumber || '',
      addressLine2: user?.billingAddress?.addressLine2 || user?.address?.addressLine2 || '',
      city: user?.billingAddress?.city || user?.address?.city || '',
      postalCode: user?.billingAddress?.postalCode || user?.address?.postalCode || '',
      country: user?.billingAddress?.country || user?.address?.country || 'Deutschland',
    },
    paymentMethod: user?.paymentMethod || 'card',
    useSameAddress: false,
  };

  const hasContactData = Boolean(initialFormData.firstName && initialFormData.lastName && initialFormData.email);
  const hasAddressData = Boolean(
    initialFormData.shippingAddress.street &&
    initialFormData.shippingAddress.houseNumber &&
    initialFormData.shippingAddress.city &&
    initialFormData.shippingAddress.postalCode
  );
  const hasPaymentData = Boolean(initialFormData.paymentMethod);

  const initialStep = hasContactData && hasAddressData && hasPaymentData
    ? 4
    : hasContactData && hasAddressData
      ? 3
      : hasContactData
        ? 2
        : 1;

  return (
    <CheckoutClient
      initialIsLoggedIn={Boolean(user)}
      initialFormData={initialFormData}
      initialStep={initialStep}
    />
  );
}


