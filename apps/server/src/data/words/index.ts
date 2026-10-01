import type { Category, LanguageCode } from '@drawguess/shared';
import de from './de';
import en from './en';
import es from './es';
import fr from './fr';
import hi from './hi';
import ja from './ja';
import pt from './pt';
import type { Difficulty, WordBankFile } from './types';

export type { Difficulty, WordBankFile } from './types';

/** Register a new language here after adding its word file. */
export const STATIC_WORDS: Record<LanguageCode, WordBankFile> = { en, es, fr, de, hi, pt, ja };

export interface WordEntry {
  text: string;
  category: Category;
  difficulty: Difficulty;
  language: LanguageCode;
}

export function flattenWordFile(language: LanguageCode, file: WordBankFile): WordEntry[] {
  const out: WordEntry[] = [];
  for (const [category, byDiff] of Object.entries(file) as [Category, WordBankFile[Category]][]) {
    for (const [difficulty, list] of Object.entries(byDiff) as [Difficulty, string[]][]) {
      for (const text of list) out.push({ text, category, difficulty, language });
    }
  }
  return out;
}
