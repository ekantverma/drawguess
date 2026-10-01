import { z } from 'zod';
import {
  AVATAR_LIMITS,
  CANVAS,
  CATEGORIES,
  LANGUAGES,
  LIMITS,
  REPORT_REASONS,
  WORD_MODES,
} from './constants';
import { cleanCustomWord, cleanText } from './text';

const langCodes = LANGUAGES.map((l) => l.code) as string[];

export const playerNameSchema = z
  .string()
  .transform(cleanText)
  .pipe(
    z
      .string()
      .min(LIMITS.playerName.min, `Name must be at least ${LIMITS.playerName.min} characters`)
      .max(LIMITS.playerName.max, `Name must be at most ${LIMITS.playerName.max} characters`),
  );

export const avatarSchema = z.object({
  color: z
    .number()
    .int()
    .min(0)
    .max(AVATAR_LIMITS.color - 1),
  eyes: z
    .number()
    .int()
    .min(0)
    .max(AVATAR_LIMITS.eyes - 1),
  mouth: z
    .number()
    .int()
    .min(0)
    .max(AVATAR_LIMITS.mouth - 1),
  hat: z
    .number()
    .int()
    .min(0)
    .max(AVATAR_LIMITS.hat - 1),
});

export const roomCodeSchema = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(
    z
      .string()
      .length(LIMITS.roomCodeLength, 'Room codes have 6 characters')
      .regex(/^[A-Z0-9]+$/),
  );

export const customWordsSchema = z
  .array(z.string())
  .max(LIMITS.customWords, `At most ${LIMITS.customWords} custom words`)
  .superRefine((list, ctx) => {
    list.forEach((w, i) => {
      if (!cleanCustomWord(w)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [i],
          message: `"${w.slice(0, 30)}" is not a valid word (2-30 letters, max 3 words)`,
        });
      }
    });
  })
  .transform((list) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const w of list) {
      const c = cleanCustomWord(w);
      if (c && !seen.has(c.toLowerCase())) {
        seen.add(c.toLowerCase());
        out.push(c);
      }
    }
    return out;
  });

export const settingsSchema = z
  .object({
    roomName: z
      .string()
      .transform(cleanText)
      .pipe(z.string().min(LIMITS.roomName.min, 'Room name is too short').max(LIMITS.roomName.max)),
    maxPlayers: z.number().int().min(LIMITS.maxPlayers.min).max(LIMITS.maxPlayers.max),
    rounds: z.number().int().min(LIMITS.rounds.min).max(LIMITS.rounds.max),
    drawTime: z.number().int().min(LIMITS.drawTime.min).max(LIMITS.drawTime.max),
    wordCount: z.number().int().min(LIMITS.wordCount.min).max(LIMITS.wordCount.max),
    hints: z.number().int().min(LIMITS.hints.min).max(LIMITS.hints.max),
    wordMode: z.enum(WORD_MODES),
    language: z.string().refine((c) => langCodes.includes(c), 'Unsupported language'),
    categories: z.array(z.enum(CATEGORIES)).max(CATEGORIES.length),
    customWords: customWordsSchema,
    customWordsOnly: z.boolean(),
    isPublic: z.boolean(),
  })
  .superRefine((s, ctx) => {
    if (s.customWordsOnly && s.customWords.length < s.wordCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customWords'],
        message: `Add at least ${s.wordCount} custom words to use only custom words`,
      });
    }
  });

export const defaultSettings = {
  roomName: 'Doodle Den',
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  wordMode: 'normal',
  language: 'en',
  categories: [],
  customWords: [],
  customWordsOnly: false,
  isPublic: false,
} as const;

export const createRoomSchema = z.object({
  hostName: playerNameSchema,
  avatar: avatarSchema,
  settings: settingsSchema,
});

export const joinRoomSchema = z.object({
  roomCode: roomCodeSchema,
  playerName: playerNameSchema,
  avatar: avatarSchema,
  playerToken: z.string().min(10).max(100).optional(),
  spectate: z.boolean().optional(),
});

export const readySchema = z.object({ ready: z.boolean() });
export const wordChosenSchema = z.object({ word: z.string().min(1).max(60) });
export const textSchema = z.object({
  text: z.string().transform(cleanText).pipe(z.string().min(1).max(LIMITS.chatLength)),
});
export const playerIdSchema = z.object({ playerId: z.string().min(1).max(60) });
export const kickSchema = z.object({
  playerId: z.string().min(1).max(60),
  ban: z.boolean().optional(),
});
export const votekickSchema = z.object({ targetId: z.string().min(1).max(60) });
export const reportSchema = z.object({
  targetId: z.string().min(1).max(60),
  reason: z.enum(REPORT_REASONS),
  details: z.string().transform(cleanText).pipe(z.string().max(LIMITS.reportDetails)).optional(),
});
export const replayRequestSchema = z.object({
  turn: z.number().int().min(0).max(10000).optional(),
});

const unit = z.number().min(0).max(1);
const strokeId = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/);
export const drawStartSchema = z.object({
  id: strokeId,
  x: unit,
  y: unit,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  width: z.number().min(1).max(60),
  tool: z.enum(['brush', 'eraser']),
});
export const drawMoveSchema = z.object({
  id: strokeId,
  points: z
    .array(unit)
    .min(2)
    .max(400)
    .refine((p) => p.length % 2 === 0, 'points must be x,y pairs'),
});
export const drawEndSchema = z.object({ id: strokeId });

export const maxStrokePoints = CANVAS.maxPointsPerStroke;
