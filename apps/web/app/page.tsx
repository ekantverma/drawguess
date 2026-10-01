'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Eye,
  Film,
  Globe2,
  Languages,
  MessageCircle,
  Palette,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { DoodlePad } from '@/components/DoodlePad';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STEPS = [
  {
    t: 'Make or join a room',
    d: 'Create a room and share the code or link, or type a friend’s code.',
  },
  {
    t: 'Pick a word and draw',
    d: 'Each turn one player chooses a secret word and sketches it on a live canvas.',
  },
  {
    t: 'Guess in the chat',
    d: 'Everyone else types guesses. The sooner you nail it, the more you score.',
  },
  {
    t: 'Take turns, crown a winner',
    d: 'Everybody draws each round. After the last round the top score wins.',
  },
];
const FEATURES = [
  {
    i: Users,
    t: 'Rooms for 2 to 20',
    d: 'Public lobbies anyone can browse, or private rooms behind an invite link.',
  },
  {
    i: Palette,
    t: 'A canvas that keeps up',
    d: 'Strokes stream to everyone as you draw. Brush, eraser, undo, clear.',
  },
  {
    i: Languages,
    t: 'Words in four languages',
    d: 'English, Español, Français and Deutsch, by category, plus your own custom words.',
  },
  {
    i: Eye,
    t: 'Spectator seats',
    d: 'Watch a game in progress without playing, and slide in next round.',
  },
  {
    i: Film,
    t: 'Replay any drawing',
    d: 'Watch the round back at 1x, 2x or 4x once the word is revealed.',
  },
  {
    i: ShieldCheck,
    t: 'Moderation built in',
    d: 'Host kick and ban, vote-kick, and player reports.',
  },
];

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/join${code ? `?code=${code}` : ''}`);
  };
  return (
    <div className="paper-dots">
      <header className="mx-auto flex max-w-6xl items-center gap-3 p-4">
        <Logo />
        <nav className="ml-auto flex items-center gap-1 text-sm font-bold" aria-label="Main">
          <Link href="#how" className="hidden rounded-md px-3 py-2 hover:bg-muted sm:block">
            How to play
          </Link>
          <Link href="/join" className="hidden rounded-md px-3 py-2 hover:bg-muted sm:block">
            Public rooms
          </Link>
          <Link href="/history" className="hidden rounded-md px-3 py-2 hover:bg-muted sm:block">
            History
          </Link>
          <Link href="/account" className="rounded-md px-3 py-2 hover:bg-muted">
            Account
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 md:grid-cols-2 md:pt-12">
          <div>
            <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-6xl">
              Sketch it.
              <br />
              Shout it.
              <br />
              Score it.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              DrawGuess is a free multiplayer drawing game. One player draws a secret word, everyone
              else races to guess it. No sign-up needed.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link href="/create-room">Create a room</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/join">Browse public rooms</Link>
              </Button>
            </div>
            <form
              onSubmit={go}
              className="mt-6 flex max-w-sm gap-2"
              aria-label="Join with a room code"
            >
              <Input
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, '')
                      .slice(0, 6),
                  )
                }
                placeholder="Room code"
                aria-label="Room code"
                className="h-12 text-center font-mono text-lg font-extrabold tracking-[0.3em]"
                autoComplete="off"
              />
              <Button type="submit" size="lg">
                Join room
              </Button>
            </form>
          </div>
          <DoodlePad />
        </section>

        <section id="how" className="border-y-2 border-border bg-card py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-8 text-3xl font-extrabold">How to play</h2>
            <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.t} className="relative pl-12">
                  <span className="absolute left-0 top-0 grid size-9 place-items-center rounded-full border-2 border-border bg-secondary font-display text-lg font-extrabold shadow-chunk-sm">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-extrabold leading-snug">{s.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-8 text-3xl font-extrabold">Everything a party needs</h2>
          <ul className="grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ i: Icon, t, d }) => (
              <li key={t} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-md border-2 border-border bg-accent/40">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-extrabold">{t}</h3>
                  <p className="text-sm text-muted-foreground">{d}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="chunk mt-12 flex flex-wrap items-center justify-between gap-4 bg-primary p-6 text-primary-foreground">
            <div className="flex items-center gap-3">
              <MessageCircle className="size-8" />
              <p className="font-display text-2xl font-extrabold">
                Your friends are one link away.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary">
              <Link href="/create-room">Start a room</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-border py-6 text-center text-sm text-muted-foreground">
  <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
    <span className="font-bold text-foreground">DrawGuess</span>
    <Link href="/join" className="hover:underline">
      <Globe2 className="mr-1 inline size-3.5" />
      Public rooms
    </Link>
    <Link href="/history" className="hover:underline">
      Game history
    </Link>
    <span>Made for drawing badly together.</span>
  </p>

  <p className="mt-3 text-xs">
    © {new Date().getFullYear()} DrawGuess. All rights reserved. Made with ❤️ by{" "}
    <a
      href="https://www.linkedin.com/in/ekantverma"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-foreground hover:underline"
    >
      Ekant Verma
    </a>
  </p>
</footer>
    </div>
  );
}
