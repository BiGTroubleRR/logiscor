import { describe, expect, it } from 'vitest';
import { extractLaneCodes } from './lane-codes';

describe('extractLaneCodes', () => {
  it('extracts codes from a hyphen-joined lane', () => {
    expect(extractLaneCodes('Lanes served: CZ-AT-IT-SI.')).toEqual(['CZ', 'AT', 'IT', 'SI']);
  });

  it('extracts codes from a comma-joined lane with spaces', () => {
    expect(extractLaneCodes('Serves DE, AT, HU routes.')).toEqual(['DE', 'AT', 'HU']);
  });

  it('requires at least two consecutive codes — a lone code in prose is not a lane', () => {
    expect(extractLaneCodes('We operate out of DE with a US office.')).toEqual([]);
  });

  it('drops tokens that are not valid ISO 3166-1 alpha-2 codes from an otherwise-valid group', () => {
    // "ZZ" is not a real ISO code — the surrounding valid codes are still kept.
    expect(extractLaneCodes('Route: CZ-ZZ-SK')).toEqual(['CZ', 'SK']);
  });

  it('deduplicates repeated codes across multiple groups', () => {
    expect(extractLaneCodes('CZ-AT-HU and again AT-HU-CZ')).toEqual(['CZ', 'AT', 'HU']);
  });

  it('returns an empty array when there is no lane-shaped text', () => {
    expect(extractLaneCodes('General freight forwarder, no lane info on file.')).toEqual([]);
  });

  it('ignores lowercase two-letter runs (the pattern requires uppercase)', () => {
    expect(extractLaneCodes('cz-at-hu should not match')).toEqual([]);
  });
});
