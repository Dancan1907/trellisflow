import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Signup
   * 1. Check if email exists.
   * 2. Hash password.
   * 3. Create User + Personal Container in a transaction.
   * 4. Generate tokens.
   */
  async signup(dto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        timezone: dto.timezone ?? 'UTC',
        reportingCurrency: dto.reportingCurrency ?? 'USD',
        personaHint: dto.personaHint,
        containers: {
          create: {
            id: randomUUID(),
            type: 'PERSONAL',
            name: 'Personal',
            currency: dto.reportingCurrency ?? 'USD',
            status: 'ACTIVE',
          },
        },
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  /**
   * Login
   * 1. Find user.
   * 2. Verify password.
   * 3. Generate tokens.
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  /**
   * Refresh Token
   * Validates a refresh token and issues a new access token + refresh token pair.
   */
  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.deletedAt) {
        throw new UnauthorizedException('User no longer exists');
      }

      return this.generateTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Request Password Reset
   * Generates a short-lived token and saves it to the DB.
   */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });

    // Security: Always return success, even if email doesn't exist.
    if (!user) {
      return {
        message: 'If that email exists, a reset link has been sent.',
      };
    }

    const rawToken = randomUUID();
    const tokenHash = await argon2.hash(rawToken);

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.emailVerificationToken.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        tokenHash,
        purpose: 'PASSWORD_RESET',
        expiresAt,
      },
    });

    // In production, send via email.
    // Returning for Swagger/testing only.
    return {
      message: 'If that email exists, a reset link has been sent.',
      devToken: rawToken,
    };
  }

  /**
   * Confirm Password Reset
   * Verifies the token and updates the password.
   */
  async confirmPasswordReset(rawToken: string, newPassword: string) {
    const tokens = await this.prisma.emailVerificationToken.findMany({
      where: {
        purpose: 'PASSWORD_RESET',
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    let validToken = null;

    for (const token of tokens) {
      if (await argon2.verify(token.tokenHash, rawToken)) {
        validToken = token;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const newHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: validToken.userId,
        },
        data: {
          passwordHash: newHash,
        },
      }),

      this.prisma.emailVerificationToken.update({
        where: {
          id: validToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    return {
      message: 'Password has been reset successfully.',
    };
  }

  /**
   * Helper: Generate JWT Access Token and Refresh Token
   */
  private async generateTokens(userId: string, email: string) {
    const payload = {
      sub: userId,
      email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '30d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
