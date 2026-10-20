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
            // 1. Get the current user from CLS
            const userId = cls.get('userId');

            // 2. If there's no user (e.g. public routes), or it's not a tenant table, run normally
            if (!userId || !USER_TABLES.includes(model)) {
              return query(args);
            }

            // 3. Cast args to 'any' to bypass the union type restriction.
            // We know what we are doing based on the operation type.
            const typedArgs = args as any;

            // 4. Apply automatic filtering based on the operation
            if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(operation)) {
              typedArgs.where = { ...typedArgs.where, userId };
            } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
              typedArgs.where = { ...typedArgs.where, userId };
            } else if (['create', 'createMany'].includes(operation)) {
              if (Array.isArray(typedArgs.data)) {
                typedArgs.data = typedArgs.data.map((d: any) => ({ ...d, userId }));
              } else {
                typedArgs.data = { ...typedArgs.data, userId };
              }
            } else if (operation === 'upsert') {
              typedArgs.where = { ...typedArgs.where, userId };
              typedArgs.create = { ...typedArgs.create, userId };
            }

            return query(typedArgs);
          },
        },
      },
    });
  });
}
