import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, GitBranch, Terminal, Server, Plus, Trash2, Cpu, HardDrive, AlertCircle, FolderGit2 } from 'lucide-react';
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
      const owner = selectedRepo.github_owner || selectedRepo.owner || 'orchestrator-demo';
      const name = selectedRepo.repository_name || selectedRepo.name || 'hello-bot';
      api
        .get(`/github/repositories/${owner}/${name}/branches`)
        .then((res) => {
          setBranches(res.data);
          if (res.data.length > 0) {
            setSelectedBranch(res.data[0].name);
          }
        })
        .catch(() => {
          setBranches([{ name: 'main', commit_sha: 'a1b2c3d4e5f6', is_default: true }]);
          setSelectedBranch('main');
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
    if (!selectedRepo || !selectedMachineId) {
      setError('Please select both a repository and a target machine.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const envMap: Record<string, string> = {};
    envVars.forEach(({ key, value }) => {
      if (key.trim()) envMap[key.trim()] = value;
    });

    const parsedParams = parameters
      .split(' ')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const repoName = selectedRepo.repository_name || selectedRepo.name;
    const repoUrl = selectedRepo.repository_url || selectedRepo.url;

    try {
      const payload = {
        repository_id: selectedRepo.id,
        repository_name: repoName,
        repository_url: repoUrl,
        branch: selectedBranch,
        entry_point: selectedEntryPoint,
        machine_id: selectedMachineId,
        parameters: parsedParams,
        environment_variables: envMap,
        timeout_seconds: timeoutSeconds,
        max_retries: maxRetries,
      };

      const res = await api.post('/jobs', payload);
      onClose();
      navigate(`/jobs/${res.data.job_id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to dispatch automation job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dispatch Python Automation Job"
      subtitle="Select a repository script to execute remotely on a Windows machine node"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Repository & Branch Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Repo Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FolderGit2 className="h-3.5 w-3.5 text-purple-600" />
              <span>GitHub Repository</span>
            </label>
            <select
              value={selectedRepo?.repository_name || selectedRepo?.name || ''}
              onChange={(e) => {
                const found = repos.find(
                  (r) => (r.repository_name || r.name) === e.target.value
                );
                if (found) setSelectedRepo(found);
              }}
              className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none font-medium"
            >
              {repos.map((r) => {
                const name = r.repository_name || r.name;
                const owner = r.github_owner || r.owner;
                return (
                  <option key={name} value={name}>
                    {owner}/{name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Branch Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-purple-600" />
              <span>Git Branch</span>
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

        {/* Python Entry Point */}
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
                {ep} (Python script)
              </option>
            ))}
          </select>
        </div>

        {/* Target Execution Machine */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-purple-600" />
            <span>Target Machine</span>
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {machines.length === 0 ? (
              <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 text-center text-xs text-slate-500 font-medium">
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
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50/80 shadow-purple-sm'
                        : 'border-purple-100 bg-white hover:border-purple-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="machine_selection"
                        checked={isSelected}
                        onChange={() => setSelectedMachineId(m.machine_id)}
                        className="text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{m.machine_name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {m.machine_id} • {m.operating_system || 'Windows'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isOnline && (
                        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600 font-mono">
                          <span className="flex items-center gap-1">
                            <Cpu className="h-3.5 w-3.5 text-purple-600" />
                            {m.cpu_usage || 0}%
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3.5 w-3.5 text-indigo-600" />
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
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Command-Line Arguments
          </label>
          <input
            type="text"
            placeholder="e.g. --environment production --date 2026-08-15"
            value={parameters}
            onChange={(e) => setParameters(e.target.value)}
            className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:outline-none font-mono"
          />
        </div>

        {/* Action Buttons */}
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
            disabled={isSubmitting || !selectedMachineId}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] disabled:opacity-50 transition-all cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Job Now'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
