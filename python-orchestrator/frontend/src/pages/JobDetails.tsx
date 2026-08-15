import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  PlaySquare,
  Square,
  Repeat,
  Sparkles,
  ExternalLink,
  GitBranch,
  GitCommit,
  Server,
  Clock,
  CheckCircle2,
  AlertCircle,
  Terminal,
  RotateCw,
} from 'lucide-react';
import api from '../services/api';
import { Job, JobLog } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TerminalViewer } from '../components/TerminalViewer';
import { WebSocketClient } from '../services/websocket';
import { format, formatDistanceToNow } from 'date-fns';

export const JobDetails: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);

  const fetchJob = async () => {
    if (!jobId) return;
    try {
      const [jobRes, logsRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/jobs/${jobId}/logs`),
      ]);
      setJob(jobRes.data);
      setLogs(logsRes.data);

      const isActive = [
        'QUEUED',
        'ASSIGNED',
        'PREPARING',
        'INSTALLING_DEPENDENCIES',
        'RUNNING',
      ].includes(jobRes.data.status);
      setIsLive(isActive);
    } catch (err) {
      console.error('Failed to fetch job details', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();

    if (!jobId) return;
    const unsubscribe = WebSocketClient.subscribeToJobLogs(jobId, (logEntry) => {
      setLogs((prev) => [...prev, logEntry]);
    });

    const interval = setInterval(fetchJob, 4000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [jobId]);

  const handleCancelJob = async () => {
    if (!jobId) return;
    try {
      await api.post(`/jobs/${jobId}/cancel`);
      fetchJob();
    } catch (err) {
      console.error('Failed to cancel job', err);
    }
  };

  const handleRetryJob = async () => {
    if (!jobId) return;
    try {
      const res = await api.post(`/jobs/${jobId}/retry`);
      navigate(`/jobs/${res.data.job_id}`);
    } catch (err) {
      console.error('Failed to retry job', err);
    }
  };

  const handleRunLatest = async () => {
    if (!job) return;
    try {
      const res = await api.post('/jobs', {
        repository_id: job.repository_id,
        repository_name: job.repository_name,
        repository_url: job.repository_url,
        branch: job.branch,
        entry_point: job.entry_point,
        machine_id: job.machine_id,
        parameters: job.parameters,
        environment_variables: job.environment_variables,
      });
      navigate(`/jobs/${res.data.job_id}`);
    } catch (err) {
      console.error('Failed to run latest job', err);
    }
  };

  if (isLoading && !job) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mr-3" />
        <span>Loading execution details...</span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rounded-3xl border border-purple-100 bg-white p-12 text-center text-slate-500 font-medium">
        Job not found.
      </div>
    );
  }

  const isActive = [
    'QUEUED',
    'ASSIGNED',
    'PREPARING',
    'INSTALLING_DEPENDENCIES',
    'RUNNING',
  ].includes(job.status);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/jobs')}
            className="rounded-full border border-purple-200 bg-white p-2 text-slate-600 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 font-mono tracking-tight">
                {job.job_id}
              </h2>
              <StatusBadge status={job.status} size="sm" />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {job.repository_name} • {job.entry_point}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {isActive ? (
            <button
              onClick={handleCancelJob}
              className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 fill-rose-700" />
              <span>Stop Job</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleRetryJob}
                title="Run again using exact same commit SHA"
                className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 transition-all cursor-pointer"
              >
                <Repeat className="h-3.5 w-3.5 text-purple-600" />
                <span>Run Again (Same Commit)</span>
              </button>
              <button
                onClick={handleRunLatest}
                title="Pull latest commit on branch and execute"
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4.5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Run Latest</span>
              </button>
            </>
          )}

          <button
            onClick={fetchJob}
            className="rounded-full border border-purple-200 bg-white p-2 text-slate-600 hover:bg-purple-50 cursor-pointer"
          >
            <RotateCw className="h-4 w-4 text-purple-600" />
          </button>
        </div>
      </div>

      {/* Error alert banner if failed */}
      {job.error_message && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 animate-fadeIn">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold uppercase tracking-wider text-rose-700">
              Execution Error [{job.error_type}]
            </div>
            <div className="font-mono">{job.error_message}</div>
          </div>
        </div>
      )}

      {/* Main Grid: Live Terminal Viewer + Metadata Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Real-time Terminal Log Console */}
        <div className="lg:col-span-8 flex flex-col">
          <TerminalViewer
            logs={logs}
            isLoading={isLoading}
            jobId={job.job_id}
            isLive={isLive}
          />
        </div>

        {/* Right 4 Cols: Detailed Execution Metadata */}
        <div className="lg:col-span-4 space-y-4">
          {/* Runtime Stats Card */}
          <div className="rounded-3xl border border-purple-100 bg-white/90 p-5 space-y-3 font-mono text-xs shadow-2xs">
            <h4 className="font-bold text-xs font-sans text-slate-900 border-b border-purple-100 pb-2">
              Execution Metrics
            </h4>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-sans">Status:</span>
              <StatusBadge status={job.status} size="sm" />
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-sans">Exit Code:</span>
              <span
                className={`font-bold ${
                  job.exit_code === 0
                    ? 'text-emerald-700'
                    : job.exit_code !== null
                    ? 'text-rose-700'
                    : 'text-slate-400'
                }`}
              >
                {job.exit_code !== null && job.exit_code !== undefined ? job.exit_code : 'Running'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-sans">Duration:</span>
              <span className="text-slate-800 font-bold">
                {job.duration_seconds !== null ? `${job.duration_seconds}s` : isActive ? 'running...' : '-'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-sans">Started:</span>
              <span className="text-slate-800 font-bold">
                {job.started_at ? format(new Date(job.started_at), 'HH:mm:ss') : '-'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-sans">Completed:</span>
              <span className="text-slate-800 font-bold">
                {job.completed_at ? format(new Date(job.completed_at), 'HH:mm:ss') : '-'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-sans">Created By:</span>
              <span className="text-slate-800 font-bold">{job.created_by}</span>
            </div>
          </div>

          {/* Git & Source Code Card */}
          <div className="rounded-3xl border border-purple-100 bg-white/90 p-5 space-y-3 font-mono text-xs shadow-2xs">
            <h4 className="font-bold text-xs font-sans text-slate-900 border-b border-purple-100 pb-2 flex items-center justify-between">
              <span>Source Versioning</span>
              <a
                href={job.repository_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-900"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </h4>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-sans">Repository:</span>
              <span className="text-slate-900 font-bold">{job.repository_name}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-sans">Branch:</span>
              <span className="text-purple-700 font-bold">{job.branch}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-sans">Commit SHA:</span>
              <span className="text-indigo-700 font-bold truncate max-w-[140px]">
                {job.commit_sha ? job.commit_sha.substring(0, 10) : 'resolving...'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-sans">Entry Point:</span>
              <span className="text-slate-900 font-bold">{job.entry_point}</span>
            </div>
          </div>

          {/* Target Machine */}
          <div className="rounded-3xl border border-purple-100 bg-white/90 p-5 space-y-3 font-mono text-xs shadow-2xs">
            <h4 className="font-bold text-xs font-sans text-slate-900 border-b border-purple-100 pb-2">
              Assigned Worker Machine
            </h4>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 font-sans">Machine ID:</span>
              <button
                onClick={() => navigate(`/machines/${job.machine_id}`)}
                className="text-purple-700 hover:underline font-bold"
              >
                {job.machine_id}
              </button>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-sans">Environment:</span>
              <span className="text-slate-800 font-bold">Isolated Virtualenv</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
