// ============================================================================
// @CurrentUser() Decorator
// ============================================================================
// Usage: @CurrentUser() user: { id: string, email: string, name: string }
// This grabs the user object that the JwtStrategy attached to req.user.

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
