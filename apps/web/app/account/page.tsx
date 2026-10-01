'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldError, Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, useMe } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
const registerSchema = z.object({
  username: z.string().trim().min(2, 'At least 2 characters').max(20),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').max(100),
});

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const qc = useQueryClient();
  const schema = mode === 'login' ? loginSchema : registerSchema;
  const form = useForm<{ username?: string; email: string; password: string }>({
    resolver: zodResolver(schema) as never,
    defaultValues: { email: '', password: '', username: '' },
  });
  const e = form.formState.errors;
  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(async (v) => {
        try {
          await api(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(v) });
          toast.success(mode === 'login' ? 'Welcome back!' : 'Account created');
          await qc.invalidateQueries({ queryKey: ['me'] });
        } catch (err) {
          toast.error((err as Error).message);
        }
      })}
    >
      {mode === 'register' && (
        <div>
          <Label htmlFor={`${mode}-u`}>Username</Label>
          <Input id={`${mode}-u`} className="mt-1.5" {...form.register('username')} />
          <FieldError message={e.username?.message} />
        </div>
      )}
      <div>
        <Label htmlFor={`${mode}-e`}>Email</Label>
        <Input
          id={`${mode}-e`}
          type="email"
          autoComplete="email"
          className="mt-1.5"
          {...form.register('email')}
        />
        <FieldError message={e.email?.message} />
      </div>
      <div>
        <Label htmlFor={`${mode}-p`}>Password</Label>
        <Input
          id={`${mode}-p`}
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="mt-1.5"
          {...form.register('password')}
        />
        <FieldError message={e.password?.message} />
      </div>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {mode === 'login' ? 'Sign in' : 'Create account'}
      </Button>
    </form>
  );
}

export default function AccountPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const user = me.data?.user;
  return (
    <div className="mx-auto max-w-md p-3 sm:p-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>
      <h1 className="mb-1 text-3xl font-extrabold">Account</h1>
      <p className="mb-5 text-muted-foreground">
        Optional. Guests can always play. An account keeps your stats.
      </p>
      {me.isLoading && <p role="status">Loading…</p>}
      {me.error && (
        <p role="alert" className="font-semibold text-destructive">
          {(me.error as Error).message}
        </p>
      )}
      {me.data && !me.data.dbEnabled && (
        <p className="chunk bg-secondary/40 p-4 text-sm font-semibold">
          Accounts need MongoDB. Set <code>MONGODB_URI</code> on the server to turn them on. You can
          still play as a guest.
        </p>
      )}
      {user && (
        <div className="chunk space-y-4 p-5">
          <p className="text-lg font-extrabold">
            {user.username}{' '}
            <span className="text-sm font-medium text-muted-foreground">{user.email}</span>
          </p>
          <dl className="grid grid-cols-2 gap-3 text-center">
            {(
              [
                ['Games', user.stats.gamesPlayed],
                ['Wins', user.stats.gamesWon],
                ['Correct guesses', user.stats.correctGuesses],
                ['Total points', user.stats.totalPoints],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-md border-2 border-border bg-muted p-3">
                <dd className="font-display text-2xl font-extrabold tabular-nums">{v}</dd>
                <dt className="text-xs font-bold text-muted-foreground">{k}</dt>
              </div>
            ))}
          </dl>
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href="/create-room">Play</Link>
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await api('/api/auth/logout', { method: 'POST' });
                await qc.invalidateQueries({ queryKey: ['me'] });
                setBusy(false);
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      )}
      {me.data?.dbEnabled && !user && (
        <div className="chunk p-5">
          <Tabs defaultValue="login">
            <TabsList>
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <AuthForm mode="login" />
            </TabsContent>
            <TabsContent value="register">
              <AuthForm mode="register" />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
