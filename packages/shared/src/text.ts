import { LIMITS } from './constants';

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g;

/** Strip control/bidi chars and angle brackets, collapse whitespace, trim. */
export function cleanText(input: string): string {
  return input.replace(CONTROL, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
}

const CUSTOM_WORD_RE = /^[\p{L}\p{N}][\p{L}\p{N} '-]*[\p{L}\p{N}]$/u;

/** Returns a cleaned custom word or null if invalid. */
export function cleanCustomWord(input: string): string | null {
  const w = cleanText(input);
  const { min, max } = LIMITS.customWordLength;
  if (w.length < min || w.length > max) return null;
  if (!CUSTOM_WORD_RE.test(w)) return null;
  if (w.split(' ').length > 3) return null;
  if (!/\p{L}/u.test(w)) return null;
  return w;
}

/** Guess/word normalisation. Exact-equality on this form is the match rule. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
