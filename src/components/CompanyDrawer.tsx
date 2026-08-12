'use client';

import { useCrm } from '@/contexts/CrmContext';
import CompanyProfileContent from './CompanyProfileContent';

export default function CompanyDrawer() {
  const { selected, closeDrawer } = useCrm();

  if (!selected) return null;

  return (
    <>
      {/* Leaflet's own panes/controls (MapView.tsx) use z-index up to ~1000, so the drawer needs
          to clear that or the map paints on top of it — see the "map in front of the drawer" bug. */}
      <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 1900 }} />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: 'min(460px, 100vw)',
          background: '#fff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <CompanyProfileContent />
      </div>
    </>
  );
}
