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
    if (!window.confirm(`Are you sure you want to remove machine ${machineId}?`)) return;
    try {
      await api.delete(`/machines/${machineId}`);
      fetchMachines();
    } catch (err) {
      console.error('Failed to delete machine', err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Server className="h-5 w-5 text-teal-400" />
            <span>Registered Execution Machines</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Windows and Linux worker agents executing isolated Python applications
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMachines}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={openAddMachine}
            className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-teal-500/20 hover:bg-teal-400 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Machine</span>
          </button>
        </div>
      </div>

      {/* Machines Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
              <tr>
                <th className="px-6 py-4">Machine</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Environment</th>
                <th className="px-6 py-4">Hardware Telemetry</th>
                <th className="px-6 py-4">Last Beacon</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {machines.length > 0 ? (
                machines.map((m) => (
                  <tr
                    key={m.machine_id}
                    onClick={() => navigate(`/machines/${m.machine_id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    {/* Machine Name & ID */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">{m.machine_name}</div>
                      <div className="text-[11px] font-mono text-teal-400">{m.machine_id}</div>
                      {m.hostname && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {m.hostname} • {m.ip_address || '127.0.0.1'}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <StatusBadge status={m.status} size="sm" />
                      {m.current_job_id && (
                        <div className="text-[10px] text-teal-300 font-mono mt-1">
                          Job: {m.current_job_id}
                        </div>
                      )}
                    </td>

                    {/* Environment */}
                    <td className="px-6 py-4 font-mono text-[11px]">
                      <div>{m.operating_system || 'Windows'}</div>
                      <div className="text-slate-400">
                        Python: {m.python_version || '3.12'}
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        Agent v{m.agent_version || '1.0.0'}
                      </div>
                    </td>

                    {/* CPU / RAM / Disk gauges */}
                    <td className="px-6 py-4">
                      <div className="space-y-1.5 w-44 font-mono text-[11px]">
                        {/* CPU */}
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>CPU</span>
                            <span>{m.cpu_usage || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(m.cpu_usage || 0, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* RAM */}
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>RAM</span>
                            <span>{m.memory_usage || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(m.memory_usage || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Last Beacon */}
                    <td className="px-6 py-4 text-slate-400">
                      {m.last_heartbeat ? (
                        formatDistanceToNow(new Date(m.last_heartbeat), { addSuffix: true })
                      ) : (
                        <span className="text-slate-600">Never</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleToggleStatus(m, e)}
                          title={m.status === 'DISABLED' ? 'Enable Machine' : 'Disable Machine'}
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(m.machine_id, e)}
                          title="Delete Machine"
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No machines registered yet. Click <strong>"Add Machine"</strong> to generate a registration token.
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
