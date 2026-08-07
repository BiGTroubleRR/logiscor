'use client';

import { useCrm } from '@/contexts/CrmContext';
import { editInputStyle, primaryButtonStyle } from '@/lib/styles';
import { activityTypeColor, formatDate, formatTag, tierColor } from '@/lib/format';
import type { ActivityType, CompanyType } from '@/types/company';

export default function CompanyDrawer() {
  const {
    selected,
    identity,
    closeDrawer,
    deleteCompanyAction,
    duplicateCompanyAction,
    draft,
    setDraft,
    saveStrength,
    dismissDuplicate,
    restoreDuplicate,
    editingDetails,
    editDraft,
    editError,
    startEditDetails,
    cancelEditDetails,
    setEditField,
    saveEditDetails,
    allCapabilities,
    addTag,
    removeTag,
    allTrailerTypes,
    addTrailerType,
    removeTrailerType,
    activityLog,
    activityLoading,
    addActivity,
  } = useCrm();

  if (!selected) return null;

  const isManager = identity?.role === 'manager';
  const tier = tierColor(draft.strength || null);

  const scoreHint =
    selected.strength_score != null
      ? 'Manually set score.'
      : selected.routeMatch
        ? `Route relevance: ${selected.route_distance_km} km off route.`
        : 'Not yet scored — run a route search, or set a manual score below.';

  const availableTagChoices = allCapabilities.filter((t) => !selected.capability_tags.includes(t));
  const availableTrailerTypeChoices = allTrailerTypes.filter((t) => !selected.trailer_types.includes(t));

  return (
    <>
      <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 40 }} />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: 460,
          background: '#fff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: '0 0 auto', padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{selected.name}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              {formatTag(selected.type)} · {selected.city}, {selected.country}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
            <button
              onClick={() => duplicateCompanyAction(selected.id)}
              title="Duplicate company"
              style={{ border: 'none', background: '#f1f5f9', color: '#334155', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
            >
              ⧉
            </button>
            <button
              onClick={() => deleteCompanyAction(selected.id)}
              title="Delete company"
              style={{ border: 'none', background: '#fef2f2', color: '#dc2626', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
            >
              🗑
            </button>
            <button onClick={closeDrawer} title="Close" style={{ border: 'none', background: '#f1f5f9', color: '#64748b', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
              ✕
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Strength Score */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Strength Score</span>
              <span style={{ background: tier.bg, color: tier.fg, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>{tier.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: tier.bar }}>{draft.strength}</div>
              <input
                type="range"
                min={0}
                max={100}
                value={draft.strength}
                onChange={(e) => setDraft({ strength: Number(e.target.value) })}
                disabled={!isManager}
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{scoreHint}</div>
            <textarea
              value={draft.rationale}
              onChange={(e) => setDraft({ rationale: e.target.value })}
              disabled={!isManager}
              placeholder="Rationale for this score..."
              style={{ width: '100%', marginTop: 10, border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, fontSize: 13, minHeight: 60, resize: 'vertical' }}
            />
            {!isManager && <div style={{ fontSize: 11, color: '#b45309', marginTop: 6 }}>Only Procurement Managers can edit the strength score.</div>}
            {isManager && (
              <button onClick={saveStrength} style={{ ...primaryButtonStyle, marginTop: 8 }}>
                Save Score
              </button>
            )}
          </div>

          {/* Duplicate warning / dismissed notice */}
          {selected.isDuplicate && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#991b1b' }}>
                  ⚠ Possible duplicate of {selected.duplicateMatches.length === 1 ? '1 other entry' : `${selected.duplicateMatches.length} other entries`}
                </span>
                <button onClick={() => dismissDuplicate(selected.id)} style={{ border: 'none', background: 'none', color: '#991b1b', fontSize: 11, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                  Not a duplicate
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {selected.duplicateMatches.map((dup) => (
                  <DuplicateLink key={dup.id} id={dup.id} name={dup.name} />
                ))}
              </div>
            </div>
          )}
          {selected.duplicate_dismissed && selected.hasDuplicateMatch && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Duplicate flag dismissed for this company.</span>
              <button onClick={() => restoreDuplicate(selected.id)} style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 11, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                Undo
              </button>
            </div>
          )}

          {/* Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Details</span>
              {!editingDetails && (
                <button onClick={startEditDetails} style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  Edit
                </button>
              )}
            </div>

            {!editingDetails ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  <Field label="Region" value={selected.region || 'Not recorded'} />
                  <Field label="Coordinates" value={`${selected.lat.toFixed(3)}, ${selected.lng.toFixed(3)}`} />
                  <Field label="Last updated" value={formatDate(selected.updated_at)} />
                  <Field label="Website" value={selected.website || '—'} />
                  <Field label="Phone" value={selected.phone || '—'} />
                  <Field label="Email" value={selected.email || '—'} span2 />
                </div>
                {selected.pending_review && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <span style={{ background: '#fef2f2', color: '#b91c1c', fontSize: 11, padding: '3px 8px', borderRadius: 999, fontWeight: 600 }}>Pending review</span>
                  </div>
                )}
                <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginTop: 12 }}>{selected.description}</p>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                  Source: {selected.source} ·{' '}
                  {selected.source_url ? (
                    <a href={selected.source_url} target="_blank" rel="noopener noreferrer">
                      view source
                    </a>
                  ) : (
                    'n/a'
                  )}
                </div>
              </>
            ) : (
              editDraft && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <LabeledInput label="Name" value={editDraft.name} onChange={(v) => setEditField('name', v)} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Type</span>
                      <select value={editDraft.type} onChange={(e) => setEditField('type', e.target.value as CompanyType)} style={editInputStyle}>
                        <option value="carrier">Carrier</option>
                        <option value="manufacturer">Manufacturer</option>
                        <option value="port">Port</option>
                        <option value="warehouse">Warehouse</option>
                      </select>
                    </label>
                    <LabeledInput label="Country" value={editDraft.country} onChange={(v) => setEditField('country', v)} />
                    <LabeledInput label="Region" value={editDraft.region} onChange={(v) => setEditField('region', v)} />
                    <LabeledInput label="City" value={editDraft.city} onChange={(v) => setEditField('city', v)} />
                    <LabeledInput label="Latitude" value={editDraft.lat} onChange={(v) => setEditField('lat', v)} />
                    <LabeledInput label="Longitude" value={editDraft.lng} onChange={(v) => setEditField('lng', v)} />
                    <LabeledInput label="Website" value={editDraft.website} onChange={(v) => setEditField('website', v)} />
                    <LabeledInput label="Phone" value={editDraft.phone} onChange={(v) => setEditField('phone', v)} />
                  </div>
                  <LabeledInput label="Email" value={editDraft.email} onChange={(v) => setEditField('email', v)} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155' }}>
                    <input type="checkbox" checked={editDraft.pending_review} onChange={() => setEditField('pending_review', !editDraft.pending_review)} />
                    Pending review
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Description</span>
                    <textarea
                      value={editDraft.description}
                      onChange={(e) => setEditField('description', e.target.value)}
                      style={{ ...editInputStyle, minHeight: 60, resize: 'vertical' }}
                    />
                  </label>
                  {editError && <div style={{ fontSize: 12, color: '#b91c1c' }}>{editError}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={saveEditDetails} style={primaryButtonStyle}>
                      Save
                    </button>
                    <button onClick={cancelEditDetails} style={{ background: 'none', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Trailer Types — lives right after Details/MULDA, per how staff actually look this up */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>Trailer Types</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selected.trailer_types.map((type) => (
                <span key={type} style={{ background: '#f1f5f9', color: '#334155', fontSize: 12, padding: '5px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {type}
                  <button onClick={() => removeTrailerType(type)} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}>
                    ✕
                  </button>
                </span>
              ))}
              {selected.trailer_types.length === 0 && <span style={{ fontSize: 12, color: '#94a3b8' }}>None on file.</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <select
                value={draft.trailerTypeChoice}
                onChange={(e) => setDraft({ trailerTypeChoice: e.target.value })}
                style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 6, padding: 7, fontSize: 12 }}
              >
                <option value="">Add trailer type...</option>
                {availableTrailerTypeChoices.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button onClick={addTrailerType} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
                Add
              </button>
            </div>
          </div>

          {/* Capability Tags */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>Capability Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selected.capability_tags.map((tag) => (
                <span key={tag} style={{ background: '#f1f5f9', color: '#334155', fontSize: 12, padding: '5px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {formatTag(tag)}
                  <button onClick={() => removeTag(tag)} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}>
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <select value={draft.tagChoice} onChange={(e) => setDraft({ tagChoice: e.target.value })} style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 6, padding: 7, fontSize: 12 }}>
                <option value="">Add capability...</option>
                {availableTagChoices.map((t) => (
                  <option key={t} value={t}>
                    {formatTag(t)}
                  </option>
                ))}
              </select>
              <button onClick={addTag} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
                Add
              </button>
            </div>
          </div>

          {/* Activity Log */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>Activity Log</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
              <select
                value={draft.activityType}
                onChange={(e) => setDraft({ activityType: e.target.value as ActivityType })}
                style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 7, fontSize: 12, marginBottom: 6 }}
              >
                <option value="Call">Call</option>
                <option value="Email">Email</option>
                <option value="Meeting">Meeting</option>
                <option value="Note">Note</option>
              </select>
              <textarea
                value={draft.activityNote}
                onChange={(e) => setDraft({ activityNote: e.target.value })}
                placeholder="Log a call, email, meeting or note..."
                style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, fontSize: 13, minHeight: 50, resize: 'vertical' }}
              />
              <button onClick={addActivity} style={{ alignSelf: 'flex-start', marginTop: 6, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
                Add Entry
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activityLoading ? (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Loading…</div>
              ) : (
                <>
                  {activityLog.map((entry) => (
                    <div key={entry.id} style={{ display: 'flex', gap: 10 }}>
                      <span
                        style={{
                          background: `${activityTypeColor(entry.type)}1a`,
                          color: activityTypeColor(entry.type),
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 5,
                          height: 'fit-content',
                        }}
                      >
                        {entry.type}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          {formatDate(entry.entry_date)} · {entry.author}
                        </div>
                        <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{entry.summary}</div>
                      </div>
                    </div>
                  ))}
                  {activityLog.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8' }}>No activity logged yet.</div>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, value, span2 }: { label: string; value: string; span2?: boolean }) {
  return (
    <div style={span2 ? { gridColumn: 'span 2' } : undefined}>
      <div style={{ color: '#94a3b8', fontSize: 11 }}>{label}</div>
      <div style={{ color: '#0f172a' }}>{value}</div>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={editInputStyle} />
    </label>
  );
}

function DuplicateLink({ id, name }: { id: string; name: string }) {
  const { openDrawer } = useCrm();
  return (
    <button onClick={() => openDrawer(id)} style={{ textAlign: 'left', border: 'none', background: 'none', color: '#b91c1c', fontSize: 12, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
      {name}
    </button>
  );
}
