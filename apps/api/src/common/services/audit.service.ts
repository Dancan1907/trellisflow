// ============================================================================
// AuditLogService
// ============================================================================
// Centralized service for writing audit logs.
// Every financial mutation (create, update, delete) MUST go through here.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction, ActorType } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log a financial mutation.
   *
   * @param tx The Prisma transaction client (so logs roll back if the mutation fails)
   * @param userId The owner of the data
   * @param entityType The table name (e.g., 'Transaction', 'Account')
   * @param entityId The ID of the specific record
   * @param action CREATE, UPDATE, DELETE, ARCHIVE, etc.
   * @param before The state of the record before (null for CREATE)
   * @param after The state of the record after (null for DELETE)
   */
  async log(
    tx: any,
    userId: string,
    entityType: string,
    entityId: string,
    action: AuditAction,
    before: any | null,
    after: any | null,
  ) {
    // Determine which fields changed (only for updates)
    const changedFields: string[] = [];
    if (before && after) {
      for (const key of Object.keys(after)) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
          changedFields.push(key);
        }
      }
    }

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        userId,
        actorType: ActorType.USER,
        actorId: userId,
        entityType,
        entityId,
        action,
        before: before ?? undefined,
        after: after ?? undefined,
        changedFields,
      },
    });
  }
}
