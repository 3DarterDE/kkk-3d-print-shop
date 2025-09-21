"use client";

import { useEffect, useState, useCallback } from 'react';

// Simple in-memory cache to dedupe concurrent auth requests and avoid
// repeating the call across components rendered at the same time
let inFlightAuthRequest: Promise<any> | null = null;
let cachedAuthResult: any = null;
let cachedAt = 0;
const AUTH_CACHE_TTL_MS = 15000; // keep for 15s to smooth page transitions

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
      const now = Date.now();

      // Serve from short-lived cache if fresh
      if (cachedAuthResult && now - cachedAt < AUTH_CACHE_TTL_MS) {
        const data = cachedAuthResult;
        const authenticated = Boolean(data.authenticated);
        setIsAuthenticated(authenticated);
        setIsAdmin(Boolean(data.isAdmin));
        setNeedsVerification(Boolean(data.needsVerification));
        setUser(authenticated ? (data.user || null) : null);
        return;
      }

      // Reuse in-flight request when multiple components mount simultaneously
      if (!inFlightAuthRequest) {
        inFlightAuthRequest = fetch('/api/auth/me', { cache: 'no-store' })
          .then((res) => res.json())
          .finally(() => {
            // allow new requests after resolution
            inFlightAuthRequest = null;
          });
      }

      const data = await inFlightAuthRequest;
      cachedAuthResult = data;
      cachedAt = Date.now();
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
