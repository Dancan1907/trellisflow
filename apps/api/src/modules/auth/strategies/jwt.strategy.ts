// ============================================================================
// JWT Strategy
// ============================================================================
// This tells Passport how to extract the JWT from the request and how to
// validate the user it represents.

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../../../prisma/prisma.service';

// The shape of the payload we signed in AuthService.generateTokens
interface JwtPayload {
  sub: string; // user ID
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private readonly cls: ClsService,
  ) {
    super({
      // 1. Look for the token in the Authorization header as "Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 2. Reject expired tokens automatically
      ignoreExpiration: false,
      // 3. The secret used to sign the token
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') as string,
    });
  }

  /**
   * Passport calls this automatically if the token's signature is valid.
   * We use it to ensure the user still exists in the database.
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Store the user ID in CLS so the Prisma extension can use it
    this.cls.set('userId', user.id);

    // Whatever we return here gets attached to `req.user` in the controllers
    return { id: user.id, email: user.email, name: user.name };
  }
}
