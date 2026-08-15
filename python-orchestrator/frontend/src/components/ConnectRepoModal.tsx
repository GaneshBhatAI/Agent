import React, { useState } from 'react';
import { FolderGit2, Key, Check, AlertCircle, ExternalLink, GitBranch } from 'lucide-react';
import { Modal } from './Modal';
import api from '../services/api';
import { supabaseService } from '../services/supabase';
import { authService } from '../services/auth';

interface ConnectRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepoConnected: () => void;
}

export const ConnectRepoModal: React.FC<ConnectRepoModalProps> = ({
  isOpen,
  onClose,
  onRepoConnected,
}) => {
  const [repoInput, setRepoInput] = useState<string>('');
  const [patToken, setPatToken] = useState<string>('');
  const [defaultBranch, setDefaultBranch] = useState<string>('main');
  const [description, setDescription] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim()) return;

    setError(null);
    setSuccess(null);
    setIsValidating(true);

    try {
      // 1. Parse owner and repo name
      let cleanInput = repoInput.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
      const parts = cleanInput.split('/');
      if (parts.length < 2) {
        throw new Error('Please enter a valid repository format: "owner/repository" or "https://github.com/owner/repository"');
      }
      const owner = parts[0];
      const repoName = parts[1];
      const fullUrl = `https://github.com/${owner}/${repoName}`;

      // 2. Validate live against GitHub API if token provided
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
      };
      if (patToken.trim()) {
        headers.Authorization = `token ${patToken.trim()}`;
      }

      let detectedBranch = defaultBranch;
      try {
        const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, { headers });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          detectedBranch = ghData.default_branch || defaultBranch;
          if (ghData.private) {
            setIsPrivate(true);
          }
        } else if (ghRes.status === 404 && !patToken.trim()) {
          throw new Error('Repository not found or is private. If it is a private repository, please provide a GitHub Personal Access Token (PAT).');
        } else if (ghRes.status === 401) {
          throw new Error('Invalid GitHub Personal Access Token. Please check token permissions (requires "repo" scope).');
        }
      } catch (fetchErr: any) {
        if (fetchErr.message && !fetchErr.message.includes('Failed to fetch')) {
          throw fetchErr;
        }
      }

      // 3. Store in Supabase database scoped to current user
      const currentUser = authService.getCurrentUser();
      const newRepoPayload = {
        github_owner: owner,
        repository_name: repoName,
        repository_url: fullUrl,
        default_branch: detectedBranch,
        description: description.trim() || `Connected repository ${owner}/${repoName}`,
        is_private: isPrivate || !!patToken.trim(),
        created_by: currentUser?.username || 'admin',
      };

      await api.post('/github/repositories', newRepoPayload);

      // 4. If PAT provided, save encrypted credential in user's vault
      if (patToken.trim()) {
        await api.post('/credentials', {
          name: `GITHUB_PAT_${owner.toUpperCase()}_${repoName.toUpperCase()}`,
          credential_type: 'GITHUB_PAT',
          value: patToken.trim(),
          description: `Access token for repository ${owner}/${repoName}`,
        });
      }

      setSuccess(`Successfully connected ${owner}/${repoName}!`);
      setTimeout(() => {
        onRepoConnected();
        onClose();
        setRepoInput('');
        setPatToken('');
        setDescription('');
        setSuccess(null);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to connect repository', err);
      setError(err.message || 'Failed to connect repository.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect GitHub Repository"
      subtitle="Add your own public or private repository using a Personal Access Token (PAT)"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-semibold">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FolderGit2 className="h-3.5 w-3.5 text-purple-600" />
              <span>Repository URL or Name *</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">e.g. GaneshBhatAI/Agent or full GitHub URL</span>
          </label>
          <input
            type="text"
            required
            placeholder="https://github.com/your-org/your-automation-repo"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-purple-600" />
              <span>GitHub Personal Access Token (PAT)</span>
            </span>
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-purple-700 hover:underline flex items-center gap-0.5"
            >
              <span>Generate PAT</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </label>
          <input
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (Optional for public, required for private)"
            value={patToken}
            onChange={(e) => setPatToken(e.target.value)}
            className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none font-mono"
          />
          <p className="text-[10.5px] text-slate-500 mt-1">
            Token is stored AES-256 encrypted in your private Credential Vault.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-purple-600" />
              <span>Default Branch</span>
            </label>
            <input
              type="text"
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
              placeholder="main or master"
              className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Repository Type
            </label>
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="repo_priv"
                  checked={!isPrivate}
                  onChange={() => setIsPrivate(false)}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span>Public Repo</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="repo_priv"
                  checked={isPrivate}
                  onChange={() => setIsPrivate(true)}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span>Private Repo</span>
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Description (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Finance team bot scripts, ETL workflows"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none"
          />
        </div>

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
            disabled={isValidating}
            className="rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] disabled:opacity-50 transition-all cursor-pointer"
          >
            {isValidating ? 'Connecting & Verifying...' : 'Connect Repository'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
