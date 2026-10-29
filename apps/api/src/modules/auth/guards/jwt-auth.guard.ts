// ============================================================================
// JWT Auth Guard
// ============================================================================
// We apply this to any route that requires a logged-in user.

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
