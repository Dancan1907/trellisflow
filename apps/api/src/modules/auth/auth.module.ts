// ============================================================================
// Auth Module
// ============================================================================

import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<JwtModuleOptions> => {
        // Explicitly cast the secret to string to satisfy strict typings
        const secret = config.get<string>('JWT_ACCESS_SECRET');
        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET is not defined in environment variables');
        }

        return {
          secret,
          signOptions: {
            // Cast to 'any' here because @nestjs/jwt strictly types this
            // to the 'StringValue' type from the 'ms' library, which doesn't
            // accept generic strings from env vars easily without a cast.
            expiresIn: config.get<string>('JWT_ACCESS_EXPIRY', '15m') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
