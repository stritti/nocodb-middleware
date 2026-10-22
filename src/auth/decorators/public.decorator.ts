import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route or controller as reachable without a JWT.
 *
 * All routes require authentication by default because `JwtAuthGuard` is
 * registered globally. Use this only for endpoints that must be open, such as
 * health checks, or that are protected by another mechanism.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
