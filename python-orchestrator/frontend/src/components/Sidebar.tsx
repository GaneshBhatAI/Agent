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
  Cpu,
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
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col h-screen shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 p-2 shadow-lg shadow-teal-500/30">
          <Cpu className="h-5 w-5 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
            ORCHESTRATOR
            <span className="rounded bg-teal-500/20 px-1.5 py-0.2 text-[9px] font-mono font-semibold text-teal-300 border border-teal-500/30">
              RPA
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 font-mono">Python Control Room</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Control Center
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.12)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
            </span>
            <span className="text-slate-300 font-medium text-[11px]">System Online</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
