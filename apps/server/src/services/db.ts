import mongoose from 'mongoose';
import { env } from '../config/env';

let connecting: Promise<boolean> | null = null;

/** Connects if MONGODB_URI is set. The game still runs (memory only) without a database. */
export function connectDb(): Promise<boolean> {
  if (!env.MONGODB_URI) return Promise.resolve(false);
  connecting ??= mongoose
    .connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => true)
    .catch((err) => {
      console.error(
        '[db] MongoDB connection failed, continuing without persistence:',
        (err as Error).message,
      );
      return false;
    });
  return connecting;
}

export const dbReady = (): boolean => mongoose.connection.readyState === 1;
export async function closeDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
