"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/cart";

export default function CheckoutPage() {
  const [total, setTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { items, clear } = useCartStore();

  useEffect(() => {
    const calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(calculatedTotal);
  }, [items]);

  const handleCheckout = async () => {
    if (items.length === 0) {
      setErrorMessage('Warenkorb ist leer');
      setOrderStatus('error');
      return;
    }

    setIsProcessing(true);
    setOrderStatus('processing');

    try {
      // Reduce stock
      const response = await fetch('/api/shop/reduce-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            slug: item.slug,
            quantity: item.quantity,
            variations: item.variations || {}
          }))
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Verarbeiten der Bestellung');
      }

      // Check if all items were processed successfully
      const failedItems = result.results.filter((r: any) => !r.success);
      
      if (failedItems.length > 0) {
        const errorDetails = failedItems.map((item: any) => 
          `${item.slug}: ${item.error}${item.available ? ` (nur ${item.available} verfügbar)` : ''}`
        ).join(', ');
        
        setErrorMessage(`Bestellung fehlgeschlagen: ${errorDetails}`);
        setOrderStatus('error');
        return;
      }

      // Success - clear cart and show success message
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
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-green-600 mb-4">Bestellung erfolgreich!</h1>
          <p className="text-gray-600 mb-6">
            Ihre Bestellung wurde erfolgreich verarbeitet. Der Lagerbestand wurde entsprechend angepasst.
          </p>
          <button 
            onClick={() => {
              setOrderStatus('idle');
              setErrorMessage('');
            }}
            className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Neue Bestellung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      <p className="mb-4">Gast-Checkout (ohne Login). Zahlungsintegration kann später ergänzt werden.</p>
      
      {items.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Warenkorb</h2>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{item.title}</span>
                  <span className="text-gray-500 ml-2">x{item.quantity}</span>
                </div>
                <span className="font-medium">{(item.price * item.quantity / 100).toFixed(2)} €</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border rounded p-4">
        <div className="flex justify-between mb-4">
          <span>Zwischensumme</span>
          <span>{(total / 100).toFixed(2)} €</span>
        </div>
        
        {orderStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            {errorMessage}
          </div>
        )}
        
        <button 
          onClick={handleCheckout}
          disabled={isProcessing || items.length === 0}
          className={`w-full px-4 py-2 rounded font-medium ${
            isProcessing || items.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-800'
          }`}
        >
          {isProcessing ? 'Wird verarbeitet...' : 'Bestellung abschicken'}
        </button>
      </div>
    </div>
  );
}


