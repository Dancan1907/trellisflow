import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTokensService } from './api-tokens.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';

@ApiTags('api-tokens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/tokens')
export class ApiTokensController {
  constructor(private readonly tokensService: ApiTokensService) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Param('businessId') businessId: string,
    @Body() dto: CreateApiTokenDto,
  ) {
    return this.tokensService.create(user.id, businessId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Param('businessId') businessId: string) {
    return this.tokensService.findAll(user.id, businessId);
  }

  @Patch(':tokenId/revoke')
  revoke(@CurrentUser() user: any, @Param('tokenId') tokenId: string) {
    return this.tokensService.revoke(user.id, tokenId);
  }
}
