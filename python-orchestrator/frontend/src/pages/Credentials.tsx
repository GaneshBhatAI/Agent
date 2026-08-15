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
    if (!window.confirm('Are you sure you want to delete this encrypted credential?')) return;
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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-purple-600" />
            AES-256 Encrypted Credential Vault
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Securely manage GitHub tokens, API keys, database connection strings, and bot secrets
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4.5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Credential</span>
        </button>
      </div>

      {/* Security Info Banner */}
      <div className="rounded-3xl border border-purple-200/80 bg-purple-50/60 p-4 flex items-center gap-3">
        <div className="rounded-2xl bg-purple-100 p-2.5 text-purple-700">
          <Shield className="h-5 w-5" />
        </div>
        <div className="text-xs text-slate-600">
          <span className="font-bold text-slate-800">Hardware & Vault Security Active:</span> All
          credentials are encrypted at rest using AES-256 (Fernet) keys. Plain-text secrets are
          never exposed in logs or network responses.
        </div>
      </div>

      {/* Credentials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {credentials.map((cred) => (
          <div
            key={cred.id}
            className="rounded-3xl border border-purple-100 bg-white/90 p-5 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{cred.name}</h3>
                  <span className="inline-block mt-1 rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-800 font-mono">
                    {cred.credential_type}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(cred.id)}
                  title="Delete Credential"
                  className="rounded-full border border-purple-100 bg-white p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="mt-3 text-xs text-slate-500 line-clamp-2 font-medium">
                {cred.description || 'No description provided.'}
              </p>
            </div>

            <div className="pt-3 border-t border-purple-50 flex items-center justify-between text-[10.5px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-purple-600" />
                Encrypted at rest
              </span>
              <span>
                {formatDistanceToNow(new Date(cred.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Credential Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Store Encrypted Credential"
        subtitle="Safely store secrets in the AES-256 Vault"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Credential Identifier Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. GITHUB_ENTERPRISE_PAT, PROD_DB_SECRET"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Secret Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none font-medium"
            >
              <option value="GITHUB_PAT">GitHub Personal Access Token (PAT)</option>
              <option value="API_KEY">Generic API Key</option>
              <option value="PASSWORD">System Password</option>
              <option value="SSH_KEY">Private SSH Key</option>
              <option value="OTHER">Custom Secret</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Secret Value (Will be Encrypted)
            </label>
            <textarea
              required
              rows={3}
              placeholder="Paste sensitive token or credential value here..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="What this credential is used for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-purple-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Encrypting...' : 'Save to Vault'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
