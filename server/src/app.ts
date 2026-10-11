import express, { type ErrorRequestHandler, type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import {
  recommendationsRequestSchema, recommendationsResponseSchema, planRequestSchema,
  planResponseSchema, diagnosisResponseSchema
} from '../../shared/src/contracts.js';
import { ApiError, GroqProvider, fileSignatureMatches, visionEnabled, type AiProvider } from './ai.js';

const asyncRoute = (fn: (req: express.Request, res: express.Response) => Promise<void>): express.RequestHandler =>
  (req, res, next) => { Promise.resolve(fn(req, res)).catch(next); };
function parseProvider<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiError(502, 'INVALID_AI_RESPONSE', 'AI returned an incomplete answer. Please try again.');
  return parsed.data;
}
const stringsSchema = z.object({ plantName: z.string().trim().max(120).default(''), symptoms: z.string().trim().max(500).default('') });
export type AppOptions = { ai?: AiProvider; env?: NodeJS.ProcessEnv };
export function createApp({ ai, env = process.env }: AppOptions = {}): Express {
  const app = express();
  const service = ai ?? new GroqProvider(env);
  app.disable('x-powered-by');
  app.use(helmet());
  const origins = (env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(o => o.trim());
  app.use(cors({ origin(origin, cb) { if (!origin || origins.includes(origin)) cb(null, true); else cb(new ApiError(403, 'ORIGIN_FORBIDDEN', 'Origin is not allowed.')); } }));
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/capabilities', (_req, res) => res.json({
    recommendations: Boolean(env.GROQ_API_KEY?.trim() && env.GROQ_TEXT_MODEL?.trim()),
    diagnosis: visionEnabled(env)
  }));
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 45, standardHeaders: 'draft-7', legacyHeaders: false,
    handler(_req, res) { res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many AI requests. Try again later.' } }); } });
  app.use('/api/recommendations', limiter);
  app.use('/api/plans', limiter);
  app.use('/api/diagnose', limiter);
  app.post('/api/recommendations', asyncRoute(async (req, res) => {
    const body = recommendationsRequestSchema.parse(req.body);
    const response = parseProvider(recommendationsResponseSchema, await service.recommendations(body.preferences));
    res.json(response);
  }));
  app.post('/api/plans', asyncRoute(async (req, res) => {
    const body = planRequestSchema.parse(req.body);
    const response = parseProvider(planResponseSchema, await service.plan(body.preferences, body.selectedPlant));
    res.json(response);
  }));
  const maxMb = Math.min(15, Math.max(1, Number(env.MAX_IMAGE_SIZE_MB) || 5));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxMb * 1024 * 1024, files: 1, fields: 2 },
    fileFilter(_req, file, cb) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) cb(new ApiError(415, 'INVALID_IMAGE_TYPE', 'Choose a PNG, JPG, or WebP image.'));
      else cb(null, true);
    } }).single('image');
  app.post('/api/diagnose', (req, res, next) => {
    if (!visionEnabled(env)) return next(new ApiError(503, 'VISION_UNAVAILABLE', 'Photo diagnosis is unavailable until a compatible vision model is configured and verified.'));
    upload(req, res, error => error ? next(error) : next());
  }, asyncRoute(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'IMAGE_REQUIRED', 'Upload a plant photo to continue.');
    if (!fileSignatureMatches(req.file)) throw new ApiError(415, 'INVALID_IMAGE_CONTENT', 'This file is not a supported image.');
    const fields = stringsSchema.parse(req.body);
    const response = parseProvider(diagnosisResponseSchema, await service.diagnose({ image: req.file.buffer, mime: req.file.mimetype, ...fields }));
    res.json(response);
  }));
  app.use('/api', (_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'The requested endpoint does not exist.')));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof ApiError) { res.status(error.status).json({ error: { code: error.code, message: error.message } }); return; }
    if (error instanceof z.ZodError) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input or incomplete response. Check your details and try again.' } }); return; }
    if (error instanceof multer.MulterError) {
      res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: { code: error.code === 'LIMIT_FILE_SIZE' ? 'IMAGE_TOO_LARGE' : 'INVALID_UPLOAD', message: error.code === 'LIMIT_FILE_SIZE' ? `Image must be under ${maxMb} MB.` : 'Invalid upload. Choose one supported photo.' } }); return;
    }
    if (error instanceof SyntaxError && 'body' in error) { res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' } }); return; }
    if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') { res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request is too large.' } }); return; }
    // Never emit unknown provider/internal exception contents to the browser.
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server. Please try again.' } });
  };
  app.use(errors);
  return app;
}
