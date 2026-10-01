'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  LANGUAGES,
  playerNameSchema,
  type AvatarConfig,
  type JoinedData,
  type RoomSettings,
} from '@drawguess/shared';
import { AvatarPicker } from '@/components/AvatarPicker';
import { Logo } from '@/components/Logo';
import { DEFAULT_INPUT, SettingsForm } from '@/components/SettingsForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { FieldError, Label } from '@/components/ui/label';
import { gameCanvas } from '@/lib/canvas';
import { loadProfile, randomAvatar, saveProfile, saveSession } from '@/lib/profile';
import { request } from '@/lib/socket';
import { useGameStore } from '@/stores/gameStore';

const nameSchema = z.object({ name: playerNameSchema });

export default function CreateRoomPage() {
  const router = useRouter();
  const [avatar, setAvatar] = useState<AvatarConfig>({ color: 3, eyes: 0, mouth: 0, hat: 0 });
  const [settingsLanguage, setSettingsLanguage] = useState(DEFAULT_INPUT.language);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const form = useForm<z.input<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: '' },
  });
  const { ref: regRef, ...nameReg } = form.register('name');

  useEffect(() => {
    const p = loadProfile();
    if (p) {
      form.setValue('name', p.name);
      setAvatar(p.avatar);
      setSettingsLanguage(
        LANGUAGES.some((language) => language.code === p.language)
          ? p.language!
          : DEFAULT_INPUT.language,
      );
    } else setAvatar(randomAvatar());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async (settings: RoomSettings) => {
    if (!(await form.trigger())) {
      nameRef.current?.focus();
      toast.error('Add your name first');
      return;
    }
    const name = String(form.getValues('name'));
    setBusy(true);
    try {
      useGameStore.getState().resetRoom();
      gameCanvas.clear();
      const data = await request<JoinedData & { roomCode: string }>('create_room', {
        hostName: name,
        avatar,
        settings,
      });
      saveProfile({ name, avatar, language: settings.language });
      saveSession(data.roomCode, { token: data.playerToken, playerId: data.playerId });
      useGameStore.getState().applyState(data.state);
      router.push(`/room/${data.roomCode}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-3 sm:p-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>
      <h1 className="mb-1 text-3xl font-extrabold sm:text-4xl">Create a room</h1>
      <p className="mb-6 text-muted-foreground">
        Pick your look, tune the rules, then invite friends with a code or link.
      </p>
      <div className="grid gap-5 md:grid-cols-[18rem_minmax(0,1fr)]">
        <section className="chunk h-fit space-y-4 p-4">
          <h2 className="text-lg font-extrabold">You</h2>
          <div>
            <Label htmlFor="host-name">Your name</Label>
            <Input
              id="host-name"
              className="mt-1.5"
              maxLength={20}
              placeholder="Doodle Dave"
              autoComplete="nickname"
              aria-invalid={!!form.formState.errors.name}
              ref={(el) => {
                regRef(el);
                nameRef.current = el;
              }}
              {...nameReg}
            />
            <FieldError message={form.formState.errors.name?.message as string | undefined} />
          </div>
          <AvatarPicker value={avatar} onChange={setAvatar} />
        </section>
        <section className="chunk p-4">
          <h2 className="mb-3 text-lg font-extrabold">Room settings</h2>
          <SettingsForm
            key={settingsLanguage}
            initial={{ ...DEFAULT_INPUT, language: settingsLanguage }}
            submitLabel="Create room"
            busy={busy}
            onSubmit={create}
          />
        </section>
      </div>
    </div>
  );
}
