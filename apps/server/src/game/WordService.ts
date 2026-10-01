import { normalizeText, type RoomSettings } from '@drawguess/shared';
import { STATIC_WORDS, flattenWordFile, type WordEntry } from '../data/words';

/** In-memory word cache. Loaded from MongoDB when available, else from bundled files. */
export class WordBank {
  private lists = new Map<string, WordEntry[]>();

  loadStatic(): void {
    for (const [lang, file] of Object.entries(STATIC_WORDS)) {
      this.lists.set(lang, flattenWordFile(lang, file));
    }
  }

  setList(language: string, entries: WordEntry[]): void {
    if (entries.length) this.lists.set(language, entries);
  }

  list(language: string): WordEntry[] {
    return this.lists.get(language) ?? this.lists.get('en') ?? [];
  }

  languages(): string[] {
    return [...this.lists.keys()];
  }
}

export class WordService {
  constructor(
    private bank: WordBank,
    private rng: () => number = Math.random,
  ) {}

  static normalize = normalizeText;

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(this.rng() * arr.length)];
  }

  /** Distinct word choices for the drawer. Prefers words not yet used this game. */
  choices(settings: RoomSettings, count: number, used: Set<string>): string[] {
    const custom = settings.customWords;
    const builtin = settings.customWordsOnly
      ? []
      : this.bank
          .list(settings.language)
          .filter(
            (w) => settings.categories.length === 0 || settings.categories.includes(w.category),
          )
          .map((w) => w.text);
    const pool = [...builtin, ...custom];
    if (pool.length === 0) return [];

    const combo = settings.wordMode === 'combination' && pool.length >= 2;
    const out: string[] = [];
    const seen = new Set<string>();
    const tryAdd = (text: string, allowUsed: boolean): void => {
      const n = normalizeText(text);
      if (seen.has(n) || (!allowUsed && used.has(n))) return;
      seen.add(n);
      out.push(text);
    };
    const draw = (): string => {
      const fromCustom = custom.length > 0 && builtin.length > 0 && this.rng() < 0.5;
      const src = fromCustom ? custom : pool;
      if (!combo) return this.pick(src);
      const a = this.pick(src);
      let b = this.pick(pool);
      for (let i = 0; i < 10 && normalizeText(b) === normalizeText(a); i++) b = this.pick(pool);
      return `${a} ${b}`;
    };
    for (let attempt = 0; attempt < 300 && out.length < count; attempt++) tryAdd(draw(), false);
    for (let attempt = 0; attempt < 300 && out.length < count; attempt++) tryAdd(draw(), true);
    return out;
  }

  static letterIndices(word: string): number[] {
    const idx: number[] = [];
    WordService.units(word).forEach((unit, i) => {
      if (/[\p{L}\p{N}]/u.test(unit)) idx.push(i);
    });
    return idx;
  }

  private static units(word: string): string[] {
    const units: string[] = [];
    for (const char of word) {
      if (/\p{M}/u.test(char) && units.length) units[units.length - 1] += char;
      else units.push(char);
    }
    return units;
  }

  /** "_ _ a _ _" style mask encoded as a string of the same length. Hidden mode => "". */
  mask(word: string, revealed: Set<number>, mode: RoomSettings['wordMode']): string {
    if (mode === 'hidden') return '';
    return WordService.units(word)
      .map((unit, i) => (/^[\p{L}\p{N}]/u.test(unit) ? (revealed.has(i) ? unit : '_') : unit))
      .join('');
  }

  /** Pick a not-yet-revealed letter. Never reveals the last hidden letter. */
  nextHintIndex(word: string, revealed: Set<number>): number | null {
    const letters = WordService.letterIndices(word);
    const hidden = letters.filter((i) => !revealed.has(i));
    if (hidden.length <= 1) return null;
    return this.pick(hidden);
  }

  /** Exact match after normalisation (case, accents, punctuation, spacing). No partial matches. */
  matches(guess: string, word: string): boolean {
    const g = normalizeText(guess);
    return g.length > 0 && g === normalizeText(word);
  }

  /** Edit distance 1 on words of 5+ letters => private "so close" nudge, never points. */
  isClose(guess: string, word: string): boolean {
    const g = normalizeText(guess);
    const w = normalizeText(word);
    if (w.length < 5 || g === w || Math.abs(g.length - w.length) > 1) return false;
    return levenshtein(g, w) === 1;
  }

  /** True if text contains the secret word (used to stop the drawer leaking it in chat). */
  leaks(text: string, word: string): boolean {
    const w = normalizeText(word).replace(/ /g, '');
    if (!w) return false;
    return normalizeText(text).replace(/ /g, '').includes(w);
  }
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}
