'use client';

import { useState, useEffect } from 'react';
import { CgProfile } from 'react-icons/cg';
import { IoCheckmarkCircleSharp } from 'react-icons/io5';
import { GoXCircleFill } from 'react-icons/go';
import useAuth from '@/lib/hooks/useAuth';
import { useUserData } from '@/lib/contexts/UserDataContext';

export default function CustomerButton() {
  const { user: authUser, loading, error, refresh } = useAuth();
  const { user: userData } = useUserData();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-customer-dropdown]')) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isInteractive = mounted && !loading;

  const handleButtonClick = () => {
    // Avoid race & hydration mismatch: ignore clicks until mounted and not loading
    if (!isInteractive) return;
    if (authUser) {
      setIsOpen(!isOpen);
    } else {
      setIsModalOpen(true);
    }
  };


  const handleLogin = () => {
    // Open Auth0 login in a centered popup and return to popup-complete page
    const w = 500;
    const h = 650;
    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : (window as any).screenX;
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : (window as any).screenY;
    const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
    const systemZoom = width / window.screen.availWidth;
    const left = (width - w) / 2 / systemZoom + dualScreenLeft;
    const top = (height - h) / 2 / systemZoom + dualScreenTop;

    // Get current page path for returnTo
    const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
    const returnTo = encodeURIComponent('/auth/popup-complete?next=' + currentPath);

    const popup = window.open(
      `/api/auth/login?prompt=login&max_age=0&returnTo=${returnTo}`,
      '_blank',
      `scrollbars=yes, width=${w}, height=${h}, top=${top}, left=${left}`
    );

    // Fallback if popup was blocked
    if (!popup || popup.closed) {
      window.location.assign(`/api/auth/login?prompt=login&max_age=0&returnTo=${returnTo}`);
      return;
    }

    if (popup) {
      // Listen for completion message
      const onMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (!event.data || event.data.type !== 'auth:popup-complete') return;
        window.removeEventListener('message', onMessage);
        try {
          // Try to confirm authenticated session (handle potential race)
          let ok = false;
          for (let i = 0; i < 6; i++) {
            const r = await fetch('/api/auth/me?login=1', { cache: 'no-store' });
            const j = await r.json().catch(() => null);
            if (j && j.authenticated) { ok = true; break; }
            await new Promise(res => setTimeout(res, 250));
          }
          await refresh();
        } catch {}
        setIsModalOpen(false);
        // If backend signaled a post-login destination (e.g., /activate), go there immediately
        if (event.data && typeof event.data.next === 'string' && event.data.next.length > 0) {
          try { window.location.assign(event.data.next); } catch {}
        }
      };
      window.addEventListener('message', onMessage);
    }
  };

  const handleSignup = () => {
    const w = 500;
    const h = 650;
    const left = window.screenX + Math.max(0, (window.innerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.innerHeight - h) / 2);
    
    // Get current page path for returnTo
    const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
    const returnTo = encodeURIComponent('/auth/popup-complete?next=' + currentPath);
    
    const popup = window.open(
      `/api/auth/login?screen_hint=signup&prompt=login&max_age=0&returnTo=${returnTo}`,
      '_blank',
      `scrollbars=yes, width=${w}, height=${h}, top=${top}, left=${left}`
    );
    if (!popup || popup.closed) {
      window.location.assign(`/api/auth/login?screen_hint=signup&prompt=login&max_age=0&returnTo=${returnTo}`);
      return;
    }
    if (popup) {
      const onMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (!event.data || event.data.type !== 'auth:popup-complete') return;
        window.removeEventListener('message', onMessage);
        try {
          let ok = false;
          for (let i = 0; i < 6; i++) {
            const r = await fetch('/api/auth/me?login=1', { cache: 'no-store' });
            const j = await r.json().catch(() => null);
            if (j && j.authenticated) { ok = true; break; }
            await new Promise(res => setTimeout(res, 250));
          }
          await refresh();
        } catch {}
        setIsModalOpen(false);
        if (event.data && typeof event.data.next === 'string' && event.data.next.length > 0) {
          try { window.location.assign(event.data.next); } catch {}
        }
      };
      window.addEventListener('message', onMessage);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="relative" data-customer-dropdown>
        <button
          onClick={handleButtonClick}
          className={`flex items-center text-sm ${isInteractive ? 'text-white hover:text-blue-200' : 'text-white/60 cursor-wait'} transition-all duration-300 group`}
          aria-label="Kundenbereich"
          disabled={!isInteractive}
        >
          <div className="w-8 h-8 flex items-center justify-center group-hover:drop-shadow-[0_0_6px_rgba(173,216,230,0.6)] transition-all duration-300 relative">
            <CgProfile className="w-7 h-7 transition-transform duration-300 group-hover:scale-110" />
            {mounted && !loading && (
              authUser ? (
                <IoCheckmarkCircleSharp className="absolute -top-1 -right-1 w-4 h-4 text-green-500 bg-white rounded-full" />
              ) : (
                <GoXCircleFill className="absolute -top-1 -right-1 w-4 h-4 text-red-500 bg-white rounded-full" />
              )
            )}
          </div>
        </button>

        {/* Dropdown for logged in users */}
        {authUser && isOpen && (
          <div className="absolute right-0 top-12 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                {userData?.firstName && userData?.lastName 
                  ? `${userData.firstName} ${userData.lastName}`
                  : userData?.name || authUser.name || 'User'
                }
              </p>
              <p className="text-sm text-gray-500">{userData?.email || authUser.email}</p>
            </div>
            
            <div className="py-1">
              <a
                href="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Profil verwalten
              </a>
              <a
                href="/orders"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Bestellungen
              </a>
              <a
                href="/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Einstellungen
              </a>
            </div>
            
            <div className="border-t border-gray-200 py-1">
              <a
                href="/api/auth/logout"
                className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Abmelden
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Login Modal for non-logged in users */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={handleCloseModal}
          ></div>
          
          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Anmelden</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-center">
              <div className="mb-4">
                <CgProfile className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-6">
                  Melden Sie sich an, um auf Ihr Profil, Ihre Bestellungen und Einstellungen zuzugreifen.
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handleLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200"
                >
                  Anmelden
                </button>
                
                <div className="text-center py-2">
                  <p className="text-sm text-gray-500">
                    Noch kein Konto?{' '}
                    <button
                      onClick={handleSignup}
                      className="text-blue-600 hover:text-blue-700 font-medium underline"
                    >
                      Hier registrieren
                    </button>
                  </p>
                </div>
                
                <button
                  onClick={handleCloseModal}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
