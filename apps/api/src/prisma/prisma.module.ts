// ============================================================================
// PrismaModule
// ============================================================================
// Makes PrismaService available application-wide.
// Marked @Global() so every module can inject PrismaService without
// importing PrismaModule explicitly.

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
