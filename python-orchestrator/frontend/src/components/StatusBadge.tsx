import React from 'react';
import { JobStatus, MachineStatus } from '../types';

interface StatusBadgeProps {
  status: JobStatus | MachineStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showPulse = true,
}) => {
  const getStyles = () => {
    switch (status) {
      case 'ONLINE':
      case 'SUCCESS':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
          glow: 'shadow-[0_0_8px_rgba(52,211,153,0.4)]',
        };
      case 'RUNNING':
      case 'PREPARING':
      case 'INSTALLING_DEPENDENCIES':
      case 'ASSIGNED':
        return {
          bg: 'bg-teal-500/10 border-teal-500/30 text-teal-300',
          dot: 'bg-teal-400',
          glow: 'shadow-[0_0_8px_rgba(45,212,191,0.5)]',
        };
      case 'BUSY':
        return {
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
          dot: 'bg-indigo-400',
          glow: 'shadow-[0_0_8px_rgba(129,140,248,0.5)]',
        };
      case 'QUEUED':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-400',
          glow: 'shadow-[0_0_8px_rgba(251,191,36,0.4)]',
        };
      case 'FAILED':
      case 'TIMEOUT':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-400',
          glow: 'shadow-[0_0_8px_rgba(244,63,94,0.4)]',
        };
      case 'CANCELLED':
      case 'DISABLED':
      case 'OFFLINE':
      default:
        return {
          bg: 'bg-slate-800/80 border-slate-700 text-slate-400',
          dot: 'bg-slate-500',
          glow: '',
        };
    }
  };

  const { bg, dot, glow } = getStyles();
  const isAnimated =
    showPulse &&
    ['RUNNING', 'PREPARING', 'INSTALLING_DEPENDENCIES', 'ASSIGNED', 'ONLINE', 'BUSY'].includes(
      status
    );

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2.5 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${bg} ${sizeClasses} tracking-wide transition-all`}
    >
      <span className="relative flex h-2 w-2">
        {isAnimated && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dot} opacity-75`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dot} ${glow}`} />
      </span>
      <span>{status.replace(/_/g, ' ')}</span>
    </span>
  );
};
