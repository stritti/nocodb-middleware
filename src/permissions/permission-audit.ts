import { Logger } from '@nestjs/common';
import { CrudAction } from './enums/crud-action.enum';

/**
 * Logs a denied permission check with stable, structured fields so log
 * aggregation can filter and alert on `event: permission_denied` by user,
 * action and table. With nestjs-pino the object becomes top-level JSON fields.
 */
export function logPermissionDenied(
  logger: Logger,
  userId: number | string,
  action: CrudAction,
  table: string,
): void {
  logger.warn(
    { event: 'permission_denied', userId, action, table },
    'Permission denied',
  );
}
