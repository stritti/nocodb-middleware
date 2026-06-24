<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useBooksStore } from '@/stores/books';

const authStore = useAuthStore();
const booksStore = useBooksStore();

const authors = ref([]);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');

onMounted(() => {
  fetchAuthors();
});

const fetchAuthors = async () => {
  try {
    loading.value = true;
    error.value = null;

    const response = await authStore.api.get('/authors', {
      params: {
        search: searchQuery.value || undefined,
        limit: 20,
      },
    });

    authors.value = response.data.data;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to fetch authors';
    console.error('Failed to fetch authors:', err);
  } finally {
    loading.value = false;
  }
};

const viewAuthorBooks = async (authorId: number) => {
  try {
    await booksStore.fetchBooksByAuthor(authorId);
    // Navigate to books view with author filter
    // In a real implementation, you might want to show a modal or navigate
  } catch (err) {
    console.error('Failed to fetch author books:', err);
  }
};
</script>

<template>
  <div class="authors-view">
    <div class="page-header">
      <h1 class="page-title">Authors</h1>
      <p class="page-subtitle">Discover your favorite authors and their works</p>
    </div>

    <!-- Search -->
    <div class="search-card card mb-4">
      <div class="search-form flex items-center gap-2">
        <input 
          type="text" 
          v-model="searchQuery" 
          class="form-input flex-1" 
          placeholder="Search authors by name or bio..."
          @input="fetchAuthors"
        />
        <button class="btn btn-primary" @click="fetchAuthors" :disabled="loading">
          <span v-if="loading">Searching...</span>
          <span v-else>🔍 Search</span>
        </button>
      </div>
    </div>

    <!-- Authors Grid -->
    <div class="authors-grid" v-if="authors.length > 0">
      <div class="author-card card" v-for="author in authors" :key="author.id">
        <div class="author-header">
          <div class="author-avatar">{{ author.name.substring(0, 2).toUpperCase() }}</div>
          <h3>{{ author.name }}</h3>
        </div>
        
        <div class="author-bio" v-if="author.bio">
          <p>{{ author.bio.substring(0, 150) }}{{ author.bio.length > 150 ? '...' : '' }}</p>
        </div>
        
        <div class="author-meta">
          <span class="author-birthdate" v-if="author.birth_date">
            📅 {{ new Date(author.birth_date).toLocaleDateString() }}
          </span>
        </div>
        
        <div class="author-actions flex gap-2 mt-3">
          <button class="btn btn-outline btn-sm" @click="viewAuthorBooks(author.id)">
            📚 View Books
          </button>
          <router-link :to="`/books?search=${encodeURIComponent(author.name)}`" class="btn btn-primary btn-sm">
            Search Books
          </router-link>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div class="empty-state card" v-if="authors.length === 0 && !loading">
      <div class="empty-state-icon">✍️</div>
      <div class="empty-state-title">No authors found</div>
      <div class="empty-state-text">Try adjusting your search query</div>
    </div>

    <!-- Loading State -->
    <div class="loading-state card" v-if="loading && authors.length === 0">
      <div class="loading-content flex items-center justify-center py-4">
        <div class="spinner"></div>
        <span class="ml-2">Loading authors...</span>
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
.authors-view {
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

.authors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.author-card {
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.author-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.author-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
}

.author-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--dark-color);
  margin: 0;
}

.author-bio {
  margin-bottom: 1rem;
}

.author-bio p {
  font-size: 0.875rem;
  color: var(--gray-color);
  line-height: 1.5;
  margin: 0;
}

.author-meta {
  font-size: 0.75rem;
  color: var(--gray-color);
}

.author-actions {
  display: flex;
  gap: 0.5rem;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.gap-2 {
  gap: 0.5rem;
}

.mt-3 { margin-top: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }

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
