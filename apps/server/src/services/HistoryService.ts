import type { HistoryRecord } from '@drawguess/shared';
import { GameHistoryModel } from '../models';
import { dbReady } from './db';

/** Game history: always kept in a small in-memory ring, persisted to MongoDB when connected. */
export class HistoryService {
  private memory: HistoryRecord[] = [];
  constructor(private memoryLimit = 50) {}

  async record(rec: HistoryRecord): Promise<void> {
    this.memory.unshift(rec);
    if (this.memory.length > this.memoryLimit) this.memory.length = this.memoryLimit;
    if (!dbReady()) return;
    try {
      await GameHistoryModel.create({ ...rec, recordId: rec.id, endedAt: new Date(rec.endedAt) });
    } catch (err) {
      console.error('[history] failed to persist game:', (err as Error).message);
    }
  }

  async recent(limit = 20): Promise<HistoryRecord[]> {
    if (dbReady()) {
      const docs = await GameHistoryModel.find().sort({ createdAt: -1 }).limit(limit).lean();
      return docs.map(toRecord);
    }
    return this.memory.slice(0, limit);
  }

  async byId(id: string): Promise<HistoryRecord | null> {
    if (dbReady()) {
      const d = await GameHistoryModel.findOne({ recordId: id }).lean();
      return d ? toRecord(d) : null;
    }
    return this.memory.find((r) => r.id === id) ?? null;
  }
}

function toRecord(d: Record<string, unknown>): HistoryRecord {
  return {
    id: d.recordId as string,
    roomCode: d.roomCode as string,
    roomName: d.roomName as string,
    participants: d.participants as HistoryRecord['participants'],
    winner: (d.winner as HistoryRecord['winner']) ?? null,
    finalScores: d.finalScores as HistoryRecord['finalScores'],
    turns: d.turns as HistoryRecord['turns'],
    roundsPlayed: d.roundsPlayed as number,
    durationMs: d.durationMs as number,
    endedAt: new Date(d.endedAt as Date).toISOString(),
  };
}
