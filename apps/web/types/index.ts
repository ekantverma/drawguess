export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';
export type SessionStatus = 'idle' | 'joining' | 'joined' | 'needs-identity' | 'error';
export interface SessionError {
  code: string;
  message: string;
}
