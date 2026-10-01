import { defaultSettings, settingsSchema, type RoomSettings } from '@drawguess/shared';
import { ChatService } from '../src/game/ChatService';
import type { Payload, Transport } from '../src/game/Transport';
import { RoomRegistry } from '../src/game/RoomRegistry';
import { WordBank, WordService } from '../src/game/WordService';
import type { Room } from '../src/game/Room';
import type { Player } from '../src/game/Player';
import type { ServerToClientEvents } from '@drawguess/shared';

export interface Logged {
  to: string; // socketId or "room:CODE"
  except?: string | null;
  event: string;
  payload: unknown;
}

export class FakeTransport implements Transport {
  log: Logged[] = [];
  joined = new Map<string, Set<string>>();
  emitToSocket<E extends keyof ServerToClientEvents>(
    socketId: string,
    event: E,
    payload: Payload<E>,
  ) {
    this.log.push({ to: socketId, event, payload });
  }
  emitToRoom<E extends keyof ServerToClientEvents>(code: string, event: E, payload: Payload<E>) {
    this.log.push({ to: `room:${code}`, event, payload });
  }
  emitToRoomExcept<E extends keyof ServerToClientEvents>(
    code: string,
    except: string | null,
    event: E,
    payload: Payload<E>,
  ) {
    this.log.push({ to: `room:${code}`, except, event, payload });
  }
  join(socketId: string, code: string) {
    if (!this.joined.has(code)) this.joined.set(code, new Set());
    this.joined.get(code)!.add(socketId);
  }
  leave(socketId: string, code: string) {
    this.joined.get(code)?.delete(socketId);
  }
  events(name: string) {
    return this.log.filter((l) => l.event === name);
  }
}

export function makeSettings(over: Partial<RoomSettings> = {}): RoomSettings {
  return settingsSchema.parse({
    ...defaultSettings,
    categories: [],
    customWords: [],
    roomName: 'Test Room',
    drawTime: 60,
    rounds: 2,
    hints: 2,
    ...over,
  });
}

export const AVATAR = { color: 0, eyes: 0, mouth: 0, hat: 0 };

export function setup(over: Partial<RoomSettings> = {}, rng: () => number = Math.random) {
  const transport = new FakeTransport();
  const bank = new WordBank();
  bank.loadStatic();
  const words = new WordService(bank, rng);
  const finished: unknown[] = [];
  const registry = new RoomRegistry({ transport, words, onGameFinished: (r) => finished.push(r) });
  const room = registry.create(makeSettings(over));
  const chat = new ChatService(room, words);
  let n = 0;
  const add = (name: string, opts: { spectate?: boolean; token?: string } = {}): Player => {
    const { player } = room.join({
      name,
      avatar: AVATAR,
      socketId: `sock-${name}-${n++}`,
      ip: `10.0.0.${n}`,
      ...opts,
    });
    return player;
  };
  return { transport, words, registry, room, chat, add, finished };
}

export function drawerOf(room: Room): Player {
  return room.players.get(room.game!.turn!.drawerId)!;
}
