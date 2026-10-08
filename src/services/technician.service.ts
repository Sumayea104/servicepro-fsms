import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { withCache, invalidateCache } from '../utils/cache.js';

const TECH_CACHE_PREFIX = 'technicians:';

export async function listTechnicians(filters: { skill?: string; available?: string; verified?: string; page: number; limit: number }) {
  const cacheKey = `${TECH_CACHE_PREFIX}list:${filters.skill || 'any'}:${filters.available || 'any'}:${filters.verified || 'any'}:${filters.page}:${filters.limit}`;

  return withCache(cacheKey, 30, async () => {
    const where: any = {};
    if (filters.skill) where.skills = { has: filters.skill };
    if (filters.available === 'true') where.isAvailable = true;
    if (filters.verified === 'true') where.isVerified = true;

    const [items, total] = await Promise.all([
      prisma.technicianProfile.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true } } },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { rating: 'desc' },
      }),
      prisma.technicianProfile.count({ where }),
    ]);

    return { items, total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) };
  });
}

export async function getTechnicianById(id: string) {
  const technician = await prisma.technicianProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true } },
      availability: true,
      reviews: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!technician) throw AppError.notFound('Technician not found');
  return technician;
}

export async function updateAvailability(userId: string, isAvailable: boolean) {
  const updated = await prisma.technicianProfile.update({ where: { userId }, data: { isAvailable } });
  await invalidateCache(TECH_CACHE_PREFIX);
  return updated;
}

export async function updateLocation(userId: string, currentLat: number, currentLng: number) {
  return prisma.technicianProfile.update({ where: { userId }, data: { currentLat, currentLng } });
}

export async function updateSkills(userId: string, skills: string[], serviceAreas?: string[]) {
  const updated = await prisma.technicianProfile.update({
    where: { userId },
    data: { skills, ...(serviceAreas ? { serviceAreas } : {}) },
  });
  await invalidateCache(TECH_CACHE_PREFIX);
  return updated;
}

export async function setWeeklyAvailability(userId: string, slots: { dayOfWeek: number; startTime: string; endTime: string }[]) {
  const profile = await prisma.technicianProfile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound('Technician profile not found');

  return prisma.$transaction(async (tx) => {
    await tx.availability.deleteMany({ where: { technicianId: profile.id } });
    await tx.availability.createMany({
      data: slots.map((s) => ({ technicianId: profile.id, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })),
    });
    return tx.availability.findMany({ where: { technicianId: profile.id } });
  });
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Ranks AVAILABLE, VERIFIED technicians whose skills include the job's
 * category, using a weighted score of proximity, current open workload,
 * and rating. Advisory only — an admin still commits via POST /jobs/:id/assign.
 */
export async function suggestTechnicians(jobId: string) {
  return withCache(`${TECH_CACHE_PREFIX}suggest:${jobId}`, 15, () => computeSuggestions(jobId));
}

async function computeSuggestions(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw AppError.notFound('Job not found');

  const candidates = await prisma.technicianProfile.findMany({
    where: { isAvailable: true, isVerified: true, skills: { has: job.category } },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      assignedJobs: { where: { status: { in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] } } },
    },
  });

  const scored = candidates.map((tech) => {
    const distanceKm =
      job.latitude != null && job.longitude != null && tech.currentLat != null && tech.currentLng != null
        ? haversineKm(job.latitude, job.longitude, tech.currentLat, tech.currentLng)
        : 25;

    const loadRatio = Math.min(tech.assignedJobs.length / 6, 1);
    const ratingNormalized = Math.min(tech.rating / 5, 1);

    const score = 0.4 * (1 / (1 + distanceKm)) + 0.35 * (1 - loadRatio) + 0.25 * ratingNormalized;

    return {
      technicianId: tech.id,
      name: tech.user.fullName,
      email: tech.user.email,
      distanceKm: Math.round(distanceKm * 10) / 10,
      currentOpenJobs: tech.assignedJobs.length,
      rating: tech.rating,
      score: Math.round(score * 1000) / 1000,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 10);
}
