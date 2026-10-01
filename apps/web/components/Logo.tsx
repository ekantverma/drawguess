import Link from 'next/link';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-9', className)} aria-hidden>
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="10"
        className="fill-secondary stroke-border"
        strokeWidth="2.5"
      />
      <path
        d="M9 26c4-10 7 4 11-6s7 2 11-5"
        fill="none"
        className="stroke-border"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="31" cy="11" r="2.5" className="fill-accent stroke-border" strokeWidth="1.5" />
    </svg>
  );
}

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight',
        className,
      )}
    >
      <LogoMark />
      DrawGuess
    </Link>
  );
}
