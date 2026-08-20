'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useCrm } from '@/contexts/CrmContext';
import CompanyProfileContent from './CompanyProfileContent';

// A centered modal rather than the old cramped right-side panel — company profiles have grown
// (Projects, Countries Served, editable rate quotes, ...) and a 460px-wide sliver stopped being
// enough room. AnimatePresence keeps the backdrop/panel mounted just long enough to play their
// exit animation on close instead of vanishing instantly; each carries a stable `key` so
// switching between companies while the modal stays open (e.g. clicking a duplicate/merge link)
// re-renders the content in place rather than replaying the open animation.
export default function CompanyDrawer() {
  const { selected, closeDrawer } = useCrm();

  useEffect(() => {
    if (!selected) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDrawer();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selected, closeDrawer]);

  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          key="company-modal-backdrop"
          onClick={closeDrawer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          // Leaflet's own panes/controls (MapView.tsx) use z-index up to ~1000, so this needs to
          // clear that or the map paints on top of the modal — inherited from the old side panel.
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1900 }}
        />
      )}
      {selected && (
        <motion.div
          key="company-modal-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            pointerEvents: 'none',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.9 }}
            style={{
              pointerEvents: 'auto',
              width: 'min(720px, 100%)',
              maxHeight: '88vh',
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 24px 70px rgba(15, 23, 42, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <CompanyProfileContent />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
