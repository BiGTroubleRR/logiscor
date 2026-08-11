'use client';

import { useRef, useState } from 'react';
import { useCrm } from '@/contexts/CrmContext';
import { useLocale } from '@/contexts/LocaleContext';
import { outlineButtonStyle, primaryButtonStyle } from '@/lib/styles';
import { parseImportWorkbook } from '@/lib/company-import-parse';
import {
  validateImportRows,
  partitionDuplicateRows,
  type ImportedCompanyRow,
  type ImportRowError,
  type ImportDuplicateEntry,
} from '@/lib/company-import';
import { downloadImportTemplate } from '@/lib/company-import-template';

type Stage =
  | { kind: 'idle' }
  | { kind: 'preview'; unique: ImportedCompanyRow[]; invalid: ImportRowError[]; duplicates: ImportDuplicateEntry[] }
  | { kind: 'importing' }
  | { kind: 'done'; importedCount: number; rowErrors: ImportRowError[] }
  | { kind: 'error'; message: string };

export default function ImportCompaniesButton() {
  const { importCompanies, companies } = useCrm();
  const { locale, t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  // Indices into stage.duplicates that staff have opted to import anyway — e.g. separate hubs
  // of the same company that share a website domain and got auto-flagged. Empty by default,
  // matching the previous "exclude duplicates automatically" behavior until reviewed.
  const [includedDuplicates, setIncludedDuplicates] = useState<Set<number>>(new Set());

  async function handleFile(file: File) {
    try {
      const raw = await parseImportWorkbook(file);
      if (raw.length === 0) {
        setStage({ kind: 'error', message: t.importBtn.noDataRows });
        return;
      }
      const { valid, errors } = validateImportRows(raw, locale);
      const { unique, duplicates } = partitionDuplicateRows(valid, companies, locale);
      setIncludedDuplicates(new Set());
      setStage({ kind: 'preview', unique, invalid: errors, duplicates });
    } catch {
      setStage({ kind: 'error', message: t.importBtn.couldNotRead });
    }
  }

  function toggleDuplicate(i: number) {
    setIncludedDuplicates((set) => {
      const next = new Set(set);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function handleConfirm() {
    if (stage.kind !== 'preview') return;
    const toImport = [...stage.unique, ...stage.duplicates.filter((_, i) => includedDuplicates.has(i)).map((d) => d.row)];
    const skipped = [
      ...stage.invalid,
      ...stage.duplicates.filter((_, i) => !includedDuplicates.has(i)).map((d) => ({ row: null, reason: d.reason })),
    ];
    setStage({ kind: 'importing' });
    const result = await importCompanies(toImport);
    if (!result) {
      setStage({ kind: 'error', message: t.importBtn.importFailedRetry });
      return;
    }
    setStage({ kind: 'done', importedCount: result.importedCount, rowErrors: [...skipped, ...result.rowErrors] });
  }

  function reset() {
    setStage({ kind: 'idle' });
    setIncludedDuplicates(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        onClick={() => downloadImportTemplate(locale)}
        style={{ ...outlineButtonStyle, background: '#fff', color: '#0f172a', fontWeight: 600 }}
      >
        {t.importBtn.template}
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{ ...outlineButtonStyle, background: '#fff', color: '#0f172a', fontWeight: 600 }}
      >
        {t.importBtn.importAction}
      </button>

      {stage.kind !== 'idle' && (
        <>
          <div onClick={stage.kind === 'importing' ? undefined : reset} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 60 }} />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 480,
              maxHeight: '80vh',
              overflow: 'auto',
              background: '#fff',
              borderRadius: 10,
              boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
              zIndex: 61,
              padding: 20,
            }}
          >
            {stage.kind === 'preview' && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{t.importBtn.previewHeading}</div>
                <div style={{ fontSize: 13, color: '#334155', marginBottom: 8 }}>{t.importBtn.rowsReadyToImport(stage.unique.length + includedDuplicates.size)}</div>
                {stage.duplicates.length > 0 && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>{t.importBtn.duplicatesFound(stage.duplicates.length)}</div>
                      <button
                        onClick={() =>
                          setIncludedDuplicates((set) =>
                            set.size === stage.duplicates.length ? new Set() : new Set(stage.duplicates.map((_, i) => i)),
                          )
                        }
                        style={{ border: 'none', background: 'none', color: '#92400e', fontSize: 11, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
                      >
                        {includedDuplicates.size === stage.duplicates.length ? t.importBtn.selectNoneDuplicates : t.importBtn.selectAllDuplicates}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflow: 'auto' }}>
                      {stage.duplicates.map((d, i) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: '#92400e', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={includedDuplicates.has(i)}
                            onChange={() => toggleDuplicate(i)}
                            style={{ marginTop: 2 }}
                          />
                          <span>
                            {d.reason} <em style={{ fontStyle: 'italic' }}>({t.importBtn.importAnyway})</em>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {stage.invalid.length > 0 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#991b1b', marginBottom: 6 }}>{t.importBtn.rowsWillBeSkipped(stage.invalid.length)}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflow: 'auto' }}>
                      {stage.invalid.map((e, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#b91c1c' }}>
                          {e.row != null ? t.importBtn.rowPrefix(e.row) : ''}
                          {e.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button
                    onClick={handleConfirm}
                    disabled={stage.unique.length + includedDuplicates.size === 0}
                    style={{ ...primaryButtonStyle, opacity: stage.unique.length + includedDuplicates.size === 0 ? 0.5 : 1 }}
                  >
                    {t.importBtn.importCount(stage.unique.length + includedDuplicates.size)}
                  </button>
                  <button onClick={reset} style={{ background: 'none', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
                    {t.importBtn.cancel}
                  </button>
                </div>
              </>
            )}

            {stage.kind === 'importing' && <div style={{ fontSize: 13, color: '#64748b' }}>{t.importBtn.importing}</div>}

            {stage.kind === 'done' && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{t.importBtn.completeHeading}</div>
                <div style={{ fontSize: 13, color: '#166534', marginBottom: 8 }}>{t.importBtn.importedCount(stage.importedCount)}</div>
                {stage.rowErrors.length > 0 && (
                  <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 8 }}>{t.importBtn.rowsSkippedNote(stage.rowErrors.length)}</div>
                )}
                <button onClick={reset} style={primaryButtonStyle}>
                  {t.importBtn.done}
                </button>
              </>
            )}

            {stage.kind === 'error' && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{t.importBtn.failedHeading}</div>
                <div style={{ fontSize: 13, color: '#b91c1c', marginBottom: 12 }}>{stage.message}</div>
                <button onClick={reset} style={primaryButtonStyle}>
                  {t.importBtn.close}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
