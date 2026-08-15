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
  Plus,
} from 'lucide-react';
import api from '../services/api';
import { DashboardStats, Job, Machine } from '../types';
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
      const res = await api.get('/dashboard');
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
      <div className="relative overflow-hidden rounded-3xl border border-purple-200/80 bg-gradient-to-r from-white via-[#FAF5FC] to-[#F3EEF8] p-8 shadow-[0_4px_25px_rgba(111,83,163,0.06)]">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-100/70 px-3 py-1 text-xs font-bold text-purple-800">
              <Cpu className="h-3.5 w-3.5 text-purple-600" />
              <span>Ai Anveshana • Agentic Orchestrator</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Enterprise Control Room
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium">
              Centrally coordinate and trigger remote Python automation bots across your registered Windows machines directly from GitHub repositories.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={openAddMachine}
              className="flex items-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-xs hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 text-purple-600" />
              <span>Register Machine</span>
            </button>
            <button
              onClick={openRunJob}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-5 py-2.5 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Dispatch Job</span>
            </button>
          </div>
        </div>

        {/* Ambient Glow in Banner */}
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-purple-300/20 blur-[90px] pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Online Machines"
          value={`${stats?.online_machines ?? 0} / ${stats?.total_machines ?? 0}`}
          subtitle={`${stats?.busy_machines ?? 0} currently executing`}
          icon={Server}
          color="purple"
          badge={stats?.online_machines ? 'Healthy' : 'Standby'}
        />

        <MetricCard
          title="Total Executions"
          value={stats?.total_jobs ?? 0}
          subtitle="Lifetime dispatched runs"
          icon={PlaySquare}
          color="indigo"
        />

        <MetricCard
          title="Successful Jobs"
          value={stats?.successful_jobs ?? 0}
          subtitle={`${
            stats?.total_jobs
              ? Math.round(((stats.successful_jobs || 0) / stats.total_jobs) * 100)
              : 100
          }% success rate`}
          icon={CheckCircle2}
          color="emerald"
        />

        <MetricCard
          title="Failed / Timed Out"
          value={stats?.failed_jobs ?? 0}
          subtitle="Requiring operator review"
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Recent Dispatches & Machine Telemetry Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Jobs Table */}
        <div className="rounded-3xl border border-purple-100 bg-white/85 p-6 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <PlaySquare className="h-4 w-4 text-purple-600" />
                Recent Executions
              </h3>
              <p className="text-xs text-slate-500 font-medium">Real-time status of latest automation jobs</p>
            </div>
            <button
              onClick={() => navigate('/jobs')}
              className="flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900"
            >
              <span>View all</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-purple-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3">Job ID</th>
                  <th className="py-3 px-3">Repository & Entry</th>
                  <th className="py-3 px-3">Machine</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading execution history...
                    </td>
                  </tr>
                ) : !stats?.recent_jobs || stats.recent_jobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">
                      No jobs have been executed yet. Click <strong>Dispatch Job</strong> to start.
                    </td>
                  </tr>
                ) : (
                  stats.recent_jobs.map((job: Job) => (
                    <tr
                      key={job.id}
                      onClick={() => navigate(`/jobs/${job.job_id}`)}
                      className="group cursor-pointer transition-colors hover:bg-purple-50/60"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-purple-700">
                        {job.job_id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <FolderGit2 className="h-3.5 w-3.5 text-purple-500" />
                          {job.repository_name}
                        </div>
                        <div className="text-[10.5px] font-mono text-slate-500">
                          {job.entry_point}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 font-medium">{job.machine_id}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={job.status} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {job.started_at
                          ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true })
                          : 'Pending'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Machine Telemetry Summary */}
        <div className="rounded-3xl border border-purple-100 bg-white/85 p-6 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Server className="h-4 w-4 text-purple-600" />
                Fleet Health
              </h3>
              <p className="text-xs text-slate-500 font-medium">Active worker nodes</p>
            </div>
            <button
              onClick={() => navigate('/machines')}
              className="text-xs font-bold text-purple-700 hover:text-purple-900"
            >
              Manage
            </button>
          </div>

          <div className="space-y-3">
            {Array.isArray(stats?.machines) && stats.machines.length > 0 ? (
              (stats.machines as Machine[]).map((m) => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/machines/${m.machine_id}`)}
                  className="group flex flex-col gap-2 rounded-2xl border border-purple-100/80 bg-purple-50/40 p-3.5 transition-all hover:bg-purple-50 hover:border-purple-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-800 group-hover:text-purple-800">
                        {m.machine_name}
                      </span>
                      <p className="font-mono text-[10px] text-slate-500">
                        {m.hostname || m.machine_id}
                      </p>
                    </div>
                    <StatusBadge status={m.status} size="sm" />
                  </div>

                  {m.status === 'ONLINE' || m.status === 'BUSY' ? (
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-purple-100/60 text-[10px]">
                      <div>
                        <span className="text-slate-500">CPU</span>
                        <div className="font-mono font-bold text-slate-800">{m.cpu_usage || 0}%</div>
                      </div>
                      <div>
                        <span className="text-slate-500">RAM</span>
                        <div className="font-mono font-bold text-slate-800">{m.memory_usage || 0}%</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Disk</span>
                        <div className="font-mono font-bold text-slate-800">{m.disk_usage || 0}%</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No machines registered yet. Click <strong>Register Machine</strong> to connect.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
