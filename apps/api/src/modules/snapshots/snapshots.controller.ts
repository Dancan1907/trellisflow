import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SnapshotsService } from './snapshots.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('snapshots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('snapshots')
export class SnapshotsController {
  constructor(private readonly snapshotsService: SnapshotsService) {}

  @Post('process-daily')
  @ApiOperation({
    summary: 'Trigger the daily snapshot job for all users',
    description: 'Normally called by a cron job at midnight.',
  })
  async processDaily() {
    // In production, this should be protected by a secret header
    return this.snapshotsService.computeForAllUsers();
  }
}
