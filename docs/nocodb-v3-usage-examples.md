# NocoDB v3 API - Usage Examples

This document provides practical examples for using the new v3 API methods.

## Table of Contents
- [User Role Management](#user-role-management)
- [Role Management](#role-management)
- [Advanced Queries](#advanced-queries)
- [Batch Operations](#batch-operations)

---

## User Role Management

### Assign a Role to a User

```typescript
import { UserRolesService } from './users/user-roles.service';

// V3 API (recommended)
await userRolesService.assignRoleV3({
  userId: 123,
  roleId: 456
});

// Response: { id: 789, user: [...], role: [...], assigned_at: "..." }
```

### Get All Roles for a User

```typescript
// V3 API - Single call with nested data
const roles = await userRolesService.getUserRolesV3(userId);

// Response:
// [
//   { id: 1, role_name: 'admin', description: 'Administrator', is_system_role: true },
//   { id: 2, role_name: 'editor', description: 'Content Editor', is_system_role: false }
// ]
```

### Remove a Role from a User

```typescript
await userRolesService.removeRoleV3(userId, roleId);
```

### Assign Multiple Roles

```typescript
// Still uses v2 internally, but you can batch with v3
const roleIds = [1, 2, 3];

for (const roleId of roleIds) {
  await userRolesService.assignRoleV3({ userId, roleId });
}
```

---

## Role Management

### Create a New Role

```typescript
import { RolesService } from './roles/roles.service';

const role = await rolesService.createRoleV3({
  roleName: 'moderator',
  description: 'Content moderator with limited permissions',
  isSystemRole: false
});

// Response: { id: 5, role_name: 'moderator', ... }
```

### Find a Role by Name

```typescript
const adminRole = await rolesService.findRoleByNameV3('admin');

if (adminRole) {
  console.log(`Admin role ID: ${adminRole.id}`);
}
```

### Get All Roles

```typescript
const allRoles = await rolesService.getAllRolesV3();

// Response:
// [
//   { id: 1, role_name: 'admin', ... },
//   { id: 2, role_name: 'editor', ... },
//   { id: 3, role_name: 'viewer', ... }
// ]
```

### Delete a Role

```typescript
await rolesService.deleteRoleV3(roleId);
```

---

## Advanced Queries

### Using NocoDBV3Service Directly

```typescript
import { NocoDBV3Service } from './nocodb/nocodb-v3.service';

constructor(private nocoDBV3Service: NocoDBV3Service) {}

// Create with inline relationships
const user = await this.nocoDBV3Service.create('mUsers', {
  username: 'johndoe',
  email: 'john@example.com',
  roles: [
    { id: 1 },  // Admin role
    { id: 2 }   // Editor role
  ]
});

// Read with nested data
const userWithRoles = await this.nocoDBV3Service.read('mUsers', userId, {
  includeRelations: ['roles', 'permissions']
});

// List with filters
const admins = await this.nocoDBV3Service.list('mUsers', {
  where: '(roles.role_name,eq,admin)',
  includeRelations: ['roles']
});

// Update with relationship changes
await this.nocoDBV3Service.update('mUsers', userId, {
  email: 'newemail@example.com',
  roles: [{ id: 3 }]  // Change to viewer role
});
```

### Complex Filters

```typescript
// Find users with specific role
const editors = await this.nocoDBV3Service.list('mUserRoles', {
  where: '(role.role_name,eq,editor)',
  includeRelations: ['user', 'role']
});

// Find active users
const activeUsers = await this.nocoDBV3Service.list('mUsers', {
  where: '(is_active,eq,true)',
  sort: '-created_at',  // Descending
  limit: 10
});

// Combine filters
const result = await this.nocoDBV3Service.list('mUsers', {
  where: '(is_active,eq,true)~and(email,like,%@company.com)',
  fields: ['id', 'username', 'email'],
  limit: 50,
  offset: 0
});
```

---

## Batch Operations

### Batch Create Users

```typescript
const newUsers = [
  { username: 'user1', email: 'user1@example.com', is_active: true },
  { username: 'user2', email: 'user2@example.com', is_active: true },
  { username: 'user3', email: 'user3@example.com', is_active: true }
];

const results = await this.nocoDBV3Service.batchCreate('mUsers', newUsers);

// Results include all created records
console.log(`Created ${results.length} users`);
```

### Batch Update

```typescript
const updates = [
  { id: 1, data: { is_active: false } },
  { id: 2, data: { is_active: false } },
  { id: 3, data: { email: 'updated@example.com' } }
];

const results = await this.nocoDBV3Service.batchUpdate('mUsers', updates);
```

### Batch Role Assignment

```typescript
// Assign same role to multiple users
const userIds = [1, 2, 3, 4, 5];
const roleId = 2; // Editor role

for (const userId of userIds) {
  try {
    await userRolesService.assignRoleV3({ userId, roleId });
  } catch (error) {
    console.error(`Failed to assign role to user ${userId}:`, error.message);
  }
}
```

---

## Helper Methods

### Check if Record Exists

```typescript
const exists = await this.nocoDBV3Service.exists(
  'mUsers',
  '(email,eq,test@example.com)'
);

if (exists) {
  console.log('User already exists');
}
```

### Find One Record

```typescript
const user = await this.nocoDBV3Service.findOne(
  'mUsers',
  '(username,eq,admin)'
);

if (user) {
  console.log(`Found user: ${user.id}`);
}
```

---

## Migration Examples

### Before (V2) vs After (V3)

#### Example 1: Create User with Role

**Before (V2)**:
```typescript
// Step 1: Create user
const user = await httpClient.post('/api/v2/tables/mUsers/records', {
  username: 'john',
  email: 'john@example.com'
});

// Step 2: Assign role
await httpClient.post('/api/v2/tables/mUserRoles/records', {
  user: { Id: user.data.Id },
  role: { Id: roleId }
});

// Total: 2 API calls
```

**After (V3)**:
```typescript
// Single call with inline relationship
const user = await nocoDBV3Service.create('mUsers', {
  username: 'john',
  email: 'john@example.com',
  roles: [{ id: roleId }]
});

// Total: 1 API call ✨
```

#### Example 2: Get User with Roles

**Before (V2)**:
```typescript
// Step 1: Get user
const user = await httpClient.get(`/api/v2/tables/mUsers/records/${userId}`);

// Step 2: Get user roles
const userRoles = await httpClient.get('/api/v2/tables/mUserRoles/records', {
  params: { where: `(user.Id,eq,${userId})` }
});

// Step 3: Get role details for each
const roles = await Promise.all(
  userRoles.data.list.map(ur => 
    httpClient.get(`/api/v2/tables/mRoles/records/${ur.role.Id}`)
  )
);

// Total: 3+ API calls
```

**After (V3)**:
```typescript
// Single call with nested data
const user = await nocoDBV3Service.read('mUsers', userId, {
  includeRelations: ['roles']
});

// user.roles contains all role data
// Total: 1 API call ✨
```

---

## Best Practices

### 1. Use V3 for New Code
Always prefer v3 methods for new features to get the best performance.

### 2. Leverage Inline Relationships
Create records with relationships in a single call:

```typescript
// Good ✅
await nocoDBV3Service.create('mUserRoles', {
  user: [{ id: userId }],
  role: [{ id: roleId }],
  assigned_at: new Date().toISOString()
});

// Avoid ❌
const record = await create(...);
await linkRecords(...);
```

### 3. Use includeRelations for Reads
Fetch related data in one call:

```typescript
// Good ✅
const user = await nocoDBV3Service.read('mUsers', userId, {
  includeRelations: ['roles', 'permissions']
});

// Avoid ❌
const user = await read(...);
const roles = await getRoles(...);
const permissions = await getPermissions(...);
```

### 4. Batch When Possible
Use batch operations for multiple records:

```typescript
// Good ✅
await nocoDBV3Service.batchCreate('mUsers', users);

// Avoid ❌
for (const user of users) {
  await create(user);
}
```

### 5. Handle Rate Limits
The v3 service automatically handles rate limiting (5 req/sec), but be mindful in loops:

```typescript
// The service will automatically throttle
for (const item of items) {
  await nocoDBV3Service.create('mTable', item);
  // Automatic delay applied if needed
}
```

---

## Error Handling

```typescript
try {
  await userRolesService.assignRoleV3({ userId, roleId });
} catch (error) {
  if (error instanceof ConflictException) {
    console.log('Role already assigned');
  } else if (error instanceof NotFoundException) {
    console.log('User or role not found');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Performance Tips

1. **Use v3 for relationships**: 50-70% faster than v2
2. **Batch operations**: Reduce total request time
3. **Include only needed fields**: Use `fields` parameter
4. **Cache table IDs**: Reuse table metadata
5. **Use pagination**: Don't fetch all records at once

```typescript
// Efficient pagination
const pageSize = 50;
let offset = 0;
let hasMore = true;

while (hasMore) {
  const result = await nocoDBV3Service.list('mUsers', {
    limit: pageSize,
    offset: offset,
    fields: ['id', 'username', 'email']
  });
  
  // Process result.list
  
  hasMore = result.list.length === pageSize;
  offset += pageSize;
}
```
