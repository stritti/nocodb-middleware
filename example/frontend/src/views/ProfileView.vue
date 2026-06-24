<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const form = ref({
  username: '',
  email: '',
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const error = ref<string | null>(null);
const success = ref<string | null>(null);
const loading = ref(false);

onMounted(() => {
  if (authStore.user) {
    form.value.username = authStore.user.username;
    form.value.email = authStore.user.email;
  }
});

const updateProfile = async () => {
  try {
    loading.value = true;
    error.value = null;
    success.value = null;

    await authStore.updateProfile({
      username: form.value.username,
      email: form.value.email,
    });

    success.value = 'Profile updated successfully!';
  } catch (err) {
    error.value = err.message || 'Failed to update profile';
  } finally {
    loading.value = false;
  }
};

const updatePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    error.value = 'Passwords do not match';
    return;
  }

  try {
    loading.value = true;
    error.value = null;
    success.value = null;

    await authStore.updatePassword(
      passwordForm.value.currentPassword,
      passwordForm.value.newPassword
    );

    success.value = 'Password updated successfully!';
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
  } catch (err) {
    error.value = err.message || 'Failed to update password';
  } finally {
    loading.value = false;
  }
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
  <div class="profile-view">
    <div class="page-header">
      <h1 class="page-title">My Profile</h1>
      <p class="page-subtitle">Manage your account settings</p>
    </div>

    <div class="profile-container">
      <!-- Profile Card -->
      <div class="profile-card card mb-4">
        <div class="profile-header flex items-center gap-4 mb-4">
          <div class="profile-avatar">
            {{ authStore.user?.username.substring(0, 2).toUpperCase() }}
          </div>
          <div class="profile-info">
            <h2>{{ authStore.user?.username }}</h2>
            <div class="profile-role">
              <span class="badge" :class="`badge-${authStore.user?.role}`">
                {{ authStore.user?.role }}
              </span>
            </div>
          </div>
        </div>

        <div class="profile-details">
          <div class="detail-item">
            <span class="detail-label">Username</span>
            <span class="detail-value">{{ authStore.user?.username }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Email</span>
            <span class="detail-value">{{ authStore.user?.email }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Role</span>
            <span class="detail-value" :style="{ color: getRoleColor() }">{{ authStore.user?.role }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Member Since</span>
            <span class="detail-value">{{ authStore.user?.created_at ? new Date(authStore.user.created_at).toLocaleDateString() : 'N/A' }}</span>
          </div>
        </div>
      </div>

      <!-- Edit Profile Form -->
      <div class="edit-profile-card card mb-4">
        <h3 class="mb-4">Edit Profile</h3>

        <div class="alert alert-success mb-4" v-if="success">
          <span>✅</span>
          <span>{{ success }}</span>
        </div>

        <div class="alert alert-error mb-4" v-if="error">
          <span>⚠️</span>
          <span>{{ error }}</span>
        </div>

        <form @submit.prevent="updateProfile" class="profile-form">
          <div class="form-group">
            <label for="username" class="form-label">Username</label>
            <input 
              type="text" 
              id="username" 
              v-model="form.username" 
              class="form-input" 
              required
              @focus="error = null; success = null"
            />
          </div>

          <div class="form-group">
            <label for="email" class="form-label">Email</label>
            <input 
              type="email" 
              id="email" 
              v-model="form.email" 
              class="form-input" 
              required
              @focus="error = null; success = null"
            />
          </div>

          <button 
            type="submit" 
            class="btn btn-primary"
            :disabled="loading"
          >
            <span v-if="loading">Updating...</span>
            <span v-else>Update Profile</span>
          </button>
        </form>
      </div>

      <!-- Change Password Form -->
      <div class="password-card card">
        <h3 class="mb-4">Change Password</h3>

        <form @submit.prevent="updatePassword" class="password-form">
          <div class="form-group">
            <label for="currentPassword" class="form-label">Current Password</label>
            <input 
              type="password" 
              id="currentPassword" 
              v-model="passwordForm.currentPassword" 
              class="form-input" 
              required
              @focus="error = null; success = null"
            />
          </div>

          <div class="form-group">
            <label for="newPassword" class="form-label">New Password</label>
            <input 
              type="password" 
              id="newPassword" 
              v-model="passwordForm.newPassword" 
              class="form-input" 
              required
              @focus="error = null; success = null"
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword" class="form-label">Confirm New Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              v-model="passwordForm.confirmPassword" 
              class="form-input" 
              required
              @focus="error = null; success = null"
            />
          </div>

          <button 
            type="submit" 
            class="btn btn-primary"
            :disabled="loading"
          >
            <span v-if="loading">Updating...</span>
            <span v-else>Change Password</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-view {
  max-width: 800px;
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

.profile-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile-card {
  background-color: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.profile-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.5rem;
}

.profile-info h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--dark-color);
  margin-bottom: 0.5rem;
}

.profile-role {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.profile-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--gray-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-value {
  font-size: 0.875rem;
  color: var(--dark-color);
}

.edit-profile-card,
.password-card {
  background-color: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.profile-form,
.password-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 400px;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.gap-4 {
  gap: 1rem;
}

.mb-4 { margin-bottom: 1rem; }

.mb-2 { margin-bottom: 0.5rem; }
</style>
