import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { db } from '../lib/db';
import { adminUser } from '../db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  
  if (!email || !password) {
    console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variable');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  try {
    const existing = await db.select().from(adminUser).where(eq(adminUser.email, email)).limit(1);

    if (existing.length > 0) {
      if (process.env.FORCE_UPDATE_PASSWORD === 'true') {
        await db.update(adminUser).set({ passwordHash: hash }).where(eq(adminUser.email, email));
        console.log(`Admin user ${email} password updated.`);
      } else {
        console.log(`Admin user ${email} already exists. Skipping creation.`);
      }
      process.exit(0);
    }

    await db.insert(adminUser).values({
      email,
      name: 'System Administrator',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Successfully created admin user: ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed admin:', error);
    process.exit(1);
  }
}

main().catch(console.error);
