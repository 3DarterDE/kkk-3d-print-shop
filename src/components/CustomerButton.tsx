'use client';

import { useState, useEffect } from 'react';
import { CgProfile } from 'react-icons/cg';
import useAuth from '@/lib/hooks/useAuth';
import { useUserData } from '@/lib/contexts/UserDataContext';

export default function CustomerButton() {
  const { user: authUser, loading, error } = useAuth();
  const { user: userData } = useUserData();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleButtonClick = () => {
    if (authUser) {
      // User is logged in, toggle dropdown
      setIsOpen(!isOpen);
    } else {
      // User is not logged in, open modal
      setIsModalOpen(true);
    }
  };


  const handleLogin = () => {
    // Redirect to Auth0 login and send back to activation page
  window.location.assign('/api/auth/login?returnTo=%2Factivate%3Fsend%3D1');
  };

  const handleSignup = () => {
    // Redirect to Auth0 signup and send back to activation page
  window.location.assign('/api/auth/login?screen_hint=signup&returnTo=%2Factivate%3Fsend%3D1');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="relative" data-customer-dropdown>
        <button
          onClick={handleButtonClick}
          className="flex items-center text-sm text-white hover:text-blue-200 transition-all duration-300 group"
          aria-label="Kundenbereich"
        >
          <div className="w-8 h-8 flex items-center justify-center group-hover:drop-shadow-[0_0_6px_rgba(173,216,230,0.6)] transition-all duration-300">
            <CgProfile className="w-7 h-7 transition-transform duration-300 group-hover:scale-110" />
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
