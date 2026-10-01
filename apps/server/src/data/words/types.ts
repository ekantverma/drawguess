import type { Category } from '@drawguess/shared';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type WordBankFile = Record<Category, Record<Difficulty, string[]>>;
