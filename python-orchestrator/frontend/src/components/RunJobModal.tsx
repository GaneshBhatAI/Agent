import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, GitBranch, Terminal, Server, Plus, Trash2, Cpu, HardDrive, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { GitHubBranchItem, GitHubFileItem, GitHubRepoItem, Machine } from '../types';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';

interface RunJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRepo?: GitHubRepoItem;
  defaultMachineId?: string;
  defaultBranch?: string;
  defaultEntryPoint?: string;
}

export const RunJobModal: React.FC<RunJobModalProps> = ({
  isOpen,
  onClose,
  defaultRepo,
  defaultMachineId,
  defaultBranch = 'main',
  defaultEntryPoint = 'main.py',
}) => {
  const navigate = useNavigate();

  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(defaultRepo || null);
  const [branches, setBranches] = useState<GitHubBranchItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch);
  const [entryPoints, setEntryPoints] = useState<string[]>([]);
  const [selectedEntryPoint, setSelectedEntryPoint] = useState<string>(defaultEntryPoint);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>(defaultMachineId || '');
  const [parameters, setParameters] = useState<string>('');
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(1800);
  const [maxRetries, setMaxRetries] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load repositories and machines on open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      api.get('/github/repositories').then((res) => {
        setRepos(res.data);
        if (!selectedRepo && res.data.length > 0) {
          setSelectedRepo(res.data[0]);
        }
      });

      api.get('/machines').then((res) => {
        setMachines(res.data);
        const onlineMachine = res.data.find((m: Machine) => m.status === 'ONLINE');
        if (onlineMachine && !selectedMachineId) {
          setSelectedMachineId(onlineMachine.machine_id);
        } else if (res.data.length > 0 && !selectedMachineId) {
          setSelectedMachineId(res.data[0].machine_id);
        }
      });
    }
  }, [isOpen]);

  // Load branches when repo changes
  useEffect(() => {
    if (selectedRepo) {
      api
        .get(`/github/repositories/${selectedRepo.owner}/${selectedRepo.name}/branches`)
        .then((res) => {
          setBranches(res.data);
          const defaultB = res.data.find((b: GitHubBranchItem) => b.name === selectedRepo.default_branch);
          setSelectedBranch(defaultB ? defaultB.name : res.data[0]?.name || 'main');
        })
        .catch(() => setBranches([{ name: 'main', commit_sha: '', protected: false }]));
    }
  }, [selectedRepo]);

  // Load files to find Python entry points
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
          if (!pyFiles.includes(selectedEntryPoint)) {
            setSelectedEntryPoint(pyFiles[0] || 'main.py');
          }
        })
        .catch(() => setEntryPoints(['main.py']));
    }
  }, [selectedRepo, selectedBranch]);

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleUpdateEnvVar = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...envVars];
    updated[index][field] = val;
    setEnvVars(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) {
      setError('Please select a repository');
      return;
    }
    if (!selectedMachineId) {
      setError('Please select a target machine');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Format parameters
    const paramList = parameters
      .trim()
      .split(/\s+/)
      .filter((p) => p.length > 0);

    // Format environment variables
    const envDict: Record<string, string> = {};
    envVars.forEach((ev) => {
      if (ev.key.trim()) {
        envDict[ev.key.trim()] = ev.value;
      }
    });

    try {
      const payload = {
        repository_name: selectedRepo.name,
        repository_url: selectedRepo.html_url,
        branch: selectedBranch,
        entry_point: selectedEntryPoint,
        machine_id: selectedMachineId,
        parameters: paramList,
        environment_variables: envDict,
        timeout_seconds: timeoutSeconds,
        max_retries: maxRetries,
      };

      const res = await api.post('/jobs', payload);
      onClose();
      navigate(`/jobs/${res.data.job_id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to dispatch job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMachine = machines.find((m) => m.machine_id === selectedMachineId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dispatch Python Application"
      subtitle="Select repository, entry point, and execution machine"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Repository & Branch Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Repository Selector */}
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
                  {r.owner}/{r.name} {r.private ? '🔒' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-teal-400" />
              <span>Git Branch</span>
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none font-mono"
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} {b.protected ? '(protected)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Python Entry Point */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-teal-400" />
            <span>Python Entry Point</span>
          </label>
          <div className="relative">
            <select
              value={selectedEntryPoint}
              onChange={(e) => setSelectedEntryPoint(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none font-mono"
            >
              {entryPoints.map((ep) => (
                <option key={ep} value={ep}>
                  {ep} (Python script)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Target Execution Machine */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-teal-400" />
            <span>Target Machine</span>
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {machines.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center text-xs text-slate-400">
                No machines registered yet. Please register a Machine Agent first.
              </div>
            ) : (
              machines.map((m) => {
                const isSelected = selectedMachineId === m.machine_id;
                const isOnline = m.status === 'ONLINE';
                return (
                  <div
                    key={m.machine_id}
                    onClick={() => setSelectedMachineId(m.machine_id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-500/10 shadow-[0_0_12px_rgba(20,184,166,0.15)]'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    } ${m.status === 'DISABLED' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="machine_selection"
                        checked={isSelected}
                        onChange={() => setSelectedMachineId(m.machine_id)}
                        className="text-teal-500 focus:ring-teal-500"
                        disabled={m.status === 'DISABLED'}
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">{m.machine_name}</p>
                        <p className="text-xs text-slate-400 font-mono">
                          {m.machine_id} • {m.operating_system || 'Windows'} • Python {m.python_version || '3.12'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isOnline && (
                        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Cpu className="h-3.5 w-3.5 text-teal-400" />
                            {m.cpu_usage || 0}%
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3.5 w-3.5 text-indigo-400" />
                            {m.memory_usage || 0}%
                          </span>
                        </div>
                      )}
                      <StatusBadge status={m.status} size="sm" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Command-Line Arguments */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Command-Line Arguments
          </label>
          <input
            type="text"
            placeholder="e.g. --environment production --date 2026-08-14"
            value={parameters}
            onChange={(e) => setParameters(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:outline-none font-mono"
          />
        </div>

        {/* Environment Variables */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Environment Variables
            </label>
            <button
              type="button"
              onClick={handleAddEnvVar}
              className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Variable</span>
            </button>
          </div>

          {envVars.length > 0 ? (
            <div className="space-y-2">
              {envVars.map((ev, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="KEY (e.g. API_ENV)"
                    value={ev.key}
                    onChange={(e) => handleUpdateEnvVar(index, 'key', e.target.value)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-teal-500 focus:outline-none font-mono uppercase"
                  />
                  <input
                    type="text"
                    placeholder="VALUE"
                    value={ev.value}
                    onChange={(e) => handleUpdateEnvVar(index, 'value', e.target.value)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-teal-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveEnvVar(index)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No environment variables defined.</p>
          )}
        </div>

        {/* Advanced Options Grid */}
        <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Timeout (Seconds)
            </label>
            <input
              type="number"
              min="30"
              max="86400"
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 1800)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-teal-500 focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Max Auto-Retries
            </label>
            <select
              value={maxRetries}
              onChange={(e) => setMaxRetries(parseInt(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
            >
              <option value="0">0 (No retries)</option>
              <option value="1">1 Retry</option>
              <option value="2">2 Retries</option>
              <option value="3">3 Retries</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedMachineId}
            className="flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/20 hover:bg-teal-400 focus:outline-none disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                <span>Dispatching...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-slate-950" />
                <span>Run Application</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
