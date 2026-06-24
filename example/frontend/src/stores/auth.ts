import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  created_at?: string;
  updated_at?: string;
}

interface AuthResponse {
  access_token: string;
  user: User;
}

interface AuthCredentials {
  username: string;
  password: string;
  email?: string;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const router = useRouter();

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isUser = computed(() => user.value?.role === 'user');
  const isGuest = computed(() => user.value?.role === 'guest');

  const api = axios.create({
    baseURL: '/api',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add request interceptor to include token
  api.interceptors.request.use((config) => {
    if (token.value) {
      config.headers.Authorization = `Bearer ${token.value}`;
    }
    return config;
  });

  // Initialize auth store with user data
  const initialize = async () => {
    if (!token.value) return;

    try {
      loading.value = true;
      error.value = null;

      const response = await api.get('/users/me');
      user.value = response.data;
    } catch (err) {
      console.error('Failed to initialize auth:', err);
      logout();
    } finally {
      loading.value = false;
    }
  };

  // Login user
  const login = async (credentials: AuthCredentials) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await api.post('/users/login', {
        username: credentials.username,
        password: credentials.password,
      });

      const data: AuthResponse = response.data;
      
      token.value = data.access_token;
      user.value = data.user;
      
      // Save token to localStorage
      localStorage.setItem('token', data.access_token);

      // Redirect to home or intended route
      await router.push({ name: 'home' });

      return data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Login failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Register new user
  const register = async (credentials: AuthCredentials & { email: string }) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await api.post('/users/register', {
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
      });

      const data: AuthResponse = response.data;
      
      token.value = data.access_token;
      user.value = data.user;
      
      // Save token to localStorage
      localStorage.setItem('token', data.access_token);

      // Redirect to home
      await router.push({ name: 'home' });

      return data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Registration failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Logout user
  const logout = () => {
    token.value = null;
    user.value = null;
    error.value = null;
    
    // Remove token from localStorage
    localStorage.removeItem('token');
    
    // Redirect to login
    router.push({ name: 'login' });
  };

  // Update user profile
  const updateProfile = async (updateData: Partial<User>) => {
    if (!user.value?.id) return;

    try {
      loading.value = true;
      error.value = null;

      const response = await api.put(`/users/${user.value.id}`, updateData);
      user.value = response.data;

      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update profile';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Update password
  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await api.put('/users/me/password', {
        currentPassword,
        newPassword,
      });

      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update password';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Clear error
  const clearError = () => {
    error.value = null;
  };

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isUser,
    isGuest,
    api,
    initialize,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    clearError,
  };
});
