'use client';

import { useState } from 'react';
import { useCrm } from '@/contexts/CrmContext';
import { useLocale } from '@/contexts/LocaleContext';
import { editInputStyle, primaryButtonStyle } from '@/lib/styles';
import { formatDate } from '@/lib/format';
import type { ProjectStatus } from '@/types/project';

const sectionLabelStyle = { fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: 8 };

export default function ProjectDrawer() {
  const {
    selectedProject,
    closeProjectDrawer,
    deleteProjectAction,
    editingProject,
    projectDraft,
    startEditProject,
    cancelEditProject,
    setProjectField,
    saveProjectDetails,
    companies,
    companyIdsByProject,
    addCompanyToProjectAction,
    removeCompanyFromProjectAction,
  } = useCrm();
  const { locale, t } = useLocale();
  const dateLocale = locale === 'cs' ? 'cs-CZ' : 'en-US';
  const [companySearch, setCompanySearch] = useState('');

  if (!selectedProject) return null;

  const assignedIds = companyIdsByProject.get(selectedProject.id) ?? new Set<string>();
  const assignedCompanies = companies.filter((c) => assignedIds.has(c.id));
  const query = companySearch.trim().toLowerCase();
  const searchResults = query ? companies.filter((c) => !assignedIds.has(c.id) && c.name.toLowerCase().includes(query)).slice(0, 8) : [];

  return (
    <>
      <div onClick={closeProjectDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 1900 }} />
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
        <div style={{ flex: '0 0 auto', padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{selectedProject.name}</div>
          <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
            <button
              onClick={() => deleteProjectAction(selectedProject.id)}
              title={t.projects.deleteProject}
              style={{ border: 'none', background: '#fef2f2', color: '#dc2626', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
            >
              🗑
            </button>
            <button onClick={closeProjectDrawer} title={t.drawer.close} style={{ border: 'none', background: '#f1f5f9', color: '#64748b', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
              ✕
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={sectionLabelStyle}>{t.projects.details}</span>
              {!editingProject && (
                <button onClick={startEditProject} style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  {t.drawer.edit}
                </button>
              )}
            </div>

            {!editingProject ? (
              <>
                <span
                  style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 9px',
                    borderRadius: 999,
                  }}
                >
                  {t.projectStatuses[selectedProject.status]}
                </span>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                  {selectedProject.start_date ? formatDate(selectedProject.start_date, dateLocale) : t.drawer.dash}
                  {' — '}
                  {selectedProject.end_date ? formatDate(selectedProject.end_date, dateLocale) : t.drawer.dash}
                </div>
                <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginTop: 12 }}>{selectedProject.description || t.drawer.dash}</p>
              </>
            ) : (
              projectDraft && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{t.projects.name}</span>
                    <input type="text" value={projectDraft.name} onChange={(e) => setProjectField('name', e.target.value)} style={editInputStyle} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{t.projects.status}</span>
                    <select value={projectDraft.status} onChange={(e) => setProjectField('status', e.target.value as ProjectStatus)} style={editInputStyle}>
                      <option value="active">{t.projectStatuses.active}</option>
                      <option value="on_hold">{t.projectStatuses.on_hold}</option>
                      <option value="completed">{t.projectStatuses.completed}</option>
                      <option value="cancelled">{t.projectStatuses.cancelled}</option>
                    </select>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{t.projects.startDate}</span>
                      <input
                        type="date"
                        value={projectDraft.start_date ?? ''}
                        onChange={(e) => setProjectField('start_date', e.target.value || null)}
                        style={editInputStyle}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{t.projects.endDate}</span>
                      <input
                        type="date"
                        value={projectDraft.end_date ?? ''}
                        onChange={(e) => setProjectField('end_date', e.target.value || null)}
                        style={editInputStyle}
                      />
                    </label>
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{t.projects.descriptionLabel}</span>
                    <textarea
                      value={projectDraft.description}
                      onChange={(e) => setProjectField('description', e.target.value)}
                      style={{ ...editInputStyle, minHeight: 60, resize: 'vertical' }}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={saveProjectDetails} style={primaryButtonStyle}>
                      {t.drawer.save}
                    </button>
                    <button onClick={cancelEditProject} style={{ background: 'none', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
                      {t.drawer.cancel}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Companies — text-search picker rather than a dropdown, since there can be
              hundreds of companies (unlike the small option lists elsewhere in the app). */}
          <div>
            <div style={sectionLabelStyle}>{t.projects.companies}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {assignedCompanies.map((c) => (
                <span key={c.id} style={{ background: '#f1f5f9', color: '#334155', fontSize: 12, padding: '5px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {c.name}
                  <button
                    onClick={() => removeCompanyFromProjectAction(selectedProject.id, c.id)}
                    style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}
                  >
                    ✕
                  </button>
                </span>
              ))}
              {assignedCompanies.length === 0 && <span style={{ fontSize: 12, color: '#94a3b8' }}>{t.projects.noCompaniesAssigned}</span>}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder={t.projects.searchCompaniesPlaceholder}
                style={editInputStyle}
              />
              {searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 1, maxHeight: 220, overflow: 'auto' }}>
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        addCompanyToProjectAction(selectedProject.id, c.id);
                        setCompanySearch('');
                      }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '8px 10px', fontSize: 13, color: '#334155', cursor: 'pointer' }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
