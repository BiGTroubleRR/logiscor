import type { NextConfig } from 'next';

// Allowed origins, derived from what this app actually talks to:
//   - This project's own Supabase instance: REST + Auth (no client-side Realtime — see the
//     note atop supabase/schema.sql for why)
//   - OpenStreetMap tile servers: map tiles for the Leaflet map (MapView.tsx) — no API key,
//     the map/marker-clustering code itself ships in the JS bundle rather than a remote script
//   - OSRM's public demo server (router.project-osrm.org): free, keyless driving directions for
//     route search — see fetchDirections in CrmContext.tsx
//   - Photon (photon.komoot.io): the free OSM geocoder route search falls back to
// Fonts are self-hosted at build time via next/font, so no fonts.googleapis.com entry is needed.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const OSM_TILE_ORIGINS = 'https://*.tile.openstreetmap.org';
const OSRM_ORIGIN = 'https://router.project-osrm.org';
const PHOTON_ORIGIN = 'https://photon.komoot.io';

const csp = [
  `default-src 'self'`,
  // 'unsafe-inline' is required for React's style={{...}} props (rendered as style=""
  // attributes) and Next's small inline hydration bootstrap script. 'unsafe-eval' is dev-only:
  // React's dev-mode call-stack reconstruction uses eval() and is never used in production builds.
  `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV !== 'production' ? "'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${OSM_TILE_ORIGINS}`,
  `font-src 'self' data:`,
  `connect-src 'self' ${SUPABASE_URL} ${OSRM_ORIGIN} ${PHOTON_ORIGIN}`,
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
