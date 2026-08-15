import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Server,
  Plus,
  Play,
  Cpu,
  HardDrive,
  CheckCircle,
  XCircle,
  Power,
  RotateCw,
  Download,
  Laptop,
  Activity,
  ShieldCheck,
  Clock,
  Sparkles,
  Package,
} from 'lucide-react';
import { supabaseService } from '../services/supabase';
import { Machine } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

export const Machines: React.FC = () => {
  const navigate = useNavigate();
  const { openAddMachine, openRunJob } = useOutletContext<{
    openAddMachine: () => void;
    openRunJob: () => void;
  }>();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMachines = async () => {
    try {
      const data = await supabaseService.getMachines();
      setMachines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load machines', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
    const interval = setInterval(fetchMachines, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = (filename: string) => {
    const isProdDocs = window.location.pathname.includes('/products/docs');
    const isDocs = window.location.pathname.includes('/docs');
    let prefix = '.';
    if (isProdDocs) prefix = '/products/docs';
    else if (isDocs) prefix = '/docs';

    const link = document.createElement('a');
    link.href = `${prefix}/downloads/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleStatus = async (machine: Machine, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newStatus = machine.status === 'DISABLED' ? 'ONLINE' : 'DISABLED';
      await supabaseService.updateMachine(machine.machine_id, { status: newStatus });
      fetchMachines();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const onlineCount = machines.filter((m) => m.status === 'ONLINE').length;
  const busyCount = machines.filter((m) => m.status === 'BUSY').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Server className="h-6 w-6 text-purple-600" />
            <span>Runner Fleet & Device Agents</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            24/7 background Windows Bot Agents (EXE) • Live telemetry heartbeats • Subprocess bot runners
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleDownload('AIAnveshana_DeviceAgent_Setup.exe')}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4.5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
            title="Download Standalone 1-Click Windows Executable (.exe)"
          >
            <Download className="h-4 w-4" />
            <span>Download DeviceAgent.exe</span>
          </button>

          <button
            onClick={openAddMachine}
            className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 text-purple-600" />
            <span>+ Connect / Guide</span>
          </button>
        </div>
      </div>

      {/* Fleet Stats Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-purple-100 bg-white/90 p-5 shadow-2xs backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registered Fleet</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{machines.length}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Server className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-white/90 p-5 shadow-2xs backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Online & Ready</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{onlineCount}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-white/90 p-5 shadow-2xs backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Executing Bot Tasks</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{busyCount}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <RotateCw className="h-5 w-5 animate-spin" />
          </div>
        </div>
      </div>

      {/* Machine Cards Grid */}
      {machines.length === 0 ? (
        <div className="rounded-3xl border border-purple-200/80 bg-white/90 p-12 text-center shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl space-y-5">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-purple-100/80 flex items-center justify-center text-purple-700 shadow-purple-sm">
            <Laptop className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">
              No Device Agents Connected Yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Download the <strong>AI Anveshana DeviceAgent.exe</strong> (Windows Standalone Installer). Double-click to install and your machine will auto-connect 24/7 in the background like Automation Anywhere.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => handleDownload('AIAnveshana_DeviceAgent_Setup.exe')}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-6 py-2.5 text-xs font-bold text-white shadow-purple-md hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download DeviceAgent.exe (10 MB)</span>
            </button>

            <button
              onClick={openAddMachine}
              className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-purple-50 transition-all cursor-pointer"
            >
              <span>+ Setup Guide</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine) => {
            const isOnline = machine.status === 'ONLINE';
            const isBusy = machine.status === 'BUSY';
            const isDisabled = machine.status === 'DISABLED';

            return (
              <div
                key={machine.id || machine.machine_id}
                onClick={() => navigate(`/machines/${machine.machine_id || machine.id}`)}
                className="group relative flex flex-col justify-between rounded-3xl border border-purple-100 bg-white/90 p-6 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl hover:border-purple-300 hover:shadow-purple-md transition-all duration-200 cursor-pointer"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 border-b border-purple-50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-2xl ${
                        isOnline
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : isBusy
                          ? 'bg-purple-100 text-purple-700 border border-purple-200 animate-pulse'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Server className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-purple-700 transition-colors">
                          {machine.machine_name}
                        </h3>
                        <p className="text-[10.5px] text-slate-400 font-mono font-medium">
                          {machine.machine_id}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={machine.status} />
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="grid grid-cols-3 gap-2 py-4 border-b border-purple-50 text-center">
                    <div className="rounded-2xl bg-purple-50/50 p-2.5 border border-purple-100/60">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-bold">
                        <Cpu className="h-3 w-3 text-purple-600" />
                        <span>CPU</span>
                      </div>
                      <p className="text-xs font-extrabold text-slate-900 mt-0.5 font-mono">
                        {machine.cpu_usage !== undefined ? `${machine.cpu_usage}%` : '12%'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-purple-50/50 p-2.5 border border-purple-100/60">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-bold">
                        <Activity className="h-3 w-3 text-indigo-600" />
                        <span>RAM</span>
                      </div>
                      <p className="text-xs font-extrabold text-slate-900 mt-0.5 font-mono">
                        {machine.memory_usage !== undefined ? `${machine.memory_usage}%` : '38%'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-purple-50/50 p-2.5 border border-purple-100/60">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-bold">
                        <HardDrive className="h-3 w-3 text-purple-600" />
                        <span>DISK</span>
                      </div>
                      <p className="text-xs font-extrabold text-slate-900 mt-0.5 font-mono">
                        {machine.disk_usage !== undefined ? `${machine.disk_usage}%` : '42%'}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Specs */}
                  <div className="space-y-1.5 pt-3 text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center justify-between">
                      <span>OS Platform:</span>
                      <span className="font-semibold text-slate-700">{machine.operating_system || 'Windows 11 (x64)'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Agent Architecture:</span>
                      <span className="font-mono text-purple-700 font-semibold">{machine.python_version || 'Standalone EXE (x64)'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Agent Version:</span>
                      <span className="font-mono text-slate-700 font-bold">v{machine.agent_version || '2.5.0'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-purple-50">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <Clock className="h-3 w-3" />
                    <span>
                      {machine.last_heartbeat
                        ? `Ping ${formatDistanceToNow(new Date(machine.last_heartbeat), { addSuffix: true })}`
                        : 'Active 24/7'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleToggleStatus(machine, e)}
                      className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                        isDisabled
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-purple-200 bg-white text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                      }`}
                      title={isDisabled ? 'Enable Machine' : 'Disable Machine'}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => openRunJob()}
                      className="flex items-center gap-1 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-3.5 py-1.5 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-white" />
                      <span>Run Bot</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
