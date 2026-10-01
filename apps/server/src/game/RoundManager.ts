import type { Stroke } from '@drawguess/shared';

export interface TurnState {
  /** globally increasing id; async callbacks compare against it to detect staleness */
  turnId: number;
  index: number;
  round: number;
  drawerId: string;
  options: string[];
  word: string | null;
  revealed: Set<number>;
  /** playerId -> points earned for their correct guess */
  guessed: Map<string, number>;
  guessOrder: string[];
  gains: Map<string, number>;
  strokes: Stroke[];
  live: Stroke | null;
  startedAt: number | null;
}

/** Owns turn order: a "round" = every player draws once. Total turns = rounds x players. */
export class RoundManager {
  turnIndex = -1;
  turn: TurnState | null = null;
  private nextTurnId = 1;

  constructor(
    readonly order: string[],
    readonly rounds: number,
  ) {}

  get totalTurns(): number {
    return this.order.length * this.rounds;
  }

  roundOf(index: number): number {
    return Math.floor(index / this.order.length) + 1;
  }

  /** Advance to the next eligible drawer. Returns null when the game is finished. */
  advance(isEligible: (playerId: string) => boolean): TurnState | null {
    while (++this.turnIndex < this.totalTurns) {
      const drawerId = this.order[this.turnIndex % this.order.length];
      if (!isEligible(drawerId)) continue;
      this.turn = {
        turnId: this.nextTurnId++,
        index: this.turnIndex,
        round: this.roundOf(this.turnIndex),
        drawerId,
        options: [],
        word: null,
        revealed: new Set(),
        guessed: new Map(),
        guessOrder: [],
        gains: new Map(),
        strokes: [],
        live: null,
        startedAt: null,
      };
      return this.turn;
    }
    return null;
  }
}
