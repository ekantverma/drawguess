'use client';
import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  areGameSoundsMuted,
  primeGameAudio,
  setGameSoundsMuted,
} from '@/lib/gameSounds';

export function GameSoundToggle() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(areGameSoundsMuted());
    const unlock = () => {
      if (!areGameSoundsMuted()) primeGameAudio();
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  const toggle = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    setGameSoundsMuted(nextMuted);
    if (!nextMuted) primeGameAudio();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={muted ? 'Turn game sounds on' : 'Turn game sounds off'}
      title={muted ? 'Turn game sounds on' : 'Turn game sounds off'}
    >
      {muted ? <VolumeX /> : <Volume2 />}
    </Button>
  );
}