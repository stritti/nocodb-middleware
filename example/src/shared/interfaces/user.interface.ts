export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  created_at?: string;
  updated_at?: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface JwtPayload {
  sub: number;
  username: string;
  email: string;
  role: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
