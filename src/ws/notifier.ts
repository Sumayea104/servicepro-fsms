import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyAccessToken } from '../utils/jwt.js';
import { logger } from '../config/logger.js';


const connections = new Map<string, Set<WebSocket>>();

export function attachWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (socket, req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const token = url.searchParams.get('token');
    if (!token) {
      socket.close(4001, 'Missing auth token');
      return;
    }

    let userId: string;
    try {
      userId = verifyAccessToken(token).sub;
    } catch {
      socket.close(4001, 'Invalid or expired token');
      return;
    }

    if (!connections.has(userId)) connections.set(userId, new Set());
    connections.get(userId)!.add(socket);
    logger.debug({ userId }, 'WS client connected');

    socket.on('close', () => {
      connections.get(userId)?.delete(socket);
      if (connections.get(userId)?.size === 0) connections.delete(userId);
    });
  });

  logger.info('WebSocket server attached at /ws');
  return wss;
}

export function broadcastToUser(userId: string, event: { type: string; payload: unknown }) {
  const sockets = connections.get(userId);
  if (!sockets) return;
  const message = JSON.stringify(event);
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
  }
}
