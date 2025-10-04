import CheckoutClient, { CheckoutFormData } from "./CheckoutClient";
import { auth0 } from "@/lib/auth0";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";

export default async function CheckoutPage() {
  const session = await auth0.getSession();
  let user = null;
  
  // Load full user data from database if session exists
  if (session?.user?.sub) {
    try {
      await connectToDatabase();
      user = await User.findOne({ auth0Id: session.user.sub }).lean();
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  const shippingAddress = {
    firstName: user?.address?.firstName || user?.firstName || '',
    lastName: user?.address?.lastName || user?.lastName || '',
    company: user?.address?.company || '',
    street: user?.address?.street || '',
    houseNumber: user?.address?.houseNumber || '',
    addressLine2: user?.address?.addressLine2 || '',
    city: user?.address?.city || '',
    postalCode: user?.address?.postalCode || '',
    country: user?.address?.country || 'Deutschland',
  };

  const billingAddress = {
    firstName: user?.billingAddress?.firstName || '',
    lastName: user?.billingAddress?.lastName || '',
    company: user?.billingAddress?.company || '',
    street: user?.billingAddress?.street || '',
    houseNumber: user?.billingAddress?.houseNumber || '',
    addressLine2: user?.billingAddress?.addressLine2 || '',
    city: user?.billingAddress?.city || '',
    postalCode: user?.billingAddress?.postalCode || '',
    country: user?.billingAddress?.country || 'Deutschland',
  };

  const initialFormData: CheckoutFormData = {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    salutation: user?.salutation || 'Herr',
    email: user?.email || '',
    phone: user?.phone || '',
    shippingAddress,
    billingAddress,
    paymentMethod: user?.paymentMethod || 'card',
    useSameAddress: user?.useSameAddress || false,
  };

  const hasContactData = Boolean(initialFormData.firstName && initialFormData.lastName && initialFormData.email);
  const hasShippingAddressData = Boolean(
    initialFormData.shippingAddress.street &&
    initialFormData.shippingAddress.houseNumber &&
    initialFormData.shippingAddress.city &&
    initialFormData.shippingAddress.postalCode
  );
  
  // Check if billing address is needed (only if not using same address)
  const needsBillingAddress = !initialFormData.useSameAddress;
  const hasBillingAddressData = !needsBillingAddress || Boolean(
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


