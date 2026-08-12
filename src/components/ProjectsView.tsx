'use client';

import type { CSSProperties } from 'react';
import { useCrm } from '@/contexts/CrmContext';
import { useLocale } from '@/contexts/LocaleContext';
import { formatDate } from '@/lib/format';
import type { ProjectView } from '@/types/project';
import ProjectDrawer from './ProjectDrawer';

const td: CSSProperties = { padding: '12px 14px' };
const thStyle: CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  whiteSpace: 'nowrap',
};

const STATUS_COLORS: Record<ProjectView['status'], string> = {
  active: '#0d9488',
  on_hold: '#d97706',
  completed: '#2563eb',
  cancelled: '#94a3b8',
};

function Row({ p }: { p: ProjectView }) {
  const { openProjectDrawer } = useCrm();
  const { locale, t } = useLocale();
  const dateLocale = locale === 'cs' ? 'cs-CZ' : 'en-US';
  const dateRange =
    p.start_date || p.end_date
      ? `${p.start_date ? formatDate(p.start_date, dateLocale) : t.drawer.dash} — ${p.end_date ? formatDate(p.end_date, dateLocale) : t.drawer.dash}`
      : t.drawer.dash;

  return (
    <tr onClick={() => openProjectDrawer(p.id)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
      <td style={td}>
        <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
      </td>
      <td style={td}>
        <span style={{ background: `${STATUS_COLORS[p.status]}1a`, color: STATUS_COLORS[p.status], fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999 }}>
          {t.projectStatuses[p.status]}
        </span>
      </td>
      <td style={{ ...td, color: '#334155', fontSize: 12 }}>{dateRange}</td>
      <td style={{ ...td, color: '#334155' }}>{p.companyCount}</td>
    </tr>
  );
}

export default function ProjectsView() {
  const { projectViews, addProject, setView } = useCrm();
  const { t } = useLocale();

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{t.projects.title}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{t.projects.subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={addProject} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {t.projects.addProject}
          </button>
          <button
            onClick={() => setView('list')}
            style={{ border: 'none', background: 'none', color: '#0d9488', fontSize: 12, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
          >
            {t.bin.backToList}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
        {projectViews.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t.projects.empty}</div>
        ) : (
          <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={thStyle}>{t.projects.colName}</th>
                <th style={thStyle}>{t.projects.colStatus}</th>
                <th style={thStyle}>{t.projects.colDates}</th>
                <th style={thStyle}>{t.projects.colCompanies}</th>
              </tr>
            </thead>
            <tbody>
              {projectViews.map((p) => (
                <Row key={p.id} p={p} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ProjectDrawer />
    </div>
  );
}
