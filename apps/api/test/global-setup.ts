// apps/api/test/global-setup.ts
/* eslint-disable no-console */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export default async () => {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.warn('⚠️  No TEST_DATABASE_URL or DATABASE_URL set. Skipping test DB wake-up.');
    return;
  }

  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  try {
    console.log('Waking up test database...');
    await prisma.$connect();
    console.log('✅ Test database is ready');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};
