'use client';

import { CrmProvider, useCrm } from '@/contexts/CrmContext';
import Header from './Header';
import RouteSearchBar from './RouteSearchBar';
import FilterBar from './FilterBar';
import CompanyTable from './CompanyTable';
import MapView from './MapView';
import CompanyDrawer from './CompanyDrawer';

function CrmShell() {
  const { view, loading, loadError, mutationError } = useCrm();

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#0f172a' }}>
      <Header />
      <RouteSearchBar />
      <FilterBar />

      {mutationError && (
        <div style={{ background: '#fef2f2', color: '#991b1b', fontSize: 12, padding: '8px 20px', borderBottom: '1px solid #fecaca' }}>
          {mutationError}
        </div>
      )}

      {loadError ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 13 }}>{loadError}</div>
      ) : loading ? (
        <div style={{ flex: 1, padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading carriers...</div>
      ) : view === 'list' ? (
        <CompanyTable />
      ) : (
        <MapView />
      )}

      <CompanyDrawer />
    </div>
  );
}

export default function CrmApp() {
  return (
    <CrmProvider>
      <CrmShell />
    </CrmProvider>
  );
}
