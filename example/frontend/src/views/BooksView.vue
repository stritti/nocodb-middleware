<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useBooksStore } from '@/stores/books';
import { useAuthStore } from '@/stores/auth';

const booksStore = useBooksStore();
const authStore = useAuthStore();

const searchQuery = ref('');
const selectedAuthor = ref('');
const minPrice = ref(0);
const maxPrice = ref(100);

onMounted(() => {
  fetchBooks();
});

watch([searchQuery, selectedAuthor, minPrice, maxPrice], () => {
  fetchBooks();
});

const fetchBooks = async (overrides: any = {}) => {
  try {
    const options: any = {
      page: 1,
      limit: 10,
      sortBy: 'title',
      sortOrder: 'ASC',
      ...overrides,
    };

    if (searchQuery.value) {
      options.search = searchQuery.value;
    }

    // Use price-range endpoint when custom range is set (non-guests only)
    const isGuest = authStore.isGuest;
    const isDefaultRange = minPrice.value === 0 && maxPrice.value === 100;

    if (!isGuest && !isDefaultRange) {
      await booksStore.fetchBooksByPriceRange(minPrice.value, maxPrice.value, options);
    } else if (searchQuery.value) {
      await booksStore.searchBooks(searchQuery.value, options);
    } else {
      await booksStore.fetchBooks(options);
    }
  } catch (error) {
    console.error('Failed to fetch books:', error);
  }
};

const addToFavorites = async (bookId: number) => {
  try {
    await authStore.api.post(`/users/me/favorites/${bookId}`);
    // Show success message
  } catch (error) {
    console.error('Failed to add to favorites:', error);
  }
};

const getPriceRangeText = () => {
  if (authStore.isGuest) {
    return 'Under $10 (Guest View)';
  }
  return `$${minPrice.value} - $${maxPrice.value}`;
};
</script>

<template>
  <div class="books-view">
    <div class="page-header">
      <h1 class="page-title">Books</h1>
      <p class="page-subtitle">Browse our collection of books</p>
    </div>

    <!-- Filters -->
    <div class="filters-card card mb-4">
      <h3 class="mb-3">Filters</h3>
      <div class="filters-grid">
        <div class="filter-group">
          <label class="form-label">Search</label>
          <input 
            type="text" 
            v-model="searchQuery" 
            class="form-input" 
            placeholder="Search by title or description"
          />
        </div>
        <div class="filter-group">
          <label class="form-label">Price Range</label>
          <div class="price-range">
            <input 
              type="number" 
              v-model.number="minPrice" 
              class="form-input" 
              placeholder="Min"
              min="0"
            />
            <span>to</span>
            <input 
              type="number" 
              v-model.number="maxPrice" 
              class="form-input" 
              placeholder="Max"
              min="0"
            />
          </div>
          <div class="price-range-text" v-if="authStore.isGuest">
            <span class="badge badge-gray">Guests can only see books under $10</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Books Table -->
    <div class="books-table-card card">
      <div class="table-header flex justify-between items-center mb-3">
        <h3>Books ({{ booksStore.pageInfo.total }} total)</h3>
        <router-link to="/authors" class="btn btn-outline btn-sm">
          View Authors
        </router-link>
      </div>

      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Price</th>
              <th>Year</th>
              <th v-if="authStore.isAuthenticated">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="book in booksStore.books" :key="book.id">
              <td>
                <strong>{{ book.title }}</strong>
                <div class="book-description" v-if="book.description">
                  {{ book.description.substring(0, 50) }}...
                </div>
              </td>
              <td>{{ book.author?.name || 'Unknown' }}</td>
              <td>${{ book.price.toFixed(2) }}</td>
              <td>{{ book.published_year || 'N/A' }}</td>
              <td v-if="authStore.isAuthenticated">
                <div class="table-actions">
                  <button 
                    class="btn btn-outline btn-sm"
                    @click="addToFavorites(book.id)"
                    title="Add to favorites"
                  >
                    ❤️
                  </button>
                  <router-link 
                    :to="`/authors/${book.author_id}`" 
                    class="btn btn-outline btn-sm"
                    v-if="book.author_id"
                    title="View author"
                  >
                    ✍️
                  </router-link>
                </div>
              </td>
            </tr>
            <tr v-if="booksStore.books.length === 0">
              <td colspan="5" class="text-center py-4">
                <div class="empty-state">
                  <div class="empty-state-icon">📚</div>
                  <div class="empty-state-title">No books found</div>
                  <div class="empty-state-text">Try adjusting your filters</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination flex justify-between items-center mt-4" v-if="booksStore.pageInfo.totalPages > 1">
        <div class="pagination-info">
          Showing {{ booksStore.pageInfo.page }} of {{ booksStore.pageInfo.totalPages }} pages
        </div>
        <div class="pagination-controls flex gap-2">
          <button 
            class="btn btn-outline btn-sm"
            :disabled="!booksStore.pageInfo.hasPrevPage"
            @click="fetchBooks({ page: booksStore.pageInfo.page - 1 })"
          >
            Previous
          </button>
          <button 
            class="btn btn-outline btn-sm"
            :disabled="!booksStore.pageInfo.hasNextPage"
            @click="fetchBooks({ page: booksStore.pageInfo.page + 1 })"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.books-view {
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

.filters-card {
  background-color: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.price-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.price-range input {
  width: 80px;
}

.price-range span {
  color: var(--gray-color);
  font-size: 0.875rem;
}

.price-range-text {
  margin-top: 0.5rem;
}

.books-table-card {
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

.book-description {
  font-size: 0.75rem;
  color: var(--gray-color);
  margin-top: 0.25rem;
}

.text-center {
  text-align: center;
}

.py-4 {
  padding: 1rem 0;
}

.flex {
  display: flex;
}

.justify-between {
  justify-content: space-between;
}

.items-center {
  align-items: center;
}

.gap-2 {
  gap: 0.5rem;
}

.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mt-4 { margin-top: 1rem; }

.mt-3 { margin-top: 0.75rem; }

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

.pagination {
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.pagination-info {
  font-size: 0.875rem;
  color: var(--gray-color);
}

.pagination-controls {
  display: flex;
  gap: 0.5rem;
}
</style>
