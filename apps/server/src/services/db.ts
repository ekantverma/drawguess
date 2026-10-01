import mongoose from 'mongoose';
import { env } from '../config/env';

let connecting: Promise<boolean> | null = null;

/** Connects if MONGODB_URI is set. The game still runs (memory only) without a database. */
export function connectDb(): Promise<boolean> {
  if (!env.MONGODB_URI) {
    console.warn('[db] MONGODB_URI is not configured. Continuing in memory-only mode.');
    return Promise.resolve(false);
  }

  console.info('[db] MongoDB connection configured. Connecting...');

  connecting ??= mongoose
    .connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
      console.info('[db] MongoDB connected successfully.');
      console.info(`[db] Connected database: ${mongoose.connection.name}`);
      return true;
    })
    .catch((err) => {
      console.error(
        '[db] MongoDB connection failed, continuing without persistence:',
        (err as Error).message,
      );
      connecting = null;
      return false;
    });

  return connecting;
}

export const dbReady = (): boolean => mongoose.connection.readyState === 1;

export async function closeDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.info('[db] MongoDB disconnected.');
  }
}