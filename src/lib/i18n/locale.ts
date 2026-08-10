// Plain constants/types shared between server code (layout.tsx) and client code
// (LocaleContext.tsx). Deliberately NOT in LocaleContext.tsx itself: that file is
// 'use client', and a value imported from a 'use client' module into server code resolves to
// undefined at runtime (only component exports cross that boundary, not plain values).
export type Locale = 'en' | 'cs';
export const LOCALE_COOKIE = 'carrier-crm-locale';
