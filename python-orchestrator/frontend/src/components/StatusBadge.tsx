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
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          dot: 'bg-emerald-500',
          glow: '',
        };
      case 'RUNNING':
      case 'PREPARING':
      case 'INSTALLING_DEPENDENCIES':
      case 'ASSIGNED':
        return {
          bg: 'bg-purple-50 border-purple-200 text-purple-700',
          dot: 'bg-purple-500',
          glow: '',
        };
      case 'BUSY':
        return {
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
          dot: 'bg-indigo-500',
          glow: '',
        };
      case 'QUEUED':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          dot: 'bg-amber-500',
          glow: '',
        };
      case 'FAILED':
      case 'TIMEOUT':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          dot: 'bg-rose-500',
          glow: '',
        };
      case 'CANCELLED':
      case 'DISABLED':
      case 'OFFLINE':
      default:
        return {
          bg: 'bg-slate-100 border-slate-200 text-slate-600',
          dot: 'bg-slate-400',
          glow: '',
        };
    }
  };

  const { bg, dot } = getStyles();
  const isAnimated =
    showPulse &&
    ['RUNNING', 'PREPARING', 'INSTALLING_DEPENDENCIES', 'ASSIGNED', 'ONLINE', 'BUSY'].includes(
      status
    );

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-medium',
    md: 'text-xs px-2.5 py-1 gap-2 font-semibold',
    lg: 'text-sm px-3 py-1.5 gap-2.5 font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${bg} ${sizeClasses} tracking-wide transition-all shadow-xs`}
    >
      <span className="relative flex h-2 w-2">
        {isAnimated && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dot} opacity-75`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dot}`} />
      </span>
      <span>{status.replace(/_/g, ' ')}</span>
    </span>
  );
};
