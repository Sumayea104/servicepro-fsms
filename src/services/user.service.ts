import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, fullName: true, phone: true, role: true, avatarUrl: true, createdAt: true,
      technician: { include: { availability: true } },
    },
  });
  if (!user) throw AppError.notFound('User not found');
  return user;
}

export async function updateMe(userId: string, input: { fullName?: string; phone?: string; avatarUrl?: string }) {
  return prisma.user.update({ where: { id: userId }, data: input });
}
