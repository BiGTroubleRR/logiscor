'use client';

import { useState } from 'react';
import { useCrm } from '@/contexts/CrmContext';
import { useLocale } from '@/contexts/LocaleContext';
import { editInputStyle, primaryButtonStyle } from '@/lib/styles';
import RfqEmailModal from './RfqEmailModal';
import LocationAutocomplete from './LocationAutocomplete';
import { activityTypeColor, countryNameFromCode, flagEmoji, formatDate, formatDateTime, formatTag, normalizeUrl, tierColor } from '@/lib/format';
import FlagIcon from './FlagIcon';
import CountryLabel from './CountryLabel';
import { COUNTRY_OPTIONS, NON_COUNTRY_OPTIONS } from '@/lib/countries';
import { translateOption } from '@/lib/i18n/option-labels';
import type { ActivityType, CompanyType } from '@/types/company';
import {
  TRANSPORT_MODES,
  LOAD_TYPES,
  CONTAINER_TYPES,
  ROAD_VEHICLE_TYPES,
  ROAD_CAPACITIES,
  ROAD_SERVICE_TYPES,
  SPECIAL_CARGO_TYPES,
  GENERAL_CARGO_TYPES,
  HAZMAT_CLASSES,
  DELIVERY_SCOPES,
} from '@/lib/rate-quote-options';

const rateSectionLabelStyle = { fontSize: 11, color: '#94a3b8', marginBottom: 3 } as const;
const OTHER_SENTINEL = '__other__';

// A <select> from a preset list, with a trailing "Other" option that swaps in a free-text
// input — for the couple of fields (Container Type, Capacity) the taxonomy explicitly
// leaves open-ended ("... 등" / "etc." in the request) rather than a closed set.
function OtherableSelect({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const { locale, t } = useLocale();
  const isCustom = value !== '' && !options.includes(value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <select value={isCustom ? OTHER_SENTINEL : value} onChange={(e) => onChange(e.target.value === OTHER_SENTINEL ? ' ' : e.target.value)} style={editInputStyle}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {translateOption(o, locale)}
          </option>
        ))}
        <option value={OTHER_SENTINEL}>{t.drawer.otherSpecify}</option>
      </select>
      {isCustom && <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={t.drawer.specifyPlaceholder} style={editInputStyle} />}
    </div>
  );
}

