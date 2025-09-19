'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

function ActivatePageContent() {
  const { user, loading, needsVerification } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resentInfo, setResentInfo] = useState<string>('');
  const [cooldown, setCooldown] = useState<number>(0);
  const [initialSent, setInitialSent] = useState<boolean>(false);
  const [showCodeInput, setShowCodeInput] = useState<boolean>(false);

  // Get email from URL params or user data
  const email = searchParams.get('email') || user?.email || '';

  // Redirect if not logged in or already verified
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    // If user is already verified, redirect to home
    if (user && !needsVerification) {
      router.push('/');
    }
  }, [user, needsVerification, loading, router]);

  // Optional: simple cooldown timer UI state
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Auto-send exactly once if we arrive with ?send=1 and we still need verification
  // Note: Removed duplicate auto-send effect to avoid double emails


  // Kein Auto-Send mehr beim Laden der Seite

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Bitte gib einen 6-stelligen Code ein');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Use Auth0's verification endpoint
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Navigate immediately once session is updated
        router.push('/');
      } else {
        setError(data.error || 'Ungültiger Code');
      }
    } catch (error) {
      setError('Netzwerkfehler. Bitte versuche es erneut.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Lade...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">E-Mail bestätigt!</h1>
          <p className="text-gray-600 mb-4">
            Dein Account wurde erfolgreich aktiviert. Du wirst zur Startseite weitergeleitet...
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  async function resendCode() {
    try {
      setIsVerifying(true);
      setError('');
      setResentInfo('');
      const resp = await fetch('/api/auth/generate-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: user?.name || email }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        if (data?.reason === 'already_verified') {
          // We are already verified; bounce home
          router.push('/');
          return;
        }
        throw new Error(data?.error || 'Fehler beim Senden des Codes');
      }
      if (typeof data.expiresIn === 'number') {
        setCooldown(Math.min(60, data.expiresIn));
      } else {
        setCooldown(60);
      }
      setResentInfo('Code wurde gesendet. Bitte prüfe dein Postfach.');
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Senden des Codes');
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <div className="text-blue-500 text-6xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">E-Mail bestätigen</h1>
          <p className="text-gray-600">
            Bitte klicke auf <strong>Code senden</strong>, um einen Bestätigungscode an <strong>{email}</strong> zu erhalten.
          </p>
        </div>

        {!showCodeInput && (
          <div className="flex flex-col items-center space-y-4">
            <button
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={async () => {
                setIsVerifying(true);
                setError('');
                setResentInfo('');
                try {
                  const resp = await fetch('/api/auth/generate-verification-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, name: user?.name || email }),
                  });
                  const data = await resp.json();
                  if (!resp.ok) {
                    throw new Error(data?.error || 'Fehler beim Senden des Codes');
                  }
                  setResentInfo('Code wurde gesendet. Bitte prüfe dein Postfach.');
                  setShowCodeInput(true);
                  setInitialSent(true);
                  if (typeof data.expiresIn === 'number') {
                    setCooldown(Math.min(60, data.expiresIn));
                  } else {
                    setCooldown(60);
                  }
                } catch (e: any) {
                  setError(e?.message || 'Fehler beim Senden des Codes');
                } finally {
                  setIsVerifying(false);
                }
              }}
              disabled={isVerifying}
            >
              {isVerifying ? 'Sende...' : 'Code senden'}
            </button>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 w-full">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            {resentInfo && (
              <p className="text-green-600">{resentInfo}</p>
            )}
          </div>
        )}

        {showCodeInput && (
          <>
            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Bestätigungscode
                </label>
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                  placeholder="123456"
                  maxLength={6}
                  autoComplete="off"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying || code.length !== 6}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isVerifying ? 'Verifiziere...' : 'Code bestätigen'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <div className="text-sm text-gray-500 space-y-2">
                {resentInfo && (
                  <p className="text-green-600">{resentInfo}</p>
                )}
                <p>
                  Kein Code erhalten?{' '}
                  <button
                    onClick={resendCode}
                    disabled={isVerifying || cooldown > 0}
                    className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cooldown > 0 ? `Erneut senden in ${cooldown}s` : 'Code erneut senden'}
                  </button>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ActivatePageContent />
    </Suspense>
  );
}
