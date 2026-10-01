import { createServer } from 'node:http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@drawguess/shared';
import { env } from './config/env';
import { RoomRegistry } from './game/RoomRegistry';
import { WordBank, WordService } from './game/WordService';
import { buildApiRouter, errorHandler } from './routes/api';
import { dbReady } from './services/db';
import { HistoryService } from './services/HistoryService';
import { persistReport } from './services/ReportService';
import { StatsService } from './services/StatsService';
import { SocketGateway } from './sockets/SocketGateway';
import { SocketTransport } from './sockets/SocketTransport';

export interface AppOptions {
  origins?: string[];
}

/** Builds HTTP + Socket.IO servers without listening, so tests can use an ephemeral port. */
export function createApp(opts: AppOptions = {}) {
  const origins = opts.origins ?? env.clientOrigins;
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());
  app.use(
    '/api',
    rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: true, legacyHeaders: false }),
  );

  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: origins, credentials: true },
    maxHttpBufferSize: 64 * 1024,
    pingInterval: 10_000,
    pingTimeout: 15_000,
    transports: ['websocket', 'polling'],
  });

  const bank = new WordBank();
  bank.loadStatic();
  const words = new WordService(bank);
  const history = new HistoryService();
  const stats = new StatsService();
  const registry = new RoomRegistry({
    transport: new SocketTransport(io as never),
    words,
    onGameFinished: (rec, room) => {
      void history.record(rec);
      void stats.recordGame(room, rec);
    },
    onReport: (report, room) => void persistReport(report, room.code),
  });
  registry.startSweeper();

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptimeSec: Math.round(process.uptime()),
      rooms: registry.size,
      db: dbReady() ? 'connected' : 'disabled',
    });
  });
  app.use('/api', buildApiRouter(registry, history));
  app.use(errorHandler);

  new SocketGateway(io as never, registry).start();

  async function shutdown(): Promise<void> {
    registry.shutdown();
    await new Promise<void>((resolve) => io.close(() => resolve()));
  }

  return { app, httpServer, io, registry, bank, history, shutdown };
}
