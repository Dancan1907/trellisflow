import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiTokensService } from '../api-tokens.service';
import { extractBearerToken, getTokenExpiry } from '../api-tokens.util';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly tokensService: ApiTokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    const rawToken = extractBearerToken(request.headers['authorization']);

    if (!rawToken) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    // Validate token and attach the business (container) to the request
    const tokenRecord = await this.tokensService.validateToken(rawToken);

    request.container = tokenRecord.container;
    request.apiToken = tokenRecord;

    // Let the external site see when its token runs out, without a dashboard visit.
    response.setHeader('X-Token-Expires-At', tokenRecord.expiresAt.toISOString());

    const expiry = getTokenExpiry(tokenRecord.expiresAt);
    if (expiry.expiringSoon) {
      response.setHeader(
        'X-Token-Expiry-Warning',
        `This API token expires in ${expiry.daysLeft} day(s). Rotate it in TrellisFlow to avoid downtime.`,
      );
    }

    return true;
  }
}
