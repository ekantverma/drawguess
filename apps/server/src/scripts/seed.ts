import { closeDb, connectDb, dbReady } from '../services/db';
import { seedWords } from '../services/WordRepository';

const ok = await connectDb();
if (!ok || !dbReady()) {
  console.error('Could not connect to MongoDB. Set MONGODB_URI in apps/server/.env first.');
  process.exit(1);
}
const inserted = await seedWords();
console.log(`Seed complete. Inserted ${inserted} new words (existing words untouched).`);
await closeDb();
