import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Server,
  PlaySquare,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  TrendingUp,
  Cpu,
  Clock,
  RefreshCw,
  FolderGit2,
} from 'lucide-react';
import api from '../services/api';
import { DashboardStats, Job } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { WebSocketClient } from '../services/websocket';
import { formatDistanceToNow } from 'date-fns';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { openRunJob, openAddMachine } = useOutletContext<{
    openRunJob: () => void;
    openAddMachine: () => void;
  }>();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);

    // Subscribe to live machine updates via WebSocket
    const unsubscribe = WebSocketClient.subscribeToMachines(() => {
      fetchStats();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-300">
              <Cpu className="h-3.5 w-3.5" />
              <span>Self-Hosted Python Orchestrator v1.0</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Enterprise Control Room
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Execute, isolate, and monitor Python scripts & workflows from GitHub across registered Windows worker machines with zero reliance on GitHub Actions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={openAddMachine}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
            >
              <Server className="h-4 w-4 text-teal-400" />
              <span>Register Worker</span>
            </button>
            <button
              onClick={openRunJob}
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-teal-500/25 hover:bg-teal-400 transition-all cursor-pointer"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              <span>Dispatch Job</span>
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Machine & Job Overview Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Online Workers"
          value={stats?.machines.online ?? 0}
          subtitle={`${stats?.machines.total ?? 0} total registered`}
          icon={Server}
          color="emerald"
          badge={stats?.machines.busy ? `${stats.machines.busy} BUSY` : undefined}
        />
        <MetricCard
          title="Active Executions"
          value={stats?.jobs.running ?? 0}
          subtitle={`${stats?.jobs.queued ?? 0} queued`}
          icon={PlaySquare}
          color="teal"
        />
        <MetricCard
          title="Jobs Today"
          value={stats?.jobs.total_today ?? 0}
          subtitle={`${stats?.jobs.success ?? 0} completed successfully`}
          icon={CheckCircle2}
          color="indigo"
        />
        <MetricCard
          title="Success Rate"
          value={`${stats?.jobs.success_rate_percent ?? 100}%`}
          subtitle={`${stats?.jobs.failed ?? 0} failures today`}
          icon={TrendingUp}
          color={stats && stats.jobs.failed > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Recent Jobs Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Recent Executions
            </h3>
            <p className="text-xs text-slate-400">Live stream of latest job runs across worker fleet</p>
          </div>
          <button
            onClick={() => navigate('/jobs')}
            className="flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
              <tr>
                <th className="px-6 py-3.5">Job ID</th>
                <th className="px-6 py-3.5">Application</th>
                <th className="px-6 py-3.5">Machine</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Created</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {stats?.recent_jobs && stats.recent_jobs.length > 0 ? (
                stats.recent_jobs.map((job) => (
                  <tr
                    key={job.job_id}
                    onClick={() => navigate(`/jobs/${job.job_id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-teal-300">
                      {job.job_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{job.repository_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {job.entry_point} • branch: {job.branch}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">
                      {job.machine_id}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      {job.duration_seconds !== null && job.duration_seconds !== undefined
                        ? `${job.duration_seconds}s`
                        : job.status === 'RUNNING'
                        ? 'running...'
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/${job.job_id}`);
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No jobs executed yet. Click <strong>"Dispatch Job"</strong> above to launch your first Python task.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
