import { describe, expect, it } from 'vitest';
import { mergeCountriesServed } from './countries-served';

describe('mergeCountriesServed', () => {
  it('returns the existing list unchanged when everything to add is null/blank', () => {
    expect(mergeCountriesServed(['CZ', 'SK'], [null, undefined, ''])).toEqual(['CZ', 'SK']);
  });

  it('appends a genuinely new code after the existing ones', () => {
    expect(mergeCountriesServed(['CZ'], ['BE'])).toEqual(['CZ', 'BE']);
  });

  it('does not duplicate a code already present in existing', () => {
    expect(mergeCountriesServed(['CZ', 'BE'], ['CZ'])).toEqual(['CZ', 'BE']);
  });

  it('does not duplicate a code repeated within toAdd itself', () => {
    expect(mergeCountriesServed(['CZ'], ['BE', 'BE'])).toEqual(['CZ', 'BE']);
  });

  it('normalizes lowercase/mixed-case input to uppercase', () => {
    expect(mergeCountriesServed(['CZ'], ['be'])).toEqual(['CZ', 'BE']);
  });

  it('adds both a new origin and destination code from one rate quote', () => {
    expect(mergeCountriesServed([], ['cz', 'be'])).toEqual(['CZ', 'BE']);
  });
});
