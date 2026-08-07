import type { NextConfig } from 'next';

// Allowed origins, derived from what this app actually talks to:
//   - This project's own Supabase instance: REST + Auth (no client-side Realtime — see the
//     note atop supabase/schema.sql for why)
//   - Google Maps JavaScript API: map tiles/script, plus the Directions/Geocoding calls the JS
//     SDK makes itself
//   - Photon (photon.komoot.io): the free OSM geocoder route search falls back to
// Fonts are self-hosted at build time via next/font, so no fonts.googleapis.com entry is needed.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const GOOGLE_MAPS_ORIGINS = 'https://*.googleapis.com https://*.gstatic.com https://*.google.com';
const PHOTON_ORIGIN = 'https://photon.komoot.io';

const csp = [
  `default-src 'self'`,
  // 'unsafe-inline' is required for React's style={{...}} props (rendered as style=""
  // attributes) and Next's small inline hydration bootstrap script. 'unsafe-eval' is dev-only:
  // React's dev-mode call-stack reconstruction uses eval() and is never used in production builds.
  `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV !== 'production' ? "'unsafe-eval' " : ''}${GOOGLE_MAPS_ORIGINS}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${GOOGLE_MAPS_ORIGINS}`,
  `font-src 'self' data:`,
  `connect-src 'self' ${SUPABASE_URL} ${GOOGLE_MAPS_ORIGINS} ${PHOTON_ORIGIN}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
