'use client';
import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/stores/gameStore';

export function ConnectionBadge() {
  const c = useGameStore((s) => s.connection);
  if (c === 'connected')
    return (
      <Badge variant="success">
        <Wifi className="size-3" /> Live
      </Badge>
    );
  return (
    <Badge variant={c === 'connecting' ? 'secondary' : 'destructive'} role="status">
      <WifiOff className="size-3" /> {c === 'connecting' ? 'Reconnecting…' : 'Offline'}
    </Badge>
  );
}
