import { SCORING, type AvatarConfig, type LeaderboardEntry } from '@drawguess/shared';

interface Entry {
  playerId: string;
  name: string;
  avatar: AvatarConfig;
  score: number;
  correctGuesses: number;
  left: boolean;
}

/** Pure server-side scoring. All numbers come from SCORING constants. */
export class ScoreManager {
  private entries = new Map<string, Entry>();

  register(p: { id: string; name: string; avatar: AvatarConfig }): void {
    if (!this.entries.has(p.id)) {
      this.entries.set(p.id, {
        playerId: p.id,
        name: p.name,
        avatar: p.avatar,
        score: 0,
        correctGuesses: 0,
        left: false,
      });
    }
  }

  static orderMultiplier(order: number): number {
    return Math.max(SCORING.minMultiplier, 1 - SCORING.orderStep * (order - 1));
  }

  /** timeLeft/total in seconds, order is 1-based position among correct guessers. */
  guesserPoints(timeLeft: number, total: number, order: number): number {
    const ratio = total > 0 ? Math.min(1, Math.max(0, timeLeft / total)) : 0;
    return Math.round((SCORING.base + SCORING.speed * ratio) * ScoreManager.orderMultiplier(order));
  }

  drawerPoints(guesserCount: number): number {
    return Math.round(SCORING.drawerBase + SCORING.drawerPool / Math.max(1, guesserCount));
  }

  award(playerId: string, points: number, correctGuess = false): void {
    const e = this.entries.get(playerId);
    if (!e || points <= 0) return;
    e.score += points;
    if (correctGuess) e.correctGuesses += 1;
  }

  markLeft(playerId: string): void {
    const e = this.entries.get(playerId);
    if (e) e.left = true;
  }

  scoreOf(playerId: string): number {
    return this.entries.get(playerId)?.score ?? 0;
  }

  correctOf(playerId: string): number {
    return this.entries.get(playerId)?.correctGuesses ?? 0;
  }

  leaderboard(): LeaderboardEntry[] {
    const sorted = [...this.entries.values()].sort(
      (a, b) =>
        b.score - a.score || b.correctGuesses - a.correctGuesses || a.name.localeCompare(b.name),
    );
    let rank = 0;
    let prev: Entry | null = null;
    return sorted.map((e, i) => {
      if (!prev || e.score !== prev.score) rank = i + 1; // ties share a rank
      prev = e;
      return { ...e, rank };
    });
  }
}

/** A winner exists only if exactly one player holds rank 1 AND has scored. Otherwise: tie / no winner (null). */
export function pickWinner(board: LeaderboardEntry[]): LeaderboardEntry | null {
  const top = board.filter((e) => e.rank === 1);
  return top.length === 1 && top[0].score > 0 ? top[0] : null;
}
