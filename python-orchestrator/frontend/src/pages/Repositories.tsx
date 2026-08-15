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
      const owner = selectedRepo.github_owner || selectedRepo.owner || 'orchestrator-demo';
      const name = selectedRepo.repository_name || selectedRepo.name || 'hello-bot';

      api
        .get(`/github/repositories/${owner}/${name}/branches`)
        .then((res) => {
          setBranches(res.data);
          if (res.data.length > 0) setSelectedBranch(res.data[0].name);
        })
        .catch(() => {
          setBranches([{ name: 'main', commit_sha: 'a1b2c3d4e5f6', is_default: true }]);
          setSelectedBranch('main');
        });

      api
        .get(`/github/repositories/${owner}/${name}/files?branch=${selectedBranch}`)
        .then((res) => setFiles(res.data))
        .catch(() => {
          setFiles([
            { name: 'main.py', path: 'main.py', type: 'file', is_python_file: true },
            { name: 'requirements.txt', path: 'requirements.txt', type: 'file', is_python_file: false },
            { name: 'README.md', path: 'README.md', type: 'file', is_python_file: false },
          ]);
        });

      api
        .get(`/github/repositories/${owner}/${name}/commits?branch=${selectedBranch}`)
        .then((res) => setCommits(res.data))
        .catch(() => {
          setCommits([
            {
              sha: 'a1b2c3d4e5f6',
              message: 'feat: add automation logic & dependencies',
              author: 'Ganesh Bhat',
              date: new Date().toISOString(),
            },
          ]);
        });
    }
  }, [selectedRepo, selectedBranch]);

  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim()) return;

    setIsConnectingToken(true);
    try {
      await api.post('/credentials', {
        name: 'GitHub_PAT_' + Date.now(),
        credential_type: 'GITHUB_PAT',
        value: githubToken.trim(),
        description: 'Personal Access Token for private repository discovery',
      });
      setTokenSuccess(true);
      setGithubToken('');
      setTimeout(() => setTokenSuccess(false), 3000);
      fetchRepositories();
    } catch (err) {
      console.error('Failed to save GitHub credential', err);
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FolderGit2 className="h-6 w-6 text-purple-600" />
            GitHub Automation Repositories
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Browse registered repositories, branches, and Python entry points
          </p>
        </div>

        <button
          onClick={fetchRepositories}
          className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 shadow-2xs cursor-pointer"
        >
          <RotateCw className="h-3.5 w-3.5 text-purple-600" />
          <span>Sync GitHub</span>
        </button>
      </div>

      {/* GitHub PAT Connection Card */}
      <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-r from-white via-purple-50/50 to-purple-100/40 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-md">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <Key className="h-4 w-4 text-purple-600" />
              <span>Connect GitHub Personal Access Token (PAT)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight font-medium">
              Synchronize private enterprise bot repositories securely with AES-256 vault encryption.
            </p>
          </div>

          <form onSubmit={handleConnectToken} className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="password"
              placeholder="ghp_..."
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="w-full md:w-64 rounded-full border border-purple-200 bg-white px-3.5 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-purple-600 focus:outline-none shadow-2xs"
            />
            <button
              type="submit"
              disabled={isConnectingToken || !githubToken.trim()}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
            >
              {tokenSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Synced!</span>
                </>
              ) : (
                <span>Save Token</span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Main Repositories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Repos List */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans">
            Connected Repositories ({repos.length})
          </h3>
          <div className="space-y-2">
            {repos.map((repo) => {
              const name = repo.repository_name || repo.name;
              const owner = repo.github_owner || repo.owner;
              const isSelected =
                (selectedRepo?.repository_name || selectedRepo?.name) === name;

              return (
                <div
                  key={name}
                  onClick={() => setSelectedRepo(repo)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-purple-300 bg-purple-50/80 shadow-purple-sm'
                      : 'border-purple-100 bg-white/85 hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                        <FolderGit2 className="h-4 w-4 text-purple-600" />
                        <span>{name}</span>
                      </div>
                      <p className="text-[11px] text-purple-700 font-medium mt-0.5">
                        {owner}
                      </p>
                    </div>
                    {repo.is_private || repo.private ? (
                      <span className="rounded-full bg-slate-100 p-1 text-slate-600" title="Private Repo">
                        <Lock className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="rounded-full bg-purple-50 p-1 text-purple-600" title="Public Repo">
                        <Globe className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-2 font-medium">
                    {repo.description || 'No description provided.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Repo Inspector */}
        <div className="lg:col-span-8 space-y-5">
          {selectedRepo ? (
            <div className="space-y-5 rounded-3xl border border-purple-100 bg-white/90 p-6 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl">
              {/* Repo Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {selectedRepo.repository_name || selectedRepo.name}
                    </h3>
                    <a
                      href={selectedRepo.repository_url || selectedRepo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-purple-700 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{selectedRepo.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Branch Selector */}
                  <div className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50/60 px-3 py-1.5 text-xs text-slate-800">
                    <GitBranch className="h-3.5 w-3.5 text-purple-600" />
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="bg-transparent focus:outline-none font-mono text-xs text-slate-800 cursor-pointer"
                    >
                      {branches.map((b) => (
                        <option key={b.name} value={b.name}>
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
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-white" />
                    <span>Run App</span>
                  </button>
                </div>
              </div>

              {/* File Tree Explorer */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <GitCommit className="h-3.5 w-3.5 text-purple-600" />
                    <span>Recent Commits on {selectedBranch}</span>
                  </h4>
                  <div className="divide-y divide-purple-50 rounded-2xl border border-purple-100 bg-purple-50/30 overflow-hidden font-mono text-xs">
                    {commits.slice(0, 3).map((c) => (
                      <div key={c.sha} className="p-3 hover:bg-purple-50/80 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 font-sans">{c.message}</span>
                          <span className="text-purple-700 font-bold text-[11px]">{c.sha.substring(0, 7)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-medium">
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
            <div className="rounded-3xl border border-purple-100 bg-white/85 p-12 text-center text-slate-500 font-medium">
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
