import { randomUUID } from 'node:crypto';
import type { ChatChannel, ChatKind, ChatMessage } from '@drawguess/shared';
import { GameError } from './errors';
import type { Player } from './Player';
import type { Room } from './Room';
import type { WordService } from './WordService';

/** Routes player text to the right place: guess, chat, guessers-only, spectators-only. */
export class ChatService {
  constructor(
    private room: Room,
    private words: WordService,
  ) {}

  private make(p: Player, text: string, kind: ChatKind, channel: ChatChannel): ChatMessage {
    return {
      id: randomUUID(),
      playerId: p.id,
      playerName: p.name,
      text,
      kind,
      channel,
      at: Date.now(),
    };
  }

  /** `guess` event. Falls back to plain chat when the player cannot guess right now. */
  guess(p: Player, text: string): void {
    const game = this.room.game;
    if (!game || game.phase !== 'DRAWING') return this.chat(p, text);
    const outcome = game.submitGuess(p, text);
    switch (outcome) {
      case 'correct':
        return; // Correct guesses are never echoed as text: the word stays secret.
      case 'close':
        this.room.pushChat(this.make(p, text, 'guess', 'all'));
        this.room.send(p, 'chat_message', {
          ...this.make(p, `"${text}" is very close!`, 'close', 'all'),
          playerName: 'System',
        });
        return;
      case 'wrong':
        this.room.send(p, 'guess_result', {
          correct: false,
          playerId: p.id,
          playerName: p.name,
          points: 0,
        });
        this.room.pushChat(this.make(p, text, 'guess', 'all'));
        return;
      case 'rejected':
        return this.chat(p, text);
    }
  }

  /** `chat` event. */
  chat(p: Player, text: string): void {
    const game = this.room.game;
    if (p.role === 'spectator') {
      this.room.pushChat(this.make(p, text, 'chat', 'spectators'));
      return;
    }
    if (game && game.phase === 'DRAWING') {
      const word = game.secretWord();
      const drawerId = game.turn?.drawerId;
      if (word && p.id === drawerId) {
        if (this.words.leaks(text, word)) {
          throw new GameError('WORD_LEAK', "You can't reveal the word while drawing");
        }
        this.room.pushChat(this.make(p, text, 'chat', 'all'));
        return;
      }
      if (word && p.id !== drawerId) {
        if (game.guessedIds().has(p.id)) {
          this.room.pushChat(this.make(p, text, 'chat', 'guessers'));
          return;
        }
        // A guesser typing in the chat box is still guessing; never leak the word as chat.
        if (this.words.matches(text, word) || this.words.leaks(text, word))
          return this.guess(p, text);
      }
    }
    this.room.pushChat(this.make(p, text, 'chat', 'all'));
  }
}
