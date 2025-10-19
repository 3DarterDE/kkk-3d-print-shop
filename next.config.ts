import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    qualities: [25, 50, 75, 100],
    formats: ['image/webp', 'image/avif'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['sharp'],
  async headers() {
    const securityHeaders = [
      // Note: script-src will be finalized in middleware with a nonce per request
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          // allow Sentry ingest and dev websockets; script-src nonce is set in middleware
          `connect-src 'self' https://*.auth0.com https://*.auth0cdn.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io ${process.env.NODE_ENV === 'development' ? 'ws: wss:' : ''}`,
          "font-src 'self' data:",
          "form-action 'self'",
        ].join('; '),
      },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: '3darterde',
  project: 'javascript-nextjs',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});