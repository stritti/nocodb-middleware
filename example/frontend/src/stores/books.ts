import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth';

interface Author {
  id: number;
  name: string;
  bio?: string;
  birth_date?: string;
}

interface Book {
  id: number;
  title: string;
  description?: string;
  published_year?: number;
  isbn?: string;
  price: number;
  author_id?: number;
  author?: Author;
  created_at?: string;
  updated_at?: string;
}

interface PageDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface PageOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

export const useBooksStore = defineStore('books', () => {
  const books = ref<Book[]>([]);
  const currentBook = ref<Book | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const pageInfo = ref<PageDto<Book>['meta']>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const authStore = useAuthStore();

  // Get all books
  const fetchBooks = async (options: PageOptions = {}) => {
    try {
      loading.value = true;
      error.value = null;

      const params: Record<string, any> = {};
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;
      if (options.sortBy) params.sortBy = options.sortBy;
      if (options.sortOrder) params.sortOrder = options.sortOrder;
      if (options.search) params.search = options.search;

      const response = await authStore.api.get('/books', { params });
      const data: PageDto<Book> = response.data;

      books.value = data.data;
      pageInfo.value = data.meta;

      return data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch books';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get a single book by ID
  const fetchBook = async (id: number) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await authStore.api.get(`/books/${id}`);
      currentBook.value = response.data;

      return response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch book';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Create a new book
  const createBook = async (bookData: Partial<Book>) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await authStore.api.post('/books', bookData);
      const newBook: Book = response.data;

      // Add to local state
      books.value.unshift(newBook);
      pageInfo.value.total += 1;

      return newBook;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create book';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Update a book
  const updateBook = async (id: number, bookData: Partial<Book>) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await authStore.api.put(`/books/${id}`, bookData);
      const updatedBook: Book = response.data;

      // Update in local state
      const index = books.value.findIndex(b => b.id === id);
      if (index !== -1) {
        books.value[index] = updatedBook;
      }
      if (currentBook.value?.id === id) {
        currentBook.value = updatedBook;
      }

      return updatedBook;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update book';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Delete a book
  const deleteBook = async (id: number) => {
    try {
      loading.value = true;
      error.value = null;

      await authStore.api.delete(`/books/${id}`);

      // Remove from local state
      books.value = books.value.filter(b => b.id !== id);
      pageInfo.value.total -= 1;

      if (currentBook.value?.id === id) {
        currentBook.value = null;
      }

      return true;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to delete book';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Search books
  const searchBooks = async (query: string, options: PageOptions = {}) => {
    try {
      loading.value = true;
      error.value = null;

      const params: Record<string, any> = { q: query };
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;
      if (options.sortBy) params.sortBy = options.sortBy;
      if (options.sortOrder) params.sortOrder = options.sortOrder;

      const response = await authStore.api.get('/books/search', { params });
      const data: PageDto<Book> = response.data;

      books.value = data.data;
      pageInfo.value = data.meta;

      return data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to search books';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get books by author
  const fetchBooksByAuthor = async (authorId: number, options: PageOptions = {}) => {
    try {
      loading.value = true;
      error.value = null;

      const params: Record<string, any> = {};
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;
      if (options.sortBy) params.sortBy = options.sortBy;
      if (options.sortOrder) params.sortOrder = options.sortOrder;

      const response = await authStore.api.get(`/books/author/${authorId}`, { params });
      const data: PageDto<Book> = response.data;

      books.value = data.data;
      pageInfo.value = data.meta;

      return data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch books by author';
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
    books,
    currentBook,
    loading,
    error,
    pageInfo,
    fetchBooks,
    fetchBook,
    createBook,
    updateBook,
    deleteBook,
    searchBooks,
    fetchBooksByAuthor,
    clearError,
  };
});
