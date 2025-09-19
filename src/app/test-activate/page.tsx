'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestActivatePage() {
  const router = useRouter();
  const [email, setEmail] = useState('test@example.com');

  const handleTestRedirect = () => {
    const url = new URL('/activate', window.location.origin);
    url.searchParams.set('email', email);
    router.push(url.toString());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Test Activate Page</h1>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="test@example.com"
            />
          </div>
          <button
            onClick={handleTestRedirect}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Zur Activate-Seite weiterleiten
          </button>
        </div>
      </div>
    </div>
  );
}
