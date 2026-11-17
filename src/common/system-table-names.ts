/**
 * Logical (unprefixed) names of the middleware's system tables in NocoDB.
 * Permissions and data access always refer to tables by these logical names.
 */
export const SYSTEM_TABLE_NAMES = {
  USERS: 'users',
  ROLES: 'roles',
  USER_ROLES: 'user_roles',
  TABLE_PERMISSIONS: 'table_permissions',
  API_RESOURCES: 'api_resources',
  API_RESOURCE_FIELDS: 'api_resource_fields',
  API_RESOURCE_FILTERS: 'api_resource_filters',
} as const;

export type SystemTableName =
  (typeof SYSTEM_TABLE_NAMES)[keyof typeof SYSTEM_TABLE_NAMES];
