import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAuditDto } from './dto/query-audit.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAllForUser(userId: string, query: QueryAuditDto = {}) {
    const where: Prisma.AuditLogWhereInput = { userId };

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.action) {
      where.action = query.action as AuditAction;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 50,
    });
  }
}