// The shared body of the company view — rendered inside CompanyDrawer.tsx's narrow side
// panel and inside the full-page profile route (src/app/companies/[id]/page.tsx). Reads
// everything straight from useCrm(), so no props are needed in either context.
export default function CompanyProfileContent() {
  const {
    selected,
    identity,
    closeDrawer,
    deleteCompanyAction,
    duplicateCompanyAction,
    mergeCompaniesAction,
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
    addCompanyType,
    removeCompanyType,
    allCountriesServed,
    addCountryServed,
    removeCountryServed,
    projects,
    selectedProjectIds,
    addCompanyToSelectedProject,
    removeCompanyFromSelectedProject,
    activityLog,
    activityLoading,
    addActivity,
    rateQuotes,
    rateQuotesLoading,
    addRateQuote,
    deleteRateQuoteAction,
    editingRateId,
    startEditRateQuote,
    cancelEditRateQuote,
    saveRateQuoteEdit,
  } = useCrm();
  const { locale, t } = useLocale();
  const [showRfqModal, setShowRfqModal] = useState(false);
  // Address search box for the Details edit form (Feature: address-driven lat/lng) — deliberately
  // local, not part of editDraft/CrmContext: this text has no persisted purpose beyond the edit
  // session, unlike every other editDraft field which maps 1:1 onto a Company column.
  const [addressSearchText, setAddressSearchText] = useState('');
  const [showAdvancedCoords, setShowAdvancedCoords] = useState(false);
  // Seeded once per edit session (not on every editDraft change — city/region typing would
  // otherwise fight the search box) from the company's current city/region/country, so
  // confirming an unchanged location is a single pick, not a from-scratch search. Adjusted
  // during render (React's documented pattern) rather than in an effect, same as
  // CompanyTable.tsx's pagination reset — avoids a setState-in-effect extra render for no benefit.
  const [prevEditingDetails, setPrevEditingDetails] = useState(editingDetails);
  if (editingDetails !== prevEditingDetails) {
    setPrevEditingDetails(editingDetails);
    if (editingDetails && editDraft) {
      setAddressSearchText([editDraft.city, editDraft.region, editDraft.country].filter(Boolean).join(', '));
    }
    setShowAdvancedCoords(false);
  }

  if (!selected) return null;

  const isManager = identity?.role === 'manager';
  const tier = tierColor(draft.strength || null);
  const trTag = (label: string) => (locale === 'cs' ? translateOption(formatTag(label), 'cs') : formatTag(label));
  const dateLocale = locale === 'cs' ? 'cs-CZ' : 'en-US';
  const todayIso = new Date().toISOString().slice(0, 10);

  const scoreHint =
    selected.strength_score != null
      ? t.drawer.manuallySetScore
      : selected.routeMatch
        ? t.drawer.routeRelevance(selected.route_distance_km ?? 0)
        : t.drawer.notYetScored;

  const availableTagChoices = allCapabilities.filter((c) => !selected.capability_tags.includes(c));
  const availableTrailerTypeChoices = allTrailerTypes.filter((tt) => !selected.trailer_types.includes(tt));
  const availableCountryChoices = allCountriesServed.filter((code) => !selected.countries_served.includes(code));
  const ALL_COMPANY_TYPES: CompanyType[] = ['carrier', 'manufacturer', 'port', 'warehouse'];
  const availableCompanyTypeChoices = ALL_COMPANY_TYPES.filter((ct) => !selected.types.includes(ct));

  return (
    <>
      <div style={{ flex: '0 0 auto', padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{selected.name}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <span>
              {(selected.types.length ? selected.types : [selected.type]).map((tp) => trTag(tp)).join(' / ')} · {selected.city},
            </span>
            <CountryLabel country={selected.country} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
          <a
            href={`/companies/${selected.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title={t.drawer.openFullProfile}
            aria-label={t.drawer.openFullProfile}
            style={{ border: 'none', background: '#f1f5f9', color: '#334155', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
          >
            ↗
          </a>
          <button
            onClick={() => duplicateCompanyAction(selected.id)}
            title={t.drawer.addHub}
            aria-label={t.drawer.addHub}
            style={{ border: 'none', background: '#f1f5f9', color: '#334155', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          >
            ⧉
          </button>
          <button
            onClick={() => setShowRfqModal(true)}
            disabled={!selected.email}
            title={selected.email ? t.rfq.sendRfq : t.rfq.noEmailOnFile}
            aria-label={selected.email ? t.rfq.sendRfq : t.rfq.noEmailOnFile}
            style={{
              border: 'none',
              background: selected.email ? '#f1f5f9' : '#f8fafc',
              color: selected.email ? '#334155' : '#cbd5e1',
              width: 28,
              height: 28,
              borderRadius: 6,
              cursor: selected.email ? 'pointer' : 'not-allowed',
              fontSize: 13,
            }}
          >
            ✉
          </button>
          <button
            onClick={() => deleteCompanyAction(selected.id)}
            title={t.drawer.deleteCompany}
            aria-label={t.drawer.deleteCompany}
            style={{ border: 'none', background: '#fef2f2', color: '#dc2626', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          >
            🗑
          </button>
          <button onClick={closeDrawer} title={t.drawer.close} aria-label={t.drawer.close} style={{ border: 'none', background: '#f1f5f9', color: '#64748b', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
            ✕
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Strength Score */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{t.drawer.strengthScore}</span>
            <span style={{ background: tier.bg, color: tier.fg, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>{t.tiers[tier.tierKey]}</span>
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
            placeholder={t.drawer.rationalePlaceholder}
            style={{ width: '100%', marginTop: 10, border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, fontSize: 13, minHeight: 60, resize: 'vertical' }}
          />
          {!isManager && <div style={{ fontSize: 11, color: '#b45309', marginTop: 6 }}>{t.drawer.managerOnlyScore}</div>}
          {isManager && (
            <button onClick={saveStrength} style={{ ...primaryButtonStyle, marginTop: 8 }}>
              {t.drawer.saveScore}
            </button>
          )}
        </div>

        {/* Duplicate warning / dismissed notice */}
        {selected.isDuplicate && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#991b1b' }}>{t.drawer.possibleDuplicateOf(selected.duplicateMatches.length)}</span>
              <button onClick={() => dismissDuplicate(selected.id)} style={{ border: 'none', background: 'none', color: '#991b1b', fontSize: 11, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                {t.drawer.notADuplicate}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selected.duplicateMatches.map((dup) => (
                <div key={dup.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <DuplicateLink id={dup.id} name={dup.name} />
                  <button
                    onClick={() => mergeCompaniesAction(selected.id, dup.id)}
                    title={t.drawer.mergeIntoThis(dup.name)}
                    style={{ border: 'none', background: 'none', color: '#991b1b', fontSize: 11, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', padding: 0, flex: '0 0 auto' }}
                  >
                    {t.drawer.merge}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {selected.duplicate_dismissed && selected.hasDuplicateMatch && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>{t.drawer.duplicateFlagDismissed}</span>
            <button onClick={() => restoreDuplicate(selected.id)} style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 11, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
              {t.drawer.undo}
            </button>
          </div>
        )}

        {/* Company Types — a company can be more than one thing (e.g. a carrier that also
            runs warehouse services), so this is a chip list like Trailer Types/Capability
            Tags rather than the old single-select. */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>{t.drawer.companyTypes}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(selected.types.length ? selected.types : [selected.type]).map((tp) => (
              <span key={tp} style={{ background: '#f1f5f9', color: '#334155', fontSize: 12, padding: '5px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                {trTag(tp)}
                {selected.types.length > 1 && (
                  <button
                    onClick={() => removeCompanyType(tp)}
                    title={`${t.drawer.remove} ${trTag(tp)}`}
                    aria-label={`${t.drawer.remove} ${trTag(tp)}`}
                    style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
          {availableCompanyTypeChoices.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <select
                value={draft.companyTypeChoice}
                onChange={(e) => setDraft({ companyTypeChoice: e.target.value })}
                style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 6, padding: 7, fontSize: 12 }}
              >
                <option value="">{t.drawer.addCompanyTypePlaceholder}</option>
                {availableCompanyTypeChoices.map((ct) => (
                  <option key={ct} value={ct}>
                    {trTag(ct)}
                  </option>
                ))}
              </select>
              <button onClick={addCompanyType} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
                {t.drawer.add}
              </button>
            </div>
          )}
        </div>

        {/* Projects — same chip-list + dropdown-and-Add idiom as Company Types/Trailer
            Types above; the small project list makes a dropdown fine here, unlike
            ProjectDrawer.tsx's Companies section which needs a text-search picker instead. */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>{t.drawer.projects}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {projects
              .filter((p) => selectedProjectIds.has(p.id))
              .map((p) => (
                <span key={p.id} style={{ background: '#f1f5f9', color: '#334155', fontSize: 12, padding: '5px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.name}
                  <button
                    onClick={() => removeCompanyFromSelectedProject(p.id)}
                    title={`${t.drawer.remove} ${p.name}`}
                    aria-label={`${t.drawer.remove} ${p.name}`}
                    style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            {selectedProjectIds.size === 0 && <span style={{ fontSize: 12, color: '#94a3b8' }}>{t.drawer.noProjectsAssigned}</span>}
          </div>
          {projects.filter((p) => !selectedProjectIds.has(p.id)).length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <select
                value={draft.projectChoice}
                onChange={(e) => setDraft({ projectChoice: e.target.value })}
                style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 6, padding: 7, fontSize: 12 }}
              >
                <option value="">{t.drawer.addProjectPlaceholder}</option>
                {projects
                  .filter((p) => !selectedProjectIds.has(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <button onClick={addCompanyToSelectedProject} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
                {t.drawer.add}
              </button>
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{t.drawer.details}</span>
            {!editingDetails && (
              <button onClick={startEditDetails} style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                {t.drawer.edit}
              </button>
            )}
          </div>

          {!editingDetails ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                <Field
                  label={t.drawer.address}
                  value={[selected.city, selected.region, selected.country].filter(Boolean).join(', ') || t.drawer.notRecorded}
                  span2
                />
                <Field label={t.drawer.region} value={selected.region || t.drawer.notRecorded} />
                <Field label={t.drawer.coordinates} value={`${selected.lat.toFixed(3)}, ${selected.lng.toFixed(3)}`} />
                <Field label={t.drawer.lastUpdated} value={formatDateTime(selected.updated_at, dateLocale)} />
                <Field
                  label={t.drawer.website}
                  value={selected.website || t.drawer.dash}
                  href={selected.website ? normalizeUrl(selected.website) : undefined}
                />
                <Field label={t.drawer.phone} value={selected.phone || t.drawer.dash} />
                <Field label={t.drawer.email} value={selected.email || t.drawer.dash} span2 />
              </div>
              <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginTop: 12 }}>{selected.description}</p>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                {t.drawer.sourcePrefix}
                {selected.source} ·{' '}
                {selected.source_url ? (
                  <a href={selected.source_url} target="_blank" rel="noopener noreferrer">
                    {t.drawer.viewSource}
                  </a>
                ) : (
                  t.drawer.notApplicable
                )}
              </div>
            </>
          ) : (
            editDraft && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <LabeledInput label={t.drawer.name} value={editDraft.name} onChange={(v) => setEditField('name', v)} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{t.drawer.searchAddressLabel}</span>
                    <LocationAutocomplete
                      value={addressSearchText}
                      onChange={setAddressSearchText}
                      onSelect={(s) => {
                        setEditField('lat', String(s.lat));
                        setEditField('lng', String(s.lng));
                        if (s.countryCode) setEditField('country', countryNameFromCode(s.countryCode));
                      }}
                      placeholder={t.drawer.searchAddressPlaceholder}
                      inputStyle={editInputStyle}
                    />
                  </label>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {t.drawer.currentlyPinnedAt(
                      Number.isFinite(parseFloat(editDraft.lat)) ? parseFloat(editDraft.lat) : selected.lat,
                      Number.isFinite(parseFloat(editDraft.lng)) ? parseFloat(editDraft.lng) : selected.lng,
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedCoords((v) => !v)}
                    style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, textAlign: 'left', width: 'fit-content' }}
                  >
                    {showAdvancedCoords ? t.drawer.hideAdvancedCoordinates : t.drawer.advancedEditCoordinates}
                  </button>
                  {showAdvancedCoords && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <LabeledInput label={t.drawer.latitude} value={editDraft.lat} onChange={(v) => setEditField('lat', v)} />
                      <LabeledInput label={t.drawer.longitude} value={editDraft.lng} onChange={(v) => setEditField('lng', v)} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{t.drawer.type}</span>
                    <select value={editDraft.type} onChange={(e) => setEditField('type', e.target.value as CompanyType)} style={editInputStyle}>
                      <option value="carrier">{t.companyTypes.carrier}</option>
                      <option value="manufacturer">{t.companyTypes.manufacturer}</option>
                      <option value="port">{t.companyTypes.port}</option>
                      <option value="warehouse">{t.companyTypes.warehouse}</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{t.drawer.country}</span>
                    <select value={editDraft.country} onChange={(e) => setEditField('country', e.target.value)} style={editInputStyle}>
                      <option value="">{t.drawer.selectCountryPlaceholder}</option>
                      {COUNTRY_OPTIONS.map((o) => (
                        <option key={o.code} value={o.name}>
                          {flagEmoji(o.code)} {o.name}
                        </option>
                      ))}
                      {NON_COUNTRY_OPTIONS.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <LabeledInput label={t.drawer.region} value={editDraft.region} onChange={(v) => setEditField('region', v)} />
                  <LabeledInput label={t.drawer.city} value={editDraft.city} onChange={(v) => setEditField('city', v)} />
                  <LabeledInput label={t.drawer.website} value={editDraft.website} onChange={(v) => setEditField('website', v)} />
                  <LabeledInput label={t.drawer.phone} value={editDraft.phone} onChange={(v) => setEditField('phone', v)} />
                </div>
                <LabeledInput label={t.drawer.email} value={editDraft.email} onChange={(v) => setEditField('email', v)} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155' }}>
                  <input type="checkbox" checked={editDraft.pending_review} onChange={() => setEditField('pending_review', !editDraft.pending_review)} />
                  {t.drawer.pendingReview}
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{t.drawer.description}</span>
                  <textarea
                    value={editDraft.description}
                    onChange={(e) => setEditField('description', e.target.value)}
                    style={{ ...editInputStyle, minHeight: 60, resize: 'vertical' }}
                  />
                </label>
                {editError && <div style={{ fontSize: 12, color: '#b91c1c' }}>{editError}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={saveEditDetails} style={primaryButtonStyle}>
                    {t.drawer.save}
                  </button>
                  <button onClick={cancelEditDetails} style={{ background: 'none', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
                    {t.drawer.cancel}
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Trailer Types — lives right after Details/MULDA, per how staff actually look this up */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>{t.drawer.trailerTypes}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selected.trailer_types.map((type) => (
              <span key={type} style={{ background: '#f1f5f9', color: '#334155', fontSize: 12, padding: '5px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                {translateOption(type, locale)}
                <button
                  onClick={() => removeTrailerType(type)}
                  title={`${t.drawer.remove} ${translateOption(type, locale)}`}
                  aria-label={`${t.drawer.remove} ${translateOption(type, locale)}`}
                  style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}
                >
                  ✕
                </button>
              </span>
            ))}
            {selected.trailer_types.length === 0 && <span style={{ fontSize: 12, color: '#94a3b8' }}>{t.drawer.noneOnFile}</span>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <select
              value={draft.trailerTypeChoice}
              onChange={(e) => setDraft({ trailerTypeChoice: e.target.value })}
              style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 6, padding: 7, fontSize: 12 }}
            >
              <option value="">{t.drawer.addTrailerTypePlaceholder}</option>
              {availableTrailerTypeChoices.map((tt) => (
                <option key={tt} value={tt}>
                  {translateOption(tt, locale)}
                </option>
              ))}
            </select>
            <button onClick={addTrailerType} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
              {t.drawer.add}
            </button>
          </div>
        </div>

        {/* Capability Tags */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>{t.drawer.capabilityTags}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selected.capability_tags.map((tag) => (
              <span key={tag} style={{ background: '#f1f5f9', color: '#334155', fontSize: 12, padding: '5px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                {trTag(tag)}
                <button
                  onClick={() => removeTag(tag)}
                  title={`${t.drawer.remove} ${trTag(tag)}`}
                  aria-label={`${t.drawer.remove} ${trTag(tag)}`}
                  style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <select value={draft.tagChoice} onChange={(e) => setDraft({ tagChoice: e.target.value })} style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 6, padding: 7, fontSize: 12 }}>
              <option value="">{t.drawer.addCapabilityPlaceholder}</option>
              {availableTagChoices.map((c) => (
                <option key={c} value={c}>
                  {trTag(c)}
                </option>
              ))}
            </select>
            <button onClick={addTag} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
              {t.drawer.add}
            </button>
          </div>
        </div>

        {/* Countries Served — structured field for the list's flags column, falling back to
            a free-text lane-code parse (see lib/lane-codes.ts) for companies not tagged here. */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>{t.drawer.countriesServed}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selected.countries_served.map((code) => (
              <span key={code} title={countryNameFromCode(code)} style={{ background: '#f1f5f9', color: '#334155', fontSize: 12, padding: '5px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FlagIcon code={code} />
                {code}
                <button
                  onClick={() => removeCountryServed(code)}
                  title={`${t.drawer.remove} ${code}`}
                  aria-label={`${t.drawer.remove} ${code}`}
                  style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}
                >
                  ✕
                </button>
              </span>
            ))}
            {selected.countries_served.length === 0 && <span style={{ fontSize: 12, color: '#94a3b8' }}>{t.drawer.noneOnFile}</span>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <select
              value={draft.countryChoice}
              onChange={(e) => setDraft({ countryChoice: e.target.value })}
              style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 6, padding: 7, fontSize: 12 }}
            >
              <option value="">{t.drawer.addCountryPlaceholder}</option>
              {availableCountryChoices.map((code) => (
                <option key={code} value={code}>
                  {code} — {countryNameFromCode(code)}
                </option>
              ))}
            </select>
            <button onClick={addCountryServed} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
              {t.drawer.add}
            </button>
          </div>
        </div>

        {/* Activity Log */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>{t.drawer.activityLog}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
            <select
              value={draft.activityType}
              onChange={(e) => setDraft({ activityType: e.target.value as ActivityType })}
              style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 7, fontSize: 12, marginBottom: 6 }}
            >
              <option value="Call">{t.activityTypes.Call}</option>
              <option value="Email">{t.activityTypes.Email}</option>
              <option value="Meeting">{t.activityTypes.Meeting}</option>
              <option value="Note">{t.activityTypes.Note}</option>
            </select>
            <textarea
              value={draft.activityNote}
              onChange={(e) => setDraft({ activityNote: e.target.value })}
              placeholder={t.drawer.logPlaceholder}
              style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, fontSize: 13, minHeight: 50, resize: 'vertical' }}
            />
            <button onClick={addActivity} style={{ alignSelf: 'flex-start', marginTop: 6, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
              {t.drawer.addEntry}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activityLoading ? (
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.drawer.loading}</div>
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
                      {t.activityTypes[entry.type]}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>
                        {formatDate(entry.entry_date, dateLocale)}
                        {t.drawer.dateAuthorSep}
                        {entry.author}
                      </div>
                      <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{entry.summary}</div>
                    </div>
                  </div>
                ))}
                {activityLog.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.drawer.noActivityYet}</div>}
              </>
            )}
          </div>
        </div>

        {/* Rates Received — past quotes for a specific lane, so staff have them on hand
            next time a similar route comes up. */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>{t.drawer.ratesReceived}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <LocationAutocomplete
                value={draft.rateOrigin}
                onChange={(text) => setDraft({ rateOrigin: text, rateOriginCountryCode: null })}
                onSelect={(s) => setDraft({ rateOriginCountryCode: s.countryCode })}
                placeholder={t.drawer.originPlaceholder}
                inputStyle={editInputStyle}
              />
              <LocationAutocomplete
                value={draft.rateDestination}
                onChange={(text) => setDraft({ rateDestination: text, rateDestinationCountryCode: null })}
                onSelect={(s) => setDraft({ rateDestinationCountryCode: s.countryCode })}
                placeholder={t.drawer.destinationPlaceholder}
                inputStyle={editInputStyle}
              />
            </div>

            {/* 1. Transport Mode — top-level filter; nothing below appears until this is set. */}
            <div>
              <div style={rateSectionLabelStyle}>{t.drawer.transportMode}</div>
              <select
                value={draft.rateTransportMode}
                onChange={(e) =>
                  setDraft({
                    rateTransportMode: e.target.value,
                    rateLoadType: '',
                    rateContainerType: '',
                    rateVehicleType: '',
                    rateCapacity: '',
                    rateServiceType: '',
                  })
                }
                style={editInputStyle}
              >
                <option value="">{t.drawer.selectTransportMode}</option>
                {TRANSPORT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {translateOption(m, locale)}
                  </option>
                ))}
              </select>
            </div>

            {draft.rateTransportMode && (
              <>
                {/* 2. Cargo & Equipment Specification — depends on transport mode. */}
                {(draft.rateTransportMode === 'Ocean Freight' || draft.rateTransportMode === 'Rail / Multimodal') && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div>
                      <div style={rateSectionLabelStyle}>{t.drawer.loadType}</div>
                      <select value={draft.rateLoadType} onChange={(e) => setDraft({ rateLoadType: e.target.value })} style={editInputStyle}>
                        <option value="">{t.drawer.selectLoadType}</option>
                        {LOAD_TYPES.map((lt) => (
                          <option key={lt} value={lt}>
                            {translateOption(lt, locale)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={rateSectionLabelStyle}>{t.drawer.containerType}</div>
                      <OtherableSelect
                        value={draft.rateContainerType}
                        options={CONTAINER_TYPES}
                        placeholder={t.drawer.selectContainerType}
                        onChange={(v) => setDraft({ rateContainerType: v })}
                      />
                    </div>
                  </div>
                )}

                {draft.rateTransportMode === 'Road Freight' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div>
                      <div style={rateSectionLabelStyle}>{t.drawer.vehicleType}</div>
                      <select value={draft.rateVehicleType} onChange={(e) => setDraft({ rateVehicleType: e.target.value })} style={editInputStyle}>
                        <option value="">{t.drawer.selectVehicleType}</option>
                        {ROAD_VEHICLE_TYPES.map((vt) => (
                          <option key={vt} value={vt}>
                            {translateOption(vt, locale)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={rateSectionLabelStyle}>{t.drawer.capacity}</div>
                      <OtherableSelect
                        value={draft.rateCapacity}
                        options={ROAD_CAPACITIES}
                        placeholder={t.drawer.selectCapacity}
                        onChange={(v) => setDraft({ rateCapacity: v })}
                      />
                    </div>
                  </div>
                )}

                {/* 3. Cargo Type & Handling Requirements. */}
                <div>
                  <div style={rateSectionLabelStyle}>{t.drawer.cargoTypeHandling}</div>
                  <select
                    value={draft.rateCargoType}
                    onChange={(e) => {
                      const cargoType = e.target.value;
                      setDraft({ rateCargoType: cargoType, rateHazmatClass: cargoType === 'ADR / Hazmat' ? draft.rateHazmatClass : '' });
                    }}
                    style={editInputStyle}
                  >
                    <option value="">{t.drawer.selectCargoType}</option>
                    <optgroup label={t.drawer.specialCargo}>
                      {SPECIAL_CARGO_TYPES.map((ct) => (
                        <option key={ct} value={ct}>
                          {translateOption(ct, locale)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t.drawer.generalCargo}>
                      {GENERAL_CARGO_TYPES.map((ct) => (
                        <option key={ct} value={ct}>
                          {translateOption(ct, locale)}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {draft.rateCargoType === 'ADR / Hazmat' && (
                  <div>
                    <div style={rateSectionLabelStyle}>{t.drawer.hazmatClass}</div>
                    <select value={draft.rateHazmatClass} onChange={(e) => setDraft({ rateHazmatClass: e.target.value })} style={editInputStyle}>
                      <option value="">{t.drawer.selectHazmatClass}</option>
                      {HAZMAT_CLASSES.map((hc) => (
                        <option key={hc} value={hc}>
                          {translateOption(hc, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 4. Service Type & Operational Scope. */}
                <div style={{ display: 'grid', gridTemplateColumns: draft.rateTransportMode === 'Road Freight' ? '1fr 1fr' : '1fr', gap: 6 }}>
                  {draft.rateTransportMode === 'Road Freight' && (
                    <div>
                      <div style={rateSectionLabelStyle}>{t.drawer.roadFleetType}</div>
                      <select value={draft.rateServiceType} onChange={(e) => setDraft({ rateServiceType: e.target.value })} style={editInputStyle}>
                        <option value="">{t.drawer.selectFleetType}</option>
                        {ROAD_SERVICE_TYPES.map((st) => (
                          <option key={st} value={st}>
                            {translateOption(st, locale)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <div style={rateSectionLabelStyle}>{t.drawer.deliveryScope}</div>
                    <select value={draft.rateDeliveryScope} onChange={(e) => setDraft({ rateDeliveryScope: e.target.value })} style={editInputStyle}>
                      <option value="">{t.drawer.selectDeliveryScope}</option>
                      {DELIVERY_SCOPES.map((ds) => (
                        <option key={ds} value={ds}>
                          {translateOption(ds, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <input
                type="number"
                value={draft.rateAmount}
                onChange={(e) => setDraft({ rateAmount: e.target.value })}
                placeholder={t.drawer.ratePlaceholder}
                style={editInputStyle}
              />
              <input
                type="text"
                value={draft.rateDemFt}
                onChange={(e) => setDraft({ rateDemFt: e.target.value })}
                placeholder={t.drawer.demFtPlaceholder}
                style={editInputStyle}
              />
            </div>
            <div>
              <div style={rateSectionLabelStyle}>{t.drawer.expiresAt}</div>
              <input
                type="date"
                value={draft.rateExpiresAt}
                onChange={(e) => setDraft({ rateExpiresAt: e.target.value })}
                style={editInputStyle}
              />
            </div>
            <textarea
              value={draft.rateNotes}
              onChange={(e) => setDraft({ rateNotes: e.target.value })}
              placeholder={t.drawer.notesPlaceholder}
              style={{ ...editInputStyle, minHeight: 44, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={editingRateId ? saveRateQuoteEdit : addRateQuote}
                disabled={!draft.rateOrigin.trim() || !draft.rateDestination.trim()}
                style={{
                  alignSelf: 'flex-start',
                  background: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                  opacity: !draft.rateOrigin.trim() || !draft.rateDestination.trim() ? 0.5 : 1,
                }}
              >
                {editingRateId ? t.drawer.saveRate : t.drawer.addRate}
              </button>
              {editingRateId && (
                <button
                  onClick={cancelEditRateQuote}
                  style={{ alignSelf: 'flex-start', border: '1px solid #cbd5e1', background: 'none', color: '#64748b', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
                >
                  {t.drawer.cancelEdit}
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rateQuotesLoading ? (
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.drawer.loading}</div>
            ) : (
              <>
                {rateQuotes.map((quote) => {
                  const isExpired = !!quote.expires_at && quote.expires_at < todayIso;
                  const isEditing = editingRateId === quote.id;
                  return (
                    <div
                      key={quote.id}
                      style={{
                        display: 'flex',
                        gap: 10,
                        borderBottom: '1px solid #f1f5f9',
                        paddingBottom: 8,
                        opacity: isExpired && !isEditing ? 0.6 : 1,
                        background: isEditing ? '#f0fdfa' : undefined,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {quote.origin} → {quote.destination}
                          {isExpired && (
                            <span style={{ background: '#fef2f2', color: '#b91c1c', fontSize: 10, padding: '2px 6px', borderRadius: 999, fontWeight: 600 }}>
                              {t.drawer.expiredBadge}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {quote.rate != null && <span style={{ fontWeight: 600, color: '#0f172a' }}>€{quote.rate.toLocaleString()}</span>}
                          {quote.transport_mode && <span>{translateOption(quote.transport_mode, locale)}</span>}
                          {quote.load_type && <span>{translateOption(quote.load_type, locale)}</span>}
                          {quote.container_type && <span>{translateOption(quote.container_type, locale)}</span>}
                          {quote.vehicle_type && <span>{translateOption(quote.vehicle_type, locale)}</span>}
                          {quote.capacity && <span>{translateOption(quote.capacity, locale)}</span>}
                          {quote.cargo_type && <span>{translateOption(quote.cargo_type, locale)}</span>}
                          {quote.hazmat_class && <span>{translateOption(quote.hazmat_class, locale)}</span>}
                          {quote.service_type && <span>{translateOption(quote.service_type, locale)}</span>}
                          {quote.delivery_scope && <span>{translateOption(quote.delivery_scope, locale)}</span>}
                          {quote.dem_ft && (
                            <span>
                              {t.drawer.demFtPrefix}
                              {quote.dem_ft}
                            </span>
                          )}
                        </div>
                        {quote.notes && <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>{quote.notes}</div>}
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                          {formatDate(quote.created_at, dateLocale)}
                          {quote.expires_at && ` · ${t.drawer.expiresAt}: ${formatDate(quote.expires_at, dateLocale)}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <button
                          onClick={() => (isEditing ? cancelEditRateQuote() : startEditRateQuote(quote))}
                          title={isEditing ? t.drawer.cancelEdit : t.drawer.editRate}
                          aria-label={isEditing ? t.drawer.cancelEdit : t.drawer.editRate}
                          style={{ border: 'none', background: 'none', color: isEditing ? '#0d9488' : '#cbd5e1', fontSize: 13, cursor: 'pointer', padding: '2px 4px', height: 'fit-content' }}
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => deleteRateQuoteAction(quote.id)}
                          title={t.drawer.deleteRate}
                          aria-label={t.drawer.deleteRate}
                          style={{ border: 'none', background: 'none', color: '#cbd5e1', fontSize: 13, cursor: 'pointer', padding: '2px 4px', height: 'fit-content' }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
                {rateQuotes.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.drawer.noRatesYet}</div>}
              </>
            )}
          </div>
        </div>
      </div>

      {showRfqModal && <RfqEmailModal companies={[{ name: selected.name, email: selected.email }]} onClose={() => setShowRfqModal(false)} />}
    </>
  );
}

function Field({ label, value, href, span2 }: { label: string; value: string; href?: string; span2?: boolean }) {
  return (
    <div style={span2 ? { gridColumn: 'span 2' } : undefined}>
      <div style={{ color: '#94a3b8', fontSize: 11 }}>{label}</div>
      <div style={{ color: '#0f172a' }}>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#2563eb', wordBreak: 'break-all' }}>
            {value}
          </a>
        ) : (
          value
        )}
      </div>
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
