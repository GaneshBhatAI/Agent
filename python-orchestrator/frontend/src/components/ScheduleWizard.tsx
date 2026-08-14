import React, { useEffect, useState } from 'react';
import { Calendar, Clock, GitBranch, Terminal, Server, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { GitHubBranchItem, GitHubFileItem, GitHubRepoItem, Machine, Schedule, ScheduleType } from '../types';
import { Modal } from './Modal';

interface ScheduleWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  existingSchedule?: Schedule | null;
}

const CRON_PRESETS = [
  { label: 'Every 5 Minutes', value: '*/5 * * * *' },
  { label: 'Every 15 Minutes', value: '*/15 * * * *' },
  { label: 'Hourly (Top of hour)', value: '0 * * * *' },
  { label: 'Daily at 8:00 AM', value: '0 8 * * *' },
  { label: 'Daily at Midnight', value: '0 0 * * *' },
  { label: 'Weekdays at 9:00 AM', value: '0 9 * * 1-5' },
  { label: 'Weekly (Sunday 00:00)', value: '0 0 * * 0' },
];

export const ScheduleWizard: React.FC<ScheduleWizardProps> = ({
  isOpen,
  onClose,
  onSaved,
  existingSchedule,
}) => {
  const [name, setName] = useState<string>('');
  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);
  const [branches, setBranches] = useState<GitHubBranchItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [entryPoints, setEntryPoints] = useState<string[]>([]);
  const [selectedEntryPoint, setSelectedEntryPoint] = useState<string>('main.py');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('CRON');
  const [cronExpression, setCronExpression] = useState<string>('0 8 * * *');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(60);
  const [parameters, setParameters] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (existingSchedule) {
        setName(existingSchedule.name);
        setSelectedBranch(existingSchedule.branch);
        setSelectedEntryPoint(existingSchedule.entry_point);
        setSelectedMachineId(existingSchedule.machine_id);
        setScheduleType(existingSchedule.schedule_type);
        setCronExpression(existingSchedule.cron_expression || '0 8 * * *');
        setIntervalMinutes(existingSchedule.interval_minutes || 60);
        setParameters((existingSchedule.parameters || []).join(' '));
      } else {
        setName('Daily Report Generator');
        setCronExpression('0 8 * * *');
      }

      api.get('/github/repositories').then((res) => {
        setRepos(res.data);
        if (res.data.length > 0) {
          const match = existingSchedule
            ? res.data.find((r: GitHubRepoItem) => r.name === existingSchedule.repository_name)
            : res.data[0];
          setSelectedRepo(match || res.data[0]);
        }
      });

      api.get('/machines').then((res) => {
        setMachines(res.data);
        if (!selectedMachineId && res.data.length > 0) {
          setSelectedMachineId(res.data[0].machine_id);
        }
      });
    }
  }, [isOpen, existingSchedule]);

  useEffect(() => {
    if (selectedRepo) {
      api
        .get(`/github/repositories/${selectedRepo.owner}/${selectedRepo.name}/branches`)
        .then((res) => setBranches(res.data))
        .catch(() => setBranches([{ name: 'main', commit_sha: '', protected: false }]));
    }
  }, [selectedRepo]);

  useEffect(() => {
    if (selectedRepo && selectedBranch) {
      api
        .get(`/github/repositories/${selectedRepo.owner}/${selectedRepo.name}/files`, {
          params: { branch: selectedBranch },
        })
        .then((res) => {
          const pyFiles = res.data
            .filter((f: GitHubFileItem) => f.is_python || f.name.endsWith('.py'))
            .map((f: GitHubFileItem) => f.path);
          setEntryPoints(pyFiles.length > 0 ? pyFiles : ['main.py']);
        })
        .catch(() => setEntryPoints(['main.py']));
    }
  }, [selectedRepo, selectedBranch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedRepo || !selectedMachineId) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const paramList = parameters
      .trim()
      .split(/\s+/)
      .filter((p) => p.length > 0);

    const payload = {
      name: name.trim(),
      repository_name: selectedRepo.name,
      repository_url: selectedRepo.html_url,
      branch: selectedBranch,
      entry_point: selectedEntryPoint,
      machine_id: selectedMachineId,
      schedule_type: scheduleType,
      cron_expression: scheduleType === 'CRON' ? cronExpression : null,
      interval_minutes: scheduleType === 'INTERVAL' ? intervalMinutes : null,
      enabled: true,
      parameters: paramList,
    };

    try {
      if (existingSchedule) {
        await api.put(`/schedules/${existingSchedule.id}`, payload);
      } else {
        await api.post('/schedules', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingSchedule ? 'Edit Schedule' : 'Create Automated Schedule'}
      subtitle="Configure recurring triggers for automated execution on target machine"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Schedule Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Daily Morning Invoicing Task"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Repository */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              GitHub Repository
            </label>
            <select
              value={selectedRepo?.name || ''}
              onChange={(e) => {
                const found = repos.find((r) => r.name === e.target.value);
                if (found) setSelectedRepo(found);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
              required
            >
              {repos.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-teal-400" />
              <span>Branch</span>
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none font-mono"
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Entry Point */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-teal-400" />
              <span>Python Entry Point</span>
            </label>
            <select
              value={selectedEntryPoint}
              onChange={(e) => setSelectedEntryPoint(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none font-mono"
            >
              {entryPoints.map((ep) => (
                <option key={ep} value={ep}>
                  {ep}
                </option>
              ))}
            </select>
          </div>

          {/* Machine */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-teal-400" />
              <span>Target Machine</span>
            </label>
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
              required
            >
              {machines.map((m) => (
                <option key={m.machine_id} value={m.machine_id}>
                  {m.machine_name} ({m.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trigger Type Selection */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
              <input
                type="radio"
                name="scheduleType"
                checked={scheduleType === 'CRON'}
                onChange={() => setScheduleType('CRON')}
                className="text-teal-500 focus:ring-teal-500"
              />
              <Calendar className="h-4 w-4 text-teal-400" />
              <span>Cron Expression</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
              <input
                type="radio"
                name="scheduleType"
                checked={scheduleType === 'INTERVAL'}
                onChange={() => setScheduleType('INTERVAL')}
                className="text-teal-500 focus:ring-teal-500"
              />
              <Clock className="h-4 w-4 text-indigo-400" />
              <span>Fixed Interval</span>
            </label>
          </div>

          {scheduleType === 'CRON' ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="0 8 * * *"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-teal-300 focus:border-teal-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CRON_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setCronExpression(preset.value)}
                    className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-700 hover:text-white"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="10080"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 60)}
                className="w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-200 focus:border-teal-500 focus:outline-none"
              />
              <span className="text-xs text-slate-400">minutes between runs</span>
            </div>
          )}
        </div>

        {/* Command Line Arguments */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Command-Line Arguments
          </label>
          <input
            type="text"
            placeholder="e.g. --scheduled --type automated"
            value={parameters}
            onChange={(e) => setParameters(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:outline-none font-mono"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-teal-500 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-teal-400 transition-colors cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : existingSchedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
