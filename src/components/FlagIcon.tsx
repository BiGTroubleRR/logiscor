'use client';

import type { CSSProperties, ComponentType } from 'react';
import * as Flags from 'country-flag-icons/react/3x2';

// Real per-country SVG flags rather than Unicode regional-indicator flag emoji (flagEmoji in
// lib/format.ts) — Windows browsers don't ship a color-emoji font that renders those as actual
// flags, so they fall back to showing the raw two-letter code as text instead of a flag.
const FLAG_COMPONENTS = Flags as unknown as Record<string, ComponentType<{ title?: string; style?: CSSProperties; className?: string }>>;

export default function FlagIcon({ code, title, style }: { code: string; title?: string; style?: CSSProperties }) {
  const Flag = FLAG_COMPONENTS[code.trim().toUpperCase()];
  if (!Flag) return <span style={style}>{code}</span>;
  return (
    <Flag
      title={title}
      style={{ width: 18, height: 13, borderRadius: 2, verticalAlign: 'middle', boxShadow: '0 0 0 1px rgba(0,0,0,0.12)', flex: '0 0 auto', ...style }}
    />
  );
}
