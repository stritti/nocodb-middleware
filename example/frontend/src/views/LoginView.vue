<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const form = ref({
  username: '',
  password: '',
});

const error = ref<string | null>(null);
const loading = ref(false);

const handleSubmit = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    await authStore.login({
      username: form.value.username,
      password: form.value.password,
    });
  } catch (err) {
    error.value = err.message || 'Login failed';
  } finally {
    loading.value = false;
  }
};

const testCredentials = [
  { username: 'admin', password: 'password', role: 'Admin' },
  { username: 'alice', password: 'password', role: 'User' },
  { username: 'bob', password: 'password', role: 'User' },
  { username: 'guest', password: 'password', role: 'Guest' },
];

const quickLogin = async (username: string, password: string) => {
  form.value.username = username;
  form.value.password = password;
  await handleSubmit();
};
</script>

<template>
  <div class="login-view">
    <div class="login-container">
      <div class="login-card card">
        <div class="login-header text-center mb-4">
          <h1 class="login-title">Login</h1>
          <p class="login-subtitle">Sign in to access your account</p>
        </div>

        <form @submit.prevent="handleSubmit" class="login-form">
          <div class="alert alert-error mb-4" v-if="error">
            <span>⚠️</span>
            <span>{{ error }}</span>
          </div>

          <div class="form-group">
            <label for="username" class="form-label">Username or Email</label>
            <input 
              type="text" 
              id="username" 
              v-model="form.username" 
              class="form-input" 
              placeholder="Enter your username or email"
              required
              @focus="error = null"
            />
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <input 
              type="password" 
              id="password" 
              v-model="form.password" 
              class="form-input" 
              placeholder="Enter your password"
              required
              @focus="error = null"
            />
          </div>

          <button 
            type="submit" 
            class="btn btn-primary btn-lg w-full mt-4"
            :disabled="loading"
          >
            <span v-if="loading">Logging in...</span>
            <span v-else>Login</span>
          </button>
        </form>

        <div class="login-footer text-center mt-4">
          <p>Don't have an account? <router-link to="/register">Register here</router-link></p>
        </div>

        <div class="quick-login mt-4">
          <h4 class="mb-2">Quick Login (Test Accounts)</h4>
          <div class="quick-login-buttons">
            <button 
              v-for="cred in testCredentials" 
              :key="cred.username"
              @click="quickLogin(cred.username, cred.password)"
              class="btn btn-outline btn-sm"
              :disabled="loading"
            >
              {{ cred.role }} ({{ cred.username }})
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  min-height: calc(100vh - 65px);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--light-gray);
  padding: 1rem;
}

.login-container {
  width: 100%;
  max-width: 400px;
}

.login-card {
  padding: 2rem;
}

.login-header {
  margin-bottom: 1.5rem;
}

.login-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--dark-color);
  margin-bottom: 0.5rem;
}

.login-subtitle {
  color: var(--gray-color);
  font-size: 0.875rem;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.w-full {
  width: 100%;
}

.text-center {
  text-align: center;
}

.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mt-4 { margin-top: 1rem; }

.quick-login {
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.quick-login h4 {
  font-size: 0.875rem;
  color: var(--gray-color);
  margin-bottom: 0.75rem;
}

.quick-login-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
