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
  Layers,
  ArrowRight,
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
    try {
      const res = await api.get('/jobs');
      const data = res.data;
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelJob = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/jobs/${jobId}/cancel`);
      fetchJobs();
    } catch (err) {
      console.error('Failed to cancel job', err);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
    const matchesSearch =
      job.job_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.entry_point.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.repository_name && job.repository_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const runningCount = jobs.filter((j) => j.status === 'RUNNING' || j.status === 'QUEUED').length;
  const successCount = jobs.filter((j) => j.status === 'SUCCESS').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <PlaySquare className="h-6 w-6 text-purple-600" />
            <span>Bot Execution Jobs</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Multi-stage bot execution queue • Live device progress tracking • Real-time terminal streams
          </p>
        </div>

        <button
          onClick={openRunJob}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4.5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
        >
          <Play className="h-4 w-4 fill-white" />
          <span>+ Run New Bot</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-purple-100 bg-white/90 p-5 shadow-2xs backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Dispatches</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{jobs.length}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-white/90 p-5 shadow-2xs backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Active In Progress</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{runningCount}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <RotateCw className="h-5 w-5 animate-spin" />
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-white/90 p-5 shadow-2xs backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Completed Successfully</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{successCount}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-3xl border border-purple-100 bg-white/90 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-purple-100 bg-purple-50/40">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
            <input
              type="text"
              placeholder="Search by Job ID, bot file, or repo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-purple-200 bg-white pl-9 pr-4 py-1.5 text-xs text-slate-800 focus:border-purple-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'RUNNING', 'QUEUED', 'SUCCESS', 'FAILED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-purple-100 hover:bg-purple-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Jobs List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/60 text-slate-600 uppercase tracking-wider font-bold border-b border-purple-100 text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Job ID & Bot File</th>
                <th className="px-5 py-3.5">Target Machine</th>
                <th className="px-5 py-3.5">Current Stage</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 text-slate-700">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => {
                  const isRunning = job.status === 'RUNNING';
                  const isQueued = job.status === 'QUEUED';
                  const botName = job.entry_point.split('/').pop() || job.entry_point;

                  return (
                    <tr
                      key={job.id || job.job_id}
                      onClick={() => navigate(`/jobs/${job.job_id}`)}
                      className="hover:bg-purple-50/60 cursor-pointer transition-colors group"
                    >
                      {/* Job ID & Bot */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                            <PlaySquare className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-slate-900 group-hover:text-purple-700 transition-colors font-mono">
                                {job.job_id}
                              </span>
                              <span className="text-[10px] text-purple-700 bg-purple-100/70 font-semibold px-2 py-0.2 rounded-full">
                                {job.branch || 'master'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-mono font-medium truncate max-w-xs mt-0.5">
                              {botName}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Machine */}
                      <td className="px-5 py-4 font-mono text-slate-600 font-semibold">
                        {job.machine_name || job.machine_id || 'Auto-Fleet Node'}
                      </td>

                      {/* Execution Stage Indicator */}
                      <td className="px-5 py-4">
                        {isRunning ? (
                          <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-purple-600 animate-ping" />
                            <span className="rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-900">
                              Stage 3/4: Executing Bot Workflow
                            </span>
                          </div>
                        ) : isQueued ? (
                          <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                            Stage 1/4: Queued for Runner
                          </span>
                        ) : job.status === 'SUCCESS' ? (
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            Stage 4/4: Completed & Summary Verified
                          </span>
                        ) : (
                          <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                            Terminated with Exceptions
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        <StatusBadge status={job.status} />
                      </td>

                      {/* Duration */}
                      <td className="px-5 py-4 font-mono text-slate-500">
                        {job.duration_seconds ? `${job.duration_seconds}s` : isRunning ? 'In progress...' : '--'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/jobs/${job.job_id}`)}
                            className="flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-white border border-purple-200 px-3 py-1 rounded-full shadow-2xs cursor-pointer"
                          >
                            <span>Live Logs</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>

                          {isRunning && (
                            <button
                              onClick={(e) => handleCancelJob(job.job_id, e)}
                              className="p-1 rounded-full border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Stop Job"
                            >
                              <Square className="h-3 w-3 fill-rose-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500 font-medium">
                    No execution jobs found matching your filter criteria.
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
