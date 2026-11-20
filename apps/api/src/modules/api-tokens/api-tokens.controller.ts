import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTokensService } from './api-tokens.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { RotateApiTokenDto } from './dto/rotate-api-token.dto';

@ApiTags('api-tokens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/tokens')
export class ApiTokensController {
  constructor(private readonly tokensService: ApiTokensService) {}

  @Post()
  @ApiOperation({ summary: 'Generate an API token (the raw token is shown once)' })
  create(
    @CurrentUser() user: any,
    @Param('businessId') businessId: string,
    @Body() dto: CreateApiTokenDto,
  ) {
    return this.tokensService.create(user.id, businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tokens, including expiry warnings' })
  findAll(@CurrentUser() user: any, @Param('businessId') businessId: string) {
    return this.tokensService.findAll(user.id, businessId);
  }

  @Post(':tokenId/rotate')
  @ApiOperation({
    summary: 'Rotate a token with zero downtime',
    description:
      'Issues a new token and keeps the old one working for a grace period (default 24h) ' +
      'so the external site can switch over. Use gracePeriodHours: 0 to revoke the old token immediately.',
  })
  rotate(
    @CurrentUser() user: any,
    @Param('businessId') businessId: string,
    @Param('tokenId') tokenId: string,
    @Body() dto: RotateApiTokenDto,
  ) {
    return this.tokensService.rotate(user.id, businessId, tokenId, dto);
  }

  @Patch(':tokenId/revoke')
  @ApiOperation({ summary: 'Revoke a token immediately' })
  revoke(@CurrentUser() user: any, @Param('tokenId') tokenId: string) {
    return this.tokensService.revoke(user.id, tokenId);
  }
}
