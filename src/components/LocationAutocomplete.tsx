'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { debounce } from '@/lib/debounce';
import { ISO_3166_1_ALPHA_2_CODES } from '@/lib/lane-codes';

export type LocationSuggestion = {
  label: string;
  lat: number;
  lng: number;
  // Uppercase ISO 3166-1 alpha-2, or null if Photon didn't return a recognized one.
  countryCode: string | null;
};

type LocationAutocompleteProps = {
  value: string;
  onChange: (text: string) => void;
  // Optional — a plain typing aid (e.g. RouteSearchBar) doesn't need to react to a pick.
  onSelect?: (suggestion: LocationSuggestion) => void;
  placeholder?: string;
  inputStyle?: CSSProperties;
};

const ALPHA_2_SET = new Set(ISO_3166_1_ALPHA_2_CODES);
const MIN_QUERY_LENGTH = 3;

function parsePhotonFeature(f: { geometry: { coordinates: [number, number] }; properties?: Record<string, unknown> }): LocationSuggestion {
  const [lng, lat] = f.geometry.coordinates;
  const p = f.properties ?? {};
  const label = [p.name, p.city, p.state, p.country].filter((v): v is string => typeof v === 'string' && v.length > 0).join(', ');
  const rawCc = typeof p.countrycode === 'string' ? p.countrycode.toUpperCase() : null;
  const countryCode = rawCc && ALPHA_2_SET.has(rawCc) ? rawCc : null;
  return { label: label || String(p.name ?? ''), lat, lng, countryCode };
}

export default function LocationAutocomplete({ value, onChange, onSelect, placeholder, inputStyle }: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Guards against a slow response to an earlier keystroke overwriting a faster response to a
  // later one — no AbortController (nothing else in this codebase uses one, e.g. fetchDirections
  // in CrmContext.tsx), just discard the response if a newer request has since been fired.
  const latestRequestId = useRef(0);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Built inside an effect (runs after render), not during render itself — the debounced
  // closure reads latestRequestId.current only once actually invoked, but constructing it
  // during render would still trip the "refs read during render" lint rule since the
  // closure's ref access is visible to that static check regardless of when it runs.
  const fetcherRef = useRef<((query: string) => void) | null>(null);
  useEffect(() => {
    fetcherRef.current = debounce((query: string) => {
      const id = ++latestRequestId.current;
      fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`)
        .then((r) => r.json())
        .then((j) => {
          if (id !== latestRequestId.current) return;
          const features = Array.isArray(j.features) ? j.features : [];
          setSuggestions(features.map(parsePhotonFeature));
          setOpen(true);
        })
        .catch(() => {
          if (id !== latestRequestId.current) return;
          setSuggestions([]);
        });
    }, 350);
  }, []);

  function handleChange(text: string) {
    onChange(text);
    if (text.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    fetcherRef.current?.(text);
  }

  function handleSelect(s: LocationSuggestion) {
    onChange(s.label);
    onSelect?.(s);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            zIndex: 50,
            maxHeight: 220,
            overflow: 'auto',
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={`${s.label}-${i}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '8px 10px', fontSize: 13, color: '#334155', cursor: 'pointer' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
