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
}: {
  value: AvatarConfig;
  onChange: (a: AvatarConfig) => void;
}) {
  const step = (key: keyof AvatarConfig, max: number, d: number) =>
    onChange({ ...value, [key]: (value[key] + d + max) % max });
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
