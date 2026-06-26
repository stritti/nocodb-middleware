<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const getInitials = () => {
  if (!authStore.user) return '?';
  return authStore.user.username.substring(0, 2).toUpperCase();
};

const getRoleColor = () => {
  switch (authStore.user?.role) {
    case 'admin': return 'var(--danger-color)';
    case 'user': return 'var(--primary-color)';
    default: return 'var(--gray-color)';
  }
};
</script>

<template>
  <nav class="navbar">
    <div class="navbar-container">
      <div class="navbar-brand">
        <router-link to="/" class="navbar-brand">
          NocoDB Books
        </router-link>
      </div>
      
      <div class="navbar-nav">
        <router-link to="/" class="navbar-link" active-class="active">Home</router-link>
        <router-link to="/books" class="navbar-link" active-class="active" v-if="authStore.isAuthenticated">Books</router-link>
        <router-link to="/authors" class="navbar-link" active-class="active" v-if="authStore.isAuthenticated">Authors</router-link>
      </div>
      
      <div class="navbar-actions">
        <template v-if="authStore.isAuthenticated">
          <div class="user-menu">
            <span class="user-role" :style="{ color: getRoleColor() }">{{ authStore.user?.role }}</span>
            <div class="user-avatar">{{ getInitials() }}</div>
            <button class="btn btn-outline btn-sm" @click="router.push('/profile')">Profile</button>
            <button class="btn btn-outline btn-sm" @click="authStore.logout()">Logout</button>
          </div>
        </template>
        <template v-else>
          <router-link to="/login" class="btn btn-outline btn-sm">Login</router-link>
          <router-link to="/register" class="btn btn-primary btn-sm">Register</router-link>
        </template>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.navbar-brand {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary-color);
}

.navbar-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.navbar-link {
  color: var(--gray-color);
  font-weight: 500;
  transition: color 0.2s;
}

.navbar-link:hover {
  color: var(--primary-color);
}

.navbar-link.active {
  color: var(--primary-color);
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-role {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .navbar-nav {
    display: none;
  }
}
</style>
