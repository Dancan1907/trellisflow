// ============================================================================
// Auth Controller
// ============================================================================

import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth') // This groups the endpoints in Swagger
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // We will add the actual @Post('signup') and @Post('login') methods
  // in the next step, complete with their Swagger decorators.
}
