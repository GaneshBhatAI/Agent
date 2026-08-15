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
    const matchesSearch =
      j.job_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.repository_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.machine_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <PlaySquare className="h-6 w-6 text-purple-600" />
            Execution History & Jobs
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Monitor dispatched runs, real-time log outputs, durations, and exit codes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobs}
            className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 shadow-2xs cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5 text-purple-600" />
            <span>Refresh</span>
          </button>
          <button
            onClick={openRunJob}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4.5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>Dispatch Job</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-2xl border border-purple-100 bg-white/85 p-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
          <input
            type="text"
            placeholder="Search by Job ID, repository, or machine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-purple-100 bg-purple-50/40 pl-9 pr-4 py-1.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none font-medium"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'ONLINE', 'RUNNING', 'SUCCESS', 'FAILED', 'QUEUED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] text-white shadow-purple-sm'
                  : 'text-slate-600 hover:text-purple-900 hover:bg-purple-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table Card */}
      <div className="rounded-3xl border border-purple-100 bg-white/90 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/50 text-slate-600 uppercase tracking-wider font-bold border-b border-purple-100 text-[11px]">
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
            <tbody className="divide-y divide-purple-50 text-slate-700">
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
                      className="hover:bg-purple-50/60 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-purple-700">
                        {j.job_id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm">{j.repository_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {j.entry_point} • {j.branch}
                          {j.commit_sha && ` (${j.commit_sha.substring(0, 7)})`}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-700 font-medium">
                        {j.machine_id}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={j.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600">
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
                              j.exit_code === 0 ? 'text-emerald-700' : 'text-rose-700'
                            }
                          >
                            {j.exit_code}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{j.created_by}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
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
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                            >
                              <Square className="h-3 w-3 inline mr-1 fill-rose-700" />
                              <span>Stop</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleRetryJob(j.job_id, e)}
                              title="Run Again"
                              className="rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-bold text-purple-700 hover:bg-purple-50 cursor-pointer"
                            >
                              <Repeat className="h-3 w-3 inline mr-1 text-purple-600" />
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
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500 font-medium">
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
