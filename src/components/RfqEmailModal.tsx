'use client';

import { useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { primaryButtonStyle, editInputStyle } from '@/lib/styles';
import { buildRfqSubject, buildRfqBody } from '@/lib/rfq-template';

type Recipient = { name: string; email: string };

// Reuses ImportCompaniesButton.tsx's exact modal-overlay pattern, at a z-index above
// CompanyDrawer's 2000 so it can open from within the drawer (single-company case) as well
// as from FilterBar (bulk case).
export default function RfqEmailModal({
  companies,
  onClose,
  originText,
  destText,
}: {
  companies: Recipient[];
  onClose: () => void;
  originText?: string;
  destText?: string;
}) {
  const { t } = useLocale();
  const [subject, setSubject] = useState(() => buildRfqSubject(t.rfq));
  const [body, setBody] = useState(() => buildRfqBody(t.rfq, { originText, destText }));

  const recipients = companies.filter((c) => c.email);

  function handleSend() {
    const mailtoHref = `mailto:${recipients.map((c) => encodeURIComponent(c.email)).join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.assign(mailtoHref);
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 2090 }} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(480px, calc(100vw - 32px))',
          maxHeight: '80vh',
          overflow: 'auto',
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          zIndex: 2100,
          padding: 20,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{t.rfq.modalTitle}</div>

        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{t.rfq.recipients}</div>
        <div style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
          {recipients.length > 0 ? recipients.map((c) => c.email).join(', ') : t.rfq.noEmailOnFile}
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{t.rfq.subjectLabel}</span>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} style={editInputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{t.rfq.bodyLabel}</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} style={{ ...editInputStyle, minHeight: 160, resize: 'vertical' }} />
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSend} disabled={recipients.length === 0} style={{ ...primaryButtonStyle, opacity: recipients.length === 0 ? 0.5 : 1 }}>
            {t.rfq.send}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
            {t.rfq.cancel}
          </button>
        </div>
      </div>
    </>
  );
}
