'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { en, type Dict } from '@/lib/i18n/en';
import { cs } from '@/lib/i18n/cs';
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/locale';

export type { Locale };
export { LOCALE_COOKIE };

const DICTS: Record<Locale, Dict> = { en, cs };

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

// Client-only preference, not URL-routed — this is an internal dashboard, not a
// multi-tenant/SEO site, so there's no need for locale-prefixed routes. Persisted in a cookie
// (not localStorage) so the server can read it too — layout.tsx passes it in as
// `initialLocale`, matching what the client renders on hydration and avoiding a
// server/client text mismatch.
export function LocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  function setLocale(l: Locale) {
    setLocaleState(l);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  }

  return <LocaleContext.Provider value={{ locale, setLocale, t: DICTS[locale] }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
