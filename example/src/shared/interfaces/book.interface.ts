export interface Author {
  id: number;
  name: string;
  bio?: string;
  birth_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Book {
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

export interface CreateBookDto {
  title: string;
  description?: string;
  published_year?: number;
  isbn?: string;
  price: number;
  author_id?: number;
}

export interface UpdateBookDto {
  title?: string;
  description?: string;
  published_year?: number;
  isbn?: string;
  price?: number;
  author_id?: number;
}

export interface PageOptionsDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

export interface PageDto<T> {
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
