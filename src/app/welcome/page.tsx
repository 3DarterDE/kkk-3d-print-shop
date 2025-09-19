"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function WelcomePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleSocialLogin = async () => {
      try {
        const email = searchParams.get('email');
        const name = searchParams.get('name');
        
        if (!email || !name) {
          setStatus('error');
          setMessage('Fehlende Parameter');
          return;
        }

        // Send welcome email (the API will check if user exists and only send for new users)
        const response = await fetch('/api/send-social-welcome', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email }),
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.message === 'User already exists, no welcome email sent') {
            // User already exists, just redirect without showing any message
            setTimeout(() => {
              window.location.href = '/';
            }, 100);
            return;
          } else {
            // New user - show success message
            setStatus('success');
            setMessage('Account erfolgreich erstellt!');
            
            // Redirect to home page after 3 seconds
            setTimeout(() => {
              window.location.href = '/';
            }, 3000);
          }
        } else {
          setStatus('error');
          setMessage('Fehler beim Senden der E-Mail');
        }
      } catch (error) {
        console.error('Error handling social login:', error);
        setStatus('error');
        setMessage('Fehler beim Verarbeiten der Anmeldung');
      }
    };

    handleSocialLogin();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Anmeldung wird verarbeitet...</h1>
            <p className="text-gray-600">Bitte warten, du wirst gleich weitergeleitet...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="text-green-500 text-4xl mb-4">✅</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Account erfolgreich erstellt!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Du wirst in 3 Sekunden weitergeleitet...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="text-red-500 text-4xl mb-4">❌</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Fehler</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Zur Startseite
            </button>
          </>
        )}
      </div>
    </div>
  );
}
