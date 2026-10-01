'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import {
  CATEGORIES,
  cleanCustomWord,
  defaultSettings,
  LANGUAGES,
  LIMITS,
  settingsSchema,
  WORD_MODES,
  type RoomSettings,
} from '@drawguess/shared';
import { Button } from '@/components/ui/button';
import { Input, NativeSelect } from '@/components/ui/input';
import { FieldError, Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type SettingsInput = z.input<typeof settingsSchema>;

const MODE_INFO: Record<(typeof WORD_MODES)[number], { label: string; hint: string }> = {
  normal: { label: 'Normal', hint: 'Blanks show how long the word is.' },
  hidden: { label: 'Hidden', hint: 'No blanks, no hints. Guess from the drawing alone.' },
  combination: { label: 'Combination', hint: 'Two words mashed together. Good luck, drawer.' },
};

export const toInput = (s: RoomSettings): SettingsInput => ({ ...s });
export const DEFAULT_INPUT: SettingsInput = { ...defaultSettings, categories: [], customWords: [] };

function Range({
  label,
  value,
  min,
  max,
  unit,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  format?: (n: number) => string;
  onChange: (n: number) => void;
}) {
  const id = label.replace(/\s/g, '-').toLowerCase();
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="font-display text-lg font-extrabold tabular-nums">
          {format ? format(value) : value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-primary"
      />
    </div>
  );
}

export function SettingsForm({
  initial = DEFAULT_INPUT,
  submitLabel,
  onSubmit,
  busy,
  compact,
}: {
  initial?: SettingsInput;
  submitLabel: string;
  onSubmit: (s: RoomSettings) => void | Promise<void>;
  busy?: boolean;
  compact?: boolean;
}) {
  const form = useForm<SettingsInput, unknown, z.output<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema) as never,
    defaultValues: initial,
    mode: 'onChange',
  });
  const { watch, setValue, register, formState } = form;
  const v = watch();
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState('');
  const set = (k: keyof SettingsInput, val: unknown) =>
    setValue(k, val as never, { shouldDirty: true, shouldValidate: true });

  const addWords = () => {
    const parts = draft
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const bad = parts.filter((p) => !cleanCustomWord(p));
    if (bad.length)
      return setDraftError(`Not valid: "${bad[0].slice(0, 20)}". Use 2-30 letters, up to 3 words.`);
    const merged = [...v.customWords];
    for (const p of parts) {
      const c = cleanCustomWord(p)!;
      if (!merged.some((m) => m.toLowerCase() === c.toLowerCase())) merged.push(c);
    }
    if (merged.length > LIMITS.customWords)
      return setDraftError(`At most ${LIMITS.customWords} custom words.`);
    set('customWords', merged);
    setDraft('');
    setDraftError('');
  };

  const toggleCat = (c: (typeof CATEGORIES)[number]) =>
    set(
      'categories',
      v.categories.includes(c) ? v.categories.filter((x) => x !== c) : [...v.categories, c],
    );

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit((s) => onSubmit(s as RoomSettings))}
      noValidate
    >
      <div className={cn('grid gap-4', !compact && 'sm:grid-cols-[1fr_auto]')}>
        <div>
          <Label htmlFor="roomName">Room name</Label>
          <Input
            id="roomName"
            className="mt-1.5"
            maxLength={LIMITS.roomName.max}
            aria-invalid={!!formState.errors.roomName}
            {...register('roomName')}
          />
          <FieldError message={formState.errors.roomName?.message as string | undefined} />
        </div>
        <div className="flex items-center gap-3 self-end pb-2">
          <Switch id="isPublic" checked={v.isPublic} onCheckedChange={(c) => set('isPublic', c)} />
          <Label htmlFor="isPublic" className="leading-tight">
            Public room
            <span className="block text-xs font-medium text-muted-foreground">
              {v.isPublic ? 'Listed for anyone to join' : 'Invite link only'}
            </span>
          </Label>
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Range
          label="Max players"
          value={v.maxPlayers}
          min={LIMITS.maxPlayers.min}
          max={LIMITS.maxPlayers.max}
          onChange={(n) => set('maxPlayers', n)}
        />
        <Range
          label="Rounds"
          value={v.rounds}
          min={LIMITS.rounds.min}
          max={LIMITS.rounds.max}
          onChange={(n) => set('rounds', n)}
        />
        <Range
          label="Drawing time"
          value={v.drawTime}
          min={LIMITS.drawTime.min}
          max={LIMITS.drawTime.max}
          unit="s"
          onChange={(n) => set('drawTime', n)}
        />
        <Range
          label="Word choices"
          value={v.wordCount}
          min={LIMITS.wordCount.min}
          max={LIMITS.wordCount.max}
          onChange={(n) => set('wordCount', n)}
        />
        <Range
          label="Hints"
          value={v.hints}
          min={LIMITS.hints.min}
          max={LIMITS.hints.max}
          format={(n) => (n === 0 ? 'Off' : String(n))}
          onChange={(n) => set('hints', n)}
        />
        <div>
          <Label htmlFor="language">Word language</Label>
          <NativeSelect
            id="language"
            className="mt-1.5"
            value={v.language}
            onChange={(e) => set('language', e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-bold">Word mode</legend>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
          {WORD_MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={v.wordMode === m}
              onClick={() => set('wordMode', m)}
              className={cn(
                'rounded-md border-2 border-border p-2.5 text-left transition-colors',
                v.wordMode === m
                  ? 'bg-secondary text-secondary-foreground shadow-chunk-sm'
                  : 'bg-card hover:bg-muted',
              )}
            >
              <span className="block text-sm font-extrabold">{MODE_INFO[m].label}</span>
              <span className="block text-xs leading-snug opacity-80">{MODE_INFO[m].hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-bold">
          Categories{' '}
          <span className="font-medium text-muted-foreground">
            {v.categories.length === 0 ? '(all)' : `(${v.categories.length} picked)`}
          </span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={v.categories.includes(c)}
              onClick={() => toggleCat(c)}
              className={cn(
                'rounded-full border-2 border-border px-3 py-1 text-xs font-bold capitalize',
                v.categories.includes(c)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card hover:bg-muted',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-md border-2 border-dashed border-border/60 p-3">
        <legend className="px-1 text-sm font-bold">
          Custom words{' '}
          <span className="font-medium text-muted-foreground">
            ({v.customWords.length}/{LIMITS.customWords})
          </span>
        </legend>
        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder="Add words, comma separated"
            aria-label="Add custom words"
            onChange={(e) => {
              setDraft(e.target.value);
              setDraftError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addWords();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addWords}>
            <Plus /> Add
          </Button>
        </div>
        <FieldError
          message={draftError || (formState.errors.customWords?.message as string | undefined)}
        />
        {v.customWords.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {v.customWords.map((w) => (
              <li
                key={w}
                className="flex items-center gap-1 rounded-full border-2 border-border bg-muted py-0.5 pl-2.5 pr-1 text-xs font-bold"
              >
                {w}
                <button
                  type="button"
                  aria-label={`Remove ${w}`}
                  className="rounded-full p-0.5 hover:bg-card"
                  onClick={() =>
                    set(
                      'customWords',
                      v.customWords.filter((x) => x !== w),
                    )
                  }
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center gap-3">
          <Switch
            id="customOnly"
            checked={v.customWordsOnly}
            onCheckedChange={(c) => set('customWordsOnly', c)}
          />
          <Label htmlFor="customOnly">
            Use only my custom words{' '}
            <span className="font-medium text-muted-foreground">
              (needs at least {v.wordCount})
            </span>
          </Label>
        </div>
      </fieldset>

      <Button type="submit" size="lg" className="w-full" disabled={busy || !formState.isValid}>
        {busy ? 'Working…' : submitLabel}
      </Button>
    </form>
  );
}
