'use client';

import { useRouter } from 'next/navigation';
import { useCrm } from '@/contexts/CrmContext';
import { useAuth } from '@/contexts/AuthContext';

const tabBase = { border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600 as const, cursor: 'pointer' as const };

export default function Header() {
  const { view, setView, filtered, companies, loading, identity } = useCrm();
  const { user, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/sign-in');
  }

  return (
    <div
      style={{
        height: 60,
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: '#0f172a',
        color: '#fff',
        gap: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            background: '#0d9488',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            flex: '0 0 auto',
          }}
        >
          C
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>Carrier CRM</span>
          <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>Freight Procurement</span>
        </div>
      </div>

      <div style={{ display: 'flex', background: '#1e293b', borderRadius: 8, padding: 3, gap: 2, flex: '0 0 auto' }}>
        <button
          onClick={() => setView('list')}
          style={{ ...tabBase, background: view === 'list' ? '#0d9488' : 'transparent', color: view === 'list' ? '#fff' : '#94a3b8' }}
        >
          Company List
        </button>
        <button
          onClick={() => setView('map')}
          style={{ ...tabBase, background: view === 'map' ? '#0d9488' : 'transparent', color: view === 'map' ? '#fff' : '#94a3b8' }}
        >
          Map View
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
        {loading ? 'loading…' : `${filtered.length} of ${companies.length} carriers`}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
        {identity && (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{identity.role === 'manager' ? 'Procurement Manager' : 'Ops Staff'}</span>
        )}
        <span style={{ fontSize: 12, color: '#cbd5e1', whiteSpace: 'nowrap' }}>{user?.email}</span>
        <button
          onClick={handleSignOut}
          style={{ border: 'none', background: 'none', color: '#64748b', fontSize: 11, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
