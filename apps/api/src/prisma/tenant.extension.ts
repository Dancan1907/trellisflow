import { Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

// List of tables that are protected by multi-tenancy
const USER_TABLES = [
  'Container',
  'Account',
  'Category',
  'Transaction',
  'RecurringRule',
  'Holding',
  'InvestmentEvent',
  'Summary',
  'SummaryVersion',
  'ApiToken',
  'Budget',
  'SavingsGoal',
  'DebtPayoffPlan',
  'NetWorthSnapshot',
  'Insight',
];

export function tenantExtension(cls: ClsService) {
  return Prisma.defineExtension((prisma) => {
    return prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            // Get the current user from CLS
            const userId = cls.get('userId');

            // If there's no user (e.g. public routes), or it's not a tenant table, run normally
            if (!userId || !USER_TABLES.includes(model)) {
              return query(args);
            }

            // Apply automatic filtering
            if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(operation)) {
              args.where = { ...args.where, userId };
            } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
              args.where = { ...args.where, userId };
            } else if (['create', 'createMany'].includes(operation)) {
              if (Array.isArray(args.data)) {
                args.data = args.data.map((d: any) => ({ ...d, userId }));
              } else {
                args.data = { ...args.data, userId };
              }
            } else if (operation === 'upsert') {
              args.where = { ...args.where, userId };
              args.create = { ...args.create, userId };
            }

            return query(args);
          },
        },
      },
    });
  });
}
