import CheckoutClient, { CheckoutFormData } from "./CheckoutClient";
import { requireUser } from "@/lib/auth";

export default async function CheckoutPage() {
  const { user } = await requireUser();

  const initialFormData: CheckoutFormData = {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    salutation: user?.salutation || 'Herr',
    email: user?.email || '',
    phone: user?.phone || '',
    shippingAddress: {
      firstName: user?.address?.firstName || user?.firstName || '',
      lastName: user?.address?.lastName || user?.lastName || '',
      company: user?.address?.company || '',
      street: user?.address?.street || '',
      houseNumber: user?.address?.houseNumber || '',
      addressLine2: user?.address?.addressLine2 || '',
      city: user?.address?.city || '',
      postalCode: user?.address?.postalCode || '',
      country: user?.address?.country || 'Deutschland',
    },
    billingAddress: {
      firstName: user?.billingAddress?.firstName || user?.address?.firstName || user?.firstName || '',
      lastName: user?.billingAddress?.lastName || user?.address?.lastName || user?.lastName || '',
      company: user?.billingAddress?.company || user?.address?.company || '',
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
  const hasShippingAddressData = Boolean(
    initialFormData.shippingAddress.street &&
    initialFormData.shippingAddress.houseNumber &&
    initialFormData.shippingAddress.city &&
    initialFormData.shippingAddress.postalCode
  );
  const hasBillingAddressData = Boolean(
    initialFormData.billingAddress.street &&
    initialFormData.billingAddress.houseNumber &&
    initialFormData.billingAddress.city &&
    initialFormData.billingAddress.postalCode
  );
  const hasPaymentData = Boolean(initialFormData.paymentMethod);

  const initialStep = hasContactData && hasShippingAddressData && hasBillingAddressData && hasPaymentData
    ? 5 // All steps completed - go to overview
    : hasContactData && hasShippingAddressData && hasBillingAddressData
      ? 4 // Payment step
      : hasContactData && hasShippingAddressData
        ? 3 // Billing address step
        : hasContactData
          ? 2 // Shipping address step
          : 1; // Contact data step

  return (
    <CheckoutClient
      initialIsLoggedIn={Boolean(user)}
      initialFormData={initialFormData}
      initialStep={initialStep}
    />
  );
}


