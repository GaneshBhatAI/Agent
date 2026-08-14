import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  Plus,
  RotateCw,
  Power,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  Play,
} from 'lucide-react';
import api from '../services/api';
import { Schedule } from '../types';
import { ScheduleWizard } from '../components/ScheduleWizard';
import { formatDistanceToNow, format } from 'date-fns';

export const Schedules: React.FC = () => {
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/schedules');
      setSchedules(res.data);
    } catch (err) {
      console.error('Failed to load schedules', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleToggle = async (id: number) => {
    try {
      await api.post(`/schedules/${id}/toggle`);
      fetchSchedules();
    } catch (err) {
      console.error('Failed to toggle schedule', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await api.delete(`/schedules/${id}`);
      fetchSchedules();
    } catch (err) {
      console.error('Failed to delete schedule', err);
    }
  };

  const handleEdit = (sched: Schedule) => {
    setEditingSchedule(sched);
    setIsWizardOpen(true);
  };

  const handleNew = () => {
    setEditingSchedule(null);
    setIsWizardOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-teal-400" />
            <span>Automated Job Schedules</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            APScheduler automated triggers executing Python tasks on target worker nodes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSchedules}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-teal-500/20 hover:bg-teal-400 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Schedule</span>
          </button>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
              <tr>
                <th className="px-6 py-4">Schedule Name</th>
                <th className="px-6 py-4">Application</th>
                <th className="px-6 py-4">Trigger Rule</th>
                <th className="px-6 py-4">Target Machine</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Execution</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {schedules.length > 0 ? (
                schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">{s.name}</div>
                      <div className="text-[10px] text-slate-500">by {s.created_by}</div>
                    </td>

                    {/* App */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-200">{s.repository_name}</div>
                      <div className="text-[11px] font-mono text-teal-400">
                        {s.entry_point} • {s.branch}
                      </div>
                    </td>

                    {/* Trigger */}
                    <td className="px-6 py-4 font-mono text-xs">
                      {s.schedule_type === 'CRON' ? (
                        <div className="flex items-center gap-1.5 text-teal-300">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{s.cron_expression}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-indigo-300">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Every {s.interval_minutes}m</span>
                        </div>
                      )}
                    </td>

                    {/* Target Machine */}
                    <td className="px-6 py-4 font-mono text-slate-300">
                      {s.machine_id}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          s.enabled
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            s.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                          }`}
                        />
                        {s.enabled ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </td>

                    {/* Last Run */}
                    <td className="px-6 py-4 text-slate-400">
                      {s.last_run_at ? (
                        <div>
                          <div>{formatDistanceToNow(new Date(s.last_run_at), { addSuffix: true })}</div>
                          {s.last_job_id && (
                            <button
                              onClick={() => navigate(`/jobs/${s.last_job_id}`)}
                              className="text-[10px] text-teal-400 hover:underline font-mono"
                            >
                              {s.last_job_id}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600">Never</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggle(s.id)}
                          title={s.enabled ? 'Pause Schedule' : 'Resume Schedule'}
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(s)}
                          title="Edit Schedule"
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          title="Delete Schedule"
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No recurring schedules configured yet. Click <strong>"New Schedule"</strong> to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ScheduleWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSaved={fetchSchedules}
        existingSchedule={editingSchedule}
      />
    </div>
  );
};
