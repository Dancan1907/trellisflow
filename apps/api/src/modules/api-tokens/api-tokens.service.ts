import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTokenStatus } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_ROTATION_GRACE_HOURS,
  DEFAULT_TOKEN_EXPIRY_DAYS,
  MS_PER_DAY,
  MS_PER_HOUR,
} from './api-tokens.constants';
import { getTokenExpiry, hashApiToken } from './api-tokens.util';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { RotateApiTokenDto } from './dto/rotate-api-token.dto';

const TOKEN_SAVE_MESSAGE = 'Save this token securely. It will not be shown again.';

@Injectable()
export class ApiTokensService {
  constructor(private prisma: PrismaService) {}

  private defaultExpiry(): Date {
    return new Date(Date.now() + DEFAULT_TOKEN_EXPIRY_DAYS * MS_PER_DAY);
  }

  /** Generates a new raw token plus the row to store (hash only, never the raw value). */
  private buildToken(userId: string, containerId: string, label: string, expiresAt: Date) {
    // Format: tf_live_<48 hex chars>
    const rawToken = `tf_live_${randomBytes(24).toString('hex')}`;

    return {
      rawToken,
      data: {
        id: randomUUID(),
        userId,
        containerId,
        label,
        tokenHash: hashApiToken(rawToken),
        tokenPrefix: rawToken.slice(0, 12), // e.g. tf_live_a1b2
        scopes: ['write:summaries', 'read:business'],
        expiresAt,
        status: ApiTokenStatus.ACTIVE,
      },
    };
  }

  private async getExternalBusiness(userId: string, businessId: string) {
    const container = await this.prisma.container.findFirst({
      where: { id: businessId, userId, type: 'EXTERNAL_BUSINESS', status: 'ACTIVE' },
    });

    if (!container) throw new NotFoundException('External business not found');
    return container;
  }

  async create(userId: string, businessId: string, dto: CreateApiTokenDto) {
    await this.getExternalBusiness(userId, businessId);

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : this.defaultExpiry();
    const { rawToken, data } = this.buildToken(userId, businessId, dto.label, expiresAt);

    const apiToken = await this.prisma.apiToken.create({ data });

    return {
      id: apiToken.id,
      label: apiToken.label,
      token: rawToken, // ONLY RETURNED ONCE
      tokenPrefix: apiToken.tokenPrefix,
      expiresAt: apiToken.expiresAt,
      message: TOKEN_SAVE_MESSAGE,
    };
  }

  async findAll(userId: string, businessId: string) {
    const tokens = await this.prisma.apiToken.findMany({
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

    const now = new Date();

    return tokens.map((token) => {
      const expiry = getTokenExpiry(token.expiresAt, now);
      // A token only flips to EXPIRED in the database when someone tries to use it,
      // so report the effective status here.
      const status: ApiTokenStatus =
        token.status === ApiTokenStatus.ACTIVE && expiry.expired
          ? ApiTokenStatus.EXPIRED
          : token.status;
      const active = status === ApiTokenStatus.ACTIVE;

      return {
        ...token,
        status,
        expiresInDays: active ? expiry.daysLeft : null,
        expiringSoon: active && expiry.expiringSoon,
      };
    });
  }

  async revoke(userId: string, tokenId: string) {
    const token = await this.prisma.apiToken.findFirst({
      where: { id: tokenId, userId },
    });

    if (!token) throw new NotFoundException('Token not found');

    return this.prisma.apiToken.update({
      where: { id: tokenId },
      data: {
        status: ApiTokenStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: 'Manually revoked by user',
      },
      // Never send the token hash back to the client.
      select: {
        id: true,
        label: true,
        tokenPrefix: true,
        status: true,
        expiresAt: true,
        revokedAt: true,
        revokedReason: true,
      },
    });
  }

  /**
   * Replaces a token with a fresh one without downtime.
   *
   * The new token is active immediately. The old token keeps working for
   * `gracePeriodHours` (default 24h, or until its own expiry if sooner), giving the
   * external site time to switch. With `gracePeriodHours: 0` the old token is
   * revoked straight away.
   */
  async rotate(userId: string, businessId: string, tokenId: string, dto: RotateApiTokenDto = {}) {
    const current = await this.prisma.apiToken.findFirst({
      where: { id: tokenId, userId, containerId: businessId },
    });

    if (!current) throw new NotFoundException('Token not found');

    const now = new Date();

    if (current.status !== ApiTokenStatus.ACTIVE || current.expiresAt <= now) {
      throw new BadRequestException('Only active tokens can be rotated');
    }

    const newExpiresAt = dto.expiresAt ? new Date(dto.expiresAt) : this.defaultExpiry();
    if (newExpiresAt <= now) {
      throw new BadRequestException('expiresAt must be in the future');
    }

    const graceHours = dto.gracePeriodHours ?? DEFAULT_ROTATION_GRACE_HOURS;
    const { rawToken, data } = this.buildToken(
      userId,
      businessId,
      dto.label ?? current.label,
      newExpiresAt,
    );

    let retireOld;
    let oldTokenExpiresAt: Date;

    if (graceHours === 0) {
      oldTokenExpiresAt = now;
      retireOld = this.prisma.apiToken.update({
        where: { id: current.id },
        data: {
          status: ApiTokenStatus.REVOKED,
          revokedAt: now,
          revokedReason: 'Replaced by rotated token',
        },
      });
    } else {
      const graceEnd = new Date(now.getTime() + graceHours * MS_PER_HOUR);
      oldTokenExpiresAt = graceEnd < current.expiresAt ? graceEnd : current.expiresAt;
      retireOld = this.prisma.apiToken.update({
        where: { id: current.id },
        data: { expiresAt: oldTokenExpiresAt },
      });
    }

    const [created] = await this.prisma.$transaction([
      this.prisma.apiToken.create({ data }),
      retireOld,
    ]);

    return {
      id: created.id,
      label: created.label,
      token: rawToken, // ONLY RETURNED ONCE
      tokenPrefix: created.tokenPrefix,
      expiresAt: created.expiresAt,
      previousToken: {
        id: current.id,
        label: current.label,
        tokenPrefix: current.tokenPrefix,
        status: graceHours === 0 ? ApiTokenStatus.REVOKED : ApiTokenStatus.ACTIVE,
        expiresAt: oldTokenExpiresAt,
      },
      message: TOKEN_SAVE_MESSAGE,
    };
  }

  // Used by the API Guard to validate incoming requests
  async validateToken(rawToken: string) {
    const tokenHash = hashApiToken(rawToken);

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
