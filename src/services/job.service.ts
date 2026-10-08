import { JobStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { writeAuditLog } from '../utils/auditLog.js';
import { notifyUser } from './notification.service.js';
import { invalidateCache } from '../utils/cache.js';
import { JOB_TRANSITIONS, DEFAULT_JOB_DURATION_MINUTES } from '../constants.js';
import type { AuthUser } from '../types/express.js';

export async function createJob(customerId: string, input: any) {
  const job = await prisma.$transaction(async (tx) => {
    const created = await tx.job.create({
      data: {
        customerId,
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        tags: input.tags || [],
        estimatedCost: input.estimatedCost,
      },
    });
    await tx.jobLog.create({ data: { jobId: created.id, newStatus: 'PENDING', changedById: customerId, note: 'Job created by customer' } });
    await writeAuditLog(tx, { userId: customerId, action: 'JOB_CREATED', entity: 'Job', entityId: created.id });
    return created;
  });
  return job;
}

export async function listJobs(
  actor: AuthUser,
  filters: { status?: string; category?: string; priority?: string; page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
) {
  const where: any = { deletedAt: null };
  if (filters.status) where.status = filters.status as JobStatus;
  if (filters.category) where.category = filters.category;
  if (filters.priority) where.priority = filters.priority;

  if (actor.role === 'CUSTOMER') where.customerId = actor.id;
  if (actor.role === 'TECHNICIAN') {
    const profile = await prisma.technicianProfile.findUnique({ where: { userId: actor.id } });
    where.technicianId = profile?.id || '__none__';
  }

  const orderBy = { [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc' };

  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true, email: true, phone: true } },
        technician: { include: { user: { select: { fullName: true, phone: true } } } },
      },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy,
    }),
    prisma.job.count({ where }),
  ]);

  return { items, total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) };
}

export async function searchJobs(q: string, page: number, limit: number) {
  const where = {
    deletedAt: null,
    OR: [
      { title: { contains: q, mode: 'insensitive' as const } },
      { description: { contains: q, mode: 'insensitive' as const } },
      { address: { contains: q, mode: 'insensitive' as const } },
    ],
  };
  const [items, total] = await Promise.all([
    prisma.job.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.job.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getJobById(id: string, actor: AuthUser) {
  const job = await prisma.job.findFirst({
    where: { id, deletedAt: null },
    include: {
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      technician: { include: { user: { select: { id: true, fullName: true, phone: true, avatarUrl: true } } } },
      payment: true,
      review: true,
      serviceReport: true,
      attachments: true,
      logs: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!job) throw AppError.notFound('Job not found');

  if (actor.role === 'CUSTOMER' && job.customerId !== actor.id) throw AppError.forbidden('You can only view your own jobs');
  if (actor.role === 'TECHNICIAN') {
    const profile = await prisma.technicianProfile.findUnique({ where: { userId: actor.id } });
    if (job.technicianId !== profile?.id) throw AppError.forbidden('This job is not assigned to you');
  }

  return job;
}

export async function reviewJob(jobId: string, reviewerId: string, decision: 'APPROVE' | 'REJECT', cancellationReason?: string) {
  const job = await prisma.job.findFirst({ where: { id: jobId, deletedAt: null } });
  if (!job) throw AppError.notFound('Job not found');
  if (job.status !== 'PENDING') throw AppError.badRequest(`Only PENDING jobs can be reviewed (current status: ${job.status})`);

  if (decision === 'REJECT') {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id: jobId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: cancellationReason || 'Rejected during manager review' },
      });
      await tx.jobLog.create({ data: { jobId, oldStatus: 'PENDING', newStatus: 'CANCELLED', changedById: reviewerId, note: 'Rejected during review' } });
      await writeAuditLog(tx, { userId: reviewerId, action: 'JOB_REJECTED', entity: 'Job', entityId: jobId, details: { cancellationReason } });
      await notifyUser(tx, job.customerId, { title: 'Service request rejected', message: `Your request "${job.title}" was not approved.`, type: 'JOB_REJECTED', link: `/jobs/${jobId}` });
      return updated;
    });
  }

  await writeAuditLog(prisma, { userId: reviewerId, action: 'JOB_APPROVED', entity: 'Job', entityId: jobId });
  return job;
}

