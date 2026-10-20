// apps/api/test/global-setup.ts
/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

export default async () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.TEST_DATABASE_URL } },
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
