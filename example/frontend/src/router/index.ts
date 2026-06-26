import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import LoginView from '@/views/LoginView.vue';
import RegisterView from '@/views/RegisterView.vue';
import BooksView from '@/views/BooksView.vue';
import AuthorsView from '@/views/AuthorsView.vue';
import ProfileView from '@/views/ProfileView.vue';
import FavoritesView from '@/views/FavoritesView.vue';
import AdminView from '@/views/AdminView.vue';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: false },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false, hideForAuth: true },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { requiresAuth: false, hideForAuth: true },
    },
    {
      path: '/books',
      name: 'books',
      component: BooksView,
      meta: { requiresAuth: true },
    },
    {
      path: '/authors',
      name: 'authors',
      component: AuthorsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true },
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: FavoritesView,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  // Initialize auth store if token exists
  if (authStore.token && !authStore.user) {
    await authStore.initialize();
  }

  // Redirect to login if route requires auth and user is not authenticated
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  // Redirect to home if route should be hidden for authenticated users
  if (to.meta.hideForAuth && authStore.isAuthenticated) {
    return next({ name: 'home' });
  }

  // Check for admin requirement
  if (to.meta.requiresAdmin && authStore.isAuthenticated && authStore.user?.role !== 'admin') {
    return next({ name: 'home' });
  }

  return next();
});

export default router;
