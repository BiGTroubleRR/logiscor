'use client';

import { use, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CrmProvider, useCrm } from '@/contexts/CrmContext';
import { useLocale } from '@/contexts/LocaleContext';
import CompanyProfileContent from '@/components/CompanyProfileContent';

// A full-page view of a single company — the drawer (CompanyDrawer.tsx) is a narrow, fixed-
// width side panel that gets cramped once Projects/Countries Served/rate-quote editing are
// all stacked in it. This route renders the same CompanyProfileContent in its own tab with
// more room, e.g. for comparing a hub against its original side by side.
function ProfilePageShell({ companyId }: { companyId: string }) {
  const { loading, selected, openDrawer } = useCrm();
  const { t } = useLocale();
  const openedRef = useRef(false);

  useEffect(() => {
    if (loading || openedRef.current) return;
    openedRef.current = true;
    openDrawer(companyId);
  }, [loading, companyId, openDrawer]);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 720, minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 0 24px rgba(0,0,0,0.06)' }}>
        <div style={{ flex: '0 0 auto', padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <Link href="/" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
            {t.profilePage.backLink}
          </Link>
        </div>
        {loading ? (
          <div style={{ flex: 1, padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t.profilePage.loading}</div>
        ) : selected ? (
          <CompanyProfileContent />
        ) : (
          <div style={{ flex: 1, padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t.profilePage.notFound}</div>
        )}
      </div>
    </div>
  );
}

export default function CompanyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <CrmProvider>
      <ProfilePageShell companyId={id} />
    </CrmProvider>
  );
}
