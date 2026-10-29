import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const isTest = () => process.env.NODE_ENV === 'test';

async function hashPassword(pw: string): Promise<string> {
  if (isTest()) {
    const salt = crypto.randomBytes(16).toString('hex');
    const digest = crypto
      .createHash('sha256')
      .update(salt + pw)
      .digest('hex');
    return `test$${salt}$${digest}`;
  }
  return argon2.hash(pw);
}

async function verifyPassword(hashStr: string, pw: string): Promise<boolean> {
  if (isTest()) {
    if (!hashStr.startsWith('test$')) return false;
    const [, salt, digest] = hashStr.split('$');
    const expected = crypto
      .createHash('sha256')
      .update(salt! + pw)
      .digest('hex');
    return expected === digest;
  }
  return argon2.verify(hashStr, pw);
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        timezone: true,
        reportingCurrency: true,
        tier: true,
        personaHint: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        personaHint: dto.personaHint as never,
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        timezone: true,
        reportingCurrency: true,
        tier: true,
        personaHint: true,
        createdAt: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await verifyPassword(user.passwordHash, dto.currentPassword);

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await hashPassword(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password changed. Please sign in again on other devices.' };
  }
}
