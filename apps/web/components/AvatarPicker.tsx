'use client';
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import { AVATAR_LIMITS, type AvatarConfig } from '@drawguess/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { randomAvatar } from '@/lib/profile';

const PARTS = [
  { key: 'color', label: 'Color', max: AVATAR_LIMITS.color },
  { key: 'eyes', label: 'Eyes', max: AVATAR_LIMITS.eyes },
  { key: 'mouth', label: 'Mouth', max: AVATAR_LIMITS.mouth },
  { key: 'hat', label: 'Hat', max: AVATAR_LIMITS.hat },
] as const;

export function AvatarPicker({
  value,
  onChange,
  layout = 'parts',
}: {
  value: AvatarConfig;
  onChange: (a: AvatarConfig) => void;
  layout?: 'parts' | 'carousel';
}) {
  const step = (key: keyof AvatarConfig, max: number, d: number) =>
    onChange({ ...value, [key]: (value[key] + d + max) % max });
  if (layout === 'carousel') {
    const count = AVATAR_LIMITS.color * AVATAR_LIMITS.eyes * AVATAR_LIMITS.mouth * AVATAR_LIMITS.hat;
    const index =
      ((value.color * AVATAR_LIMITS.eyes + value.eyes) * AVATAR_LIMITS.mouth + value.mouth) *
        AVATAR_LIMITS.hat +
      value.hat;
    const cycle = (delta: number) => {
      let next = (index + delta + count) % count;
      const hat = next % AVATAR_LIMITS.hat;
      next = Math.floor(next / AVATAR_LIMITS.hat);
      const mouth = next % AVATAR_LIMITS.mouth;
      next = Math.floor(next / AVATAR_LIMITS.mouth);
      const eyes = next % AVATAR_LIMITS.eyes;
      const color = Math.floor(next / AVATAR_LIMITS.eyes);
      onChange({ color, eyes, mouth, hat });
    };
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="landing-avatar-nav size-11 rounded-full"
            onClick={() => cycle(-1)}
            aria-label="Previous avatar"
          >
            <ChevronLeft className="size-6" />
          </Button>
          <Avatar
            key={`${value.color}-${value.eyes}-${value.mouth}-${value.hat}`}
            avatar={value}
            className="size-24 drop-shadow-[0_12px_20px_rgba(0,0,0,0.25)]"
            title="Selected avatar"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="landing-avatar-nav size-11 rounded-full"
            onClick={() => cycle(1)}
            aria-label="Next avatar"
          >
            <ChevronRight className="size-6" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="landing-avatar-shuffle"
          onClick={() => onChange(randomAvatar())}
          aria-label="Random avatar"
        >
          <Shuffle /> Surprise me
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <Avatar avatar={value} className="size-20" title="Your avatar" />
      <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1">
        {PARTS.map((p) => (
          <div key={p.key} className="flex items-center justify-between gap-1 text-xs font-bold">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => step(p.key, p.max, -1)}
              aria-label={`Previous ${p.label}`}
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-9 text-center">{p.label}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => step(p.key, p.max, 1)}
              aria-label={`Next ${p.label}`}
            >
              <ChevronRight />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="col-span-2 mt-1"
          onClick={() => onChange(randomAvatar())}
        >
          <Shuffle /> Surprise me
        </Button>
      </div>
    </div>
  );
}
