import { describe, expect, it } from 'vitest';
import { canonicalCountryName, resolveCountryCode, shortCountryCode } from './countries';

describe('resolveCountryCode', () => {
  it('resolves a bare ISO alpha-2 code', () => {
    expect(resolveCountryCode('CZ')).toBe('CZ');
    expect(resolveCountryCode('cz')).toBe('CZ');
  });

  it('resolves legacy free-text spellings to the same code', () => {
    expect(resolveCountryCode('Czech Republic')).toBe('CZ');
    expect(resolveCountryCode('Czechia')).toBe('CZ');
    expect(resolveCountryCode('CZECHIA')).toBe('CZ');
  });

  it('resolves other known legacy aliases', () => {
    expect(resolveCountryCode('United Kingdom')).toBe('GB');
    expect(resolveCountryCode('United States')).toBe('US');
    expect(resolveCountryCode('North Macedonia')).toBe('MK');
  });

  it('returns null for values with no known mapping', () => {
    expect(resolveCountryCode('Unknown')).toBeNull();
    expect(resolveCountryCode('Europe (unspecified)')).toBeNull();
    expect(resolveCountryCode('')).toBeNull();
    expect(resolveCountryCode('   ')).toBeNull();
  });

  it('does not treat an unmapped two-letter string as a valid code', () => {
    expect(resolveCountryCode('ZZ')).toBeNull();
  });
});

describe('canonicalCountryName', () => {
  it('collapses legacy spellings onto one canonical name', () => {
    expect(canonicalCountryName('Czech Republic')).toBe(canonicalCountryName('Czechia'));
    expect(canonicalCountryName('Czech Republic')).toBe(canonicalCountryName('CZ'));
  });

  it('falls back to the raw value when unresolvable', () => {
    expect(canonicalCountryName('Unknown')).toBe('Unknown');
  });
});

describe('shortCountryCode', () => {
  it('returns the alpha-3 code for countries with an override', () => {
    expect(shortCountryCode('CZ')).toBe('CZE');
    expect(shortCountryCode('sk')).toBe('SVK');
  });

  it('falls back to the alpha-2 code (uppercased) for codes with no alpha-3 override', () => {
    expect(shortCountryCode('zz')).toBe('ZZ');
  });
});
