export const TABLE_NAMES = {
  USERS: 'users',
  ROLES: 'roles',
  USER_ROLES: 'user_roles',
  TABLE_PERMISSIONS: 'table_permissions',
} as const;

export const SYSTEM_TABLES: Set<string> = new Set(Object.values(TABLE_NAMES));

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES];
