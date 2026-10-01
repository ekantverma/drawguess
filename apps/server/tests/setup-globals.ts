import * as words from '../src/data/words';
(globalThis as unknown as { __words: unknown }).__words = words;
