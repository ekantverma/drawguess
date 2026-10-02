export const LIMITS = {
  maxPlayers: { min: 2, max: 20 },
  rounds: { min: 2, max: 10 },
  drawTime: { min: 15, max: 240 },
  wordCount: { min: 1, max: 5 },
  hints: { min: 0, max: 5 },
  roomName: { min: 2, max: 32 },
  playerName: { min: 2, max: 20 },
  chatLength: 200,
  customWords: 100,
  customWordLength: { min: 2, max: 30 },
  maxSpectators: 30,
  roomCodeLength: 6,
  reportDetails: 200,
} as const;

export const PHASES = ['LOBBY', 'WORD_SELECTION', 'DRAWING', 'ROUND_END', 'GAME_OVER'] as const;
export const WORD_MODES = ['normal', 'hidden', 'combination'] as const;
export const CATEGORIES = [
  'animals',
  'food',
  'objects',
  'nature',
  'technology',
  'sports',
  'places',
  'actions',
] as const;

/** Adding a language = add it here + add a word file in apps/server/src/data/words/. */
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語' },
] as const;
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as unknown as readonly [
  'en',
  ...string[],
];

export const LANGUAGE_ALIASES: Record<string, string> = {
  en: 'en',
  english: 'en',
  es: 'es',
  spanish: 'es',
  espanol: 'es',
  español: 'es',
  fr: 'fr',
  french: 'fr',
  francais: 'fr',
  français: 'fr',
  de: 'de',
  german: 'de',
  deutsch: 'de',
  hi: 'hi',
  hindi: 'hi',
  हिन्दी: 'hi',
  हिंदी: 'hi',
  pt: 'pt',
  portuguese: 'pt',
  portugues: 'pt',
  português: 'pt',
  ja: 'ja',
  japanese: 'ja',
  nihongo: 'ja',
  '日本語': 'ja',
};

export function normalizeLanguageCode(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return 'en';
  const key = raw.toLowerCase();
  return LANGUAGE_ALIASES[key] ?? raw.toLowerCase();
}

export const AVATAR_LIMITS = { color: 12, eyes: 6, mouth: 6, hat: 6 } as const;

export const REPORT_REASONS = ['cheating', 'offensive', 'spam', 'griefing', 'other'] as const;

/** Server-authoritative timings (seconds). */
export const TIMING = {
  wordSelectSec: 15,
  roundEndSec: 6,
  drawerGraceSec: 10,
  reconnectGraceSec: 30,
  emptyRoomTtlSec: 300,
  votekickTtlSec: 60,
} as const;

/**
 * Scoring (documented in README):
 *   guesser = round((BASE + SPEED * t/T) * orderMultiplier(n))
 *   orderMultiplier(n) = max(MIN_MULT, 1 - STEP * (n-1))
 *   drawer  = round(DRAWER_BASE + DRAWER_POOL / N)   per correct guess
 */
export const SCORING = {
  base: 100,
  speed: 400,
  orderStep: 0.1,
  minMultiplier: 0.5,
  drawerBase: 50,
  drawerPool: 100,
} as const;

export const CANVAS = {
  /** Virtual stage size. Points are transmitted normalised to 0..1 of this. */
  width: 800,
  height: 600,
  maxPointsPerStroke: 6000,
  maxStrokesPerTurn: 400,
  colors: [
    '#1b1b3a',
    '#6b7280',
    '#ffffff',
    '#ef4444',
    '#f97316',
    '#facc15',
    '#22c55e',
    '#14b8a6',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#92400e',
  ],
  sizes: [3, 6, 12, 22],
} as const;
