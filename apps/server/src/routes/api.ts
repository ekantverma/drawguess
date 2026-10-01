import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { CATEGORIES, LANGUAGES, LIMITS, roomCodeSchema, WORD_MODES } from '@drawguess/shared';
import { env } from '../config/env';
import { GameError } from '../game/errors';
import type { RoomRegistry } from '../game/RoomRegistry';
import {
  COOKIE_NAME,
  login,
  loginSchema,
  profile,
  register,
  registerSchema,
  signToken,
  verifyToken,
} from '../services/AuthService';
import { dbReady } from '../services/db';
import type { HistoryService } from '../services/HistoryService';

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown> | unknown) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res)).catch(next);

export function buildApiRouter(registry: RoomRegistry, history: HistoryService): Router {
  const r = Router();
  const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  r.get('/meta', (_req, res) => {
    res.json({
      languages: LANGUAGES,
      categories: CATEGORIES,
      wordModes: WORD_MODES,
      limits: LIMITS,
    });
  });

  r.get('/rooms/public', (_req, res) => {
    res.json({ rooms: registry.publicRooms() });
  });

  r.get('/rooms/:code', (req, res) => {
    const parsed = roomCodeSchema.safeParse(req.params.code);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: { code: 'INVALID_CODE', message: 'Room codes have 6 characters' } });
    res.json(registry.lookup(parsed.data));
  });

  r.get(
    '/history/recent',
    wrap(async (req, res) => {
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      res.json({ games: await history.recent(limit), persisted: dbReady() });
    }),
  );
  r.get(
    '/history/:id',
    wrap(async (req, res) => {
      const rec = await history.byId(String(req.params.id));
      if (!rec)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Game not found' } });
      res.json(rec);
    }),
  );

  // ---- accounts (optional; guests can always play) ----
  const setCookie = (res: Response, userId: string) =>
    res.cookie(COOKIE_NAME, signToken(userId), {
      httpOnly: true,
      secure: env.isProd,
      sameSite: env.isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
      domain: env.COOKIE_DOMAIN,
    });
  r.post(
    '/auth/register',
    authLimiter,
    wrap(async (req, res) => {
      const user = await register(registerSchema.parse(req.body));
      setCookie(res, user.id);
      res.status(201).json({ user });
    }),
  );
  r.post(
    '/auth/login',
    authLimiter,
    wrap(async (req, res) => {
      const user = await login(loginSchema.parse(req.body));
      setCookie(res, user.id);
      res.json({ user });
    }),
  );
  r.post('/auth/logout', (_req, res) => {
    res.clearCookie(COOKIE_NAME, {
      domain: env.COOKIE_DOMAIN,
      sameSite: env.isProd ? 'none' : 'lax',
      secure: env.isProd,
    });
    res.json({ ok: true });
  });
  r.get(
    '/auth/me',
    wrap(async (req, res) => {
      const id = verifyToken(req.cookies?.[COOKIE_NAME]);
      if (!id) return res.json({ user: null, dbEnabled: dbReady() });
      res.json({ user: await profile(id), dbEnabled: dbReady() });
    }),
  );

  return r;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof GameError) {
    res
      .status(err.code === 'DB_UNAVAILABLE' ? 503 : 400)
      .json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err && typeof err === 'object' && 'issues' in err) {
    const issue = (err as { issues: { message: string }[] }).issues[0];
    res
      .status(400)
      .json({ error: { code: 'INVALID_INPUT', message: issue?.message ?? 'Invalid input' } });
    return;
  }
  console.error('[http]', err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
}
