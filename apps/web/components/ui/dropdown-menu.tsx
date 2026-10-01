'use client';
import * as React from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof Menu.Content>,
  React.ComponentPropsWithoutRef<typeof Menu.Content>
>(({ className, sideOffset = 6, ...p }, ref) => (
  <Menu.Portal>
    <Menu.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn('chunk z-50 min-w-44 p-1 data-[state=open]:animate-pop', className)}
      {...p}
    />
  </Menu.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof Menu.Item>,
  React.ComponentPropsWithoutRef<typeof Menu.Item> & { destructive?: boolean }
>(({ className, destructive, ...p }, ref) => (
  <Menu.Item
    ref={ref}
    className={cn(
      'flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-2 text-sm font-semibold outline-none data-[highlighted]:bg-muted [&_svg]:size-4',
      destructive && 'text-destructive',
      className,
    )}
    {...p}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';
export const DropdownMenuSeparator = () => <Menu.Separator className="my-1 h-px bg-border/30" />;
export const DropdownMenuLabel = ({
  className,
  ...p
}: React.ComponentPropsWithoutRef<typeof Menu.Label>) => (
  <Menu.Label
    className={cn('px-2.5 py-1 text-xs font-bold text-muted-foreground', className)}
    {...p}
  />
);
