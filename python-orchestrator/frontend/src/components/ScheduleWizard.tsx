import React, { useEffect, useState } from 'react';
import { Calendar, Clock, GitBranch, Terminal, Server, AlertCircle, FolderGit2 } from 'lucide-react';
import api from '../services/api';
import { GitHubBranchItem, GitHubFileItem, GitHubRepoItem, Machine, Schedule, ScheduleType } from '../types';
import { Modal } from './Modal';

interface ScheduleWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleCreated: () => void;
  schedule?: Schedule | null;
}

const CRON_PRESETS = [
  { label: 'Every 5 Mins', value: '*/5 * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily 8:00 AM', value: '0 8 * * *' },
  { label: 'Daily Midnight', value: '0 0 * * *' },
  { label: 'Weekdays 9 AM', value: '0 9 * * 1-5' },
];

export const ScheduleWizard: React.FC<ScheduleWizardProps> = ({
  isOpen,
  onClose,
  onScheduleCreated,
  schedule,
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
      if (schedule) {
        setName(schedule.name);
        setSelectedBranch(schedule.branch);
        setSelectedEntryPoint(schedule.entry_point);
        setSelectedMachineId(schedule.machine_id);
        setScheduleType(schedule.schedule_type);
        setCronExpression(schedule.cron_expression || '0 8 * * *');
        setIntervalMinutes(schedule.interval_minutes || 60);
        setParameters((schedule.parameters || []).join(' '));
      } else {
        setName('Daily Report Generator');
        setCronExpression('0 8 * * *');
        setIntervalMinutes(60);
        setParameters('');
      }

      api.get('/github/repositories').then((res) => {
        setRepos(res.data);
        if (res.data.length > 0) {
          const matched = schedule
            ? res.data.find((r: any) => (r.repository_name || r.name) === schedule.repository_name)
            : res.data[0];
          setSelectedRepo(matched || res.data[0]);
        }
      });

      api.get('/machines').then((res) => {
        setMachines(res.data);
        if (res.data.length > 0 && !selectedMachineId) {
          setSelectedMachineId(schedule ? schedule.machine_id : res.data[0].machine_id);
        }
      });
    }
  }, [isOpen, schedule]);

  useEffect(() => {
    if (selectedRepo) {
      const owner = selectedRepo.github_owner || selectedRepo.owner || 'orchestrator-demo';
      const name = selectedRepo.repository_name || selectedRepo.name || 'hello-bot';

      api
        .get(`/github/repositories/${owner}/${name}/branches`)
        .then((res) => {
          setBranches(res.data);
          if (res.data.length > 0 && !schedule) {
            setSelectedBranch(res.data[0].name);
          }
        })
        .catch(() => {
          setBranches([{ name: 'main', commit_sha: 'a1b2c3d4e5f6', is_default: true }]);
        });

      api
        .get(`/github/repositories/${owner}/${name}/files?branch=${selectedBranch}`)
        .then((res) => {
          const pyFiles = res.data
            .filter((f: GitHubFileItem) => f.is_python_file || f.name.endsWith('.py'))
            .map((f: GitHubFileItem) => f.path);
          setEntryPoints(pyFiles.length > 0 ? pyFiles : ['main.py']);
          if (!pyFiles.includes(selectedEntryPoint)) {
            setSelectedEntryPoint(pyFiles[0] || 'main.py');
          }
        })
        .catch(() => {
          setEntryPoints(['main.py', 'app.py', 'bot.py']);
        });
    }
  }, [selectedRepo, selectedBranch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo || !selectedMachineId || !name.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const parsedParams = parameters
      .split(' ')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const repoName = selectedRepo.repository_name || selectedRepo.name;
    const repoUrl = selectedRepo.repository_url || selectedRepo.url;

    try {
      const payload = {
        name: name.trim(),
        repository_id: selectedRepo.id,
        repository_name: repoName,
        repository_url: repoUrl,
        branch: selectedBranch,
        entry_point: selectedEntryPoint,
        machine_id: selectedMachineId,
        schedule_type: scheduleType,
        cron_expression: scheduleType === 'CRON' ? cronExpression : undefined,
        interval_minutes: scheduleType === 'INTERVAL' ? intervalMinutes : undefined,
        parameters: parsedParams,
      };

      if (schedule) {
        await api.put(`/schedules/${schedule.id}`, payload);
      } else {
        await api.post('/schedules', payload);
      }

      onScheduleCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save automation schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={schedule ? 'Edit Automation Schedule' : 'Create Recurring Schedule'}
      subtitle="Configure automated triggers to dispatch Python bot scripts on schedule"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Schedule Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Schedule Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nightly Database ETL, Hourly Status Checker"
            className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Repository & Branch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FolderGit2 className="h-3.5 w-3.5 text-purple-600" />
              <span>Repository</span>
            </label>
            <select
              value={selectedRepo?.repository_name || selectedRepo?.name || ''}
              onChange={(e) => {
                const found = repos.find(
                  (r) => (r.repository_name || r.name) === e.target.value
                );
                if (found) setSelectedRepo(found);
              }}
              className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none"
            >
              {repos.map((r) => {
                const rName = r.repository_name || r.name;
                return (
                  <option key={rName} value={rName}>
                    {rName}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-purple-600" />
              <span>Branch</span>
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none font-mono"
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Script & Target Machine */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-purple-600" />
              <span>Python Entry Point</span>
            </label>
            <select
              value={selectedEntryPoint}
              onChange={(e) => setSelectedEntryPoint(e.target.value)}
              className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none font-mono"
            >
              {entryPoints.map((ep) => (
                <option key={ep} value={ep}>
                  {ep}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-purple-600" />
              <span>Target Machine</span>
            </label>
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none"
            >
              {machines.map((m) => (
                <option key={m.machine_id} value={m.machine_id}>
                  {m.machine_name} ({m.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trigger Type Box */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="sched_type"
                checked={scheduleType === 'CRON'}
                onChange={() => setScheduleType('CRON')}
                className="text-purple-600 focus:ring-purple-500"
              />
              <Calendar className="h-3.5 w-3.5 text-purple-600" />
              <span>Cron Expression</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="sched_type"
                checked={scheduleType === 'INTERVAL'}
                onChange={() => setScheduleType('INTERVAL')}
                className="text-purple-600 focus:ring-purple-500"
              />
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
              <span>Fixed Interval</span>
            </label>
          </div>

          {scheduleType === 'CRON' ? (
            <div className="space-y-2">
              <input
                type="text"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 8 * * *"
                className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs font-mono text-purple-800 font-bold focus:border-purple-600 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {CRON_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setCronExpression(preset.value)}
                    className="rounded-full border border-purple-200 bg-white px-2.5 py-0.5 text-[10.5px] font-semibold text-purple-800 hover:bg-purple-50 cursor-pointer shadow-2xs"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 60)}
                className="w-24 rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-purple-600 focus:outline-none"
              />
              <span className="text-xs text-slate-600 font-medium">minutes between runs</span>
            </div>
          )}
        </div>

        {/* Command Line Arguments */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Command-Line Arguments
          </label>
          <input
            type="text"
            placeholder="e.g. --scheduled --type automated"
            value={parameters}
            onChange={(e) => setParameters(e.target.value)}
            className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:outline-none font-mono"
          />
        </div>

        {/* Modal Buttons */}
        <div className="pt-2 flex justify-end gap-3 border-t border-purple-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : schedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
