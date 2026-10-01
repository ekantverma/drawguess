import { describe, expect, it } from 'vitest';
import { cleanCustomWord, cleanText, normalizeText } from './text';
import { settingsSchema, defaultSettings } from './schemas';

describe('text helpers', () => {
  it('normalises case, accents, punctuation and spacing', () => {
    expect(normalizeText('  Ice-Cream!  ')).toBe('ice cream');
    expect(normalizeText('CAFÉ')).toBe('cafe');
    expect(normalizeText("it's   a  CAT")).toBe('its a cat');
  });
  it('cleans control chars and angle brackets', () => {
    expect(cleanText('  a\u0000<b>  c ')).toBe('ab c');
  });
  it('validates custom words', () => {
    expect(cleanCustomWord('  Tiger shark ')).toBe('Tiger shark');
    expect(cleanCustomWord('a')).toBeNull();
    expect(cleanCustomWord('<script>')).toBe('script');
    expect(cleanCustomWord('12345')).toBeNull();
    expect(cleanCustomWord('one two three four')).toBeNull();
    expect(cleanCustomWord('rock; drop table')).toBeNull();
  });
});

describe('settingsSchema', () => {
  it('accepts defaults', () => {
    expect(
      settingsSchema.safeParse({ ...defaultSettings, categories: [], customWords: [] }).success,
    ).toBe(true);
  });
  it('rejects out-of-range values', () => {
    const bad = { ...defaultSettings, categories: [], customWords: [], rounds: 99 };
    expect(settingsSchema.safeParse(bad).success).toBe(false);
  });
  it('requires enough custom words in custom-only mode', () => {
    const s = { ...defaultSettings, categories: [], customWords: ['cat'], customWordsOnly: true };
    expect(settingsSchema.safeParse(s).success).toBe(false);
  });
  it('dedupes custom words', () => {
    const r = settingsSchema.parse({
      ...defaultSettings,
      categories: [],
      customWords: ['Cat', 'cat', 'Dog'],
    });
    expect(r.customWords).toEqual(['Cat', 'Dog']);
  });
});