export async function assignJob(jobId: string, adminId: string, technicianId: string, scheduledAt: Date) {
  const job = await prisma.job.findFirst({ where: { id: jobId, deletedAt: null } });
  if (!job) throw AppError.notFound('Job not found');
  if (job.status !== 'PENDING') throw AppError.badRequest(`Only PENDING jobs can be assigned (current status: ${job.status})`);

  const technician = await prisma.technicianProfile.findUnique({ where: { id: technicianId } });
  if (!technician) throw AppError.notFound('Technician not found');
  if (!technician.isAvailable) throw AppError.badRequest('This technician is currently marked unavailable');

  const windowStart = new Date(scheduledAt.getTime() - DEFAULT_JOB_DURATION_MINUTES * 60 * 1000);
  const windowEnd = new Date(scheduledAt.getTime() + DEFAULT_JOB_DURATION_MINUTES * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, technicianId);

    const conflict = await tx.job.findFirst({
      where: {
        technicianId,
        status: { in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] },
        scheduledAt: { gte: windowStart, lte: windowEnd },
        deletedAt: null,
      },
    });
    if (conflict) {
      throw AppError.conflict('This technician already has a job scheduled in that window', [
        { jobId: conflict.id, scheduledAt: conflict.scheduledAt },
      ]);
    }

    const updated = await tx.job.update({
      where: { id: jobId },
      data: { technicianId, assignedById: adminId, status: 'ASSIGNED', assignedAt: new Date(), scheduledAt },
    });

    await tx.jobLog.create({ data: { jobId, oldStatus: 'PENDING', newStatus: 'ASSIGNED', changedById: adminId, note: `Assigned to technician ${technicianId}` } });
    await writeAuditLog(tx, { userId: adminId, action: 'JOB_ASSIGNED', entity: 'Job', entityId: jobId, details: { technicianId, scheduledAt } });
    await notifyUser(tx, technician.userId, { title: 'New job assigned', message: `You've been assigned: "${job.title}"`, type: 'JOB_ASSIGNED', link: `/jobs/${jobId}` });
    await notifyUser(tx, job.customerId, { title: 'Technician assigned', message: `A technician has been assigned to your request "${job.title}"`, type: 'JOB_ASSIGNED', link: `/jobs/${jobId}` });

    return updated;
  });

  await invalidateCache('technicians:');
  return result;
}

export async function rescheduleJob(jobId: string, actorId: string, scheduledAt: Date) {
  const job = await prisma.job.findFirst({ where: { id: jobId, deletedAt: null } });
  if (!job) throw AppError.notFound('Job not found');
  if (!job.technicianId) throw AppError.badRequest('This job has no technician assigned yet');
  if (!['ASSIGNED', 'ACCEPTED'].includes(job.status)) throw AppError.badRequest(`Cannot reschedule a job in status ${job.status}`);

  const windowStart = new Date(scheduledAt.getTime() - DEFAULT_JOB_DURATION_MINUTES * 60 * 1000);
  const windowEnd = new Date(scheduledAt.getTime() + DEFAULT_JOB_DURATION_MINUTES * 60 * 1000);
  const technicianId = job.technicianId;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, technicianId);

    const conflict = await tx.job.findFirst({
      where: { technicianId, id: { not: jobId }, status: { in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] }, scheduledAt: { gte: windowStart, lte: windowEnd }, deletedAt: null },
    });
    if (conflict) throw AppError.conflict('This technician already has a job scheduled in that window');

    const updated = await tx.job.update({ where: { id: jobId }, data: { scheduledAt } });
    await tx.jobLog.create({ data: { jobId, newStatus: job.status, changedById: actorId, note: `Rescheduled to ${scheduledAt.toISOString()}` } });
    await writeAuditLog(tx, { userId: actorId, action: 'JOB_RESCHEDULED', entity: 'Job', entityId: jobId, details: { scheduledAt } });
    return updated;
  });
}

