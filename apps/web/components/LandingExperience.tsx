'use client';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Circle,
  Eraser,
  LoaderCircle,
  MessageCircle,
  Palette,
  Paintbrush,
  Pencil,
  Shapes,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import {
  AVATAR_LIMITS,
  LANGUAGES,
  playerNameSchema,
  type AvatarConfig,
  type JoinedData,
} from '@drawguess/shared';
import { Avatar } from '@/components/Avatar';
import { AvatarPicker } from '@/components/AvatarPicker';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { gameCanvas } from '@/lib/canvas';
import { loadProfile, randomAvatar, saveProfile, saveSession } from '@/lib/profile';
import { request } from '@/lib/socket';
import { useGameStore } from '@/stores/gameStore';

const LETTER_COLORS = [
  '#ffe16b',
  '#ff9d67',
  '#68d5e9',
  '#92e6a7',
  '#ff83aa',
  '#b8a3ff',
  '#ffcc66',
  '#7bd8c2',
  '#ff91b7',
];
const WELCOME_AVATARS: AvatarConfig[] = Array.from({ length: 7 }, (_, i) => ({
  color: (i * 2) % AVATAR_LIMITS.color,
  eyes: (i + 1) % AVATAR_LIMITS.eyes,
  mouth: (i * 2 + 1) % AVATAR_LIMITS.mouth,
  hat: (i * 3) % AVATAR_LIMITS.hat,
}));
const DOODLES = [
  { Icon: Pencil, top: '14%', left: '8%', delay: '-1s' },
  { Icon: Star, top: '22%', left: '20%', delay: '-3s' },
  { Icon: Circle, top: '11%', left: '34%', delay: '-2s' },
  { Icon: Paintbrush, top: '16%', right: '12%', delay: '-4s' },
  { Icon: MessageCircle, top: '35%', right: '7%', delay: '-1.5s' },
  { Icon: Shapes, top: '49%', left: '5%', delay: '-2.5s' },
  { Icon: Eraser, top: '61%', right: '11%', delay: '-3.5s' },
  { Icon: Palette, bottom: '19%', left: '15%', delay: '-.5s' },
  { Icon: Sparkles, bottom: '14%', right: '25%', delay: '-2s' },
  { Icon: Star, bottom: '31%', right: '5%', delay: '-4.5s' },
  { Icon: Circle, bottom: '11%', left: '39%', delay: '-1s' },
  { Icon: Pencil, top: '68%', left: '26%', delay: '-3s' },
];

export function LandingExperience() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarConfig>({ color: 3, eyes: 0, mouth: 0, hat: 0 });
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const profile = loadProfile();
    if (profile) {
      setName(profile.name);
      setAvatar(profile.avatar);
      if (LANGUAGES.some((item) => item.code === profile.language)) setLanguage(profile.language!);
    } else {
      setAvatar(randomAvatar());
    }
  }, []);

  const validatedName = () => {
    const result = playerNameSchema.safeParse(name);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Enter a valid name.');
      nameRef.current?.focus();
      return null;
    }
    setError('');
    return result.data;
  };

  const play = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current) return;
    const playerName = validatedName();
    if (!playerName) return;

    busyRef.current = true;
    setBusy(true);
    setStatus('Finding a room...');
    try {
      useGameStore.getState().resetRoom();
      gameCanvas.clear();
      const data = await request<JoinedData & { roomCode: string }>('quick_play', {
        playerName,
        avatar,
        language,
      });
      setStatus('Joining room...');
      saveProfile({ name: playerName, avatar, language });
      saveSession(data.roomCode, { token: data.playerToken, playerId: data.playerId });
      useGameStore.getState().applyState(data.state);
      router.push(`/room/${data.roomCode}`);
    } catch (cause) {
      const code = (cause as Error & { code?: string }).code;
      setError(
        code === 'ROOM_FULL'
          ? 'That room filled up. Try Play again.'
          : code === 'OFFLINE'
            ? 'Could not reach the game server. Check your connection and try again.'
            : (cause as Error).message || "Couldn't find a room. Please try again.",
      );
      setStatus('');
      busyRef.current = false;
      setBusy(false);
    }
  };

  const createRoom = () => {
    if (busyRef.current) return;
    const playerName = validatedName();
    if (!playerName) return;
    saveProfile({ name: playerName, avatar, language });
    router.push('/create-room');
  };

  return (
    <section className="landing-hero">
        <div className="landing-doodles" aria-hidden="true">
          {DOODLES.map(({ Icon, delay, ...position }, index) => (
            <Icon
              key={index}
              className="landing-doodle"
              size={index % 3 === 0 ? 26 : 20}
              style={{ ...position, animationDelay: delay } as CSSProperties}
            />
          ))}
        </div>
        <header className="landing-header">
          <Logo className="landing-brand" />
          <nav aria-label="Main navigation" className="landing-nav">
            <Link href="#how" className="landing-nav-how">How to play</Link>
            <Link href="/join">Public rooms</Link>
            <Link href="/history" className="landing-nav-history">History</Link>
            <Link href="/account">Account</Link>
            <ThemeToggle />
          </nav>
        </header>

        <div className="landing-center">
          <p className="landing-eyebrow">DRAW TOGETHER. GUESS ANYTHING.</p>
          <h1 className="landing-title" aria-label="DrawGuess">
            {'DrawGuess'.split('').map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className="landing-title-letter"
                style={{ color: LETTER_COLORS[index], animationDelay: `${index * 55}ms` }}
                aria-hidden="true"
              >
                {letter}
              </span>
            ))}
          </h1>
          {/* <p className="landing-tagline">The party game where the sketch is never the point.</p> */}

          <div className="landing-welcome-row" aria-hidden="true">
            {WELCOME_AVATARS.map((welcomeAvatar, index) => (
              <Avatar
                key={index}
                avatar={welcomeAvatar}
                className={`landing-welcome-avatar landing-welcome-avatar-${index}`}
                title="Welcome player"
              />
            ))}
          </div>

          <form className="landing-panel" onSubmit={(event) => void play(event)} noValidate>
            <div className="landing-fields">
              <div className="landing-field">
                <label htmlFor="landing-name">Your name</label>
                <input
                  id="landing-name"
                  ref={nameRef}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your name"
                  autoComplete="nickname"
                  maxLength={20}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'landing-error' : undefined}
                />
              </div>
              <div className="landing-field">
                <label htmlFor="landing-language">Word language</label>
                <select
                  id="landing-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  {LANGUAGES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="landing-avatar-section">
              <span className="landing-avatar-label">Pick your player</span>
              <AvatarPicker value={avatar} onChange={setAvatar} layout="carousel" />
            </div>

            {error && (
              <p id="landing-error" role="alert" className="landing-error">
                {error}
              </p>
            )}
            {/* <p className="landing-status" role="status" aria-live="polite">
              {busy && <LoaderCircle className="size-4 animate-spin" />}
              {status || ' '}
            </p> */}

            <button className="landing-play-button" type="submit" disabled={busy}>
              {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Users className="size-5" />}
              {busy ? 'Finding a room...' : 'Play!'}
            </button>
            <button
              className="landing-create-button"
              type="button"
              disabled={busy}
              onClick={createRoom}
            >
              Create Room
            </button>
          </form>
          <Link href="/join" className="landing-code-link pt-4">
            Have a room code? Join a friend
          </Link>
        </div>
        <div className="landing-scroll-cue" aria-hidden="true">
          <span />
        </div>
    </section>
  );
}