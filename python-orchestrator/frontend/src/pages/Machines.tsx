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
  MoreVertical,
  Trash2,
  Power,
  RotateCw,
} from 'lucide-react';
import api from '../services/api';
import { Machine } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { WebSocketClient } from '../services/websocket';
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
      const res = await api.get('/machines');
      setMachines(res.data);
    } catch (err) {
      console.error('Failed to load machines', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
    const interval = setInterval(fetchMachines, 10000);

    const unsubscribe = WebSocketClient.subscribeToMachines(() => {
      fetchMachines();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const handleToggleStatus = async (machine: Machine, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (machine.status === 'DISABLED') {
        await api.post(`/machines/${machine.machine_id}/enable`);
      } else {
        await api.post(`/machines/${machine.machine_id}/disable`);
      }
      fetchMachines();
    } catch (err) {
      console.error('Failed to toggle machine state', err);
    }
  };

  const handleDelete = async (machineId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this machine registration?')) return;
    try {
      await api.delete(`/machines/${machineId}`);
      fetchMachines();
    } catch (err) {
      console.error('Failed to delete machine', err);
    }
  };

  const onlineCount = machines.filter((m) => m.status === 'ONLINE').length;
  const busyCount = machines.filter((m) => m.status === 'BUSY').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Server className="h-6 w-6 text-purple-600" />
            Registered Worker Nodes
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage your fleet of Windows machines running the Python execution agent
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMachines}
            className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 shadow-2xs cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5 text-purple-600" />
            <span>Refresh</span>
          </button>
          <button
            onClick={openAddMachine}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4.5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Register Machine</span>
          </button>
        </div>
      </div>

      {/* Fleet Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-purple-100 bg-white/85 p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Machines</div>
          <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{machines.length}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-800 uppercase">Online & Ready</div>
          <div className="text-xl font-extrabold text-emerald-900 font-mono mt-0.5">{onlineCount}</div>
        </div>
        <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-purple-800 uppercase">Executing Jobs</div>
          <div className="text-xl font-extrabold text-purple-900 font-mono mt-0.5">{busyCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-600 uppercase">Offline / Inactive</div>
          <div className="text-xl font-extrabold text-slate-700 font-mono mt-0.5">
            {machines.length - (onlineCount + busyCount)}
          </div>
        </div>
      </div>

      {/* Machines Table Card */}
      <div className="rounded-3xl border border-purple-100 bg-white/90 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-purple-100 bg-purple-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-6 py-4">Machine</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Environment</th>
                <th className="px-6 py-4">Hardware Telemetry</th>
                <th className="px-6 py-4">Last Beacon</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 text-slate-700">
              {machines.length > 0 ? (
                machines.map((m) => (
                  <tr
                    key={m.machine_id}
                    onClick={() => navigate(`/machines/${m.machine_id}`)}
                    className="hover:bg-purple-50/60 cursor-pointer transition-colors"
                  >
                    {/* Machine Name & ID */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm">{m.machine_name}</div>
                      <div className="text-[11px] font-mono font-semibold text-purple-700">{m.machine_id}</div>
                      {m.hostname && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          {m.hostname} • {m.ip_address || '127.0.0.1'}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <StatusBadge status={m.status} size="sm" />
                      {m.current_job_id && (
                        <div className="text-[10px] text-purple-700 font-mono font-semibold mt-1">
                          Job: {m.current_job_id}
                        </div>
                      )}
                    </td>

                    {/* Environment */}
                    <td className="px-6 py-4 font-mono text-[11px]">
                      <div className="font-semibold text-slate-800">{m.operating_system || 'Windows'}</div>
                      <div className="text-slate-500">
                        Python: {m.python_version || '3.12'}
                      </div>
                      <div className="text-purple-600 text-[10px] font-semibold">
                        Agent v{m.agent_version || '1.0.0'}
                      </div>
                    </td>

                    {/* CPU / RAM / Disk gauges */}
                    <td className="px-6 py-4">
                      <div className="space-y-1.5 w-44 font-mono text-[11px]">
                        {/* CPU */}
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>CPU</span>
                            <span className="font-bold">{m.cpu_usage || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-purple-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(m.cpu_usage || 0, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* RAM */}
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>RAM</span>
                            <span className="font-bold">{m.memory_usage || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-purple-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(m.memory_usage || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Last Beacon */}
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {m.last_heartbeat ? (
                        formatDistanceToNow(new Date(m.last_heartbeat), { addSuffix: true })
                      ) : (
                        <span className="text-slate-400">Never</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleToggleStatus(m, e)}
                          title={m.status === 'DISABLED' ? 'Enable Machine' : 'Disable Machine'}
                          className="rounded-full border border-purple-200 bg-white p-1.5 text-slate-600 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(m.machine_id, e)}
                          title="Delete Machine"
                          className="rounded-full border border-purple-200 bg-white p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No machines registered yet. Click <strong>"Register Machine"</strong> to generate a registration token.
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
