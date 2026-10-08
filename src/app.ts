import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import router from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import * as paymentController from './controllers/payment.controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL === '*' ? true : env.FRONTEND_URL, credentials: true }));
app.use(compression());
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(globalRateLimiter);
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ success: true, message: 'ServicePro FSMS API is running', data: { time: new Date().toISOString() } }));

try {
  const swaggerDocument = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch {
  // openapi.yaml not present — Swagger UI simply won't be mounted, not a startup blocker
}

app.use('/api/v1', router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
