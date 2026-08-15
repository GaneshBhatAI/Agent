import React from 'react';
import { LogOut, User as UserIcon, Shield, Activity } from 'lucide-react';
import { authService } from '../services/auth';

interface NavbarProps {
  onOpenRunJob?: () => void;
  onOpenAddMachine?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <header className="h-16 border-b border-purple-100 bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-20 shadow-[0_4px_20px_rgba(111,83,163,0.02)]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200/80">
          <Shield className="h-4 w-4 text-purple-600" />
          <span className="text-xs font-bold text-purple-900">
            Enterprise Control Room
          </span>
          <span className="flex h-2 w-2 relative ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* User Info & Logout */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2.5 rounded-full border border-purple-200/80 bg-purple-50/70 px-3 py-1.5 shadow-2xs">
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
            className="rounded-full border border-purple-200 bg-white p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
