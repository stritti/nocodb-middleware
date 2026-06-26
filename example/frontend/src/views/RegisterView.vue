<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const form = ref({
  username: '',
  email: '',
  password: '',
});

const error = ref<string | null>(null);
const loading = ref(false);

const handleSubmit = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    await authStore.register({
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
    });
  } catch (err) {
    error.value = err.message || 'Registration failed';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="register-view">
    <div class="register-container">
      <div class="register-card card">
        <div class="register-header text-center mb-4">
          <h1 class="register-title">Create Account</h1>
          <p class="register-subtitle">Join our community today</p>
        </div>

        <form @submit.prevent="handleSubmit" class="register-form">
          <div class="alert alert-error mb-4" v-if="error">
            <span>⚠️</span>
            <span>{{ error }}</span>
          </div>

          <div class="form-group">
            <label for="username" class="form-label">Username</label>
            <input 
              type="text" 
              id="username" 
              v-model="form.username" 
              class="form-input" 
              placeholder="Choose a username"
              required
              @focus="error = null"
            />
          </div>

          <div class="form-group">
            <label for="email" class="form-label">Email Address</label>
            <input 
              type="email" 
              id="email" 
              v-model="form.email" 
              class="form-input" 
              placeholder="Enter your email"
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
              placeholder="Create a password"
              required
              @focus="error = null"
            />
          </div>

          <button 
            type="submit" 
            class="btn btn-primary btn-lg w-full mt-4"
            :disabled="loading"
          >
            <span v-if="loading">Creating account...</span>
            <span v-else>Register</span>
          </button>
        </form>

        <div class="register-footer text-center mt-4">
          <p>Already have an account? <router-link to="/login">Login here</router-link></p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-view {
  min-height: calc(100vh - 65px);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--light-gray);
  padding: 1rem;
}

.register-container {
  width: 100%;
  max-width: 400px;
}

.register-card {
  padding: 2rem;
}

.register-header {
  margin-bottom: 1.5rem;
}

.register-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--dark-color);
  margin-bottom: 0.5rem;
}

.register-subtitle {
  color: var(--gray-color);
  font-size: 0.875rem;
}

.register-form {
  display: flex;
  flex-direction: column;
}

.w-full {
  width: 100%;
}

.text-center {
  text-align: center;
}

.mb-4 { margin-bottom: 1rem; }
.mt-4 { margin-top: 1rem; }
</style>
