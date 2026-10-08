import { prisma } from '../config/prisma.js';
import { broadcastToUser } from '../ws/notifier.js';

/** Persists a notification and pushes it live over WS if the user has an open connection. */
export async function notifyUser(
  tx: any,
  userId: string,
  input: { title: string; message: string; type?: string; link?: string; metadata?: any }
) {
  const notification = await tx.notification.create({
    data: {
      userId,
      title: input.title,
      message: input.message,
      type: input.type || 'INFO',
      link: input.link,
      metadata: input.metadata ?? undefined,
    },
  });
  broadcastToUser(userId, { type: 'notification', payload: notification });
  return notification;
}
