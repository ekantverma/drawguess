import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border-2 border-border text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-chunk-sm hover:-translate-y-px hover:shadow-chunk',
        secondary:
          'bg-secondary text-secondary-foreground shadow-chunk-sm hover:-translate-y-px hover:shadow-chunk',
        accent:
          'bg-accent text-accent-foreground shadow-chunk-sm hover:-translate-y-px hover:shadow-chunk',
        outline: 'bg-card text-card-foreground shadow-chunk-sm hover:bg-muted',
        ghost: 'border-transparent hover:bg-muted active:translate-x-0 active:translate-y-0',
        destructive:
          'bg-destructive text-destructive-foreground shadow-chunk-sm hover:-translate-y-px hover:shadow-chunk',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';
