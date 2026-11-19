import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiTokensService } from '../api-tokens.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly tokensService: ApiTokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const rawToken = authHeader.split(' ')[1];

    // Validate token and attach the business (container) to the request
    const tokenRecord = await this.tokensService.validateToken(rawToken);

    request.container = tokenRecord.container;
    request.apiToken = tokenRecord;

    return true;
  }
}
