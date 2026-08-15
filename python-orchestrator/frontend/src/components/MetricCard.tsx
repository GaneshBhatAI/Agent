import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'purple' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'purple',
  badge,
}) => {
  const colorMap = {
    purple: {
      bg: 'bg-purple-100 text-purple-700 border-purple-200',
      glow: 'hover:border-purple-300 hover:shadow-purple-sm',
      badge: 'bg-purple-100 text-purple-800 border border-purple-200',
    },
    indigo: {
      bg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      glow: 'hover:border-indigo-300 hover:shadow-sm',
      badge: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    },
    emerald: {
      bg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      glow: 'hover:border-emerald-300 hover:shadow-sm',
      badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    },
    amber: {
      bg: 'bg-amber-100 text-amber-700 border-amber-200',
      glow: 'hover:border-amber-300 hover:shadow-sm',
      badge: 'bg-amber-100 text-amber-800 border border-amber-200',
    },
    rose: {
      bg: 'bg-rose-100 text-rose-700 border-rose-200',
      glow: 'hover:border-rose-300 hover:shadow-sm',
      badge: 'bg-rose-100 text-rose-800 border border-rose-200',
    },
    slate: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      glow: 'hover:border-slate-300 hover:shadow-sm',
      badge: 'bg-slate-100 text-slate-800 border border-slate-200',
    },
  }[color];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-purple-100/90 bg-white/85 p-5 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 ${colorMap.glow}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-sans">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
              {value}
            </h3>
            {badge && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${colorMap.badge}`}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>

        <div className={`rounded-2xl border p-3 ${colorMap.bg} shadow-xs`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Subtle bottom highlight */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};
