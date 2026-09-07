import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@servicepro.com' },
    update: {},
    create: {
      email: 'admin@servicepro.com',
      name: 'Super Admin',
      password: hashedPassword,
      role: Role.ADMIN,
      profile: {
        create: {
          address: 'Main Office',
          city: 'Dhaka',
        },
      },
    },
  });

  console.log('Seed data created successfully:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });