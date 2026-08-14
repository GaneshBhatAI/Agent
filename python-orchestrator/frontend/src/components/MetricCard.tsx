import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'teal' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'teal',
  badge,
}) => {
  const colorMap = {
    teal: {
      bg: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      glow: 'group-hover:border-teal-500/40',
      badge: 'bg-teal-500/20 text-teal-300',
    },
    indigo: {
      bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      glow: 'group-hover:border-indigo-500/40',
      badge: 'bg-indigo-500/20 text-indigo-300',
    },
    emerald: {
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      glow: 'group-hover:border-emerald-500/40',
      badge: 'bg-emerald-500/20 text-emerald-300',
    },
    amber: {
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      glow: 'group-hover:border-amber-500/40',
      badge: 'bg-amber-500/20 text-amber-300',
    },
    rose: {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      glow: 'group-hover:border-rose-500/40',
      badge: 'bg-rose-500/20 text-rose-300',
    },
    slate: {
      bg: 'bg-slate-800 text-slate-300 border-slate-700',
      glow: 'group-hover:border-slate-600',
      badge: 'bg-slate-700 text-slate-300',
    },
  }[color];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl ${colorMap.glow}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold tracking-tight text-white font-mono">
              {value}
            </h3>
            {badge && (
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${colorMap.badge}`}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>

        <div className={`rounded-xl border p-3 ${colorMap.bg}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      {/* Subtle bottom highlight */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-teal-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};
