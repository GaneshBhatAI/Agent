import React, { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, Shield, Settings2, Check, Radio } from 'lucide-react';
import { authService } from '../services/auth';
import { API_BASE_URL } from '../services/api';
import { Modal } from './Modal';

interface NavbarProps {
  onOpenRunJob?: () => void;
  onOpenAddMachine?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const user = authService.getCurrentUser();
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [backendUrl, setBackendUrl] = useState<string>(localStorage.getItem('orchestrator_api_url') || 'http://localhost:8001/api');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleLogout = () => {
    authService.logout();
  };

  const handleSaveBackendUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = backendUrl.trim().replace(/\/$/, '');
    localStorage.setItem('orchestrator_api_url', clean);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setIsSettingsOpen(false);
      window.location.reload();
    }, 800);
  };

  return (
    <>
      <header className="h-16 border-b border-purple-100 bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-20 shadow-[0_4px_20px_rgba(111,83,163,0.02)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200/80 hover:bg-purple-100/70 transition-all cursor-pointer"
            title="Click to configure backend orchestrator URL"
          >
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-bold text-purple-900">
              Enterprise Orchestrator
            </span>
            <span className="flex h-2 w-2 relative ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* User Info & Logout */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Configure Orchestrator Backend URL"
              className="rounded-full border border-purple-200 bg-white p-2 text-slate-600 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer shadow-2xs"
            >
              <Settings2 className="h-4 w-4 text-purple-600" />
            </button>

            <div className="flex items-center gap-2.5 rounded-full border border-purple-200/80 bg-purple-50/70 px-3 py-1.5 shadow-2xs">
              <div className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 p-1 text-white">
                <UserIcon className="h-3 w-3" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.username || 'Ganesh'}
                </p>
                <p className="text-[9.5px] text-purple-600 font-semibold leading-tight">
                  {user?.role || 'ADMIN'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-full border border-purple-200 bg-white p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Backend URL Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Orchestrator Backend Endpoint"
        subtitle="Configure the FastAPI backend URL or remote secure tunnel connection"
        maxWidth="md"
      >
        <form onSubmit={handleSaveBackendUrl} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              API Base URL
            </label>
            <input
              type="text"
              required
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:8001/api or https://tunnel.domain.com/api"
              className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-4 py-2.5 text-xs font-mono text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Default: <code className="font-mono text-purple-700">http://localhost:8001/api</code> (or your remote secure tunnel URL).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-purple-100">
            <button
              type="button"
              onClick={() => {
                setBackendUrl('http://localhost:8001/api');
              }}
              className="rounded-full border border-purple-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50"
            >
              Reset to Local
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75]"
            >
              {isSaved ? <Check className="h-3.5 w-3.5" /> : null}
              <span>{isSaved ? 'Saved! Reloading...' : 'Save Endpoint'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
