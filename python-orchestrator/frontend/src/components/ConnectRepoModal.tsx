import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Key,
  Check,
  AlertCircle,
  ExternalLink,
  Search,
  Lock,
  Globe,
  CheckSquare,
  Square,
  Sparkles,
  ArrowRight,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from './Modal';
import api from '../services/api';
import { authService } from '../services/auth';

interface ConnectRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepoConnected: () => void;
}

interface FetchedRepoItem {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  html_url: string;
  description?: string;
  default_branch: string;
  private: boolean;
  alreadyConnected?: boolean;
}

export const ConnectRepoModal: React.FC<ConnectRepoModalProps> = ({
  isOpen,
  onClose,
  onRepoConnected,
}) => {
  const [step, setStep] = useState<'token' | 'select'>('token');
  const [patToken, setPatToken] = useState<string>('');
  const [singleRepoInput, setSingleRepoInput] = useState<string>('');
  const [existingRepoUrls, setExistingRepoUrls] = useState<Set<string>>(new Set());
  const [fetchedRepos, setFetchedRepos] = useState<FetchedRepoItem[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<number>>(new Set());
  const [repoSearch, setRepoSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      // Load user's already connected repos and saved PAT from Supabase
      Promise.all([
        api.get('/github/repositories'),
        api.get('/credentials'),
      ]).then(([repoRes, credRes]) => {
        if (Array.isArray(repoRes.data)) {
          const urls = new Set<string>(
            repoRes.data.map((r: any) =>
              (r.repository_url || `${r.github_owner}/${r.repository_name}`).toLowerCase()
            )
          );
          setExistingRepoUrls(urls);
        }

        const foundToken = credRes.data?.find((c: any) => c.credential_type === 'GITHUB_PAT');
        if (foundToken && foundToken.encrypted_value && foundToken.encrypted_value.startsWith('ghp_')) {
          setPatToken(foundToken.encrypted_value);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleFetchReposWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patToken.trim() && !singleRepoInput.trim()) {
      setError('Please provide a GitHub Personal Access Token (PAT) or target a specific repository URL.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
      };
      if (patToken.trim()) {
        headers.Authorization = `Bearer ${patToken.trim()}`;
      }

      // If user provided a single repo path directly (e.g. owner/repo)
      if (singleRepoInput.trim()) {
        let clean = singleRepoInput.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
        const parts = clean.split('/');
        if (parts.length >= 2) {
          const owner = parts[0];
          const repo = parts[1];
          const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
          if (!ghRes.ok) {
            throw new Error(`Repository "${owner}/${repo}" not found or private. Check your PAT token.`);
          }
          const item = await ghRes.json();
          const isConn = existingRepoUrls.has(item.html_url.toLowerCase()) || existingRepoUrls.has(`${owner}/${repo}`.toLowerCase());
          const repoItem: FetchedRepoItem = { ...item, alreadyConnected: isConn };
          setFetchedRepos([repoItem]);
          if (!isConn) setSelectedRepoIds(new Set([item.id]));
          setStep('select');
          setIsLoading(false);
          return;
        }
      }

      // Otherwise fetch all repos accessible to this PAT
      const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', { headers });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Invalid GitHub Personal Access Token. Please check token permissions (requires "repo" scope).');
        }
        throw new Error(`GitHub API error: ${res.statusText}`);
      }

      const repos: FetchedRepoItem[] = await res.json();
      if (!Array.isArray(repos) || repos.length === 0) {
        throw new Error('No repositories found for this GitHub account.');
      }

      const mapped = repos.map((r) => {
        const fullLower = r.full_name?.toLowerCase() || '';
        const urlLower = r.html_url?.toLowerCase() || '';
        const isConn = existingRepoUrls.has(fullLower) || existingRepoUrls.has(urlLower);
        return { ...r, alreadyConnected: isConn };
      });

      setFetchedRepos(mapped);

      // Pre-select first un-connected repo
      const firstAvailable = mapped.find((r) => !r.alreadyConnected);
      setSelectedRepoIds(new Set(firstAvailable ? [firstAvailable.id] : []));
      setStep('select');
    } catch (err: any) {
      console.error('Failed to fetch repositories from GitHub', err);
      setError(err.message || 'Failed to authenticate with GitHub.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectRepo = (repo: FetchedRepoItem) => {
    if (repo.alreadyConnected) return;
    setSelectedRepoIds((prev) => {
      const next = new Set(prev);
      if (next.has(repo.id)) {
        next.delete(repo.id);
      } else {
        next.add(repo.id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const available = filteredRepos.filter((r) => !r.alreadyConnected);
    if (selectedRepoIds.size === available.length) {
      setSelectedRepoIds(new Set());
    } else {
      setSelectedRepoIds(new Set(available.map((r) => r.id)));
    }
  };

  const handleSaveSelectedRepos = async () => {
    if (selectedRepoIds.size === 0) {
      setError('Please select at least one repository to connect.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const currentUser = authService.getCurrentUser();
    const currentUsername = currentUser?.username || 'admin';

    try {
      const chosenRepos = fetchedRepos.filter((r) => selectedRepoIds.has(r.id));

      // 1. Batch Save chosen repositories into Supabase database
      for (const repo of chosenRepos) {
        await api.post('/github/repositories', {
          github_owner: repo.owner?.login || currentUsername,
          repository_name: repo.name,
          repository_url: repo.html_url,
          default_branch: repo.default_branch || 'master',
          description: repo.description || `Automation Bot Workspace for ${repo.name}`,
          is_private: repo.private,
          created_by: currentUsername,
        });
      }

      // 2. Save PAT in Credential Vault if provided
      if (patToken.trim()) {
        await api.post('/credentials', {
          name: `GITHUB_PAT_${currentUsername.toUpperCase()}`,
          credential_type: 'GITHUB_PAT',
          value: patToken.trim(),
          description: `GitHub Access Token for connected repositories`,
        });
      }

      setSuccess(`Successfully connected ${chosenRepos.length} repository${chosenRepos.length > 1 ? 'ies' : ''} to Supabase!`);
      setTimeout(() => {
        onRepoConnected();
        onClose();
        setStep('token');
        setSuccess(null);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to save repositories in Supabase', err);
      setError(err.message || 'Failed to save repository selections.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRepos = fetchedRepos.filter((r) =>
    r.full_name?.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(repoSearch.toLowerCase()))
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'token' ? 'Connect GitHub Repositories' : 'Select Repositories for Workspace'}
      subtitle={
        step === 'token'
          ? 'Enter your GitHub Personal Access Token (PAT) to load and choose your repositories'
          : 'Choose which specific bot repositories to include in your Orchestrator workspace'
      }
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 font-semibold">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {step === 'token' ? (
          <form onSubmit={handleFetchReposWithToken} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-purple-600" />
                  <span>GitHub Personal Access Token (PAT) *</span>
                </span>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,read:user"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10.5px] text-purple-700 hover:underline flex items-center gap-0.5 font-bold"
                >
                  <span>Generate Token (repo scope)</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </label>
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={patToken}
                onChange={(e) => setPatToken(e.target.value)}
                className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none font-mono"
              />
              <p className="text-[10.5px] text-slate-500 mt-1">
                Your PAT token is stored AES-256 encrypted in your private Credential Vault.
              </p>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-purple-100"></div>
              <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-bold uppercase">or single repo</span>
              <div className="flex-grow border-t border-purple-100"></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Specific Repository (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. owner/repo or https://github.com/owner/repo"
                value={singleRepoInput}
                onChange={(e) => setSingleRepoInput(e.target.value)}
                className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none font-mono"
              />
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-purple-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] disabled:opacity-50 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-1" />
                    <span>Connecting to GitHub...</span>
                  </>
                ) : (
                  <>
                    <span>Next: Select Repositories</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {/* Filter / Search Bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                <input
                  type="text"
                  placeholder="Filter repositories..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="w-full rounded-full border border-purple-200 bg-purple-50/40 pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer whitespace-nowrap"
              >
                Select All
              </button>
            </div>

            {/* Repositories Checkbox List */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 border border-purple-100 rounded-2xl p-2 bg-purple-50/20">
              {filteredRepos.length > 0 ? (
                filteredRepos.map((r) => {
                  const isSelected = selectedRepoIds.has(r.id);
                  const isConn = !!r.alreadyConnected;

                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleSelectRepo(r)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                        isConn
                          ? 'border-purple-200 bg-purple-100/40 opacity-75 cursor-default'
                          : isSelected
                          ? 'border-purple-400 bg-purple-50 shadow-2xs cursor-pointer'
                          : 'border-purple-100/70 bg-white hover:bg-purple-50/40 cursor-pointer'
                      }`}
                    >
                      <div className="pt-0.5 text-purple-600">
                        {isConn ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : isSelected ? (
                          <CheckSquare className="h-4 w-4 text-purple-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 font-mono truncate">
                            {r.full_name}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.2 text-[9.5px] font-bold border ${
                              r.private
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {r.private ? 'Private' : 'Public'}
                          </span>

                          {isConn && (
                            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.2 text-[9.5px] font-bold border border-emerald-200">
                              Already Connected
                            </span>
                          )}
                        </div>

                        {r.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                            {r.description}
                          </p>
                        )}
                        <p className="text-[10px] text-purple-700 font-mono mt-0.5">
                          branch: {r.default_branch || 'master'}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-500 font-medium">
                  No repositories matched "{repoSearch}".
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-purple-100">
              <span className="font-bold">
                {selectedRepoIds.size} new repositories selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('token')}
                  className="rounded-full border border-purple-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-purple-50 cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleSaveSelectedRepos}
                  disabled={isLoading || selectedRepoIds.size === 0}
                  className="rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-5 py-1.5 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isLoading ? 'Saving in Database...' : 'Save Selected Repositories'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
