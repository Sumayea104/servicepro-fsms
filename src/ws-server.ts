import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { attachWebSocketServer } from './ws/notifier.js';

// Combined REST + WebSocket server — this is what's deployed on Render
// (see render.yaml, startCommand: npm run start:ws). One long-running
// process can hold persistent WS connections, which a serverless
// platform like Vercel cannot, so this is deliberately the non-Vercel path.
const httpServer = http.createServer(app);
attachWebSocketServer(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`ServicePro FSMS API + WebSocket server listening on port ${env.PORT}`);
});
