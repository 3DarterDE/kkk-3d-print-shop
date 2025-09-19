'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

export default function VerificationRedirect() {
  const { user, loading, needsVerification } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('VerificationRedirect - loading:', loading, 'user:', !!user, 'needsVerification:', needsVerification);
    
    // Only redirect if user is logged in and needs verification
    if (!loading && user && needsVerification) {
      if (typeof window !== 'undefined' && window.location.pathname === '/activate') {
        return; // already on activate
      }
      console.log('VerificationRedirect - Redirecting to /activate for email verification');
      const url = new URL('/activate', window.location.origin);
      url.searchParams.set('email', user.email || '');
      console.log('VerificationRedirect - Redirect URL:', url.toString());
      router.push(url.toString());
    }
  }, [user, loading, needsVerification, router]);

  return null; // This component doesn't render anything
}
