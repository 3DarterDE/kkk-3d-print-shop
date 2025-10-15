"use client";

import Link from "next/link";
import Logo from "./Logo";
import ScrollAnimation from "@/components/ScrollAnimation";
import { useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage('Bitte geben Sie eine E-Mail-Adresse ein.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/guest-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Erfolgreich für den Newsletter angemeldet!');
        setEmail('');
        setFirstName('');
        setLastName('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Fehler beim Anmelden für den Newsletter.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    }
  };

  return (
    <footer className="mt-12 bg-gray-800 relative">
      {/* Blauer Verlauf am oberen Rand */}
      <div className="h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400"></div>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Company Info */}
          <ScrollAnimation delay={0}>
          <div className="md:col-span-1">
            <Link href="/" className="inline-block group">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center mt-2.5 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-150">
                  <Logo />
                </div>
                <div className="flex flex-col justify-center -mt-3.5">
                  <span className="font-bold text-xl text-white group-hover:text-shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-150">
                    3DarterDE
                  </span>
                  <span className="text-sm text-gray-300 -mt-1 group-hover:text-shadow-[0_0_6px_rgba(59,130,246,0.5)] transition-all duration-150">
                    Dartshop
                  </span>
                </div>
              </div>
            </Link>
            <p className="text-sm text-gray-300 leading-relaxed">
              3DarterDE bietet professionelle Autodarts-Systeme und 3D-Druck auf höchstem Niveau. 
              Mit Präzision, Innovation und Qualität setzen wir neue Maßstäbe in der digitalen 
              Dartsport-Technologie und additiven Fertigung.
            </p>
            <div className="mt-4 flex gap-3">
              {/* Instagram */}
              <a href="#" className="text-gray-400 hover:text-pink-500 transition-colors" title="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              {/* TikTok */}
              <a href="#" className="text-gray-400 hover:text-black transition-colors" title="TikTok">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              {/* Facebook */}
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors" title="Facebook">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
            
            {/* Kontakt unter Social Media Icons */}
            <div className="mt-4">
              <h4 className="font-medium text-white mb-2">Kontakt</h4>
              <div className="text-sm text-gray-300">
                <p>📧 service@3darter.de</p>
              </div>
            </div>
          </div>
          </ScrollAnimation>

          {/* Rechtliches */}
          <ScrollAnimation delay={100}>
          <div>
            <h3 className="font-semibold text-white mb-4">Rechtliches</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/agb" className="text-gray-300 hover:text-blue-400 transition-all duration-300 hover:translate-x-1 hover:pl-1 group flex items-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">›</span>
                AGB
              </Link></li>
              <li><Link href="/impressum" className="text-gray-300 hover:text-blue-400 transition-all duration-300 hover:translate-x-1 hover:pl-1 group flex items-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">›</span>
                Impressum
              </Link></li>
              <li><Link href="/datenschutz" className="text-gray-300 hover:text-blue-400 transition-all duration-300 hover:translate-x-1 hover:pl-1 group flex items-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">›</span>
                Datenschutz
              </Link></li>
            </ul>
          </div>
          </ScrollAnimation>

          {/* Kundenservice */}
          <ScrollAnimation delay={200}>
          <div>
            <h3 className="font-semibold text-white mb-4">Kundenservice</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/versand" className="text-gray-300 hover:text-blue-400 transition-all duration-300 hover:translate-x-1 hover:pl-1 group flex items-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">›</span>
                Versand
              </Link></li>
              <li><Link href="/zahlungsmethoden" className="text-gray-300 hover:text-blue-400 transition-all duration-300 hover:translate-x-1 hover:pl-1 group flex items-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">›</span>
                Zahlungsmethoden
              </Link></li>
              <li><Link href="/widerrufsrecht" className="text-gray-300 hover:text-blue-400 transition-all duration-300 hover:translate-x-1 hover:pl-1 group flex items-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">›</span>
                Widerrufsrecht
              </Link></li>
              <li><Link href="/faq" className="text-gray-300 hover:text-blue-400 transition-all duration-300 hover:translate-x-1 hover:pl-1 group flex items-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">›</span>
                FAQ
              </Link></li>
              <li><Link href="/kontakt" className="text-gray-300 hover:text-blue-400 transition-all duration-300 hover:translate-x-1 hover:pl-1 group flex items-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">›</span>
                Kontakt
              </Link></li>
            </ul>
          </div>
          </ScrollAnimation>

          {/* Newsletter & Kontakt */}
          <ScrollAnimation delay={300}>
          <div>
            <h3 className="font-semibold text-white mb-4">Newsletter</h3>
            <p className="text-sm text-gray-300 mb-4">
              Bleiben Sie über neue Produkte und Angebote informiert.
            </p>
            
            <form onSubmit={handleNewsletterSubmit} className="space-y-3 mb-4">
              <div>
                <input 
                  type="text" 
                  placeholder="Vorname (optional)" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <input 
                  type="email" 
                  placeholder="Ihre E-Mail" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md text-sm hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {status === 'loading' ? 'Wird verarbeitet...' : 'Anmelden'}
                </button>
              </div>
            </form>

            {/* Status Message */}
            {message && (
              <div className={`text-sm mb-4 p-2 rounded-md ${
                status === 'success' 
                  ? 'bg-green-900/30 text-green-300 border border-green-700' 
                  : 'bg-red-900/30 text-red-300 border border-red-700'
              }`}>
                {message}
              </div>
            )}

            <p className="text-xs text-gray-400 mb-6">
              Mit der Anmeldung akzeptieren Sie unsere{' '}
              <Link href="/datenschutz" className="text-blue-400 hover:text-blue-300 underline">
                Datenschutzerklärung
              </Link>
              .
            </p>
          </div>
          </ScrollAnimation>
        </div>
        <ScrollAnimation delay={400}>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} 3DarterDE. Alle Rechte vorbehalten.
        </div>
        </ScrollAnimation>
      </div>
    </footer>
  );
}