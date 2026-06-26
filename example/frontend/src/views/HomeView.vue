<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useBooksStore } from '@/stores/books';
import { onMounted, ref } from 'vue';

const authStore = useAuthStore();
const booksStore = useBooksStore();

const featuredBooks = ref([]);

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await booksStore.fetchBooks({ limit: 6 });
    featuredBooks.value = booksStore.books;
  }
});
</script>

<template>
  <div class="home-view">
    <div class="page-header">
      <h1 class="page-title">Welcome to NocoDB Middleware Example</h1>
      <p class="page-subtitle">A practical example with Books, Authors, and Users management</p>
    </div>

    <template v-if="authStore.isAuthenticated">
      <div class="welcome-section card mb-4">
        <h2>Welcome back, {{ authStore.user?.username }}!</h2>
        <p>You are logged in as <span class="badge" :class="`badge-${authStore.user?.role}`">{{ authStore.user?.role }}</span></p>
        <p>Explore the application using the sidebar navigation.</p>
      </div>

      <div class="featured-section">
        <h3 class="mb-3">Featured Books</h3>
        <div class="books-grid" v-if="featuredBooks.length > 0">
          <div class="book-card card" v-for="book in featuredBooks" :key="book.id">
            <div class="book-header">
              <h4>{{ book.title }}</h4>
              <span class="book-price">${{ book.price.toFixed(2) }}</span>
            </div>
            <p class="book-description" v-if="book.description">{{ book.description.substring(0, 100) }}...</p>
            <div class="book-author" v-if="book.author">
              <span>by {{ book.author.name }}</span>
            </div>
            <router-link :to="`/books?search=${encodeURIComponent(book.title)}`" class="btn btn-primary btn-sm">
              View Details
            </router-link>
          </div>
        </div>
        <div class="empty-state" v-else>
          <p>No books available. Add some books to see them here!</p>
        </div>
      </div>

      <div class="quick-actions card mt-4">
        <h3 class="mb-3">Quick Actions</h3>
        <div class="actions-grid">
          <router-link to="/books" class="action-card">
            <div class="action-icon">📚</div>
            <div class="action-label">Browse Books</div>
          </router-link>
          <router-link to="/authors" class="action-card">
            <div class="action-icon">✍️</div>
            <div class="action-label">View Authors</div>
          </router-link>
          <router-link to="/favorites" class="action-card">
            <div class="action-icon">❤️</div>
            <div class="action-label">My Favorites</div>
          </router-link>
          <router-link to="/profile" class="action-card">
            <div class="action-icon">👤</div>
            <div class="action-label">My Profile</div>
          </router-link>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="guest-section">
        <div class="guest-card card text-center">
          <h2 class="mb-2">Explore Our Book Collection</h2>
          <p class="mb-4">Browse books, discover authors, and manage your favorites.</p>
          <div class="guest-actions flex justify-center gap-3">
            <router-link to="/login" class="btn btn-primary">Login</router-link>
            <router-link to="/register" class="btn btn-outline">Register</router-link>
          </div>
        </div>

        <div class="features-grid mt-4">
          <div class="feature-card card">
            <div class="feature-icon">📚</div>
            <h3>Books</h3>
            <p>Browse our extensive collection of books with detailed information.</p>
          </div>
          <div class="feature-card card">
            <div class="feature-icon">✍️</div>
            <h3>Authors</h3>
            <p>Discover your favorite authors and their works.</p>
          </div>
          <div class="feature-card card">
            <div class="feature-icon">❤️</div>
            <h3>Favorites</h3>
            <p>Save your favorite books for quick access.</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.home-view {
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

.welcome-section {
  background-color: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.featured-section {
  background-color: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.book-card {
  padding: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.book-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.book-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.book-price {
  font-weight: 600;
  color: var(--primary-color);
}

.book-description {
  font-size: 0.875rem;
  color: var(--gray-color);
  margin-bottom: 0.75rem;
}

.book-author {
  font-size: 0.75rem;
  color: var(--gray-color);
  margin-bottom: 0.75rem;
}

.quick-actions {
  background-color: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 1rem;
  text-decoration: none;
  color: var(--dark-color);
  background-color: var(--light-gray);
  border-radius: var(--radius);
  transition: all 0.2s;
}

.action-card:hover {
  background-color: #e5e7eb;
  transform: translateY(-2px);
}

.action-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.action-label {
  font-weight: 500;
}

.guest-section {
  max-width: 800px;
  margin: 0 auto;
}

.guest-card {
  padding: 3rem 2rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.feature-card {
  padding: 2rem 1.5rem;
  text-align: center;
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  margin-bottom: 0.5rem;
}

.feature-card p {
  color: var(--gray-color);
  font-size: 0.875rem;
}

.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mt-4 { margin-top: 1rem; }

.flex {
  display: flex;
}

.justify-center {
  justify-content: center;
}

.gap-3 {
  gap: 0.75rem;
}

.text-center {
  text-align: center;
}
</style>
