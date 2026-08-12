'use client';

import { useLocale } from '@/contexts/LocaleContext';
import { canonicalCountryName, resolveCountryCode, shortCountryCode } from '@/lib/countries';
import { translateOption } from '@/lib/i18n/option-labels';
import FlagIcon from './FlagIcon';

// Renders a company's raw stored `country` value as flag + canonical name, resolving legacy
// free-text variants ("Czech Republic", "Czechia", bare "CZ") onto one spelling without
// requiring the stored value itself to be rewritten — see lib/countries.ts. `compact` swaps
// the full name for a short alpha-3-style code (e.g. "CZE") and a smaller flag, for tight
// spaces like the company table's name column.
export default function CountryLabel({ country, compact }: { country: string; compact?: boolean }) {
  const { locale } = useLocale();
  if (!country) return null;
  const code = resolveCountryCode(country);
  const name = translateOption(canonicalCountryName(country), locale);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 3 : 5, whiteSpace: 'nowrap', fontSize: compact ? 11 : undefined, color: compact ? '#94a3b8' : undefined }}>
      {code && <FlagIcon code={code} title={name} style={compact ? { width: 14, height: 10 } : undefined} />}
      {compact ? (code ? shortCountryCode(code) : name) : name}
    </span>
  );
}
