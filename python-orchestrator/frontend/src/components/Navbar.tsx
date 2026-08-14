import React from 'react';
import { Play, Plus, LogOut, User as UserIcon } from 'lucide-react';
import { authService } from '../services/auth';

interface NavbarProps {
  onOpenRunJob: () => void;
  onOpenAddMachine: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenRunJob, onOpenAddMachine }) => {
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-300">
          Control Room Portal
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Action: Add Machine */}
        <button
          onClick={onOpenAddMachine}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:bg-slate-850 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 text-teal-400" />
          <span>Add Machine</span>
        </button>

        {/* Quick Action: Run Job */}
        <button
          onClick={onOpenRunJob}
          className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-teal-500/20 hover:bg-teal-400 transition-all cursor-pointer"
        >
          <Play className="h-3.5 w-3.5 fill-slate-950" />
          <span>Run Job</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-800 mx-1" />

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5">
            <div className="rounded-lg bg-slate-800 p-1">
              <UserIcon className="h-3.5 w-3.5 text-teal-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-white leading-tight">
                {user?.username || 'Admin'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono leading-tight">
                {user?.role || 'ADMIN'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-850 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
