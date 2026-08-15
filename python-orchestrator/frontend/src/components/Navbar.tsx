import React from 'react';
import { Play, Plus, LogOut, User as UserIcon, Shield } from 'lucide-react';
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
    <header className="h-16 border-b border-purple-100 bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-20 shadow-[0_4px_20px_rgba(111,83,163,0.02)]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80">
          <Shield className="h-3.5 w-3.5 text-purple-600" />
          <span className="text-xs font-semibold text-purple-900">
            Enterprise Control Room
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Action: Add Machine */}
        <button
          onClick={onOpenAddMachine}
          className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:bg-purple-50 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 text-purple-600" />
          <span>Add Machine</span>
        </button>

        {/* Quick Action: Run Job */}
        <button
          onClick={onOpenRunJob}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4.5 py-2 text-xs font-bold text-white shadow-purple-sm shadow-purple-500/25 hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
        >
          <Play className="h-3.5 w-3.5 fill-white" />
          <span>Run Job</span>
        </button>

        <div className="h-4 w-[1px] bg-purple-100 mx-1" />

        {/* User Info & Logout */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2.5 rounded-full border border-purple-200/80 bg-purple-50/70 px-3 py-1.5">
            <div className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 p-1 text-white">
              <UserIcon className="h-3 w-3" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {user?.username || 'Admin'}
              </p>
              <p className="text-[9.5px] text-purple-600 font-semibold leading-tight">
                {user?.role || 'ADMIN'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            className="rounded-full border border-purple-200 bg-white p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
