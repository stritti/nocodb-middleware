import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark a route as public (no authentication required).
 * The JwtAuthGuard (or PermissionsGuard) must check for this metadata
 * and skip authentication when present.
 *
 * @example
 * @Public()
 * @Post('register')
 * async register(@Body() dto: SignUpDto) { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
