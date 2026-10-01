import { randomUUID } from 'node:crypto';
import { TIMING, type ReportInfo, type ReportReason, type VotekickState } from '@drawguess/shared';
import { GameError } from './errors';
import type { Player } from './Player';
import type { Room } from './Room';

interface Vote {
  voters: Set<string>;
}

/** Host kick/ban, votekick and player reports. */
export class Moderation {
  private votes = new Map<string, Vote>();
  constructor(private room: Room) {}

  kick(actor: Player, targetId: string, ban: boolean): void {
    if (actor.id !== this.room.hostId)
      throw new GameError('NOT_HOST', 'Only the host can kick or ban players');
    const target = this.room.players.get(targetId);
    if (!target) throw new GameError('NOT_FOUND', 'Player not found');
    if (target.id === actor.id) throw new GameError('BAD_TARGET', 'You cannot kick yourself');
    this.eject(target, ban);
  }

  private eject(target: Player, ban: boolean): void {
    if (ban) {
      this.room.banned.tokens.add(target.token);
      this.room.banned.names.add(target.name.toLowerCase());
      if (target.ip) this.room.banned.ips.add(target.ip);
    }
    this.room.send(target, 'kicked', {
      reason: ban ? 'The host banned you from this room.' : 'You were removed from this room.',
      banned: ban,
    });
    this.room.removePlayer(target.id, ban ? 'banned' : 'kicked');
  }

  private eligibleVoters(targetId: string): Player[] {
    return [...this.room.players.values()].filter(
      (p) => p.role === 'player' && p.connected && p.id !== targetId,
    );
  }

  private stateOf(targetId: string): VotekickState | null {
    const v = this.votes.get(targetId);
    const target = this.room.players.get(targetId);
    if (!v || !target) return null;
    const n = this.eligibleVoters(targetId).length;
    return {
      targetId,
      targetName: target.name,
      votes: v.voters.size,
      needed: Math.max(2, Math.floor(n / 2) + 1),
    };
  }

  voteKick(voter: Player, targetId: string): void {
    const target = this.room.players.get(targetId);
    if (!target) throw new GameError('NOT_FOUND', 'Player not found');
    if (voter.role !== 'player') throw new GameError('SPECTATOR', 'Spectators cannot vote');
    if (voter.id === targetId)
      throw new GameError('BAD_TARGET', 'You cannot vote to kick yourself');
    if (targetId === this.room.hostId)
      throw new GameError('BAD_TARGET', 'The host cannot be vote-kicked');
    if (this.eligibleVoters(targetId).length < 2) {
      throw new GameError(
        'VOTEKICK_UNAVAILABLE',
        'Votekick needs at least 3 players. Ask the host to kick instead.',
      );
    }
    let v = this.votes.get(targetId);
    if (!v) {
      v = { voters: new Set() };
      this.votes.set(targetId, v);
      this.room.timers.after(`vk:${targetId}`, TIMING.votekickTtlSec * 1000, () => {
        this.votes.delete(targetId);
        this.room.broadcast('votekick_update', { vote: null, targetId });
      });
      this.room.system(`${voter.name} started a vote to kick ${target.name}`);
    }
    if (v.voters.has(voter.id)) throw new GameError('ALREADY_VOTED', 'You already voted');
    v.voters.add(voter.id);
    const state = this.stateOf(targetId)!;
    if (state.votes >= state.needed) {
      this.forget(targetId);
      this.room.broadcast('votekick_update', { vote: null, targetId });
      this.room.system(`The vote passed: ${target.name} was kicked`);
      this.eject(target, false);
    } else {
      this.room.broadcast('votekick_update', { vote: state, targetId });
    }
  }

  forget(id: string): void {
    this.votes.delete(id);
    this.room.timers.clear(`vk:${id}`);
  }

  report(reporter: Player, targetId: string, reason: ReportReason, details = ''): ReportInfo {
    const target = this.room.players.get(targetId);
    if (!target) throw new GameError('NOT_FOUND', 'Player not found');
    if (target.id === reporter.id) throw new GameError('BAD_TARGET', 'You cannot report yourself');
    if (
      this.room.reports.some(
        (r) => r.reporterId === reporter.id && r.targetId === targetId && r.reason === reason,
      )
    ) {
      throw new GameError('DUPLICATE', 'You already reported this player for that reason');
    }
    if (this.room.reports.length >= 50)
      throw new GameError('LIMIT', 'Too many reports in this room');
    const report: ReportInfo = {
      id: randomUUID(),
      reporterId: reporter.id,
      reporterName: reporter.name,
      targetId,
      targetName: target.name,
      reason,
      details,
      at: Date.now(),
    };
    this.room.reports.push(report);
    this.room.deps.onReport?.(report, this.room);
    const host = this.room.host;
    if (host) this.room.send(host, 'reports_update', { reports: this.room.reports });
    return report;
  }
}
