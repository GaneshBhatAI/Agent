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
  Layers,
  Key,
  FileCode,
  FileCheck,
} from 'lucide-react';
import { supabaseService } from '../services/supabase';
import { Job, JobLog } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TerminalViewer } from '../components/TerminalViewer';
import { format, formatDistanceToNow } from 'date-fns';

export const JobDetails: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchJob = async () => {
    if (!jobId) return;
    try {
      const [fetchedJob, fetchedLogs] = await Promise.all([
        supabaseService.getJobById(jobId),
        supabaseService.getJobLogs(jobId),
      ]);
      setJob(fetchedJob);
      setLogs(Array.isArray(fetchedLogs) ? fetchedLogs : []);
    } catch (err) {
      console.error('Failed to fetch job details', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
    const interval = setInterval(fetchJob, 3000);
    return () => clearInterval(interval);
  }, [jobId]);

  const handleCancelJob = async () => {
    if (!jobId) return;
    try {
      await supabaseService.updateJob(jobId, { status: 'CANCELLED' });
      fetchJob();
    } catch (err) {
      console.error('Failed to cancel job', err);
    }
  };

  if (isLoading && !job) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/jobs')}
          className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Jobs</span>
        </button>
        <div className="p-12 text-center text-slate-500 font-bold">Job not found</div>
      </div>
    );
  }

  const isRunning = job.status === 'RUNNING';
  const isQueued = job.status === 'QUEUED';
  const isSuccess = job.status === 'SUCCESS';
  const isFailed = job.status === 'FAILED';

  // Determine Current Stage (1 to 4)
  let currentStage = 1;
  if (isQueued) currentStage = 1;
  else if (isRunning) currentStage = 3;
  else if (isSuccess) currentStage = 4;
  else if (isFailed) currentStage = 3;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/jobs')}
            className="rounded-full border border-purple-200 bg-white p-2 text-slate-600 hover:bg-purple-50 transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 tracking-tight font-mono">
                {job.job_id}
              </h2>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-xs text-slate-500 font-mono font-medium mt-0.5">
              {job.entry_point}
            </p>
          </div>
        </div>

        {isRunning && (
          <button
            onClick={handleCancelJob}
            className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Square className="h-3.5 w-3.5 fill-rose-600" />
            <span>Terminate Execution</span>
          </button>
        )}
      </div>

      {/* Visual Execution Stage Stepper Banner (Automation Anywhere Style) */}
      <div className="rounded-3xl border border-purple-100 bg-white/95 p-6 shadow-2xs backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-purple-50 pb-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-purple-600" />
            <span>Execution Stage Progression</span>
          </h3>
          <span className="text-[11px] text-purple-700 font-mono font-bold bg-purple-100/70 px-2.5 py-0.5 rounded-full">
            {isRunning ? '⚡ Active on Device' : isSuccess ? '✅ Completed' : 'Status: ' + job.status}
          </span>
        </div>

        {/* 4-Step Visual Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          {/* Stage 1 */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            currentStage > 1
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : currentStage === 1
              ? 'bg-purple-100/80 border-purple-300 text-purple-900 shadow-2xs'
              : 'bg-slate-50 border-slate-100 text-slate-400'
          }`}>
            <div className="flex items-center justify-between text-[11px] font-extrabold">
              <span>Stage 1: Workspace</span>
              {currentStage > 1 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <span className="h-2 w-2 rounded-full bg-purple-600 animate-ping" />}
            </div>
            <p className="text-[10.5px] mt-1 text-slate-600 font-medium">Git checkout & runner sync</p>
          </div>

          {/* Stage 2 */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            currentStage > 2
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : currentStage === 2
              ? 'bg-purple-100/80 border-purple-300 text-purple-900 shadow-2xs'
              : 'bg-slate-50 border-slate-100 text-slate-400'
          }`}>
            <div className="flex items-center justify-between text-[11px] font-extrabold">
              <span>Stage 2: Vault Secrets</span>
              {currentStage > 2 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : currentStage === 2 ? <span className="h-2 w-2 rounded-full bg-purple-600 animate-ping" /> : null}
            </div>
            <p className="text-[10.5px] mt-1 text-slate-600 font-medium">Inject decrypted credentials</p>
          </div>

          {/* Stage 3 */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            currentStage > 3
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : currentStage === 3
              ? 'bg-purple-100/80 border-purple-300 text-purple-900 shadow-2xs'
              : 'bg-slate-50 border-slate-100 text-slate-400'
          }`}>
            <div className="flex items-center justify-between text-[11px] font-extrabold">
              <span>Stage 3: Subprocess Run</span>
              {currentStage > 3 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : currentStage === 3 && isRunning ? <span className="h-2 w-2 rounded-full bg-purple-600 animate-ping" /> : null}
            </div>
            <p className="text-[10.5px] mt-1 text-slate-600 font-medium">Execute Python logic & HUD</p>
          </div>

          {/* Stage 4 */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            isSuccess
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-slate-50 border-slate-100 text-slate-400'
          }`}>
            <div className="flex items-center justify-between text-[11px] font-extrabold">
              <span>Stage 4: Summary</span>
              {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            </div>
            <p className="text-[10.5px] mt-1 text-slate-600 font-medium">Verify exit code & artifacts</p>
          </div>
        </div>
      </div>

      {/* Main Metadata & Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Metadata Specs (4 Cols) */}
        <div className="lg:col-span-4 rounded-3xl border border-purple-100 bg-white/90 p-5 shadow-2xs backdrop-blur-xl space-y-4">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 border-b border-purple-50 pb-2.5 flex items-center gap-1.5">
            <Server className="h-4 w-4 text-purple-600" />
            <span>Target Runner Machine</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Device Host:</span>
              <p className="font-bold text-slate-800 font-mono mt-0.5">{job.machine_name || job.machine_id || 'GANESH-RUNNER-01'}</p>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium">Branch / Commit:</span>
              <p className="font-bold text-purple-700 font-mono mt-0.5">{job.branch || 'master'}</p>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium">Triggered By:</span>
              <p className="font-bold text-slate-800 mt-0.5">{job.created_by || 'Ganesh'}</p>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium">Execution Duration:</span>
              <p className="font-mono text-slate-800 font-bold mt-0.5">
                {job.duration_seconds ? `${job.duration_seconds} seconds` : isRunning ? 'Executing on device...' : '--'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Terminal Stream (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl border border-purple-100 bg-white/90 p-5 shadow-2xs backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between border-b border-purple-50 pb-2.5">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-purple-600" />
              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                Live Subprocess Terminal Output
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              {logs.length} log lines captured
            </span>
          </div>

          <div className="min-h-[420px]">
            <TerminalViewer logs={logs} isLive={isRunning} />
          </div>
        </div>
      </div>
    </div>
  );
};
