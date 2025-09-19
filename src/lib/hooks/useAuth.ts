"use client";

import { useEffect, useState, useCallback } from 'react';

export type AuthUser = {
  sub: string;
  email?: string;
  name?: string;
};

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      const authenticated = Boolean(data.authenticated);
      setIsAuthenticated(authenticated);
      setIsAdmin(Boolean(data.isAdmin));
      setNeedsVerification(Boolean(data.needsVerification));
      setUser(authenticated ? (data.user || null) : null);
    } catch (e: any) {
      setError(e?.message || 'Auth check failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, error, isAuthenticated, isAdmin, needsVerification, user, refresh: load };
}

export default useAuth;
