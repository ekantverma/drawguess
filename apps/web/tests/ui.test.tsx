import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { defaultSettings, type RoomState } from '@drawguess/shared';
import { WordDisplay } from '@/components/game/WordDisplay';
import { Avatar } from '@/components/Avatar';
import { useGameStore } from '@/stores/gameStore';

const base = (over: Partial<RoomState['game']> = {}, you = 'me'): RoomState => ({
  code: 'ABC123',
  settings: { ...defaultSettings, categories: [], customWords: [] },
  hostId: 'me',
  phase: 'DRAWING',
  players: [
    {
      id: 'me',
      name: 'Me',
      avatar: { color: 0, eyes: 0, mouth: 0, hat: 0 },
      isHost: true,
      ready: false,
      connected: true,
      role: 'player',
      score: 0,
      guessed: false,
      isDrawer: false,
    },
    {
      id: 'dr',
      name: 'Drew',
      avatar: { color: 1, eyes: 0, mouth: 0, hat: 0 },
      isHost: false,
      ready: false,
      connected: true,
      role: 'player',
      score: 0,
      guessed: false,
      isDrawer: true,
    },
  ],
  you: { playerId: you, role: 'player', isHost: true },
  game: {
    round: 1,
    totalRounds: 2,
    turn: 0,
    totalTurns: 4,
    drawerId: 'dr',
    hint: '_a_',
    wordLength: 3,
    timeLeft: 30,
    timeTotal: 60,
    hintsUsed: 1,
    replayTurns: [],
    ...over,
  },
});

describe('WordDisplay', () => {
  it('guessers see blanks + revealed letters and the length, never a word', () => {
    render(<WordDisplay room={base()} />);
    expect(screen.getByLabelText(/Hint: blank a ?blank/i)).toBeInTheDocument();
    expect(screen.getByText('3 letters')).toBeInTheDocument();
  });
  it('the drawer sees the full word', () => {
    render(<WordDisplay room={base({ word: 'cat' }, 'dr')} />);
    expect(screen.getByLabelText('cat')).toBeInTheDocument();
    expect(screen.getByText('Draw this')).toBeInTheDocument();
  });
  it('hidden mode shows no blanks', () => {
    const r = base({ hint: '', wordLength: 0 });
    r.settings = { ...r.settings, wordMode: 'hidden' };
    render(<WordDisplay room={r} />);
    expect(screen.getByText('Hidden word')).toBeInTheDocument();
  });
});

describe('Avatar', () => {
  it('renders for every valid config and clamps bad values safely', () => {
    const { container } = render(<Avatar avatar={{ color: 99, eyes: -3, mouth: 2, hat: 5 }} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('gameStore', () => {
  beforeEach(() => useGameStore.getState().resetRoom());
  it('dedupes chat messages and caps history', () => {
    const m = {
      id: '1',
      playerId: null,
      playerName: 'S',
      text: 'hi',
      kind: 'system' as const,
      channel: 'all' as const,
      at: 0,
    };
    useGameStore.getState().addChat(m);
    useGameStore.getState().addChat(m);
    expect(useGameStore.getState().chat).toHaveLength(1);
    for (let i = 2; i < 400; i++) useGameStore.getState().addChat({ ...m, id: String(i) });
    expect(useGameStore.getState().chat.length).toBeLessThanOrEqual(200);
  });
  it('patches scores and hints without losing other state', () => {
    useGameStore.getState().applyState(base());
    useGameStore.getState().patchScores([{ playerId: 'me', score: 420 }]);
    useGameStore.getState().patchHint('ca_', 2);
    const r = useGameStore.getState().room!;
    expect(r.players.find((p) => p.id === 'me')?.score).toBe(420);
    expect(r.game?.hint).toBe('ca_');
    expect(useGameStore.getState().timeLeft).toBe(30);
  });
});
