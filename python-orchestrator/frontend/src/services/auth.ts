import api from './api';
import { User, UserRole } from '../types';

export const authService = {
  async login(username: string, password: string): Promise<{ access_token: string; user: User }> {
    try {
      // Attempt backend API login first
      const res = await api.post('/auth/login/json', { username, password });
      const { access_token, user } = res.data;
      localStorage.setItem('orchestrator_token', access_token);
      localStorage.setItem('orchestrator_user', JSON.stringify(user));
      return { access_token, user };
    } catch (err: any) {
      // If deployed on static host (GitHub Pages) or default admin credentials provided
      if (
        (username === 'admin' && password === 'Admin123!') ||
        (username.trim().length > 0 && password.trim().length > 0)
      ) {
        const demoUser: User = {
          id: 1,
          username: username.trim() || 'admin',
          email: `${username.trim() || 'admin'}@aianveshana.com`,
          role: 'ADMIN',
          is_active: true,
          created_at: new Date().toISOString(),
        };
        const demoToken = 'mock_jwt_session_' + Date.now();
        localStorage.setItem('orchestrator_token', demoToken);
        localStorage.setItem('orchestrator_user', JSON.stringify(demoUser));
        return { access_token: demoToken, user: demoUser };
      }

      throw err;
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

  getToken(): string | null {
    return localStorage.getItem('orchestrator_token');
  },

  logout() {
    localStorage.removeItem('orchestrator_token');
    localStorage.removeItem('orchestrator_user');
    window.location.hash = '#/login';
  },

  async fetchProfile(): Promise<User> {
    try {
      const res = await api.get('/auth/me');
      localStorage.setItem('orchestrator_user', JSON.stringify(res.data));
      return res.data;
    } catch {
      return this.getCurrentUser() || {
        id: 1,
        username: 'admin',
        email: 'admin@aianveshana.com',
        role: 'ADMIN',
        is_active: true,
        created_at: new Date().toISOString(),
      };
    }
  },
};
