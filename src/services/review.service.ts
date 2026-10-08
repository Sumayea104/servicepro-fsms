import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';

export async function createReview(jobId: string, reviewerId: string, input: { rating: number; punctuality: number; professionalism: number; quality: number; comment?: string }) {
  const job = await prisma.job.findFirst({ where: { id: jobId, deletedAt: null } });
  if (!job) throw AppError.notFound('Job not found');
  if (job.customerId !== reviewerId) throw AppError.forbidden('Only the customer who requested this job can leave feedback');
  if (job.status !== 'COMPLETED') throw AppError.badRequest('You can only review a job after it is completed');
  if (!job.technicianId) throw AppError.badRequest('This job has no technician to review');

  const existing = await prisma.technicianReview.findUnique({ where: { jobId } });
  if (existing) throw AppError.conflict('You have already reviewed this job');

  return prisma.$transaction(async (tx) => {
    const review = await tx.technicianReview.create({
      data: { jobId, technicianId: job.technicianId!, reviewerId, ...input },
    });

    const agg = await tx.technicianReview.aggregate({ where: { technicianId: job.technicianId! }, _avg: { rating: true } });
    await tx.technicianProfile.update({ where: { id: job.technicianId! }, data: { rating: agg._avg.rating || input.rating } });

    return review;
  });
}

export async function listTechnicianReviews(technicianId: string, page: number, limit: number) {
  const [items, total] = await Promise.all([
    prisma.technicianReview.findMany({
      where: { technicianId },
      include: { reviewer: { select: { fullName: true, avatarUrl: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.technicianReview.count({ where: { technicianId } }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
