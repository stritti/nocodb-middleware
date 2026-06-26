<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const users = ref([]);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');

onMounted(() => {
  if (authStore.user?.role !== 'admin') {
    // Redirect to home if not admin
    // This is handled by the router guard, but we can add an extra check
    return;
  }
  fetchUsers();
});

const fetchUsers = async () => {
  try {
    loading.value = true;
    error.value = null;

    const response = await authStore.api.get('/users', {
      params: {
        search: searchQuery.value || undefined,
        limit: 20,
      },
    });

    users.value = response.data.data;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to fetch users';
    console.error('Failed to fetch users:', err);
  } finally {
    loading.value = false;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'admin': return 'var(--danger-color)';
    case 'user': return 'var(--primary-color)';
    default: return 'var(--gray-color)';
  }
};

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'admin': return 'badge-danger';
    case 'user': return 'badge-primary';
    default: return 'badge-gray';
  }
};
</script>

<template>
  <div class="admin-view">
    <div class="page-header">
      <h1 class="page-title">Admin Panel</h1>
      <p class="page-subtitle">Manage users and system settings</p>
    </div>

    <!-- Stats Card -->
    <div class="stats-card card mb-4">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ users.length }}</div>
          <div class="stat-label">Total Users</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ users.filter((u: any) => u.role === 'admin').length }}</div>
          <div class="stat-label">Admins</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ users.filter((u: any) => u.role === 'user').length }}</div>
          <div class="stat-label">Regular Users</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ users.filter((u: any) => u.role === 'guest').length }}</div>
          <div class="stat-label">Guests</div>
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="search-card card mb-4">
      <div class="search-form flex items-center gap-2">
        <input 
          type="text" 
          v-model="searchQuery" 
          class="form-input flex-1" 
          placeholder="Search users by username or email..."
          @input="fetchUsers"
        />
        <button class="btn btn-primary" @click="fetchUsers" :disabled="loading">
          <span v-if="loading">Searching...</span>
          <span v-else>🔍 Search</span>
        </button>
      </div>
    </div>

    <!-- Users Table -->
    <div class="users-table-card card">
      <div class="table-header flex justify-between items-center mb-3">
        <h3>User Management</h3>
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm">
            📥 Export
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>
                <strong>{{ user.username }}</strong>
              </td>
              <td>{{ user.email }}</td>
              <td>
                <span class="badge" :class="getRoleBadgeClass(user.role)" :style="{ color: getRoleColor(user.role) }">
                  {{ user.role }}
                </span>
              </td>
              <td>{{ user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A' }}</td>
              <td>
                <div class="table-actions">
                  <router-link :to="`/profile`" class="btn btn-outline btn-sm">
                    👁️ View
                  </router-link>
                  <button class="btn btn-outline btn-sm">
                    ✏️ Edit
                  </button>
                  <button class="btn btn-danger btn-sm">
                    🗑️ Delete
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="6" class="text-center py-4">
                <div class="empty-state">
                  <div class="empty-state-icon">👥</div>
                  <div class="empty-state-title">No users found</div>
                  <div class="empty-state-text">Try adjusting your search query</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Loading State -->
      <div class="loading-state" v-if="loading && users.length === 0">
        <div class="loading-content flex items-center justify-center py-4">
          <div class="spinner"></div>
          <span class="ml-2">Loading users...</span>
        </div>
      </div>

      <!-- Error State -->
      <div class="alert alert-error mt-4" v-if="error">
        <span>⚠️</span>
        <span>{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-view {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--dark-color);
}

.page-subtitle {
  color: var(--gray-color);
  margin-top: 0.25rem;
}

.stats-card {
  background-color: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background-color: var(--light-gray);
  border-radius: var(--radius-sm);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--gray-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.search-card {
  background-color: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1rem;
}

.search-form {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.flex-1 {
  flex: 1;
}

.users-table-card {
  background-color: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.table-header {
  margin-bottom: 1rem;
}

.table-responsive {
  overflow-x: auto;
}

.table {
  width: 100%;
}

.table th {
  white-space: nowrap;
}

.text-center {
  text-align: center;
}

.py-4 {
  padding: 1rem 0;
}

.table-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--gray-color);
}

.empty-state-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--dark-color);
  margin-bottom: 0.5rem;
}

.empty-state-text {
  font-size: 0.875rem;
}

.loading-state {
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.loading-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.ml-2 { margin-left: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mt-4 { margin-top: 1rem; }

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}
</style>
