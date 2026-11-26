import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CashFlowForecastQueryDto } from './dto/cash-flow-forecast-query.dto';
import { CashFlowForecastingService } from './cash-flow-forecasting.service';

@ApiTags('cash-flow-forecasting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('forecasts/cash-flow')
export class CashFlowForecastingController {
  constructor(private readonly forecastingService: CashFlowForecastingService) {}

  @Get()
  @ApiOperation({
    summary: 'Generate a deterministic cash-flow forecast',
    description: 'Projects active cash accounts using historical posted flows, active recurring rules, and future-dated posted transactions. Does not create or modify financial records.',
  })
  async forecast(@CurrentUser() user: { id: string }, @Query() query: CashFlowForecastQueryDto) {
    return this.forecastingService.forecast(user.id, query);
  }
}
