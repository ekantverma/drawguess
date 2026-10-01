import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { PlayerStatisticsModel, UserModel } from '../models';
import { GameError } from '../game/errors';
import { dbReady } from './db';

export const registerSchema = z.object({
  username: z.string().trim().min(2).max(20),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8).max(100),
});
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(100),
});

export const COOKIE_NAME = 'dg_token';

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '7d' });
}
export function verifyToken(token: string | undefined): string | undefined {
  if (!token) return undefined;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub?: string };
    return payload.sub;
  } catch {
    return undefined;
  }
}

function requireDb(): void {
  if (!dbReady())
    throw new GameError('DB_UNAVAILABLE', 'Accounts need MongoDB. Set MONGODB_URI to enable them.');
}

export async function register(input: z.infer<typeof registerSchema>) {
  requireDb();
  if (await UserModel.findOne({ $or: [{ email: input.email }, { username: input.username }] })) {
    throw new GameError('TAKEN', 'That username or email is already registered');
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await UserModel.create({
    username: input.username,
    email: input.email,
    passwordHash,
  });
  return { id: String(user._id), username: user.username, email: user.email };
}

export async function login(input: z.infer<typeof loginSchema>) {
  requireDb();
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  // same message for unknown email and wrong password (no account enumeration)
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new GameError('BAD_CREDENTIALS', 'Incorrect email or password');
  }
  return { id: String(user._id), username: user.username, email: user.email };
}

export async function profile(userId: string) {
  requireDb();
  const user = await UserModel.findById(userId).lean();
  if (!user) return null;
  const stats = await PlayerStatisticsModel.findOne({ userId }).lean();
  return {
    id: String(user._id),
    username: user.username,
    email: user.email,
    stats: {
      gamesPlayed: stats?.gamesPlayed ?? 0,
      gamesWon: stats?.gamesWon ?? 0,
      correctGuesses: stats?.correctGuesses ?? 0,
      totalPoints: stats?.totalPoints ?? 0,
    },
  };
}
