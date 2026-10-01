import type { HistoryRecord } from '@drawguess/shared';
import type { Room } from '../game/Room';
import { PlayerStatisticsModel } from '../models';
import { dbReady } from './db';

/** Updates persistent stats for logged-in users only (guests have no userId). */
export class StatsService {
  async recordGame(room: Room, rec: HistoryRecord): Promise<void> {
    if (!dbReady()) return;
    for (const p of room.players.values()) {
      if (!p.userId) continue;
      const entry = rec.finalScores.find((e) => e.playerId === p.id);
      if (!entry) continue;
      try {
        await PlayerStatisticsModel.findOneAndUpdate(
          { userId: p.userId },
          {
            $inc: {
              gamesPlayed: 1,
              gamesWon: entry.rank === 1 ? 1 : 0,
              correctGuesses: entry.correctGuesses,
              totalPoints: entry.score,
            },
          },
          { upsert: true },
        );
      } catch (err) {
        console.error('[stats] update failed:', (err as Error).message);
      }
    }
  }
}
