import { NotFoundException } from '@nestjs/common';

/** Shared NocoDB utility types and helpers */

export interface NocoTableRef {
  id: string;
}

export interface NocoUserRecord {
  id?: number | string;
  username?: string;
  email?: string;
  is_active?: boolean;
  auth_provider?: string;
  external_subject?: string;
}

export interface NocoRoleRecord {
  id?: number | string;
  role_name?: string;
}

/**
 * Assert that a NocoDB API response is a valid table reference with a string ID.
 */
export function assertTableRef(value: unknown, context?: string): NocoTableRef {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as any).id !== 'string'
  ) {
    throw new NotFoundException(
      context
        ? `Required table not found: ${context}`
        : 'Required table reference is missing',
    );
  }
  return { id: (value as any).id };
}

/**
 * Safely cast an unknown API response to a NocoUserRecord or null.
 */
export function asUserRecord(value: unknown): NocoUserRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as NocoUserRecord;
}

/**
 * Safely cast an unknown API response to a NocoRoleRecord or null.
 */
export function asRoleRecord(value: unknown): NocoRoleRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as NocoRoleRecord;
}

/**
 * Extract a numeric ID from a NocoDB record that may have number or string id.
 */
export function extractNumericId(record: { id?: number | string }): number {
  if (typeof record.id === 'number') {
    return record.id;
  }
  if (typeof record.id === 'string' && record.id.length > 0) {
    const parsed = Number(record.id);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  throw new NotFoundException('Invalid NocoDB record ID payload');
}
