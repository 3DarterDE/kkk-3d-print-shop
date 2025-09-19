"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from '@/lib/hooks/useAuth';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Use full page navigation to avoid Next.js SPA/RSC prefetch & CORS warnings
  window.location.assign('/api/auth/login?returnTo=/admin/dashboard');
      return;
    }

    // Redirect to dashboard if authenticated
    router.replace('/admin/dashboard');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Authentifizierung...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Weiterleitung zum Dashboard...</p>
      </div>
    </div>
  );
}
