<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Navbar from '@/components/Navbar.vue';
import Sidebar from '@/components/Sidebar.vue';

const router = useRouter();
const authStore = useAuthStore();

// Check authentication on app load
if (authStore.token) {
  authStore.initialize();
}
</script>

<template>
  <div class="app-container">
    <Navbar />
    <div class="app-content">
      <Sidebar />
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-content {
  display: flex;
  flex: 1;
}

.main-content {
  flex: 1;
  padding: 1.5rem;
  background-color: var(--light-gray);
}
</style>
