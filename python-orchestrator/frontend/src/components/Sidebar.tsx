import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  FolderGit2,
  PlaySquare,
  CalendarClock,
  KeyRound,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Machines', path: '/machines', icon: Server },
  { label: 'Repositories', path: '/repositories', icon: FolderGit2 },
  { label: 'Jobs', path: '/jobs', icon: PlaySquare },
  { label: 'Schedules', path: '/schedules', icon: CalendarClock },
  { label: 'Credentials', path: '/credentials', icon: KeyRound },
  { label: 'Audit Logs', path: '/audit-logs', icon: ShieldCheck },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-purple-100 bg-white/85 backdrop-blur-xl flex flex-col h-screen shrink-0 shadow-[4px_0_24px_rgba(111,83,163,0.03)] z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-purple-100/80">
        <svg className="w-8 h-8 shrink-0" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sb_lg1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BA8BBF" />
              <stop offset="100%" stopColor="#6F53A3" />
            </linearGradient>
            <linearGradient id="sb_lg2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F3A8A" />
              <stop offset="100%" stopColor="#2D1B69" />
            </linearGradient>
          </defs>
          <rect x="0" y="35" width="100" height="30" rx="15" fill="url(#sb_lg1)" transform="rotate(45 50 50)" />
          <circle cx="22" cy="78" r="20" fill="url(#sb_lg2)" />
          <circle cx="78" cy="22" r="20" fill="url(#sb_lg2)" />
        </svg>
        <div>
          <h1 className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-1.5 font-sans">
            AI <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">ANVESHANA</span>
          </h1>
          <p className="text-[10.5px] text-purple-600/80 font-medium">Agentic Orchestrator</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-900/40">
          Orchestration Center
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] text-white shadow-purple-sm shadow-purple-500/25'
                    : 'text-slate-600 hover:text-purple-800 hover:bg-purple-50/80 border border-transparent'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Fleet Live Indicator */}
      <div className="p-3 border-t border-purple-100/80 bg-purple-50/40">
        <div className="rounded-xl border border-purple-200/60 bg-white/90 p-3 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-purple-600" />
              Fleet Orchestrator
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight font-medium">
            GitHub-powered Python runners online and dispatch ready.
          </p>
        </div>
      </div>
    </aside>
  );
};
