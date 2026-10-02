const MUTED_KEY = 'drawguess:sounds-muted';

let context: AudioContext | undefined;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  context ??= new window.AudioContext();
  return context;
}

export function primeGameAudio(): void {
  const audio = getContext();
  if (audio?.state === 'suspended') void audio.resume().catch(() => {});
}

function playTone(frequency: number, duration: number, offset = 0): void {
  if (typeof window === 'undefined' || localStorage.getItem(MUTED_KEY) === 'true') return;
  const audio = getContext();
  if (!audio) return;

  const play = () => {
    const start = audio.currentTime + offset;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  };

  if (audio.state === 'suspended') void audio.resume().then(play).catch(() => {});
  else play();
}

export function playWordChoice(): void {
  playTone(520, 0.08);
}

export function playRoundStart(): void {
  playTone(660, 0.09);
  playTone(880, 0.11, 0.085);
}

export function playCountdownTick(): void {
  playTone(740, 0.055);
}

export function setGameSoundsMuted(muted: boolean): void {
  try {
    if (muted) localStorage.setItem(MUTED_KEY, 'true');
    else localStorage.removeItem(MUTED_KEY);
  } catch {
    // Audio remains enabled for this session when storage is unavailable.
  }
}

export function areGameSoundsMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}