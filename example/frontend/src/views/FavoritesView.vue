<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const favorites = ref([]);
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(() => {
  fetchFavorites();
});

const fetchFavorites = async () => {
  try {
    loading.value = true;
    error.value = null;

    const response = await authStore.api.get('/users/me/favorites');
    favorites.value = response.data.data;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to fetch favorites';
    console.error('Failed to fetch favorites:', err);
  } finally {
    loading.value = false;
  }
};

const removeFromFavorites = async (favoriteId: number, index: number) => {
  try {
    await authStore.api.delete(`/users/me/favorites/${favoriteId}`);
    favorites.value.splice(index, 1);
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to remove from favorites';
    console.error('Failed to remove from favorites:', err);
  }
};

const getTotalPrice = () => {
  return favorites.value.reduce((total: number, fav: any) => {
    return total + (fav.book?.price || 0);
  }, 0);
};
</script>

<template>
  <div class="favorites-view">
    <div class="page-header">
      <h1 class="page-title">My Favorites</h1>
      <p class="page-subtitle">Books you've saved for later</p>
    </div>

    <!-- Summary Card -->
    <div class="summary-card card mb-4" v-if="favorites.length > 0">
      <div class="summary-content flex justify-between items-center">
        <div class="summary-info">
          <h3>{{ favorites.length }} Favorite Books</h3>
          <p>Total value: ${{ getTotalPrice().toFixed(2) }}</p>
        </div>
        <router-link to="/books" class="btn btn-primary">
          📚 Browse More Books
        </router-link>
      </div>
    </div>

    <!-- Favorites List -->
    <div class="favorites-list" v-if="favorites.length > 0">
      <div class="favorite-card card mb-3" v-for="(fav, index) in favorites" :key="fav.id">
        <div class="favorite-content flex gap-3">
          <div class="favorite-cover">
            <div class="cover-placeholder">📖</div>
          </div>
          
          <div class="favorite-details flex-1">
            <h3>{{ fav.book?.title || 'Unknown Book' }}</h3>
            <p class="favorite-author" v-if="fav.book?.author">
              by {{ fav.book.author.name }}
            </p>
            <p class="favorite-description" v-if="fav.book?.description">
              {{ fav.book.description.substring(0, 100) }}{{ fav.book.description.length > 100 ? '...' : '' }}
            </p>
            <div class="favorite-meta flex items-center gap-3">
              <span class="favorite-price">${{ (fav.book?.price || 0).toFixed(2) }}</span>
              <span class="favorite-year" v-if="fav.book?.published_year">
                📅 {{ fav.book.published_year }}
              </span>
            </div>
          </div>
          
          <div class="favorite-actions flex flex-col gap-2">
            <router-link :to="`/books?search=${encodeURIComponent(fav.book?.title || '')}`" class="btn btn-outline btn-sm">
              View Details
            </router-link>
            <button class="btn btn-danger btn-sm" @click="removeFromFavorites(fav.id, index)">
              ❤️ Remove
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div class="empty-state card" v-if="favorites.length === 0 && !loading">
      <div class="empty-state-icon">❤️</div>
      <div class="empty-state-title">No favorites yet</div>
      <div class="empty-state-text">Start adding books to your favorites collection!</div>
      <router-link to="/books" class="btn btn-primary mt-3">
        Browse Books
      </router-link>
    </div>

    <!-- Loading State -->
    <div class="loading-state card" v-if="loading && favorites.length === 0">
      <div class="loading-content flex items-center justify-center py-4">
        <div class="spinner"></div>
        <span class="ml-2">Loading your favorites...</span>
      </div>
    </div>

    <!-- Error State -->
    <div class="alert alert-error" v-if="error">
      <span>⚠️</span>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<style scoped>
.favorites-view {
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

.summary-card {
  background-color: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.summary-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-info h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--dark-color);
  margin-bottom: 0.25rem;
}

.summary-info p {
  color: var(--gray-color);
  font-size: 0.875rem;
  margin: 0;
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.favorite-card {
  background-color: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.favorite-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.favorite-content {
  display: flex;
  gap: 1.5rem;
}

.favorite-cover {
  width: 80px;
  height: 120px;
  background-color: var(--light-gray);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cover-placeholder {
  font-size: 2rem;
}

.favorite-details {
  flex: 1;
  min-width: 0;
}

.favorite-details h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--dark-color);
  margin-bottom: 0.5rem;
}

.favorite-author {
  font-size: 0.875rem;
  color: var(--gray-color);
  margin-bottom: 0.5rem;
}

.favorite-description {
  font-size: 0.875rem;
  color: var(--gray-color);
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.favorite-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.favorite-price {
  font-weight: 600;
  color: var(--primary-color);
  font-size: 1rem;
}

.favorite-year {
  font-size: 0.75rem;
  color: var(--gray-color);
}

.favorite-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  justify-content: center;
}

.flex {
  display: flex;
}

.flex-1 {
  flex: 1;
}

.flex-col {
  flex-direction: column;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 0.75rem;
}

.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mt-3 { margin-top: 0.75rem; }

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
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
  margin-bottom: 1rem;
}

.loading-state {
  background-color: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.loading-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.ml-2 { margin-left: 0.5rem; }
</style>
