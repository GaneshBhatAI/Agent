import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  PlaySquare,
  Play,
  RotateCw,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Square,
  Repeat,
} from 'lucide-react';
import api from '../services/api';
import { Job, JobStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDistanceToNow, format } from 'date-fns';

export const Jobs: React.FC = () => {
  const navigate = useNavigate();
  const { openRunJob } = useOutletContext<{ openRunJob: () => void }>();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const res = await api.get('/jobs', { params });
      setJobs(res.data);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 8000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleCancelJob = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/jobs/${jobId}/cancel`);
      fetchJobs();
    } catch (err) {
      console.error('Failed to cancel job', err);
    }
  };

  const handleRetryJob = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/jobs/${jobId}/retry`);
      navigate(`/jobs/${res.data.job_id}`);
    } catch (err) {
      console.error('Failed to retry job', err);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      j.job_id.toLowerCase().includes(q) ||
      j.repository_name.toLowerCase().includes(q) ||
      j.machine_id.toLowerCase().includes(q) ||
      j.entry_point.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <PlaySquare className="h-5 w-5 text-teal-400" />
            <span>Execution Management & History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track real-time process lifecycles, exit codes, and durations across all machines
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobs}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={openRunJob}
            className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-teal-500/20 hover:bg-teal-400 transition-all cursor-pointer"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            <span>Run New Job</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Job ID, Repo, Machine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {['ALL', 'RUNNING', 'QUEUED', 'SUCCESS', 'FAILED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 transition-all font-medium ${
                statusFilter === st
                  ? 'bg-teal-500/15 text-teal-400 border border-teal-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
              <tr>
                <th className="px-6 py-4">Job ID</th>
                <th className="px-6 py-4">Application</th>
                <th className="px-6 py-4">Machine</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Exit Code</th>
                <th className="px-6 py-4">Triggered By</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((j) => {
                  const isActive = [
                    'QUEUED',
                    'ASSIGNED',
                    'PREPARING',
                    'INSTALLING_DEPENDENCIES',
                    'RUNNING',
                  ].includes(j.status);

                  return (
                    <tr
                      key={j.job_id}
                      onClick={() => navigate(`/jobs/${j.job_id}`)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-teal-300">
                        {j.job_id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-sm">{j.repository_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {j.entry_point} • {j.branch}
                          {j.commit_sha && ` (${j.commit_sha.substring(0, 7)})`}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300">
                        {j.machine_id}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={j.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-400">
                        {j.duration_seconds !== null && j.duration_seconds !== undefined
                          ? `${j.duration_seconds}s`
                          : isActive
                          ? 'running...'
                          : '-'}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold">
                        {j.exit_code !== null && j.exit_code !== undefined ? (
                          <span
                            className={
                              j.exit_code === 0 ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {j.exit_code}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400">{j.created_by}</td>
                      <td className="px-6 py-4 text-slate-400">
                        {formatDistanceToNow(new Date(j.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isActive ? (
                            <button
                              onClick={(e) => handleCancelJob(j.job_id, e)}
                              title="Stop Job"
                              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/20"
                            >
                              <Square className="h-3 w-3 inline mr-1 fill-rose-400" />
                              <span>Stop</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleRetryJob(j.job_id, e)}
                              title="Run Again"
                              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                              <Repeat className="h-3 w-3 inline mr-1 text-teal-400" />
                              <span>Rerun</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    No jobs found matching your filter criteria.
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