export async function updateJobStatus(jobId: string, actor: AuthUser, status: JobStatus, extra: { cancellationReason?: string; finalCost?: number }) {
  const job = await prisma.job.findFirst({ where: { id: jobId, deletedAt: null }, include: { technician: true } });
  if (!job) throw AppError.notFound('Job not found');

  const allowed = JOB_TRANSITIONS[job.status as keyof typeof JOB_TRANSITIONS] || [];
  if (!allowed.includes(status as any)) {
    throw AppError.badRequest(`Invalid status transition: ${job.status} -> ${status}`, [{ field: 'status', message: `Allowed next states: ${allowed.join(', ') || 'none (terminal)'}` }]);
  }

  if (status === 'CANCELLED') {
    const isOwner = actor.role === 'CUSTOMER' && job.customerId === actor.id;
    const isAssignedTech = actor.role === 'TECHNICIAN' && job.technician?.userId === actor.id;
    if (actor.role !== 'ADMIN' && !isOwner && !isAssignedTech) throw AppError.forbidden('You cannot cancel this job');
  } else {
    if (actor.role !== 'TECHNICIAN' || job.technician?.userId !== actor.id) {
      throw AppError.forbidden('Only the assigned technician can update this job to this status');
    }
  }

  const timestampField: Record<string, string> = { ACCEPTED: 'acceptedAt', IN_PROGRESS: 'startedAt', COMPLETED: 'completedAt', CANCELLED: 'cancelledAt' };
  const data: any = { status: status as JobStatus, [timestampField[status]!]: new Date() };
  if (status === 'CANCELLED') data.cancellationReason = extra.cancellationReason ?? null;
  if (status === 'COMPLETED' && extra.finalCost != null) data.finalCost = extra.finalCost;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.job.update({ where: { id: jobId }, data });
    await tx.jobLog.create({
      data: {
        jobId,
        oldStatus: job.status as JobStatus,
        newStatus: status as JobStatus,
        changedById: actor.id,
        note: extra.cancellationReason ?? null,
      },
    });
    await writeAuditLog(tx, { userId: actor.id, action: `JOB_${status}`, entity: 'Job', entityId: jobId });

    if (status === 'COMPLETED' && job.technicianId) {
      await tx.technicianProfile.update({ where: { id: job.technicianId }, data: { totalJobs: { increment: 1 } } });
    }

    await notifyUser(tx, job.customerId, { title: `Job ${status.toLowerCase().replace('_', ' ')}`, message: `Your job "${job.title}" is now ${status}.`, type: `JOB_${status}`, link: `/jobs/${jobId}` });

    return updated;
  });

  return result;
}

export async function submitServiceReport(jobId: string, technicianUserId: string, input: any) {
  const job = await prisma.job.findFirst({ where: { id: jobId, deletedAt: null }, include: { technician: true } });
  if (!job) throw AppError.notFound('Job not found');
  if (job.technician?.userId !== technicianUserId) throw AppError.forbidden('This job is not assigned to you');
  if (!['IN_PROGRESS', 'COMPLETED'].includes(job.status)) throw AppError.badRequest('A service report can only be submitted once work has started');

  return prisma.serviceReport.upsert({
    where: { jobId },
    create: { jobId, technicianId: job.technicianId!, ...input },
    update: { ...input },
  });
}

export async function addAttachment(jobId: string, uploadedBy: string, file: { fileName: string; fileUrl: string; fileType: string; fileSize: number; purpose?: string }) {
  const job = await prisma.job.findFirst({ where: { id: jobId, deletedAt: null } });
  if (!job) throw AppError.notFound('Job not found');
  return prisma.attachment.create({ data: { jobId, uploadedBy, ...file, purpose: file.purpose ?? null } });
}

export async function cancelJob(jobId: string, actor: AuthUser, reason?: string) {
  return updateJobStatus(jobId, actor, 'CANCELLED', { cancellationReason: reason });
}