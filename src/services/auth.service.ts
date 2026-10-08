import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function expiryDate() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

async function issueTokens(userId: string, role: string, meta?: { ip?: string; ua?: string }) {
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = signRefreshToken({ sub: userId, role });
  
  await prisma.refreshToken.create({
    data: {
      userId,
      token: hashToken(refreshToken),
      expiresAt: expiryDate(),
      ipAddress: meta?.ip ?? null,
      userAgent: meta?.ua ?? null,
    },
  });

  return { accessToken, refreshToken };
}

export async function registerUser(input: { fullName: string; email: string; password: string; role: 'CUSTOMER' | 'TECHNICIAN'; phone?: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw AppError.conflict('An account with this email already exists');

  const password = await bcrypt.hash(input.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        password,
        role: input.role,
        phone: input.phone ?? null,
      },
    });
    if (input.role === 'TECHNICIAN') {
      await tx.technicianProfile.create({ data: { userId: created.id, skills: [], serviceAreas: [] } });
    }
    return created;
  });

  const tokens = await issueTokens(user.id, user.role);
  return { user, tokens };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (!user) throw AppError.unauthorized('Invalid email or password');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw AppError.unauthorized('Invalid email or password');
  if (!user.isActive) throw AppError.forbidden('This account has been deactivated');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const tokens = await issueTokens(user.id, user.role);
  return { user, tokens };
}

export async function loginWithGoogle(idToken: string, defaultRole: 'CUSTOMER' | 'TECHNICIAN') {
  if (!env.GOOGLE_CLIENT_ID) throw AppError.badRequest('Google sign-in is not configured on this server');

  const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email) throw AppError.badRequest('Invalid Google token');

  let user = await prisma.user.findUnique({ where: { email: payload.email } });

  if (!user) {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: payload.email!,
          fullName: payload.name || payload.email!.split('@')[0]!,
          password: await bcrypt.hash(crypto.randomUUID(), 10),
          role: defaultRole,
          emailVerified: true,
          avatarUrl: payload.picture ?? null,
        },
      });
      if (defaultRole === 'TECHNICIAN') {
        await tx.technicianProfile.create({ data: { userId: created.id, skills: [], serviceAreas: [] } });
      }
      return created;
    });
  }

  const tokens = await issueTokens(user.id, user.role);
  return { user, tokens };
}

export async function refreshTokens(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { token: tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw AppError.unauthorized('Refresh token is no longer valid');
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  return issueTokens(payload.sub, payload.role);
}

export async function logoutUser(refreshToken?: string) {
  if (!refreshToken) return;
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({ where: { token: tokenHash }, data: { revokedAt: new Date() } });
}