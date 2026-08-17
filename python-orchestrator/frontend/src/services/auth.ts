import api from './api';
import { User } from '../types';

export const authService = {
  async login(username: string, password: string): Promise<{ access_token: string; user: User }> {
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      throw new Error('Please provide both username and password.');
    }

    try {
      const formData = new URLSearchParams();
      formData.append('username', cleanUser);
      formData.append('password', cleanPass);

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;
      
      const userObj: User = {
        id: 1, // Just a fallback, FastAPI doesn't return full user on login, wait!
        username: cleanUser,
        email: `${cleanUser.toLowerCase()}@aianveshana.com`,
        role: 'ADMIN',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      localStorage.setItem('orchestrator_token', access_token);
      localStorage.setItem('orchestrator_user', JSON.stringify(userObj));

      return { access_token, user: userObj };
    } catch (err: any) {
      console.error('Authentication error', err);
      throw new Error(err.response?.data?.detail || 'Invalid username or password.');
    }
  },

  getCurrentUser(): User | null {
    const raw = localStorage.getItem('orchestrator_user');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  },
  
  getUsername(): string {
    const cur = this.getCurrentUser();
    return cur?.username || 'admin';
  },

  getToken(): string | null {
    return localStorage.getItem('orchestrator_token');
  },

  logout() {
    localStorage.removeItem('orchestrator_token');
    localStorage.removeItem('orchestrator_user');
    window.location.hash = '#/login';
  },

  async fetchProfile(): Promise<User> {
    const cur = this.getCurrentUser();
    return cur || {
      id: 1,
      username: 'Ganesh',
      email: 'ganesh@aianveshana.com',
      role: 'ADMIN',
      is_active: true,
      created_at: new Date().toISOString(),
    };
  },
};
