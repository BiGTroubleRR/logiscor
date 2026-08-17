import { describe, expect, it } from 'vitest';
import { activityTypeColor, flagEmoji, formatTag, normalizeUrl, tierColor, findSnippet, countryNameFromCode, typeColor } from './format';

describe('formatTag', () => {
  it('replaces underscores with spaces and title-cases each word', () => {
    expect(formatTag('road_freight')).toBe('Road Freight');
    expect(formatTag('adr')).toBe('Adr');
  });
});

describe('tierColor', () => {
  it('classifies unscored, weak, medium, and strong bands', () => {
    expect(tierColor(null).tierKey).toBe('unscored');
    expect(tierColor(undefined).tierKey).toBe('unscored');
    expect(tierColor(0).tierKey).toBe('weak');
    expect(tierColor(49).tierKey).toBe('weak');
    expect(tierColor(50).tierKey).toBe('medium');
    expect(tierColor(74).tierKey).toBe('medium');
    expect(tierColor(75).tierKey).toBe('strong');
    expect(tierColor(100).tierKey).toBe('strong');
  });
});

describe('typeColor / activityTypeColor', () => {
  it('returns a known color for recognized types and a fallback for unknown ones', () => {
    expect(typeColor('carrier')).toBe('#2563eb');
    expect(typeColor('nonsense')).toBe('#64748b');
    expect(activityTypeColor('Call')).toBe('#2563eb');
  });
});

describe('normalizeUrl', () => {
  it('leaves a URL with a scheme untouched', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('prepends https:// to a bare domain', () => {
    expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
  });
});

describe('flagEmoji', () => {
  it('builds the two-codepoint regional-indicator flag for a 2-letter code', () => {
    expect(flagEmoji('cz')).toBe('🇨🇿');
    expect(flagEmoji('US')).toBe('🇺🇸');
  });

  it('returns the input unchanged when it is not exactly 2 characters', () => {
    expect(flagEmoji('Unknown')).toBe('Unknown');
    expect(flagEmoji('C')).toBe('C');
  });
});

describe('countryNameFromCode', () => {
  it('applies the Turkey override instead of the newer CLDR "Türkiye" spelling', () => {
    expect(countryNameFromCode('TR')).toBe('Turkey');
    expect(countryNameFromCode('tr')).toBe('Turkey');
  });

  it('resolves a standard code via Intl.DisplayNames', () => {
    expect(countryNameFromCode('CZ')).toBe('Czechia');
    expect(countryNameFromCode('DE')).toBe('Germany');
  });
});

describe('findSnippet', () => {
  it('finds a case-insensitive match and splits it into before/match/after', () => {
    const result = findSnippet('The quick brown fox jumps', 'BROWN');
    expect(result).not.toBeNull();
    expect(result!.match).toBe('brown');
    expect(result!.before + result!.match + result!.after).toContain('brown');
  });

  it('returns null when the term is blank or not found', () => {
    expect(findSnippet('some text', '')).toBeNull();
    expect(findSnippet('some text', 'missing')).toBeNull();
    expect(findSnippet('', 'x')).toBeNull();
  });
});
