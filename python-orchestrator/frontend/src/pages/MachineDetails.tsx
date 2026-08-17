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
  Radio,
} from 'lucide-react';
import api from '../services/api';
import { Job, Machine, MachinePingLogResponse } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { RunJobModal } from '../components/RunJobModal';
import { format, formatDistanceToNow } from 'date-fns';

export const MachineDetails: React.FC = () => {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pings, setPings] = useState<MachinePingLogResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunModalOpen, setIsRunModalOpen] = useState<boolean>(false);

  const fetchMachineDetails = async () => {
    if (!machineId) return;
    try {
      const [mRes, jRes, pRes] = await Promise.all([
        api.get(`/machines/${machineId}`),
        api.get(`/machines/${machineId}/jobs`),
        api.get(`/machines/${machineId}/pings`).catch(() => ({ data: [] })),
      ]);
      setMachine(mRes.data);
      setJobs(jRes.data);
      setPings(pRes.data);
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
      console.error('Failed to toggle machine', err);
    }
  };

  if (isLoading && !machine) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mr-3" />
        <span>Loading machine telemetry...</span>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="rounded-3xl border border-purple-100 bg-white p-12 text-center text-slate-500 font-medium">
        Machine not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/machines')}
            className="rounded-full border border-purple-200 bg-white p-2 text-slate-600 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight font-sans">
                {machine.machine_name}
              </h2>
              <StatusBadge status={machine.status} size="sm" />
            </div>
            <p className="text-xs text-purple-700 font-mono font-medium">
              ID: {machine.machine_id} • {machine.operating_system || 'Windows'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleStatus}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              machine.status === 'DISABLED'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-purple-50'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            <span>{machine.status === 'DISABLED' ? 'Enable Node' : 'Disable Node'}</span>
          </button>

          <button
            onClick={() => setIsRunModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4.5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>Run on this Node</span>
          </button>
        </div>
      </div>

      {/* Hardware Telemetry Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* CPU */}
        <div className="rounded-3xl border border-purple-100 bg-white/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
            <span className="flex items-center gap-1.5 text-slate-800">
              <Cpu className="h-4 w-4 text-purple-600" />
              Processor (CPU)
            </span>
            <span className="font-mono text-purple-800 font-extrabold text-sm">{machine.cpu_usage || 0}%</span>
          </div>
          <div className="h-2 w-full bg-purple-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(machine.cpu_usage || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* RAM */}
        <div className="rounded-3xl border border-purple-100 bg-white/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
            <span className="flex items-center gap-1.5 text-slate-800">
              <HardDrive className="h-4 w-4 text-indigo-600" />
              Memory (RAM)
            </span>
            <span className="font-mono text-indigo-800 font-extrabold text-sm">{machine.memory_usage || 0}%</span>
          </div>
          <div className="h-2 w-full bg-indigo-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(machine.memory_usage || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Disk */}
        <div className="rounded-3xl border border-purple-100 bg-white/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
            <span className="flex items-center gap-1.5 text-slate-800">
              <Activity className="h-4 w-4 text-emerald-600" />
              Primary Disk
            </span>
            <span className="font-mono text-emerald-800 font-extrabold text-sm">{machine.disk_usage || 0}%</span>
          </div>
          <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(machine.disk_usage || 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Specifications & Heartbeat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-purple-100 bg-white/90 p-6 space-y-3 font-mono text-xs shadow-2xs">
          <h4 className="font-bold text-xs font-sans text-slate-900 border-b border-purple-100 pb-2">
            System Environment & Specs
          </h4>
          <div className="flex justify-between py-1">
            <span className="text-slate-500 font-sans">Operating System:</span>
            <span className="text-slate-900 font-bold">{machine.operating_system || 'Windows'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500 font-sans">Python Runtime:</span>
            <span className="text-purple-700 font-bold">{machine.python_version || '3.12'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500 font-sans">Machine Agent Version:</span>
            <span className="text-slate-900 font-bold">v{machine.agent_version || '1.0.0'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500 font-sans">Hostname:</span>
            <span className="text-slate-900 font-bold">{machine.hostname || '-'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500 font-sans">IP Address:</span>
            <span className="text-slate-900 font-bold">{machine.ip_address || '127.0.0.1'}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-purple-100 bg-white/90 p-6 space-y-3 font-mono text-xs shadow-2xs">
          <h4 className="font-bold text-xs font-sans text-slate-900 border-b border-purple-100 pb-2">
            Status & Heartbeat History
          </h4>
          <div className="flex justify-between py-1">
            <span className="text-slate-500 font-sans">Current Status:</span>
            <StatusBadge status={machine.status} size="sm" />
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500 font-sans">Last Beacon:</span>
            <span className="text-slate-800 font-bold">
              {machine.last_heartbeat
                ? format(new Date(machine.last_heartbeat), 'yyyy-MM-dd HH:mm:ss')
                : 'Never'}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500 font-sans">Registered At:</span>
            <span className="text-slate-800 font-bold">
              {machine.registered_at
                ? format(new Date(machine.registered_at), 'yyyy-MM-dd HH:mm:ss')
                : '-'}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500 font-sans">Current Running Job:</span>
            <span className="text-purple-700 font-bold">{machine.current_job_id || 'None (Idle)'}</span>
          </div>
        </div>
      </div>

      {/* Ping History Terminal */}
      <div className="rounded-3xl border border-purple-100 bg-[#1e1b2e] overflow-hidden shadow-2xs">
        <div className="border-b border-[#2d2a4a] bg-[#1a1728] px-6 py-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 tracking-tight flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            Machine Telemetry Logs (Last 1 Hour)
          </h3>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Live Stream
          </span>
        </div>
        <div className="p-4 font-mono text-xs max-h-64 overflow-y-auto space-y-1">
          {pings.length > 0 ? (
            pings.map((ping) => (
              <div key={ping.id} className="flex items-center gap-3 text-slate-300">
                <span className="text-slate-500 shrink-0">
                  [{format(new Date(ping.timestamp), 'HH:mm:ss')}]
                </span>
                <span className={`shrink-0 font-bold ${
                  ping.status === 'ONLINE' ? 'text-emerald-400' :
                  ping.status === 'BUSY' ? 'text-amber-400' :
                  ping.status === 'DISABLED' ? 'text-slate-500' : 'text-red-400'
                }`}>
                  [{ping.status}]
                </span>
                <span className="truncate">
                  CPU: {ping.cpu_usage || 0}% | RAM: {ping.memory_usage || 0}% | DISK: {ping.disk_usage || 0}%
                </span>
              </div>
            ))
          ) : (
            <div className="text-slate-500 py-4 text-center">
              No ping telemetry data available for this machine yet.
            </div>
          )}
        </div>
      </div>

      {/* Machine Execution History */}
      <div className="rounded-3xl border border-purple-100 bg-white/90 overflow-hidden shadow-2xs">
        <div className="border-b border-purple-100 bg-purple-50/50 px-6 py-4">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight font-sans">
            Execution History on {machine.machine_name}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/30 text-slate-600 uppercase tracking-wider font-bold border-b border-purple-100 text-[11px]">
              <tr>
                <th className="px-6 py-3.5">Job ID</th>
                <th className="px-6 py-3.5">Application</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Exit Code</th>
                <th className="px-6 py-3.5">Executed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 text-slate-700">
              {jobs.length > 0 ? (
                jobs.map((j) => (
                  <tr
                    key={j.job_id}
                    onClick={() => navigate(`/jobs/${j.job_id}`)}
                    className="hover:bg-purple-50/60 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-purple-700">
                      {j.job_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{j.repository_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {j.entry_point}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={j.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {j.duration_seconds !== null ? `${j.duration_seconds}s` : '-'}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">
                      {j.exit_code !== null ? j.exit_code : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {formatDistanceToNow(new Date(j.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
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
