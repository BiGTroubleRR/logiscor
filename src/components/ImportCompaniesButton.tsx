'use client';

import { useRef, useState } from 'react';
import { useCrm } from '@/contexts/CrmContext';
import { outlineButtonStyle, primaryButtonStyle } from '@/lib/styles';
import { parseImportWorkbook } from '@/lib/company-import-parse';
import { validateImportRows, partitionDuplicateRows, type ImportedCompanyRow, type ImportRowError } from '@/lib/company-import';
import { downloadImportTemplate } from '@/lib/company-import-template';

type Stage =
  | { kind: 'idle' }
  | { kind: 'preview'; unique: ImportedCompanyRow[]; invalid: ImportRowError[]; duplicates: ImportRowError[] }
  | { kind: 'importing' }
  | { kind: 'done'; importedCount: number; rowErrors: ImportRowError[] }
  | { kind: 'error'; message: string };

export default function ImportCompaniesButton() {
  const { importCompanies, companies } = useCrm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });

  async function handleFile(file: File) {
    try {
      const raw = await parseImportWorkbook(file);
      if (raw.length === 0) {
        setStage({ kind: 'error', message: 'No data rows found in that file.' });
        return;
      }
      const { valid, errors } = validateImportRows(raw);
      const { unique, duplicates } = partitionDuplicateRows(valid, companies);
      setStage({ kind: 'preview', unique, invalid: errors, duplicates });
    } catch {
      setStage({ kind: 'error', message: 'Could not read that file — make sure it\'s a .xlsx built from the template.' });
    }
  }

  async function handleConfirm(unique: ImportedCompanyRow[], skipped: ImportRowError[]) {
    setStage({ kind: 'importing' });
    const result = await importCompanies(unique);
    if (!result) {
      setStage({ kind: 'error', message: 'Import failed — please try again.' });
      return;
    }
    setStage({ kind: 'done', importedCount: result.importedCount, rowErrors: [...skipped, ...result.rowErrors] });
  }

  function reset() {
    setStage({ kind: 'idle' });
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
        onClick={() => downloadImportTemplate()}
        style={{ ...outlineButtonStyle, background: '#fff', color: '#0f172a', fontWeight: 600 }}
      >
        ⬇ Template
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{ ...outlineButtonStyle, background: '#fff', color: '#0f172a', fontWeight: 600 }}
      >
        ⬆ Import
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
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Import preview</div>
                <div style={{ fontSize: 13, color: '#334155', marginBottom: 8 }}>
                  <strong>{stage.unique.length}</strong> {stage.unique.length === 1 ? 'row' : 'rows'} ready to import.
                </div>
                {stage.duplicates.length > 0 && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>
                      {stage.duplicates.length} likely {stage.duplicates.length === 1 ? 'duplicate' : 'duplicates'} excluded automatically:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflow: 'auto' }}>
                      {stage.duplicates.map((e, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#92400e' }}>
                          {e.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {stage.invalid.length > 0 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#991b1b', marginBottom: 6 }}>
                      {stage.invalid.length} {stage.invalid.length === 1 ? 'row' : 'rows'} will be skipped:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflow: 'auto' }}>
                      {stage.invalid.map((e, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#b91c1c' }}>
                          {e.row != null ? `Row ${e.row}: ` : ''}
                          {e.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button
                    onClick={() => handleConfirm(stage.unique, [...stage.invalid, ...stage.duplicates])}
                    disabled={stage.unique.length === 0}
                    style={{ ...primaryButtonStyle, opacity: stage.unique.length === 0 ? 0.5 : 1 }}
                  >
                    Import {stage.unique.length} {stage.unique.length === 1 ? 'company' : 'companies'}
                  </button>
                  <button onClick={reset} style={{ background: 'none', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </>
            )}

            {stage.kind === 'importing' && <div style={{ fontSize: 13, color: '#64748b' }}>Importing…</div>}

            {stage.kind === 'done' && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Import complete</div>
                <div style={{ fontSize: 13, color: '#166534', marginBottom: 8 }}>
                  Imported {stage.importedCount} {stage.importedCount === 1 ? 'company' : 'companies'}.
                </div>
                {stage.rowErrors.length > 0 && (
                  <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 8 }}>{stage.rowErrors.length} row(s) were skipped — see previous step for reasons.</div>
                )}
                <button onClick={reset} style={primaryButtonStyle}>
                  Done
                </button>
              </>
            )}

            {stage.kind === 'error' && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Import failed</div>
                <div style={{ fontSize: 13, color: '#b91c1c', marginBottom: 12 }}>{stage.message}</div>
                <button onClick={reset} style={primaryButtonStyle}>
                  Close
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
