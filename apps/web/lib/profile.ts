import { AVATAR_LIMITS, type AvatarConfig, type LanguageCode } from '@drawguess/shared';

export interface Profile {
  name: string;
  avatar: AvatarConfig;
  language?: LanguageCode;
}
const PROFILE_KEY = 'drawguess:profile';

export function randomAvatar(): AvatarConfig {
  const r = (n: number) => Math.floor(Math.random() * n);
  return {
    color: r(AVATAR_LIMITS.color),
    eyes: r(AVATAR_LIMITS.eyes),
    mouth: r(AVATAR_LIMITS.mouth),
    hat: r(AVATAR_LIMITS.hat),
  };
}

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}
export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...loadProfile(), ...p }));
  } catch {
    /* storage unavailable (private mode) - profile just will not persist */
  }
}

/** Per-room reconnect credential. sessionStorage => one identity per browser tab, so tabs can play against each other. */
interface RoomSession {
  token: string;
  playerId: string;
}
const key = (code: string) => `drawguess:session:${code.toUpperCase()}`;
export function loadSession(code: string): RoomSession | null {
  try {
    const raw = sessionStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as RoomSession) : null;
  } catch {
    return null;
  }
}
export function saveSession(code: string, s: RoomSession): void {
  try {
    sessionStorage.setItem(key(code), JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
export function clearSession(code: string): void {
  try {
    sessionStorage.removeItem(key(code));
  } catch {
    /* ignore */
  }
}
