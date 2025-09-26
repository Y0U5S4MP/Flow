export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'creator' | 'reader';
  avatar?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}