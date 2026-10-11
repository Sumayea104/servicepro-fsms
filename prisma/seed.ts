import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@servicepro.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        fullName: 'Platform Admin',
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    console.log(`Seeded admin: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log('Admin already exists, skipping.');
  }

  const demoTechEmail = 'demo.technician@servicepro.com';
  const existingTech = await prisma.user.findUnique({ where: { email: demoTechEmail } });
  if (!existingTech) {
    const techUser = await prisma.user.create({
      data: {
        email: demoTechEmail,
        password: await bcrypt.hash('Technician123!', 10),
        fullName: 'Demo Technician',
        role: 'TECHNICIAN',
        emailVerified: true,
      },
    });
    await prisma.technicianProfile.create({
      data: {
        userId: techUser.id,
        skills: ['ELECTRICAL', 'AC_REPAIR'],
        serviceAreas: ['Dhaka'],
        isVerified: true,
        verifiedAt: new Date(),
        isAvailable: true,
        currentLat: 23.8103,
        currentLng: 90.4125,
      },
    });
    console.log(`Seeded demo technician: ${demoTechEmail} / Technician123!`);
  }

  const demoCustomerEmail = 'demo.customer@servicepro.com';
  if (!(await prisma.user.findUnique({ where: { email: demoCustomerEmail } }))) {
    await prisma.user.create({
      data: { email: demoCustomerEmail, password: await bcrypt.hash('Customer123!', 10), fullName: 'Demo Customer', role: 'CUSTOMER', emailVerified: true },
    });
    console.log(`Seeded demo customer: ${demoCustomerEmail} / Customer123!`);
  }

  await prisma.systemSetting.upsert({
    where: { key: 'default_job_duration_minutes' },
    create: { key: 'default_job_duration_minutes', value: 120, description: 'Default appointment window used for schedule-conflict detection' },
    update: {},
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });