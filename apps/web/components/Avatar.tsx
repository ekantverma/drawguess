import { AVATAR_LIMITS, type AvatarConfig } from '@drawguess/shared';
import { cn } from '@/lib/utils';

const BG = [
  '#ffb4a2',
  '#ffd166',
  '#95e1d3',
  '#a0c4ff',
  '#cdb4ff',
  '#ffafcc',
  '#b9fbc0',
  '#fdc5f5',
  '#ffc8a2',
  '#9bf6ff',
  '#bdb2ff',
  '#f6e58d',
];
const INK = '#1d1b4b';

function Eyes({ v }: { v: number }) {
  switch (v) {
    case 1: // wide
      return (
        <g fill="#fff" stroke={INK} strokeWidth="1.5">
          <circle cx="14" cy="18" r="4" />
          <circle cx="26" cy="18" r="4" />
          <circle cx="14.5" cy="18" r="1.6" fill={INK} />
          <circle cx="25.5" cy="18" r="1.6" fill={INK} />
        </g>
      );
    case 2: // happy arcs
      return (
        <path
          d="M10 19q4-5 8 0M22 19q4-5 8 0"
          fill="none"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
        />
      );
    case 3: // sleepy
      return <path d="M10 18h8M22 18h8" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />;
    case 4: // glasses
      return (
        <g fill="#fff" stroke={INK} strokeWidth="1.8">
          <circle cx="14" cy="18" r="4.5" />
          <circle cx="26" cy="18" r="4.5" />
          <path d="M18.5 18h3" />
          <circle cx="14" cy="18" r="1.4" fill={INK} />
          <circle cx="26" cy="18" r="1.4" fill={INK} />
        </g>
      );
    case 5: // stars
      return (
        <path
          d="M14 14l1.2 3 3 .3-2.3 2 .8 3-2.7-1.7-2.7 1.7.8-3-2.3-2 3-.3zM26 14l1.2 3 3 .3-2.3 2 .8 3-2.7-1.7-2.7 1.7.8-3-2.3-2 3-.3z"
          fill={INK}
        />
      );
    default:
      return (
        <g fill={INK}>
          <circle cx="14" cy="18" r="2.4" />
          <circle cx="26" cy="18" r="2.4" />
        </g>
      );
  }
}
function Mouth({ v }: { v: number }) {
  const s = { fill: 'none', stroke: INK, strokeWidth: 2, strokeLinecap: 'round' as const };
  switch (v) {
    case 1:
      return (
        <path
          d="M14 27q6 7 12 0z"
          fill="#fff"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      );
    case 2:
      return <path d="M15 29h10" {...s} />;
    case 3:
      return <path d="M15 28q5 3 11-2" {...s} />;
    case 4:
      return (
        <g>
          <path d="M14 27q6 6 12 0" {...s} />
          <path d="M18 30q2 4 4 0z" fill="#ff6b81" stroke={INK} strokeWidth="1.2" />
        </g>
      );
    case 5:
      return <ellipse cx="20" cy="29" rx="3" ry="3.4" fill={INK} />;
    default:
      return <path d="M14 27q6 6 12 0" {...s} />;
  }
}
function Hat({ v }: { v: number }) {
  switch (v) {
    case 1:
      return (
        <path
          d="M8 13q2-9 14-8 8 1 10 8z"
          fill="#ef476f"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      );
    case 2:
      return (
        <path
          d="M20 -1l7 13H13z"
          fill="#ffd166"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      );
    case 3:
      return (
        <path
          d="M9 11l2-8 5 5 4-7 4 7 5-5 2 8z"
          fill="#ffd166"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      );
    case 4:
      return (
        <path
          d="M8 13q0-10 12-10t12 10z"
          fill="#06d6a0"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      );
    case 5:
      return (
        <path
          d="M20 8l-8-4v8zM20 8l8-4v8z"
          fill="#ff6b9a"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      );
    default:
      return null;
  }
}

export function Avatar({
  avatar,
  className,
  title,
}: {
  avatar: AvatarConfig;
  className?: string;
  title?: string;
}) {
  const clamp = (n: number, max: number) => Math.min(Math.max(0, n | 0), max - 1);
  const color = BG[clamp(avatar.color, AVATAR_LIMITS.color)];
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn('size-10 shrink-0 overflow-visible', className)}
      role="img"
      aria-label={title ?? 'avatar'}
    >
      <circle cx="20" cy="21" r="16.5" fill={color} stroke={INK} strokeWidth="2.2" />
      <Eyes v={clamp(avatar.eyes, AVATAR_LIMITS.eyes)} />
      <Mouth v={clamp(avatar.mouth, AVATAR_LIMITS.mouth)} />
      <Hat v={clamp(avatar.hat, AVATAR_LIMITS.hat)} />
    </svg>
  );
}
