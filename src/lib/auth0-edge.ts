import { Auth0Client } from '@auth0/nextjs-auth0/edge';

// Edge-safe Auth0 client for middleware. Avoids importing any server-only
// modules (like database helpers) to keep the middleware bundle compatible
// with the Edge runtime.
const domain = process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL?.replace(/^https?:\/\//, '') || '';
const appBaseUrl = process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const auth0 = new Auth0Client({
  domain,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  appBaseUrl,
  secret: process.env.AUTH0_SECRET,
  routes: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    callback: '/api/auth/callback',
    backChannelLogout: '/api/auth/backchannel-logout',
  },
});


