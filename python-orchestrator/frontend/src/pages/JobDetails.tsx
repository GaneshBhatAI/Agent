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

    // Connect real-time WebSocket for live logs and status
    const unsubscribe = WebSocketClient.subscribeToJob(
      jobId,
      (newLog: JobLog) => {
        setLogs((prev) => {
          // Avoid duplicate log lines if already present
          if (prev.some((l) => l.id === newLog.id && l.id !== undefined)) {
            return prev;
          }
          return [...prev, newLog];
        });
      },
      (statusData: any) => {
        setJob((prev) => {
          if (!prev) return null;
          const isActive = [
            'QUEUED',
            'ASSIGNED',
            'PREPARING',
            'INSTALLING_DEPENDENCIES',
            'RUNNING',
          ].includes(statusData.status);
          setIsLive(isActive);

          return {
            ...prev,
            status: statusData.status,
            started_at: statusData.started_at || prev.started_at,
            completed_at: statusData.completed_at || prev.completed_at,
            duration_seconds: statusData.duration_seconds || prev.duration_seconds,
            exit_code: statusData.exit_code !== undefined ? statusData.exit_code : prev.exit_code,
            error_message: statusData.error_message || prev.error_message,
          };
        });
      }
    );

    // Poll periodically while active
    const interval = setInterval(() => {
      if (isLive) {
        fetchJob();
      }
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [jobId, isLive]);

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
    if (!jobId) return;
    try {
      const res = await api.post(`/jobs/${jobId}/run-latest`);
      navigate(`/jobs/${res.data.job_id}`);
    } catch (err) {
      console.error('Failed to run latest job', err);
    }
  };

  if (isLoading && !job) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent mr-3" />
        Loading execution telemetry...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/jobs')}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-white font-mono tracking-tight">
                {job.job_id}
              </h2>
              <StatusBadge status={job.status} size="lg" />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {job.repository_name} • {job.entry_point} • Machine: {job.machine_id}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isActive ? (
            <button
              onClick={handleCancelJob}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 fill-rose-400" />
              <span>Stop Job</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleRetryJob}
                title="Run again using exact same commit SHA"
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
              >
                <Repeat className="h-3.5 w-3.5 text-teal-400" />
                <span>Run Again (Same Commit)</span>
              </button>
              <button
                onClick={handleRunLatest}
                title="Pull latest commit on branch and execute"
                className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-400 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Run Latest</span>
              </button>
            </>
          )}

          <button
            onClick={fetchJob}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error alert banner if failed */}
      {job.error_message && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 animate-fadeIn">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold uppercase tracking-wider text-rose-400">
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
        <div className="lg:col-span-4 space-y-5">
          {/* Runtime Stats Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 font-mono text-xs backdrop-blur-xl">
            <h4 className="font-bold text-sm font-sans text-white border-b border-slate-800 pb-2">
              Execution Metrics
            </h4>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Status:</span>
              <StatusBadge status={job.status} size="sm" />
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Exit Code:</span>
              <span
                className={`font-bold ${
                  job.exit_code === 0
                    ? 'text-emerald-400'
                    : job.exit_code !== null
                    ? 'text-rose-400'
                    : 'text-slate-500'
                }`}
              >
                {job.exit_code !== null && job.exit_code !== undefined ? job.exit_code : 'Running'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Duration:</span>
              <span className="text-slate-200">
                {job.duration_seconds !== null ? `${job.duration_seconds}s` : isActive ? 'running...' : '-'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Started:</span>
              <span className="text-slate-200">
                {job.started_at ? format(new Date(job.started_at), 'HH:mm:ss') : '-'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Completed:</span>
              <span className="text-slate-200">
                {job.completed_at ? format(new Date(job.completed_at), 'HH:mm:ss') : '-'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Created By:</span>
              <span className="text-slate-200">{job.created_by}</span>
            </div>
          </div>

          {/* Git & Source Code Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 font-mono text-xs backdrop-blur-xl">
            <h4 className="font-bold text-sm font-sans text-white border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Source Versioning</span>
              <a
                href={job.repository_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </h4>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Repository:</span>
              <span className="text-white font-semibold">{job.repository_name}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Branch:</span>
              <span className="text-teal-300 font-semibold">{job.branch}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Commit SHA:</span>
              <span className="text-indigo-400 font-mono text-[11px] truncate max-w-[140px]">
                {job.commit_sha ? job.commit_sha.substring(0, 10) : 'resolving...'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Entry Point:</span>
              <span className="text-white font-bold">{job.entry_point}</span>
            </div>
          </div>

          {/* Target Machine */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 font-mono text-xs backdrop-blur-xl">
            <h4 className="font-bold text-sm font-sans text-white border-b border-slate-800 pb-2">
              Assigned Worker Machine
            </h4>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Machine ID:</span>
              <button
                onClick={() => navigate(`/machines/${job.machine_id}`)}
                className="text-teal-400 hover:underline font-bold"
              >
                {job.machine_id}
              </button>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Environment:</span>
              <span className="text-slate-200">Isolated Virtualenv</span>
            </div>
          </div>

          {/* Command Line Parameters */}
          {job.parameters && job.parameters.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2 font-mono text-xs">
              <h4 className="font-bold text-sm font-sans text-white border-b border-slate-800 pb-2">
                CLI Arguments
              </h4>
              <div className="rounded-lg bg-slate-950 p-2 text-slate-300 text-[11px] break-all">
                {job.parameters.join(' ')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
