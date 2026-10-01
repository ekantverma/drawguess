import { randomInt } from 'node:crypto';
import {
  LIMITS,
  TIMING,
  type PublicRoomInfo,
  type RoomLookup,
  type RoomSettings,
} from '@drawguess/shared';
import { Room, type RoomDeps } from './Room';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

export class RoomRegistry {
  private rooms = new Map<string, Room>();
  private sweeper?: ReturnType<typeof setInterval>;

  constructor(private deps: RoomDeps) {}

  private generateCode(): string {
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = '';
      for (let i = 0; i < LIMITS.roomCodeLength; i++) code += ALPHABET[randomInt(ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('Could not allocate a room code');
  }

  create(settings: RoomSettings): Room {
    const room = new Room(this.generateCode(), settings, this.deps);
    this.rooms.set(room.code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  remove(code: string): void {
    const r = this.rooms.get(code);
    if (!r) return;
    r.destroy();
    this.rooms.delete(code);
  }

  get size(): number {
    return this.rooms.size;
  }

  lookup(code: string): RoomLookup {
    const r = this.get(code);
    if (!r) return { exists: false, code };
    return {
      exists: true,
      code: r.code,
      roomName: r.settings.roomName,
      players: r.playerCount(),
      maxPlayers: r.settings.maxPlayers,
      phase: r.phase,
      full: r.playerCount() >= r.settings.maxPlayers,
      inProgress: r.phase !== 'LOBBY',
    };
  }

  publicRooms(): PublicRoomInfo[] {
    return [...this.rooms.values()]
      .filter((r) => r.settings.isPublic && r.connectedCount() > 0)
      .map((r) => ({
        code: r.code,
        roomName: r.settings.roomName,
        players: r.playerCount(),
        maxPlayers: r.settings.maxPlayers,
        phase: r.phase,
        language: r.settings.language,
        rounds: r.settings.rounds,
      }));
  }

  findJoinablePublicRoom(language: string): Room | undefined {
    return [...this.rooms.values()]
      .filter(
        (room) =>
          room.settings.isPublic &&
          room.settings.language === language &&
          room.phase === 'LOBBY' &&
          room.connectedCount() > 0 &&
          room.playerCount() < room.settings.maxPlayers,
      )
      .sort((a, b) => b.playerCount() - a.playerCount())[0];
  }

  /** Delete rooms that have had nobody connected for emptyRoomTtlSec. */
  sweep(now = Date.now()): number {
    let removed = 0;
    for (const r of [...this.rooms.values()]) {
      if (r.connectedCount() > 0) {
        r.touch();
        continue;
      }
      if (now - r.lastActive > TIMING.emptyRoomTtlSec * 1000) {
        this.remove(r.code);
        removed++;
      }
    }
    return removed;
  }

  startSweeper(intervalMs = 30_000): void {
    this.sweeper = setInterval(() => this.sweep(), intervalMs);
    this.sweeper.unref?.();
  }

  shutdown(): void {
    if (this.sweeper) clearInterval(this.sweeper);
    for (const code of [...this.rooms.keys()]) this.remove(code);
  }
}
