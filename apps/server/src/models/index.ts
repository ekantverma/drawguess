import mongoose, { type Model, type Schema as SchemaType } from 'mongoose';

// Default import + destructure: named imports from mongoose (CJS) break in native ESM builds.
const { Schema, model, models } = mongoose;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

function make(name: string, schema: SchemaType): Model<Doc> {
  return (models[name] as Model<Doc>) ?? model<Doc>(name, schema);
}

export const WordModel = make(
  'Word',
  new Schema(
    {
      text: { type: String, required: true, trim: true },
      category: { type: String, required: true, index: true },
      difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
      language: { type: String, required: true, default: 'en', index: true },
      enabled: { type: Boolean, default: true },
    },
    { timestamps: true },
  ).index({ text: 1, language: 1 }, { unique: true }),
);

export const UserModel = make(
  'User',
  new Schema(
    {
      username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 2,
        maxlength: 20,
      },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true, select: false },
      avatar: { color: Number, eyes: Number, mouth: Number, hat: Number },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
  ),
);

export const PlayerStatisticsModel = make(
  'PlayerStatistics',
  new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    correctGuesses: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
  }),
);

export const GameHistoryModel = make(
  'GameHistory',
  new Schema(
    {
      recordId: { type: String, required: true, unique: true },
      roomCode: String,
      roomName: String,
      participants: [
        {
          name: String,
          avatar: { color: Number, eyes: Number, mouth: Number, hat: Number },
          _id: false,
        },
      ],
      winner: { type: { name: String, score: Number, _id: false }, default: null },
      finalScores: { type: Schema.Types.Mixed, default: [] },
      turns: { type: Schema.Types.Mixed, default: [] },
      roundsPlayed: Number,
      durationMs: Number,
      endedAt: Date,
    },
    { timestamps: { createdAt: true, updatedAt: false } },
  ).index({ createdAt: -1 }),
);

export const ReportModel = make(
  'Report',
  new Schema(
    {
      roomCode: String,
      reporterName: String,
      targetName: String,
      reason: String,
      details: String,
    },
    { timestamps: { createdAt: true, updatedAt: false } },
  ),
);
