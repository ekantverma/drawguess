import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { defaultSettings, type RoomState } from '@drawguess/shared';
import { WordDisplay } from '@/components/game/WordDisplay';
import { Avatar } from '@/components/Avatar';
import { LandingExperience } from '@/components/LandingExperience';
import { useGameStore } from '@/stores/gameStore';

const routerPush = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock('@/lib/socket', () => ({ request: vi.fn() }));
vi.mock('@/lib/canvas', () => ({ gameCanvas: { clear: vi.fn() } }));
import { request } from '@/lib/socket';

afterEach(cleanup);

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

describe('LandingExperience', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    routerPush.mockReset();
    vi.mocked(request).mockReset();
  });

  it('validates the name and changes the selected avatar', () => {
    const { container } = render(<LandingExperience />);
    fireEvent.click(screen.getByRole('button', { name: 'Play!' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 2 characters/i);

    const preview = screen.getByLabelText('Selected avatar');
    const before = preview.innerHTML;
    fireEvent.click(screen.getByRole('button', { name: 'Next avatar' }));
    expect(screen.getByLabelText('Selected avatar').innerHTML).not.toBe(before);
    expect(container.querySelectorAll('.landing-welcome-avatar')).toHaveLength(7);
  });

  it('passes name, language, and avatar into confirmed quick play', async () => {
    const state = base();
    vi.mocked(request).mockResolvedValue({
      roomCode: 'ABC123',
      playerId: 'player-1',
      playerToken: 'player-token-123456',
      state,
    });
    render(<LandingExperience />);
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: '  Sketcher  ' } });
    fireEvent.change(screen.getByLabelText('Word language'), { target: { value: 'fr' } });
    fireEvent.click(screen.getByRole('button', { name: 'Play!' }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/room/ABC123'));
    expect(request).toHaveBeenCalledWith('quick_play', {
      playerName: 'Sketcher',
      avatar: expect.objectContaining({ color: expect.any(Number) }),
      language: 'fr',
    });
    expect(JSON.parse(localStorage.getItem('drawguess:profile')!).language).toBe('fr');
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
