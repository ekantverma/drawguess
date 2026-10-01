import type { Category } from '@drawguess/shared';
import { flattenWordFile, STATIC_WORDS, type WordEntry } from '../data/words';
import { WordModel } from '../models';
import type { WordBank } from '../game/WordService';
import { dbReady } from './db';

/** Seeds MongoDB from the bundled word files (idempotent upsert). */
export async function seedWords(): Promise<number> {
  const ops = Object.entries(STATIC_WORDS).flatMap(([lang, file]) =>
    flattenWordFile(lang, file).map((w) => ({
      updateOne: {
        filter: { text: w.text, language: w.language },
        update: { $setOnInsert: { ...w, enabled: true } },
        upsert: true,
      },
    })),
  );
  const res = await WordModel.bulkWrite(ops);
  return res.upsertedCount;
}

/** Fill the in-memory bank: static files first, then override each language that exists in MongoDB. */
export async function loadWordBank(bank: WordBank): Promise<'mongodb' | 'static'> {
  bank.loadStatic();
  if (!dbReady()) return 'static';
  const docs = await WordModel.find({ enabled: true }).lean();
  const byLang = new Map<string, WordEntry[]>();
  for (const d of docs) {
    const arr = byLang.get(d.language) ?? [];
    arr.push({
      text: d.text,
      category: d.category as Category,
      difficulty: d.difficulty as WordEntry['difficulty'],
      language: d.language,
    });
    byLang.set(d.language, arr);
  }
  for (const [lang, list] of byLang) bank.setList(lang, list);
  return byLang.size ? 'mongodb' : 'static';
}
