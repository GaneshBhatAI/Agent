import api from './api';
import { User } from '../types';

export const authService = {
  async login(username: string, password: string):Promise<{ access_token: string; user: User }> {
    const res = await api.post('/auth/login/json', { username, password });
    const { access_token, user } = res.data;
    localStorage.setItem('orchestrator_token', access_token);
    localStorage.setItem('orchestrator_user', JSON.stringify(user));
    return { access_token, user };
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
    window.location.href = '/login';
  },

  async fetchProfile(): Promise<User> {
    const res = await api.get('/auth/me');
    localStorage.setItem('orchestrator_user', JSON.stringify(res.data));
    return res.data;
  },
};
