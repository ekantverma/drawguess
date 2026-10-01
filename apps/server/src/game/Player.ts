import { randomBytes, randomUUID } from 'node:crypto';
import type { AvatarConfig, Role } from '@drawguess/shared';

export class Player {
  readonly id = randomUUID();
  /** Secret reconnect credential. Never broadcast. */
  readonly token = randomBytes(24).toString('hex');
  readonly joinedAt = Date.now();
  socketId: string | null;
  connected = true;
  ready = false;

  constructor(
    public name: string,
    public avatar: AvatarConfig,
    public role: Role,
    socketId: string,
    public readonly ip: string,
    /** explicitly chose to spectate (stays spectator across games) */
    public readonly spectateOnly = false,
    public readonly userId?: string,
  ) {
    this.socketId = socketId;
  }
}
