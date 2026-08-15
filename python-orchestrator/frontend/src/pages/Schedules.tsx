import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  Plus,
  RotateCw,
  Power,
  Trash2,
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

  const handleRunNow = async (schedule: Schedule) => {
    try {
      const res = await api.post('/jobs', {
        repository_id: schedule.repository_id,
        repository_name: schedule.repository_name,
        repository_url: schedule.repository_url,
        branch: schedule.branch,
        entry_point: schedule.entry_point,
        machine_id: schedule.machine_id,
        parameters: schedule.parameters,
        environment_variables: schedule.environment_variables,
      });
      navigate(`/jobs/${res.data.job_id}`);
    } catch (err) {
      console.error('Failed to trigger schedule run now', err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-purple-600" />
            Recurring Automation Schedules
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage cron triggers and interval schedules to automatically dispatch bot scripts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSchedules}
            className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 shadow-2xs cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5 text-purple-600" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setEditingSchedule(null);
              setIsWizardOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4.5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Schedule</span>
          </button>
        </div>
      </div>

      {/* Schedules Table Card */}
      <div className="rounded-3xl border border-purple-100 bg-white/90 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/50 text-slate-600 uppercase tracking-wider font-bold border-b border-purple-100 text-[11px]">
              <tr>
                <th className="px-6 py-4">Schedule Name</th>
                <th className="px-6 py-4">Repository & Script</th>
                <th className="px-6 py-4">Machine</th>
                <th className="px-6 py-4">Trigger Frequency</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Next Run</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 text-slate-700">
              {schedules.length > 0 ? (
                schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-purple-50/60 transition-colors">
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                      <div className="text-[11px] text-slate-500 font-medium">By {s.created_by}</div>
                    </td>

                    {/* Repo & Script */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{s.repository_name}</div>
                      <div className="text-[11px] text-purple-700 font-mono font-medium">
                        {s.entry_point} • {s.branch}
                      </div>
                    </td>

                    {/* Machine */}
                    <td className="px-6 py-4 font-mono font-semibold text-slate-800">{s.machine_id}</td>

                    {/* Trigger */}
                    <td className="px-6 py-4 font-mono">
                      {s.schedule_type === 'CRON' ? (
                        <div className="flex items-center gap-1.5 text-purple-800 font-bold bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 w-fit">
                          <Calendar className="h-3.5 w-3.5 text-purple-600" />
                          <span>{s.cron_expression}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-indigo-800 font-bold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 w-fit">
                          <Clock className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Every {s.interval_minutes} mins</span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          s.enabled
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            s.enabled ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{s.enabled ? 'Active' : 'Paused'}</span>
                      </span>
                    </td>

                    {/* Next Run */}
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {s.next_run_at ? (
                        formatDistanceToNow(new Date(s.next_run_at), { addSuffix: true })
                      ) : (
                        <span className="text-slate-400">Scheduled</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRunNow(s)}
                          title="Trigger immediately"
                          className="rounded-full border border-purple-200 bg-white p-1.5 text-purple-700 hover:bg-purple-50 cursor-pointer"
                        >
                          <Play className="h-3.5 w-3.5 fill-purple-700" />
                        </button>
                        <button
                          onClick={() => handleToggle(s.id)}
                          title={s.enabled ? 'Pause Schedule' : 'Enable Schedule'}
                          className="rounded-full border border-purple-200 bg-white p-1.5 text-slate-600 hover:bg-purple-50 cursor-pointer"
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          title="Delete Schedule"
                          className="rounded-full border border-purple-200 bg-white p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
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
        onScheduleCreated={fetchSchedules}
        schedule={editingSchedule || undefined}
      />
    </div>
  );
};
