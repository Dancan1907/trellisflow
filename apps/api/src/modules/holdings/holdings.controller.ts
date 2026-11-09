import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HoldingsService } from './holdings.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QueryHoldingsDto } from './dto/query-holdings.dto';

@ApiTags('holdings') // Group these endpoints under holdings in Swagger UI
@ApiBearerAuth() // Tell swagger "this endpoint needs a JWT token" so the "Authorize" button appears
@UseGuards(JwtAuthGuard) // Means every method requires a valid JWT
@Controller('holdings') // Set the base path
export class HoldingsController {
  // Inject the Service
  constructor(private readonly holdingsService: HoldingsService) {}

  @Get() // Register this as GET /api/holdings
  @ApiOperation({ summary: 'List all holdings' }) // Adds a description to Swagger
  async findAll(@CurrentUser() user: any, @Query() query: QueryHoldingsDto) {
    return this.holdingsService.findAll(user.id, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated summary of open holdings' })
  async getSummary(@CurrentUser() user: any, @Query() query: QueryHoldingsDto) {
    return this.holdingsService.getSummary(user.id, query);
  }
}
