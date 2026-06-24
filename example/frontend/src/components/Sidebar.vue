<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const navItems = [
  { label: 'Dashboard', icon: '📊', path: '/' },
  { label: 'Books', icon: '📚', path: '/books' },
  { label: 'Authors', icon: '✍️', path: '/authors' },
  { label: 'My Favorites', icon: '❤️', path: '/favorites' },
];

const adminItems = [
  { label: 'Admin Panel', icon: '🛡️', path: '/admin' },
];

const isActive = (path: string) => {
  return router.currentRoute.value.path === path;
};
</script>

<template>
  <aside class="sidebar" v-if="authStore.isAuthenticated">
    <nav class="sidebar-nav">
      <div v-for="item in navItems" :key="item.path">
        <router-link 
          :to="item.path" 
          class="sidebar-item" 
          :class="{ active: isActive(item.path) }"
        >
          <span class="sidebar-icon">{{ item.icon }}</span>
          <span class="sidebar-label">{{ item.label }}</span>
        </router-link>
      </div>
      
      <div v-if="authStore.isAdmin" class="mt-4">
        <div v-for="item in adminItems" :key="item.path">
          <router-link 
            :to="item.path" 
            class="sidebar-item" 
            :class="{ active: isActive(item.path) }"
          >
            <span class="sidebar-icon">{{ item.icon }}</span>
            <span class="sidebar-label">{{ item.label }}</span>
          </router-link>
        </div>
      </div>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 250px;
  background-color: var(--white);
  border-right: 1px solid var(--border-color);
  height: calc(100vh - 65px);
  position: sticky;
  top: 65px;
  overflow-y: auto;
}

.sidebar-nav {
  padding: 1rem 0;
}

.sidebar-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: var(--dark-color);
}

.sidebar-item:hover {
  background-color: var(--light-gray);
}

.sidebar-item.active {
  background-color: #eff6ff;
  color: var(--primary-color);
  border-right: 3px solid var(--primary-color);
}

.sidebar-icon {
  width: 20px;
  height: 20px;
  font-size: 1rem;
}

.sidebar-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.mt-4 {
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
}
</style>
