import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { randomUUID, createHash, randomBytes } from 'crypto';

@Injectable()
export class ApiTokensService {
  constructor(private prisma: PrismaService) {}

  // Helper to hash tokens before saving/comparing
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(userId: string, businessId: string, dto: CreateApiTokenDto) {
    // Verify the business exists and belongs to the user
    const container = await this.prisma.container.findFirst({
      where: { id: businessId, userId, type: 'EXTERNAL_BUSINESS', status: 'ACTIVE' },
    });

    if (!container) throw new NotFoundException('External business not found');

    // Generate a secure token: tf_live_<random_hex>
    const rawToken = `tf_live_${randomBytes(24).toString('hex')}`;
    const tokenHash = this.hashToken(rawToken);
    const tokenPrefix = rawToken.slice(0, 12); // e.g., tf_live_a1b2

    // Default expiry: 1 year
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const apiToken = await this.prisma.apiToken.create({
      data: {
        id: randomUUID(),
        userId,
        containerId: businessId,
        label: dto.label,
        tokenHash,
        tokenPrefix,
        scopes: ['write:summaries', 'read:business'],
        expiresAt,
        status: 'ACTIVE',
      },
    });

    return {
      id: apiToken.id,
      label: apiToken.label,
      token: rawToken, // ONLY RETURNED ONCE
      tokenPrefix: apiToken.tokenPrefix,
      expiresAt: apiToken.expiresAt,
      message: 'Save this token securely. It will not be shown again.',
    };
  }

  async findAll(userId: string, businessId: string) {
    return this.prisma.apiToken.findMany({
      where: { userId, containerId: businessId },
      select: {
        id: true,
        label: true,
        tokenPrefix: true,
        status: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(userId: string, tokenId: string) {
    const token = await this.prisma.apiToken.findFirst({
      where: { id: tokenId, userId },
    });

    if (!token) throw new NotFoundException('Token not found');

    return this.prisma.apiToken.update({
      where: { id: tokenId },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: 'Manually revoked by user' },
    });
  }

  // Used by the API Guard to validate incoming requests
  async validateToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);

    const token = await this.prisma.apiToken.findUnique({
      where: { tokenHash },
      include: { container: true },
    });

    if (!token) throw new UnauthorizedException('Invalid API token');
    if (token.status !== 'ACTIVE')
      throw new UnauthorizedException('API token is revoked or inactive');
    if (token.expiresAt < new Date()) {
      await this.prisma.apiToken.update({ where: { id: token.id }, data: { status: 'EXPIRED' } });
      throw new UnauthorizedException('API token has expired');
    }

    // Update last used timestamp asynchronously (fire and forget)
    this.prisma.apiToken
      .update({
        where: { id: token.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    return token;
  }
}
