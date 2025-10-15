"use client";

import { useState } from 'react';

export default function GuestDataDeletionPage() {
  const [formData, setFormData] = useState({
    email: '',
    orderNumber: '',
    reason: '',
    customerName: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/guest-data-deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(result.message);
        setFormData({ email: '', orderNumber: '', reason: '', customerName: '' });
      } else {
        setStatus('error');
        setMessage(result.error || 'Ein Fehler ist aufgetreten');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gastbestellung - Datenlöschung beantragen
          </h1>
          <p className="text-gray-600 mb-8">
            Als Gast haben Sie das Recht, Ihre Bestelldaten gemäß DSGVO löschen zu lassen. 
            Füllen Sie das Formular aus und wir werden Ihre Daten innerhalb von 30 Tagen löschen.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="ihre@email.de"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bestellnummer *
              </label>
              <input
                type="text"
                value={formData.orderNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="z.B. 3DS-25001-1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ihr Name (optional)
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ihr vollständiger Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grund (optional)
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Warum möchten Sie Ihre Daten löschen lassen?"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'loading' ? 'Wird verarbeitet...' : 'Löschungsantrag senden'}
            </button>
          </form>

          {status === 'success' && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex">
                <div className="text-green-500 text-xl mr-3">✅</div>
                <div>
                  <h3 className="text-green-800 font-medium">Erfolgreich!</h3>
                  <p className="text-green-700 text-sm mt-1">{message}</p>
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <div className="text-red-500 text-xl mr-3">❌</div>
                <div>
                  <h3 className="text-red-800 font-medium">Fehler</h3>
                  <p className="text-red-700 text-sm mt-1">{message}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-blue-800 font-medium mb-2">Wichtige Hinweise:</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Ihr Löschungsantrag wird per E-Mail an unser Team gesendet</li>
              <li>• Wir werden Ihre Daten innerhalb von 30 Tagen löschen/anonymisieren</li>
              <li>• Persönliche Daten werden durch "Gelöscht" ersetzt, Bestellnummer bleibt für Buchhaltung</li>
              <li>• Sie erhalten eine Bestätigung per E-Mail, sobald die Löschung erfolgt ist</li>
              <li>• Bei Fragen kontaktieren Sie uns unter: service@3darter.de</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
