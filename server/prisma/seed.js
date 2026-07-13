require('dotenv').config({ path: '.env' });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@headhunters.com.au';
  const existing = await prisma.adminUser.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const hash = await bcrypt.hash('SuperSecret123!', 12);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash: hash,
        name: 'Head Hunters Super Admin',
        role: 'SUPER_ADMIN',
      },
    });
    console.log('✅ SUPER_ADMIN created');
  } else {
    console.log('✅ SUPER_ADMIN already exists');
  }

  // Seed default permissions
  const perms = [
    'manage_users',
    'manage_jobs',
    'manage_insights',
    'manage_settings',
    'manage_chat',
    'manage_content',
  ];

  for (const name of perms) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} permission` },
    });
  }
  console.log('✅ Permissions seeded');

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
