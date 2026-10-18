/**
 * Root controller.
 *
 * Serves a simple health check that confirms the API is running.
 * Used by Render's health checks and uptime monitors.
 */
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint.
   * Returns status, uptime, and version.
   */
  @Get()
  @ApiOperation({ summary: 'Health check' })
  async getHealth() {
    return this.appService.getHealth();
  }
}
