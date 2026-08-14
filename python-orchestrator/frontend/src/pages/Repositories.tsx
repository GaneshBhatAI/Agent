import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  GitBranch,
  Key,
  Play,
  Check,
  ExternalLink,
  Lock,
  Globe,
  FileCode,
  RotateCw,
  GitCommit,
} from 'lucide-react';
import api from '../services/api';
import { GitHubBranchItem, GitHubCommitItem, GitHubFileItem, GitHubRepoItem } from '../types';
import { FileExplorer } from '../components/FileExplorer';
import { RunJobModal } from '../components/RunJobModal';
import { formatDistanceToNow } from 'date-fns';

export const Repositories: React.FC = () => {
  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);
  const [branches, setBranches] = useState<GitHubBranchItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [files, setFiles] = useState<GitHubFileItem[]>([]);
  const [commits, setCommits] = useState<GitHubCommitItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Connect GitHub Token state
  const [githubToken, setGithubToken] = useState<string>('');
  const [isConnectingToken, setIsConnectingToken] = useState<boolean>(false);
  const [tokenSuccess, setTokenSuccess] = useState<boolean>(false);

  // Run modal state
  const [isRunModalOpen, setIsRunModalOpen] = useState<boolean>(false);
  const [targetEntryPoint, setTargetEntryPoint] = useState<string>('main.py');

  const fetchRepositories = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/github/repositories');
      setRepos(res.data);
      if (res.data.length > 0 && !selectedRepo) {
        setSelectedRepo(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load repositories', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  // Fetch branches and commits when repo changes
  useEffect(() => {
    if (selectedRepo) {
      api
        .get(`/github/repositories/${selectedRepo.owner}/${selectedRepo.name}/branches`)
        .then((res) => {
          setBranches(res.data);
          const def = res.data.find((b: GitHubBranchItem) => b.name === selectedRepo.default_branch);
          setSelectedBranch(def ? def.name : res.data[0]?.name || 'main');
        })
        .catch(() => setBranches([{ name: 'main', commit_sha: '', protected: false }]));

      api
        .get(`/github/repositories/${selectedRepo.owner}/${selectedRepo.name}/commits`)
        .then((res) => setCommits(res.data))
        .catch(() => setCommits([]));
    }
  }, [selectedRepo]);

  // Fetch files when branch changes
  useEffect(() => {
    if (selectedRepo && selectedBranch) {
      api
        .get(`/github/repositories/${selectedRepo.owner}/${selectedRepo.name}/files`, {
          params: { branch: selectedBranch },
        })
        .then((res) => setFiles(res.data))
        .catch(() => setFiles([]));
    }
  }, [selectedRepo, selectedBranch]);

  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim()) return;
    setIsConnectingToken(true);
    try {
      await api.post('/github/connect-token', { token: githubToken.trim() });
      setTokenSuccess(true);
      setGithubToken('');
      fetchRepositories();
      setTimeout(() => setTokenSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to connect GitHub token', err);
    } finally {
      setIsConnectingToken(false);
    }
  };

  const handleRunScript = (filePath: string) => {
    setTargetEntryPoint(filePath);
    setIsRunModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Title & GitHub Connect Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderGit2 className="h-5 w-5 text-teal-400" />
            <span>GitHub Repository Explorer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse application code, select branches, and execute Python entry points
          </p>
        </div>

        {/* Connect GitHub PAT */}
        <form
          onSubmit={handleConnectToken}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-xs w-full md:w-auto"
        >
          <Key className="h-3.5 w-3.5 text-teal-400 ml-2" />
          <input
            type="password"
            placeholder="GitHub Personal Access Token"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            className="bg-transparent px-2 py-1 text-slate-200 placeholder-slate-500 focus:outline-none w-48 md:w-56 font-mono text-xs"
          />
          <button
            type="submit"
            disabled={isConnectingToken || !githubToken.trim()}
            className="rounded-lg bg-teal-500 px-3 py-1 font-bold text-slate-950 hover:bg-teal-400 disabled:opacity-50 transition-all cursor-pointer text-xs"
          >
            {isConnectingToken ? 'Connecting...' : tokenSuccess ? 'Connected!' : 'Connect'}
          </button>
        </form>
      </div>

      {/* Main Grid: Repos on Left, Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Repository List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Repositories ({repos.length})
            </span>
            <button
              onClick={fetchRepositories}
              className="text-xs text-teal-400 hover:text-teal-300"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {repos.map((repo) => {
              const isSelected = selectedRepo?.name === repo.name;
              return (
                <div
                  key={repo.name}
                  onClick={() => setSelectedRepo(repo)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-teal-500/10 shadow-[0_0_15px_rgba(20,184,166,0.15)]'
                      : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white tracking-tight">{repo.name}</h4>
                      {repo.private ? (
                        <Lock className="h-3 w-3 text-amber-400" />
                      ) : (
                        <Globe className="h-3 w-3 text-slate-400" />
                      )}
                    </div>
                    {repo.language && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-teal-400">
                        {repo.language}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                    {repo.description || 'No repository description available.'}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{repo.owner}</span>
                    <span>branch: {repo.default_branch}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Repo Inspector */}
        <div className="lg:col-span-8 space-y-5">
          {selectedRepo ? (
            <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl">
              {/* Repo Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-white tracking-tight">
                      {selectedRepo.full_name}
                    </h3>
                    <a
                      href={selectedRepo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedRepo.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Branch Selector */}
                  <div className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200">
                    <GitBranch className="h-3.5 w-3.5 text-teal-400" />
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="bg-transparent focus:outline-none font-mono text-xs text-slate-200"
                    >
                      {branches.map((b) => (
                        <option key={b.name} value={b.name} className="bg-slate-900 text-white">
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setTargetEntryPoint('main.py');
                      setIsRunModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-400 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-slate-950" />
                    <span>Run App</span>
                  </button>
                </div>
              </div>

              {/* File Tree Explorer */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Source Code & Entry Points
                </h4>
                <FileExplorer
                  files={files}
                  selectedFile={targetEntryPoint}
                  onRunFile={handleRunScript}
                />
              </div>

              {/* Recent Commits */}
              {commits.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <GitCommit className="h-3.5 w-3.5 text-teal-400" />
                    <span>Recent Commits on {selectedBranch}</span>
                  </h4>
                  <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs">
                    {commits.slice(0, 3).map((c) => (
                      <div key={c.sha} className="p-3 hover:bg-slate-900/60 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200 font-sans">{c.message}</span>
                          <span className="text-teal-400 text-[11px]">{c.sha.substring(0, 7)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{c.author}</span>
                          <span>{formatDistanceToNow(new Date(c.date), { addSuffix: true })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-500">
              Select a repository to inspect files and entry points.
            </div>
          )}
        </div>
      </div>

      <RunJobModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        defaultRepo={selectedRepo || undefined}
        defaultBranch={selectedBranch}
        defaultEntryPoint={targetEntryPoint}
      />
    </div>
  );
};
