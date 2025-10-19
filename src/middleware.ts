import type { NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';
import { ensureCsrfCookie } from '@/lib/csrf';

export async function middleware(request: NextRequest) {
  // Let Auth0 v4 SDK handle auth routes & session management
  let response = await auth0.middleware(request);
  
  // If user is authenticated but not verified, redirect to /activate on the server
  const url = request.nextUrl.clone();

  // Allowlist paths: activation page, API routes, auth routes, Next internals, public assets
  const isAllowed =
    url.pathname === '/activate' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname.startsWith('/robots.txt') ||
    url.pathname.startsWith('/sitemap.xml') ||
    url.pathname.startsWith('/images') ||
    url.pathname.startsWith('/uploads') ||
    url.pathname.startsWith('/fonts') ||
    url.pathname.startsWith('/public');

  const session = await auth0.getSession(request);
  const user = session?.user as any;
  
  // Check verification status from Auth0 session first
  let emailVerified = Boolean(user?.email_verified);
  
  // For now, we'll rely on Auth0 session status to avoid the global error
  // The verification persistence will be handled by the auth0 callback
  // which can properly access the database

  // If verified user lands on /activate (e.g. from social login), send them home immediately
  if (url.pathname === '/activate' && user && emailVerified) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!isAllowed) {
    if (user && !emailVerified) {
      const redirectUrl = new URL('/activate', request.url);
      if (user?.email) redirectUrl.searchParams.set('email', user.email);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Ensure CSRF token cookie exists for all pages/APIs (Edge-compatible)
  const ensured = ensureCsrfCookie(request, response);
  response = ensured.response;

  // Generate CSP nonce and attach CSP header with nonce for scripts
  const c: any = (globalThis as any).crypto;
  const nonce = c && typeof c.randomUUID === 'function' ? c.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2);
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      // Allow dev HMR/runtime eval only in development
      `script-src 'self' 'nonce-${nonce}' https://cdn.auth0.com ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      // Allow Sentry ingest + websockets for HMR in dev
      `connect-src 'self' https://*.auth0.com https://*.auth0cdn.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io ${process.env.NODE_ENV === 'development' ? "ws: wss:" : ''}`,
      "font-src 'self' data:",
      "form-action 'self'",
    ].join('; ')
  );
  response.headers.set('x-csp-nonce', nonce);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'
  ]
};
