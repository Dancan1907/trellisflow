// ============================================================================
// Auth Service
// ============================================================================

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
    // 1. Check for existing user
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // 2. Hash the password (Argon2id)
    const passwordHash = await argon2.hash(dto.password);

    // 3. Create the user and container in a single DB transaction.
    // If either fails, both are rolled back.
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

    // 4. Generate tokens
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

    // Use a generic message so we don't reveal if the email exists.
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
   * Helper: Generate JWT Access Token and Refresh Token
   */
  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    // 1. Access Token (short-lived, 15m)
    const accessToken = await this.jwtService.signAsync(payload);

    // 2. Refresh Token (long-lived)
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '30d', // We'll make this dynamic later based on rememberMe
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
