import { env } from './config/env';
import { createApp } from './app';
import { closeDb, connectDb } from './services/db';
import { loadWordBank } from './services/WordRepository';

const ctx = createApp();

const dbOk = await connectDb();
const source = await loadWordBank(ctx.bank);

ctx.httpServer.listen(env.PORT, () => {
  console.log(`[server] listening on :${env.PORT} (${env.NODE_ENV})`);
  console.log(`[server] CORS origins: ${env.clientOrigins.join(', ')}`);
  console.log(
    `[server] database: ${dbOk ? 'MongoDB connected' : 'disabled (in-memory only)'} | words: ${source}`,
  );
});

let closing = false;
async function stop(signal: string): Promise<void> {
  if (closing) return;
  closing = true;
  console.log(`[server] ${signal} received, shutting down…`);
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  await ctx.shutdown();
  await new Promise<void>((r) => ctx.httpServer.close(() => r()));
  await closeDb();
  process.exit(0);
}
process.on('SIGTERM', () => void stop('SIGTERM'));
process.on('SIGINT', () => void stop('SIGINT'));
