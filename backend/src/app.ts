import './lib/query-guard';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env, isTest } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error';
import { apiLimiter } from './middleware/rateLimit';
import openApiSpec from './docs/openapi.json';
import { apiRouter } from './routes';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_URL,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Institution-Id'],
    }),
  );
  if (!isTest) app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/v1/health' } }));
  app.use(
    compression({
      threshold: 1024,
      filter: (req, res) =>
        !String(req.headers.accept ?? '').includes('text/event-stream') && compression.filter(req, res),
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/v1/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });
  app.use(
    '/api/v1/docs',
    helmet({
      contentSecurityPolicy: {
        directives: { 'img-src': ["'self'", 'data:'], 'upgrade-insecure-requests': null },
      },
    }),
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec as object, {
      customSiteTitle: 'ADMITRA API',
      swaggerOptions: { persistAuthorization: true, docExpansion: 'none', tagsSorter: 'alpha' },
    }),
  );

  app.use('/api/v1', apiLimiter, apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
