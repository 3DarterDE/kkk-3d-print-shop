"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function NewsletterUnsubscribePage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage('Bitte geben Sie Ihre E-Mail-Adresse ein.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/guest-unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Sie wurden erfolgreich vom Newsletter abgemeldet.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Fehler beim Abmelden vom Newsletter.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Newsletter abmelden</h1>
            <p className="text-gray-600">
              Geben Sie Ihre E-Mail-Adresse ein, um sich vom Newsletter abzumelden und alle Daten zu löschen.
            </p>
          </div>

          <form onSubmit={handleUnsubscribe} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                placeholder="ihre@email.de"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'loading' ? 'Wird verarbeitet...' : 'Vom Newsletter abmelden'}
            </button>
          </form>

          {/* Status Message */}
          {message && (
            <div className={`mt-6 p-4 rounded-lg ${
              status === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link 
              href="/" 
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              ← Zurück zur Startseite
            </Link>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Hinweise:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Die Abmeldung erfolgt sofort</li>
              <li>• Sie erhalten keine weiteren Newsletter</li>
              <li>• Alle Ihre Daten werden komplett gelöscht</li>
              <li>• Sowohl aus unserer Datenbank als auch aus Mailchimp</li>
              <li>• Sie können sich jederzeit wieder anmelden</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
