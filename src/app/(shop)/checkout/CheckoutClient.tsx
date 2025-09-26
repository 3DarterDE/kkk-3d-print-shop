"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/cart";
import { useUserData } from "@/lib/contexts/UserDataContext";
import { useSearchParams } from "next/navigation";

export type CheckoutFormData = {
  firstName: string;
  lastName: string;
  salutation: 'Herr' | 'Frau' | 'Divers';
  email: string;
  phone: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company: string;
    street: string;
    houseNumber: string;
    addressLine2: string;
    city: string;
    postalCode: string;
    country: string;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company: string;
    street: string;
    houseNumber: string;
    addressLine2: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: string;
  useSameAddress: boolean;
};

interface CheckoutClientProps {
  initialIsLoggedIn: boolean;
  initialFormData: CheckoutFormData;
  initialStep: number;
}

export default function CheckoutClient({ initialIsLoggedIn, initialFormData, initialStep }: CheckoutClientProps) {
  const [total, setTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const { user } = useUserData();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);
  const { items, clear, validateItems } = useCartStore();
  
  const [formData, setFormData] = useState<CheckoutFormData>(initialFormData);
  const [useSameAddress, setUseSameAddress] = useState(false);

  // Bonuspunkte-Berechnung: Automatisch höchsten verfügbaren Rabatt nehmen
  const getPointsDiscount = (points: number, orderTotal: number) => {
    const maxDiscount = orderTotal - 1; // Mindestens 1 Cent zu bezahlen
    
    // Prüfe von höchstem zu niedrigstem Rabatt
    if (points >= 5000 && 50 * 100 <= maxDiscount) return 50 * 100; // 50€
    if (points >= 4000 && 35 * 100 <= maxDiscount) return 35 * 100; // 35€
    if (points >= 3000 && 20 * 100 <= maxDiscount) return 20 * 100; // 20€
    if (points >= 2000 && 10 * 100 <= maxDiscount) return 10 * 100; // 10€
    if (points >= 1000 && 5 * 100 <= maxDiscount) return 5 * 100;   // 5€
    
    return 0;
  };
  
  // Automatisch den besten verfügbaren Rabatt ermitteln
  const getBestAvailableDiscount = (availablePoints: number, orderTotal: number) => {
    const maxDiscount = orderTotal - 1; // Mindestens 1 Cent zu bezahlen
    
    if (availablePoints >= 5000 && 50 * 100 <= maxDiscount) return { points: 5000, amount: 50 };
    if (availablePoints >= 4000 && 35 * 100 <= maxDiscount) return { points: 4000, amount: 35 };
    if (availablePoints >= 3000 && 20 * 100 <= maxDiscount) return { points: 3000, amount: 20 };
    if (availablePoints >= 2000 && 10 * 100 <= maxDiscount) return { points: 2000, amount: 10 };
    if (availablePoints >= 1000 && 5 * 100 <= maxDiscount) return { points: 1000, amount: 5 };
    
    return null;
  };
  
  const availablePoints = user?.bonusPoints || 0;
  const totalWithShipping = total + (total < 8000 ? 495 : 0);
  const pointsDiscount = redeemPoints && pointsToRedeem ? getPointsDiscount(pointsToRedeem, totalWithShipping) : 0;
  
  // Versandkosten berechnen: unter 80€ = 4,95€, ab 80€ kostenlos
  const shippingCosts = total < 8000 ? 495 : 0; // 8000 Cent = 80€, 495 Cent = 4,95€
  const subtotalAfterDiscount = Math.max(0, total - pointsDiscount);
  const finalTotal = Math.max(0, totalWithShipping - pointsDiscount);

  useEffect(() => {
    const calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(calculatedTotal);
  }, [items]);

  // URL-Parameter für Bonuspunkte-Einlösung lesen
  useEffect(() => {
    const redeemPointsParam = searchParams.get('redeemPoints');
    const pointsToRedeemParam = searchParams.get('pointsToRedeem');
    
    if (redeemPointsParam === 'true' && pointsToRedeemParam) {
      setRedeemPoints(true);
      setPointsToRedeem(parseInt(pointsToRedeemParam, 10));
    }
  }, [searchParams]);

  // Automatisch den besten Rabatt auswählen basierend auf Gesamtbetrag inklusive Versandkosten
  useEffect(() => {
    if (redeemPoints && availablePoints >= 1000) {
      // Berechne Gesamtbetrag inklusive Versandkosten für Bonuspunkte-Berechnung
      const totalWithShipping = total + (total < 8000 ? 495 : 0);
      const bestDiscount = getBestAvailableDiscount(availablePoints, totalWithShipping);
      if (bestDiscount && pointsToRedeem !== bestDiscount.points) {
        setPointsToRedeem(bestDiscount.points);
      }
    }
  }, [redeemPoints, availablePoints, total]);

  // Validate cart items on mount to ensure prices are current
  useEffect(() => {
    if (items.length > 0) {
      validateItems();
    }
  }, [items.length, validateItems]);

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as any,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateStep = (step: number) => {
    const errors: Record<string, boolean> = {};
    let isValid = true;

    switch (step) {
      case 1:
        if (!formData.firstName) { errors.firstName = true; isValid = false; }
        if (!formData.lastName) { errors.lastName = true; isValid = false; }
        if (!formData.email) { errors.email = true; isValid = false; }
        break;
      case 2:
        if (!formData.shippingAddress.firstName) { errors['shippingAddress.firstName'] = true; isValid = false; }
        if (!formData.shippingAddress.lastName) { errors['shippingAddress.lastName'] = true; isValid = false; }
        if (!formData.shippingAddress.street) { errors['shippingAddress.street'] = true; isValid = false; }
        if (!formData.shippingAddress.houseNumber) { errors['shippingAddress.houseNumber'] = true; isValid = false; }
        if (!formData.shippingAddress.city) { errors['shippingAddress.city'] = true; isValid = false; }
        if (!formData.shippingAddress.postalCode) { errors['shippingAddress.postalCode'] = true; isValid = false; }
        break;
      case 3:
        if (!useSameAddress) {
          if (!formData.billingAddress.firstName) { errors['billingAddress.firstName'] = true; isValid = false; }
          if (!formData.billingAddress.lastName) { errors['billingAddress.lastName'] = true; isValid = false; }
          if (!formData.billingAddress.street) { errors['billingAddress.street'] = true; isValid = false; }
          if (!formData.billingAddress.houseNumber) { errors['billingAddress.houseNumber'] = true; isValid = false; }
          if (!formData.billingAddress.city) { errors['billingAddress.city'] = true; isValid = false; }
          if (!formData.billingAddress.postalCode) { errors['billingAddress.postalCode'] = true; isValid = false; }
        }
        break;
      case 4:
        if (!formData.paymentMethod) { errors.paymentMethod = true; isValid = false; }
        break;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const isStepCompleted = (step: number) => {
    if (step >= currentStep) return false;
    switch (step) {
      case 1:
        return formData.salutation && formData.firstName && formData.lastName && formData.email;
      case 2:
        return formData.shippingAddress.firstName && formData.shippingAddress.lastName && 
               formData.shippingAddress.street && formData.shippingAddress.houseNumber && 
               formData.shippingAddress.city && formData.shippingAddress.postalCode;
      case 3:
        return useSameAddress || (formData.billingAddress.firstName && formData.billingAddress.lastName && 
               formData.billingAddress.street && formData.billingAddress.houseNumber && 
               formData.billingAddress.city && formData.billingAddress.postalCode);
      case 4:
        return formData.paymentMethod;
      case 5:
        return currentStep >= 5;
      default:
        return false;
    }
  };

  const saveProfileData = async () => {
    if (!isLoggedIn) return;
    try {
      const dataToSave = {
        salutation: formData.salutation,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.shippingAddress,
        billingAddress: formData.useSameAddress ? formData.shippingAddress : formData.billingAddress,
        paymentMethod: formData.paymentMethod
      };
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      if (!response.ok) {
        console.error('Failed to save profile data');
      }
    } catch (error) {
      console.error('Error saving profile data:', error);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      setErrorMessage('Warenkorb ist leer');
      setOrderStatus('error');
      return;
    }

    setIsProcessing(true);
    setOrderStatus('processing');

    try {
      const orderData = {
        items: items.map(item => ({
          productId: item.slug,
          name: item.title,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          variations: item.variations
        })),
        shippingAddress: formData.shippingAddress,
        billingAddress: formData.useSameAddress ? formData.shippingAddress : formData.billingAddress,
        paymentMethod: formData.paymentMethod,
        redeemPoints: redeemPoints,
        pointsToRedeem: pointsToRedeem,
      };

      // For logged-in users, create order in database
      if (isLoggedIn) {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Fehler beim Erstellen der Bestellung');
        }
      }

      // Clear cart and show success
      clear();
      setOrderStatus('success');
    } catch (error) {
      console.error('Checkout error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unbekannter Fehler');
      setOrderStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (orderStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl p-8 text-center shadow-xl">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-green-600 mb-4">Bestellung erfolgreich!</h1>
            <p className="text-gray-600 mb-8 text-lg">
              {isLoggedIn 
                ? 'Ihre Bestellung wurde erfolgreich erstellt und in Ihrem Konto gespeichert.' 
                : 'Ihre Bestellung wurde erfolgreich verarbeitet.'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isLoggedIn && (
                <a href="/orders" className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  Meine Bestellungen anzeigen
                </a>
              )}
              <button 
                onClick={() => {
                  setOrderStatus('idle');
                  setErrorMessage('');
                  setCurrentStep(1);
                }}
                className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                Neue Bestellung
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl p-8 text-center shadow-xl">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Warenkorb ist leer</h1>
            <p className="text-gray-600 mb-8 text-lg">Fügen Sie Artikel zu Ihrem Warenkorb hinzu, um fortzufahren.</p>
            <a href="/shop" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Jetzt einkaufen
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
        <div className="flex items-center justify-between">
                  <button
                    onClick={() => { if (currentStep >= 1) { setCurrentStep(1); } }}
                    disabled={currentStep < 1}
                    className={`flex items-center transition-colors ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'} ${currentStep < 1 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      1
                    </div>
                    <span className="ml-2 text-base font-medium">Kontaktdaten</span>
                  </button>
                  <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <button
                    onClick={() => { if (currentStep >= 2) { setCurrentStep(2); } }}
                    disabled={currentStep < 2}
                    className={`flex items-center transition-colors ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'} ${currentStep < 2 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      2
                    </div>
                    <span className="ml-2 text-base font-medium">Lieferadresse</span>
                  </button>
                  <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <button
                    onClick={() => { if (currentStep >= 3) { setCurrentStep(3); } }}
                    disabled={currentStep < 3}
                    className={`flex items-center transition-colors ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'} ${currentStep < 3 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      3
                    </div>
                    <span className="ml-2 text-base font-medium">Rechnungsadresse</span>
                  </button>
                  <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 4 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <button
                    onClick={() => { if (currentStep >= 4) { setCurrentStep(4); } }}
                    disabled={currentStep < 4}
                    className={`flex items-center transition-colors ${currentStep >= 4 ? 'text-blue-600' : 'text-gray-400'} ${currentStep < 4 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      4
                    </div>
                    <span className="ml-2 text-base font-medium">Zahlungsart</span>
                  </button>
                  <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 5 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <button
                    onClick={() => { if (currentStep >= 5) { setCurrentStep(5); } }}
                    disabled={currentStep < 5}
                    className={`flex items-center transition-colors ${currentStep >= 5 ? 'text-blue-600' : 'text-gray-400'} ${currentStep < 5 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 5 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      5
                    </div>
                    <span className="ml-2 text-base font-medium">Zusammenfassung</span>
                  </button>
                </div>
          </div>

          <div className="border-b border-gray-200 my-6"></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl p-6 shadow-lg">
              <div className="mb-2">
                
              </div>

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">Kontaktdaten</h2>
                    {isLoggedIn && formData.firstName && formData.lastName && formData.email && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">✓ Ausgefüllt</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Anrede *</label>
                    <select 
                      value={formData.salutation} 
                      onChange={(e) => handleInputChange('salutation', e.target.value as 'Herr' | 'Frau' | 'Divers')} 
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.salutation ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                      required
                    >
                      <option value="">Bitte wählen</option>
                      <option value="Herr">Herr</option>
                      <option value="Frau">Frau</option>
                      <option value="Divers">Divers</option>
                    </select>
                    {fieldErrors.salutation && (<p className="mt-1 text-sm text-red-600">Dieses Feld ist erforderlich</p>)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vorname *</label>
                      <input type="text" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} required />
                      {fieldErrors.firstName && (<p className="mt-1 text-sm text-red-600">Dieses Feld ist erforderlich</p>)}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nachname *</label>
                      <input type="text" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} required />
                      {fieldErrors.lastName && (<p className="mt-1 text-sm text-red-600">Dieses Feld ist erforderlich</p>)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail *</label>
                    <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-100 cursor-not-allowed ${fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} readOnly required />
                    {fieldErrors.email && (<p className="mt-1 text-sm text-red-600">Dieses Feld ist erforderlich</p>)}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                    <input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>

                  <div className="flex justify-end">
                    <button onClick={async () => { if (validateStep(1)) { await saveProfileData(); setCurrentStep(2); } }} className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">Weiter</button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">Lieferadresse</h2>
                    {isLoggedIn && formData.shippingAddress.street && formData.shippingAddress.houseNumber && formData.shippingAddress.city && formData.shippingAddress.postalCode && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">✓ Ausgefüllt</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Firma</label>
                    <input 
                      type="text" 
                      value={formData.shippingAddress.company ?? ''} 
                      onChange={(e) => handleInputChange('shippingAddress.company', e.target.value)} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Firmenname (optional)"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vorname *</label>
                      <input 
                        type="text" 
                        value={formData.shippingAddress.firstName} 
                        onChange={(e) => handleInputChange('shippingAddress.firstName', e.target.value)} 
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors['shippingAddress.firstName'] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        required 
                      />
                      {fieldErrors['shippingAddress.firstName'] && (<p className="mt-1 text-sm text-red-600">Dieses Feld ist erforderlich</p>)}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nachname *</label>
                      <input 
                        type="text" 
                        value={formData.shippingAddress.lastName} 
                        onChange={(e) => handleInputChange('shippingAddress.lastName', e.target.value)} 
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors['shippingAddress.lastName'] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        required 
                      />
                      {fieldErrors['shippingAddress.lastName'] && (<p className="mt-1 text-sm text-red-600">Dieses Feld ist erforderlich</p>)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Straße *</label>
                      <input type="text" value={formData.shippingAddress.street} onChange={(e) => handleInputChange('shippingAddress.street', e.target.value)} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors['shippingAddress.street'] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} required />
                      {fieldErrors['shippingAddress.street'] && (<p className="mt-1 text-sm text-red-600">Dieses Feld ist erforderlich</p>)}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hausnummer *</label>
                      <input type="text" value={formData.shippingAddress.houseNumber} onChange={(e) => handleInputChange('shippingAddress.houseNumber', e.target.value)} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors['shippingAddress.houseNumber'] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} required />
                      {fieldErrors['shippingAddress.houseNumber'] && (<p className="mt-1 text-sm text-red-600">Dieses Feld ist erforderlich</p>)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adresszusatz</label>
                    <input type="text" value={formData.shippingAddress.addressLine2} onChange={(e) => handleInputChange('shippingAddress.addressLine2', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Wohnung, Etage, etc." />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PLZ *</label>
                      <input type="text" value={formData.shippingAddress.postalCode} onChange={(e) => handleInputChange('shippingAddress.postalCode', e.target.value)} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors['shippingAddress.postalCode'] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} required />
                      {fieldErrors['shippingAddress.postalCode'] && (<p className="mt-1 text-sm text-red-600">Dieses Feld ist erforderlich</p>)}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stadt *</label>
                      <input type="text" value={formData.shippingAddress.city} onChange={(e) => handleInputChange('shippingAddress.city', e.target.value)} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors['shippingAddress.city'] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} required />
                      {fieldErrors['shippingAddress.city'] && (<p className="mt-1 text-sm text-red-600">Dieses Feld ist erforderlich</p>)}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Land *</label>
                      <select value={formData.shippingAddress.country} onChange={(e) => handleInputChange('shippingAddress.country', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="Deutschland">Deutschland</option>
                        <option value="Österreich">Österreich</option>
                        <option value="Schweiz">Schweiz</option>
                      </select>
                    </div>
                  </div>

                  {orderStatus === 'error' && (<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{errorMessage}</div>)}

                  <div className="flex justify-between">
                    <button onClick={() => setCurrentStep(1)} className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors">Zurück</button>
                    <button onClick={() => setCurrentStep(3)} className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">Weiter</button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">Rechnungsadresse</h2>
                    {isLoggedIn && (useSameAddress || (formData.billingAddress.street && formData.billingAddress.houseNumber && formData.billingAddress.city && formData.billingAddress.postalCode)) && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">✓ Ausgefüllt</span>
                    )}
                  </div>

                  <label className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      checked={useSameAddress}
                      onChange={(e) => {
                        setUseSameAddress(e.target.checked);
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            billingAddress: {
                              ...prev.shippingAddress
                            }
                          }));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Gleich wie Lieferadresse</span>
                  </label>
                  
                  {useSameAddress ? (
                    <p className="text-gray-500 italic text-sm">Rechnungsadresse ist identisch mit der Lieferadresse</p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Firma</label>
                        <input
                          type="text"
                          value={formData.billingAddress.company ?? ''}
                          onChange={(e) => handleInputChange('billingAddress.company', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Firmenname (optional)"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Vorname *</label>
                          <input
                            type="text"
                            value={formData.billingAddress.firstName}
                            onChange={(e) => handleInputChange('billingAddress.firstName', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors['billingAddress.firstName'] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            required
                          />
                          {fieldErrors['billingAddress.firstName'] && (<p className="mt-1 text-sm text-red-600">Dieses Feld ist erforderlich</p>)}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nachname *</label>
                          <input
                            type="text"
                            value={formData.billingAddress.lastName}
                            onChange={(e) => handleInputChange('billingAddress.lastName', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors['billingAddress.lastName'] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            required
                          />
                          {fieldErrors['billingAddress.lastName'] && (<p className="mt-1 text-sm text-red-600">Dieses Feld ist erforderlich</p>)}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-8">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Straße</label>
                          <input
                            type="text"
                            value={formData.billingAddress.street}
                            onChange={(e) => handleInputChange('billingAddress.street', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Hausnummer</label>
                          <input
                            type="text"
                            value={formData.billingAddress.houseNumber}
                            onChange={(e) => handleInputChange('billingAddress.houseNumber', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Adresszusatz</label>
                        <input
                          type="text"
                          value={formData.billingAddress.addressLine2}
                          onChange={(e) => handleInputChange('billingAddress.addressLine2', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Wohnung, Etage, etc."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">PLZ</label>
                          <input
                            type="text"
                            value={formData.billingAddress.postalCode}
                            onChange={(e) => handleInputChange('billingAddress.postalCode', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Stadt</label>
                          <input
                            type="text"
                            value={formData.billingAddress.city}
                            onChange={(e) => handleInputChange('billingAddress.city', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Land</label>
                          <select
                            value={formData.billingAddress.country}
                            onChange={(e) => handleInputChange('billingAddress.country', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Deutschland">Deutschland</option>
                            <option value="Österreich">Österreich</option>
                            <option value="Schweiz">Schweiz</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button onClick={() => setCurrentStep(2)} className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors">Zurück</button>
                    <button onClick={() => setCurrentStep(4)} className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">Weiter</button>
                  </div>
                </div>
              )}


              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-slate-800 mb-4">Zahlungsmethode</h2>

                  <div className="space-y-4">
                    <div className={`flex items-center p-4 border rounded-lg ${fieldErrors.paymentMethod ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}>
                      <input type="radio" id="card" name="paymentMethod" value="card" checked={formData.paymentMethod === 'card'} onChange={(e) => handleInputChange('paymentMethod', e.target.value)} className="w-4 h-4 text-blue-600" />
                      <label htmlFor="card" className="ml-3 flex items-center">
                        <svg className="w-6 h-6 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <div>
                          <div className="font-medium text-gray-900">Kreditkarte</div>
                          <div className="text-sm text-gray-500">Visa, Mastercard, American Express</div>
                        </div>
                      </label>
                    </div>

                    <div className={`flex items-center p-4 border rounded-lg ${fieldErrors.paymentMethod ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}>
                      <input type="radio" id="paypal" name="paymentMethod" value="paypal" checked={formData.paymentMethod === 'paypal'} onChange={(e) => handleInputChange('paymentMethod', e.target.value)} className="w-4 h-4 text-blue-600" />
                      <label htmlFor="paypal" className="ml-3 flex items-center">
                        <svg className="w-6 h-6 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.543-.7c-.13-.12-.27-.24-.42-.35a3.35 3.35 0 0 0-.54-.35c-.18-.1-.37-.19-.56-.27a3.35 3.35 0 0 0-.57-.2c-.19-.06-.38-.11-.57-.15a3.35 3.35 0 0 0-.58-.08c-.19-.03-.38-.05-.57-.05H9.18c-.52 0-.96.38-1.05.9L6.01 20.597h4.66c.52 0 .96-.38 1.05-.9l1.12-7.106h2.19c4.298 0 7.664-1.747 8.647-6.797.03-.149.054-.294.077-.437.292-1.867-.002-3.137-1.012-4.287z"/>
                        </svg>
                        <div>
                          <div className="font-medium text-gray-900">PayPal</div>
                          <div className="text-sm text-gray-500">Sicher bezahlen mit PayPal</div>
                        </div>
                      </label>
                    </div>

                    <div className={`flex items-center p-4 border rounded-lg ${fieldErrors.paymentMethod ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}>
                      <input type="radio" id="bank" name="paymentMethod" value="bank" checked={formData.paymentMethod === 'bank'} onChange={(e) => handleInputChange('paymentMethod', e.target.value)} className="w-4 h-4 text-blue-600" />
                      <label htmlFor="bank" className="ml-3 flex items-center">
                        <svg className="w-6 h-6 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <div>
                          <div className="font-medium text-gray-900">Überweisung</div>
                          <div className="text-sm text-gray-500">Banküberweisung</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {fieldErrors.paymentMethod && (<p className="text-sm text-red-600">Bitte wählen Sie eine Zahlungsmethode</p>)}

                  {orderStatus === 'error' && (<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{errorMessage}</div>)}

                  <div className="flex justify-between">
                    <button onClick={() => setCurrentStep(3)} className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors">Zurück</button>
                    <button 
                      onClick={async () => { if (validateStep(4)) { await saveProfileData(); setCurrentStep(5); } }}
                      className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Zur Zusammenfassung
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-slate-800 mb-4">Bestellüberblick</h2>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      Kontakt
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Name:</span>
                        <p className="font-medium text-slate-800">{formData.salutation} {formData.firstName} {formData.lastName}</p>
                      </div>
                      <div>
                        <span className="text-slate-600">E-Mail:</span>
                        <p className="font-medium text-slate-800">{formData.email}</p>
                      </div>
                      {formData.phone && (
                        <div>
                          <span className="text-slate-600">Telefon:</span>
                          <p className="font-medium text-slate-800">{formData.phone}</p>
                        </div>
                      )}
                    </div>
                    <button onClick={() => setCurrentStep(1)} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">Bearbeiten</button>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Lieferadresse
                    </h3>
                    <div className="text-sm">
                      {formData.shippingAddress.company && (
                        <p className="font-medium text-slate-800">{formData.shippingAddress.company}</p>
                      )}
                      <p className="font-medium text-slate-800">
                        {formData.shippingAddress.firstName} {formData.shippingAddress.lastName}
                      </p>
                      <p className="text-slate-600">{formData.shippingAddress.street} {formData.shippingAddress.houseNumber}{formData.shippingAddress.addressLine2 && `, ${formData.shippingAddress.addressLine2}`}</p>
                      <p className="text-slate-600">{formData.shippingAddress.postalCode} {formData.shippingAddress.city}</p>
                      <p className="text-slate-600">{formData.shippingAddress.country}</p>
                    </div>
                    <button onClick={() => setCurrentStep(2)} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">Bearbeiten</button>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Rechnungsadresse
                    </h3>
                    <div className="text-sm">
                      {formData.billingAddress.company && (
                        <p className="font-medium text-slate-800">{formData.billingAddress.company}</p>
                      )}
                      <p className="font-medium text-slate-800">
                        {formData.billingAddress.firstName} {formData.billingAddress.lastName}
                      </p>
                      <p className="text-slate-600">{formData.billingAddress.street} {formData.billingAddress.houseNumber}{formData.billingAddress.addressLine2 && `, ${formData.billingAddress.addressLine2}`}</p>
                      <p className="text-slate-600">{formData.billingAddress.postalCode} {formData.billingAddress.city}</p>
                      <p className="text-slate-600">{formData.billingAddress.country}</p>
                    </div>
                    <button onClick={() => setCurrentStep(2)} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">Bearbeiten</button>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      Zahlungsmethode
                    </h3>
                    <div className="text-sm">
                      <p className="font-medium text-slate-800">
                        {formData.paymentMethod === 'card' && 'Kreditkarte / Debitkarte'}
                        {formData.paymentMethod === 'paypal' && 'PayPal'}
                        {formData.paymentMethod === 'bank' && 'Banküberweisung'}
                      </p>
                    </div>
                    <button onClick={() => setCurrentStep(3)} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">Bearbeiten</button>
                  </div>

                  {orderStatus === 'error' && (<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{errorMessage}</div>)}

                  <div className="flex justify-between">
                    <button onClick={() => setCurrentStep(3)} className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors">Zurück</button>
                    <button onClick={handleCheckout} disabled={isProcessing} className={`px-8 py-3 font-medium rounded-lg transition-colors ${isProcessing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                      {isProcessing ? 'Wird verarbeitet...' : 'Bestellung abschicken'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl p-6 shadow-lg sticky top-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Bestellübersicht</h3>
              <div className="space-y-4 mb-6">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    {item.image && (<img src={item.image} alt={item.title} className="w-12 h-12 object-cover rounded-lg" />)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-600">Menge: {item.quantity}</p>
                      {item.variations && Object.keys(item.variations).length > 0 && (
                        <div className="mt-1">
                          {Object.entries(item.variations).map(([key, value]) => (
                            <p key={key} className="text-xs text-slate-500">{key}: {value}</p>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800">€{((item.price * item.quantity) / 100).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-600">Zwischensumme</span><span className="text-slate-800">€{(total / 100).toFixed(2)}</span></div>
                
                {/* Bonuspunkte-Rabatt */}
                {redeemPoints && pointsToRedeem > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Bonuspunkte-Rabatt ({pointsToRedeem} Punkte)</span>
                    <span>-€{(pointsDiscount / 100).toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Versand</span>
                  <span className={shippingCosts > 0 ? "text-slate-800" : "text-green-600"}>
                    {shippingCosts > 0 ? `€${(shippingCosts / 100).toFixed(2)}` : "Kostenlos"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="flex items-center">
                    <div className="relative group">
                      <svg className="w-4 h-4 mr-1 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10">
                        Alle Preise sind Endpreise zzgl. Versandkosten. Gemäß § 19 UStG wird keine Umsatzsteuer erhoben und ausgewiesen.
                        {/* Tooltip arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                    <span className="text-slate-600">Preisinformationen</span>
                  </div>
                  <span className="text-slate-800">€0.00</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t border-slate-200 pt-2"><span className="text-slate-800">Gesamt</span><span className="text-slate-800">€{(finalTotal / 100).toFixed(2)}</span></div>
              </div>

              {/* Bonuspunkte-Hinweis */}
              {isLoggedIn && availablePoints >= 1000 && !redeemPoints && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <div>
                      <p className="text-sm text-yellow-800 font-medium">Sie haben {availablePoints} Bonuspunkte!</p>
                      <p className="text-sm text-yellow-700 mt-1">Sie können bis zu {getBestAvailableDiscount(availablePoints, totalWithShipping)?.points || 0} Punkte einlösen und dabei sparen.</p>
                      <a 
                        href="/cart" 
                        className="inline-block mt-2 text-sm text-yellow-600 hover:text-yellow-700 font-medium underline"
                      >
                        Zum Warenkorb zurückkehren →
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {!isLoggedIn && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800"><strong>Tipp:</strong> Erstellen Sie ein Konto, um Ihre Bestellungen zu verfolgen und schneller zu bestellen.</p>
                  <a href="/api/auth/login" className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">Jetzt anmelden →</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}