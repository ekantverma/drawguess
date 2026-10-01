/**
 * MongoDB integration tests. They are SKIPPED unless MONGODB_TEST_URI is set, e.g.
 *   MONGODB_TEST_URI=mongodb://127.0.0.1:27017/drawguess_test npm test -w @drawguess/server
 * WARNING: the target database is dropped at the end of the run - use a throwaway database.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const URI = process.env.MONGODB_TEST_URI;

describe.skipIf(!URI)('MongoDB integration', () => {
  let db: typeof import('../src/services/db');
  let repo: typeof import('../src/services/WordRepository');
  let auth: typeof import('../src/services/AuthService');
  let mongoose: typeof import('mongoose').default;

  beforeAll(async () => {
    process.env.MONGODB_URI = URI; // must be set before config/env is first imported
    db = await import('../src/services/db');
    repo = await import('../src/services/WordRepository');
    auth = await import('../src/services/AuthService');
    mongoose = (await import('mongoose')).default;
    expect(await db.connectDb()).toBe(true);
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await db.closeDb();
  });

  it('seeds words idempotently and loads them into the word bank', async () => {
    const first = await repo.seedWords();
    expect(first).toBeGreaterThan(500);
    expect(await repo.seedWords()).toBe(0);
    const { WordBank } = await import('../src/game/WordService');
    const bank = new WordBank();
    expect(await repo.loadWordBank(bank)).toBe('mongodb');
    expect(bank.list('es').length).toBeGreaterThan(100);
    expect(bank.list('en').some((w) => w.language !== 'en')).toBe(false);
  });

  it('persists and reads back game history', async () => {
    const { HistoryService } = await import('../src/services/HistoryService');
    const h = new HistoryService();
    const rec = {
      id: 'test-game-1',
      roomCode: 'ABC123',
      roomName: 'DB Room',
      participants: [{ name: 'A', avatar: { color: 1, eyes: 1, mouth: 1, hat: 1 } }],
      winner: { name: 'A', score: 500 },
      finalScores: [],
      turns: [],
      roundsPlayed: 2,
      durationMs: 1234,
      endedAt: new Date().toISOString(),
    };
    await h.record(rec);
    expect((await h.byId('test-game-1'))?.roomName).toBe('DB Room');
    expect((await h.recent(5)).some((g) => g.id === 'test-game-1')).toBe(true);
  });

  it('registers, logs in (bcrypt), rejects bad credentials and duplicates', async () => {
    const u = await auth.register({
      username: 'dbtester',
      email: 'db@test.dev',
      password: 'correct-horse-1',
    });
    expect(u.username).toBe('dbtester');
    await expect(
      auth.register({ username: 'dbtester', email: 'other@test.dev', password: 'correct-horse-1' }),
    ).rejects.toThrow(/already/);
    expect((await auth.login({ email: 'db@test.dev', password: 'correct-horse-1' })).id).toBe(u.id);
    await expect(auth.login({ email: 'db@test.dev', password: 'wrong-password' })).rejects.toThrow(
      /Incorrect/,
    );
    expect(auth.verifyToken(auth.signToken(u.id))).toBe(u.id);
    expect(auth.verifyToken('garbage')).toBeUndefined();
    const { UserModel } = await import('../src/models');
    const raw = await UserModel.findById(u.id).select('+passwordHash').lean();
    expect(raw?.passwordHash).not.toContain('correct-horse'); // hashed, never stored in clear
  });

  it('updates player statistics for logged-in users only', async () => {
    const { StatsService } = await import('../src/services/StatsService');
    const { PlayerStatisticsModel } = await import('../src/models');
    const u = await auth.login({ email: 'db@test.dev', password: 'correct-horse-1' });
    const room = {
      players: new Map([
        ['p1', { userId: u.id }],
        ['p2', {}],
      ]),
    } as never;
    const rec = {
      id: 'x',
      roomCode: 'A',
      roomName: 'A',
      participants: [],
      winner: null,
      turns: [],
      roundsPlayed: 1,
      durationMs: 1,
      endedAt: new Date().toISOString(),
      finalScores: [
        {
          playerId: 'p1',
          name: 'A',
          avatar: { color: 0, eyes: 0, mouth: 0, hat: 0 },
          score: 700,
          correctGuesses: 3,
          rank: 1,
          left: false,
        },
        {
          playerId: 'p2',
          name: 'G',
          avatar: { color: 0, eyes: 0, mouth: 0, hat: 0 },
          score: 100,
          correctGuesses: 1,
          rank: 2,
          left: false,
        },
      ],
    };
    await new StatsService().recordGame(room, rec);
    const s = await PlayerStatisticsModel.findOne({ userId: u.id }).lean();
    expect(s).toMatchObject({ gamesPlayed: 1, gamesWon: 1, correctGuesses: 3, totalPoints: 700 });
    expect(await PlayerStatisticsModel.countDocuments()).toBe(1);
  });
});
