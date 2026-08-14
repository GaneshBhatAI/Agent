import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Server,
  ArrowLeft,
  Cpu,
  HardDrive,
  Activity,
  Play,
  Power,
  RotateCw,
  Clock,
  Terminal,
} from 'lucide-react';
import api from '../services/api';
import { Job, Machine } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { RunJobModal } from '../components/RunJobModal';
import { format, formatDistanceToNow } from 'date-fns';

export const MachineDetails: React.FC = () => {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunModalOpen, setIsRunModalOpen] = useState<boolean>(false);

  const fetchMachineDetails = async () => {
    if (!machineId) return;
    try {
      const [mRes, jRes] = await Promise.all([
        api.get(`/machines/${machineId}`),
        api.get(`/machines/${machineId}/jobs`),
      ]);
      setMachine(mRes.data);
      setJobs(jRes.data);
    } catch (err) {
      console.error('Failed to fetch machine details', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMachineDetails();
    const interval = setInterval(fetchMachineDetails, 8000);
    return () => clearInterval(interval);
  }, [machineId]);

  const handleToggleStatus = async () => {
    if (!machine) return;
    try {
      if (machine.status === 'DISABLED') {
        await api.post(`/machines/${machine.machine_id}/enable`);
      } else {
        await api.post(`/machines/${machine.machine_id}/disable`);
      }
      fetchMachineDetails();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  if (isLoading && !machine) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent mr-3" />
        Loading machine telemetry...
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
        Machine not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back button & Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/machines')}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{machine.machine_name}</span>
              <StatusBadge status={machine.status} size="sm" />
            </h2>
            <p className="text-xs font-mono text-teal-400">{machine.machine_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleStatus}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Power className="h-3.5 w-3.5" />
            <span>{machine.status === 'DISABLED' ? 'Enable' : 'Disable'}</span>
          </button>
          <button
            onClick={() => setIsRunModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-400 transition-all cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-slate-950" />
            <span>Run on this Machine</span>
          </button>
        </div>
      </div>

      {/* Hardware Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              CPU Utilization
            </span>
            <Cpu className="h-5 w-5 text-teal-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white mb-2">
            {machine.cpu_usage ?? 0}%
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(machine.cpu_usage || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* RAM */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Memory Utilization
            </span>
            <HardDrive className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white mb-2">
            {machine.memory_usage ?? 0}%
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(machine.memory_usage || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Disk */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Disk Usage
            </span>
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white mb-2">
            {machine.disk_usage ?? 0}%
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(machine.disk_usage || 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Specifications & Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-3 font-mono text-xs">
          <h4 className="font-bold text-sm font-sans text-white border-b border-slate-800 pb-2">
            System & Runtime Specifications
          </h4>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Operating System:</span>
            <span className="text-white">{machine.operating_system || 'Windows'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Python Version:</span>
            <span className="text-teal-300 font-semibold">{machine.python_version || '3.12'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Agent Version:</span>
            <span className="text-white">v{machine.agent_version || '1.0.0'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Hostname:</span>
            <span className="text-white">{machine.hostname || '-'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">IP Address:</span>
            <span className="text-white">{machine.ip_address || '127.0.0.1'}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-3 font-mono text-xs">
          <h4 className="font-bold text-sm font-sans text-white border-b border-slate-800 pb-2">
            Status & Heartbeat History
          </h4>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Current Status:</span>
            <StatusBadge status={machine.status} size="sm" />
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Last Beacon:</span>
            <span className="text-slate-200">
              {machine.last_heartbeat
                ? format(new Date(machine.last_heartbeat), 'yyyy-MM-dd HH:mm:ss')
                : 'Never'}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Registered At:</span>
            <span className="text-slate-200">
              {machine.registered_at
                ? format(new Date(machine.registered_at), 'yyyy-MM-dd HH:mm:ss')
                : '-'}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Current Running Job:</span>
            <span className="text-teal-300 font-bold">{machine.current_job_id || 'None (Idle)'}</span>
          </div>
        </div>
      </div>

      {/* Machine Execution History */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
        <div className="border-b border-slate-800 px-6 py-4">
          <h3 className="text-base font-bold text-white tracking-tight">
            Execution History on {machine.machine_name}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
              <tr>
                <th className="px-6 py-3.5">Job ID</th>
                <th className="px-6 py-3.5">Application</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Exit Code</th>
                <th className="px-6 py-3.5">Executed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {jobs.length > 0 ? (
                jobs.map((j) => (
                  <tr
                    key={j.job_id}
                    onClick={() => navigate(`/jobs/${j.job_id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-teal-300">
                      {j.job_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{j.repository_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {j.entry_point}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={j.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      {j.duration_seconds !== null ? `${j.duration_seconds}s` : '-'}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {j.exit_code !== null ? j.exit_code : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatDistanceToNow(new Date(j.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No jobs executed on this machine yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RunJobModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        defaultMachineId={machine.machine_id}
      />
    </div>
  );
};
