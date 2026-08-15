import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, ArrowRight, Sparkles, Shield } from 'lucide-react';
import { authService } from '../services/auth';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('Admin123!');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await authService.login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('Admin123!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#F8F5FB]">
      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-purple-400/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-indigo-400/20 blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex rounded-3xl bg-white p-3.5 shadow-purple-md border border-purple-200/80">
            <svg className="w-10 h-10 shrink-0" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="login_lg1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#BA8BBF" />
                  <stop offset="100%" stopColor="#6F53A3" />
                </linearGradient>
                <linearGradient id="login_lg2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4F3A8A" />
                  <stop offset="100%" stopColor="#2D1B69" />
                </linearGradient>
              </defs>
              <rect x="0" y="35" width="100" height="30" rx="15" fill="url(#login_lg1)" transform="rotate(45 50 50)" />
              <circle cx="22" cy="78" r="20" fill="url(#login_lg2)" />
              <circle cx="78" cy="22" r="20" fill="url(#login_lg2)" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-sans">
              AI <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">ANVESHANA</span>
            </h1>
            <p className="text-xs text-purple-700 font-semibold mt-0.5">
              Enterprise Agentic Orchestrator
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="rounded-3xl border border-purple-200/80 bg-white/90 p-8 shadow-purple-lg backdrop-blur-2xl space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-purple-600" />
                <span>Username</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-4 py-2.5 text-sm text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none transition-all shadow-2xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-purple-600" />
                <span>Password</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-4 py-2.5 text-sm text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none transition-all font-mono shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] py-3 text-sm font-bold text-white shadow-purple-md hover:from-[#5E4391] hover:to-[#3F2B75] focus:outline-none disabled:opacity-50 transition-all cursor-pointer mt-3"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Orchestrator</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Helper */}
          <div className="rounded-2xl border border-purple-200/70 bg-purple-50/60 p-3.5 flex items-center justify-between text-xs">
            <div className="text-slate-600">
              <span className="font-bold text-slate-800">Default Admin:</span>
              <div className="font-mono text-[11px] text-purple-700 font-semibold">admin / Admin123!</div>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 font-bold px-2.5 py-1 rounded-full bg-white border border-purple-200 shadow-2xs cursor-pointer"
            >
              <Sparkles className="h-3 w-3 text-purple-600" />
              <span>Fill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
