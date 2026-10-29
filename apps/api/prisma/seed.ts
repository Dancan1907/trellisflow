// ============================================================================
// Database Seed Script
// ============================================================================
// Run with: pnpm exec prisma db seed
//
// This script populates the database with essential baseline data:
// 1. A demo user (email: demo@trellisflow.com, password: password123)
// 2. Default categories (Food, Rent, Salary, etc.) for that user
//
// In a real app, the default categories would be created on signup by the API.
// Here, we do it manually so the demo user has data to work with.

import {
  PrismaClient,
  CategoryType,
  UserStatus,
  ContainerType,
  ContainerStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Create a demo user
  const hashedPassword = await argon2.hash('password123');

  const user = await prisma.user.upsert({
    where: { email: 'demo@trellisflow.com' },
    update: {}, // If they exist, do nothing
    create: {
      id: randomUUID(),
      email: 'demo@trellisflow.com',
      passwordHash: hashedPassword,
      name: 'Demo User',
      timezone: 'Africa/Nairobi',
      reportingCurrency: 'KES',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(), // Mark as verified for easy dev login
    },
  });

  console.log(`👤 Created demo user: ${user.email}`);

  // 2. Create a Personal Container for the demo user
  const container = await prisma.container.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      type: ContainerType.PERSONAL,
      name: 'Personal',
      currency: 'KES',
      status: ContainerStatus.ACTIVE,
    },
  });

  console.log(`📦 Created Personal container for user`);

  // 3. Create default categories
  const defaultCategories = [
    // Income
    { name: 'Salary', type: CategoryType.INCOME, icon: 'briefcase' },
    { name: 'Freelance', type: CategoryType.INCOME, icon: 'laptop' },
    { name: 'Dividends', type: CategoryType.INCOME, icon: 'trending-up' },
    { name: 'Gift', type: CategoryType.INCOME, icon: 'gift' },
    { name: 'Other Income', type: CategoryType.INCOME, icon: 'plus-circle' },

    // Expenses
    { name: 'Housing', type: CategoryType.EXPENSE, icon: 'home' },
    { name: 'Food', type: CategoryType.EXPENSE, icon: 'utensils' },
    { name: 'Transport', type: CategoryType.EXPENSE, icon: 'car' },
    { name: 'Utilities', type: CategoryType.EXPENSE, icon: 'zap' },
    { name: 'Health', type: CategoryType.EXPENSE, icon: 'heart' },
    { name: 'Entertainment', type: CategoryType.EXPENSE, icon: 'tv' },
    { name: 'Shopping', type: CategoryType.EXPENSE, icon: 'shopping-bag' },
    { name: 'Subscriptions', type: CategoryType.EXPENSE, icon: 'repeat' },
    { name: 'Taxes', type: CategoryType.EXPENSE, icon: 'file-text' },
    { name: 'Fees', type: CategoryType.EXPENSE, icon: 'alert-circle' },
    { name: 'Other Expense', type: CategoryType.EXPENSE, icon: 'minus-circle' },
  ];

  for (const cat of defaultCategories) {
    await prisma.category.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        containerId: container.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        isSystem: true,
      },
    });
  }

  console.log(`🏷️  Created ${defaultCategories.length} default categories`);
  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
