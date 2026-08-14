import React, { useEffect, useState } from 'react';
import { KeyRound, Plus, Trash2, Shield, Lock, Check } from 'lucide-react';
import api from '../services/api';
import { Credential } from '../types';
import { Modal } from '../components/Modal';
import { formatDistanceToNow } from 'date-fns';

export const Credentials: React.FC = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [name, setName] = useState<string>('');
  const [type, setType] = useState<string>('GITHUB_PAT');
  const [value, setValue] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCredentials = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/credentials');
      setCredentials(res.data);
    } catch (err) {
      console.error('Failed to load credentials', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !value.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await api.post('/credentials', {
        name: name.trim(),
        credential_type: type,
        value: value.trim(),
        description: description.trim() || undefined,
      });
      setIsModalOpen(false);
      setName('');
      setValue('');
      setDescription('');
      fetchCredentials();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save credential');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this credential?')) return;
    try {
      await api.delete(`/credentials/${id}`);
      fetchCredentials();
    } catch (err) {
      console.error('Failed to delete credential', err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-teal-400" />
            <span>Secure Credential Vault</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            AES-256 encrypted tokens and API secrets injected securely into isolated execution nodes
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-teal-500/20 hover:bg-teal-400 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Secret</span>
        </button>
      </div>

      {/* Vault Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
              <tr>
                <th className="px-6 py-4">Secret Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Security Level</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Added</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {credentials.length > 0 ? (
                credentials.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-white text-sm flex items-center gap-2">
                      <Lock className="h-4 w-4 text-teal-400" />
                      <span>{c.name}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-teal-300">
                      {c.credential_type}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                        <Shield className="h-3 w-3" />
                        AES-256 Fernet Encrypted
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 max-w-xs truncate">
                      {c.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No encrypted secrets in vault. Click <strong>"Add Secret"</strong> to add a GitHub token or API key.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Secret Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Store Encrypted Secret"
        subtitle="Credentials are encrypted at rest with AES-256 and never logged"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Secret Identifier Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Production GitHub Token"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Credential Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none font-mono"
            >
              <option value="GITHUB_PAT">GitHub Personal Access Token (PAT)</option>
              <option value="GITHUB_APP">GitHub App Private Key</option>
              <option value="API_KEY">External API Key</option>
              <option value="GENERIC_SECRET">Generic Secret Token</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Secret Value (Encrypted before storage)
            </label>
            <input
              type="password"
              required
              placeholder="Paste token or key value..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Purpose or scope of this credential"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-teal-500 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-teal-400"
            >
              {isSubmitting ? 'Encrypting...' : 'Save Encrypted Secret'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
