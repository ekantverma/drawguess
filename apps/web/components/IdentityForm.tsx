'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye } from 'lucide-react';
import { playerNameSchema, type AvatarConfig } from '@drawguess/shared';
import { AvatarPicker } from '@/components/AvatarPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldError, Label } from '@/components/ui/label';
import { loadProfile, randomAvatar } from '@/lib/profile';

const schema = z.object({ name: playerNameSchema });

export function IdentityForm({
  submitLabel,
  onSubmit,
  allowSpectate,
  busy,
}: {
  submitLabel: string;
  onSubmit: (v: { name: string; avatar: AvatarConfig; spectate: boolean }) => void | Promise<void>;
  allowSpectate?: boolean;
  busy?: boolean;
}) {
  const [avatar, setAvatar] = useState<AvatarConfig>({ color: 3, eyes: 0, mouth: 0, hat: 0 });
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    const p = loadProfile();
    if (p) {
      form.setValue('name', p.name);
      setAvatar(p.avatar);
    } else {
      setAvatar(randomAvatar());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (spectate: boolean) =>
    form.handleSubmit((v) => onSubmit({ name: String(v.name), avatar, spectate }))();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
    >
      <div>
        <Label htmlFor="player-name">Your name</Label>
        <Input
          id="player-name"
          className="mt-1.5"
          placeholder="Doodle Dave"
          maxLength={20}
          autoComplete="nickname"
          aria-invalid={!!form.formState.errors.name}
          {...form.register('name')}
        />
        <FieldError message={form.formState.errors.name?.message as string | undefined} />
      </div>
      <AvatarPicker value={avatar} onChange={setAvatar} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={busy} className="flex-1">
          {busy ? 'Working…' : submitLabel}
        </Button>
        {allowSpectate && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={busy}
            onClick={() => void submit(true)}
          >
            <Eye /> Just watch
          </Button>
        )}
      </div>
    </form>
  );
}
