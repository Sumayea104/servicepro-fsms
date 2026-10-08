import { Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { writeAuditLog } from '../utils/auditLog.js';
import { notifyUser } from './notification.service.js';
import { withCache, invalidateCache } from '../utils/cache.js';

export async function listUsers(filters: { role?: string; page: number; limit: number }) {
  const where: any = { deletedAt: null };
  if (filters.role) where.role = filters.role as Role;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true, lastLoginAt: true },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) };
}

export async function updateUserRole(adminId: string, userId: string, role: string) {
  const updated = await prisma.$transaction(async (tx) => {
    // Cast string role to Prisma Role Enum
    const user = await tx.user.update({ where: { id: userId }, data: { role: role as Role } });
    await writeAuditLog(tx, { userId: adminId, action: 'USER_ROLE_UPDATED', entity: 'User', entityId: userId, details: { role } });
    return user;
  });
  return updated;
}

export async function deactivateUser(adminId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: userId }, data: { isActive: false, deletedAt: new Date() } });
    await writeAuditLog(tx, { userId: adminId, action: 'USER_DEACTIVATED', entity: 'User', entityId: userId });
    return user;
  });
}

export async function listPendingTechnicians(page: number, limit: number) {
  const where = { isVerified: false };
  const [items, total] = await Promise.all([
    prisma.technicianProfile.findMany({
      where,
      include: { user: { select: { fullName: true, email: true, phone: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.technicianProfile.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function verifyTechnician(adminId: string, technicianId: string, decision: 'APPROVE' | 'REJECT', rejectionReason?: string) {
  const profile = await prisma.technicianProfile.findUnique({ where: { id: technicianId } });
  if (!profile) throw AppError.notFound('Technician profile not found');

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.technicianProfile.update({
      where: { id: technicianId },
      data:
        decision === 'APPROVE'
          ? { isVerified: true, verifiedAt: new Date(), verifiedById: adminId, rejectionReason: null }
          : { isVerified: false, rejectionReason: rejectionReason || 'Not approved' },
    });
    await writeAuditLog(tx, {
      userId: adminId,
      action: decision === 'APPROVE' ? 'TECHNICIAN_VERIFIED' : 'TECHNICIAN_REJECTED',
      entity: 'TechnicianProfile',
      entityId: technicianId,
      details: { rejectionReason },
    });
    await notifyUser(tx, profile.userId, {
      title: decision === 'APPROVE' ? 'You are verified!' : 'Verification not approved',
      message: decision === 'APPROVE' ? 'Your technician profile has been verified. You can now receive job assignments.' : `Your verification was not approved: ${rejectionReason || 'see admin notes'}`,
      type: 'TECHNICIAN_VERIFICATION',
    });
    return updated;
  });

  await invalidateCache('technicians:');
  return result;
}

export async function dashboardStats() {
  return withCache('admin:dashboard-stats', 60, computeDashboardStats);
}

async function computeDashboardStats() {
  const [totalUsers, totalCustomers, totalTechnicians, verifiedTechnicians, jobsByStatus, revenueAgg, avgRating] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: 'CUSTOMER', deletedAt: null } }),
    prisma.user.count({ where: { role: 'TECHNICIAN', deletedAt: null } }),
    prisma.technicianProfile.count({ where: { isVerified: true } }),
    prisma.job.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } }),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.technicianProfile.aggregate({ _avg: { rating: true } }),
  ]);

  return {
    totalUsers,
    totalCustomers,
    totalTechnicians,
    verifiedTechnicians,
    jobsByStatus: Object.fromEntries(jobsByStatus.map((j) => [j.status, j._count])),
    totalRevenue: revenueAgg._sum.amount || 0,
    averageTechnicianRating: Math.round((avgRating._avg.rating || 0) * 100) / 100,
  };
}

export async function listAuditLogs(filters: { entity?: string; page: number; limit: number }) {
  const where: any = {};
  if (filters.entity) where.entity = filters.entity;
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { fullName: true, email: true, role: true } } },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) };
}

export async function upsertSystemSetting(adminId: string, key: string, value: any, description?: string) {
  return prisma.systemSetting.upsert({
    where: { key },
    create: { key, value, description: description ?? null, updatedById: adminId },
    update: { value, description: description ?? null, updatedById: adminId },
  });
}