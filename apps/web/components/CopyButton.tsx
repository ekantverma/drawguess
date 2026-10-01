'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button, type ButtonProps } from '@/components/ui/button';

export function CopyButton({
  value,
  label,
  children,
  ...props
}: { value: string; label: string } & ButtonProps) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      toast.success(`${label} copied`);
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error('Copy failed. Select the text and copy it manually.');
    }
  };
  return (
    <Button type="button" onClick={copy} {...props}>
      {done ? <Check /> : <Copy />}
      {children}
    </Button>
  );
}
