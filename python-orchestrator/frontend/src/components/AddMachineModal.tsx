import React, { useState } from 'react';
import { Copy, Check, Server, Key, Terminal, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { Modal } from './Modal';

interface AddMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMachineAdded?: () => void;
}

export const AddMachineModal: React.FC<AddMachineModalProps> = ({
  isOpen,
  onClose,
  onMachineAdded,
}) => {
  const [machineName, setMachineName] = useState<string>('Machine-A');
  const [tokenData, setTokenData] = useState<{ token: string; machine_name: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineName.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.post('/machines/generate-token', {
        machine_name: machineName.trim(),
      });
      setTokenData({
        token: res.data.registration_token,
        machine_name: res.data.machine_name,
      });
      if (onMachineAdded) onMachineAdded();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate machine token');
    } finally {
      setIsGenerating(false);
    }
  };

  const centralUrl = window.location.origin.includes('5173')
    ? 'http://localhost:8000'
    : window.location.origin;

  const powershellCommand = tokenData
    ? `.\\install_agent.ps1 -CentralUrl "${centralUrl}" -MachineName "${tokenData.machine_name}" -RegistrationToken "${tokenData.token}"`
    : '';

  const manualCliCommand = tokenData
    ? `python agent.py --central-url "${centralUrl}" --machine-name "${tokenData.machine_name}" --token "${tokenData.token}"`
    : '';

  const copyToClipboard = (text: string, setFn: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  const handleReset = () => {
    setTokenData(null);
    setMachineName('');
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Register Worker Machine"
      subtitle="Generate a 1-time secure registration token to connect a Windows bot runner"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {!tokenData ? (
          <form onSubmit={handleGenerate} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-purple-600" />
                <span>Machine Friendly Name</span>
              </label>
              <input
                type="text"
                required
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                placeholder="e.g. Machine-A, Finance-Bot-01, VM-Prod-Worker"
                className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-4 py-2.5 text-sm text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none transition-all"
              />
              <p className="mt-1 text-[11px] text-slate-500 font-medium">
                Unique identifier to assign jobs and monitor hardware usage.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating || !machineName.trim()}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] disabled:opacity-50 transition-all cursor-pointer"
              >
                {isGenerating ? 'Generating...' : 'Generate Registration Token'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5 animate-fadeIn">
            {/* Success Token Alert */}
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-purple-600" />
                  1-Time Registration Token: {tokenData.machine_name}
                </span>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  Expires in 24h
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white border border-purple-200 p-2.5">
                <code className="font-mono text-xs text-purple-800 break-all select-all font-semibold">
                  {tokenData.token}
                </code>
                <button
                  onClick={() => copyToClipboard(tokenData.token, setCopiedToken)}
                  className="rounded-lg p-1.5 text-purple-700 hover:bg-purple-100 cursor-pointer"
                  title="Copy Token"
                >
                  {copiedToken ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* PowerShell 1-Click Installer */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-purple-600" />
                <span>Option A: Run PowerShell Automated Installer</span>
              </label>
              <div className="relative rounded-2xl bg-slate-950 p-3.5 border border-slate-800 shadow-inner">
                <pre className="font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                  {powershellCommand}
                </pre>
                <button
                  onClick={() => copyToClipboard(powershellCommand, setCopiedScript)}
                  className="absolute top-2.5 right-2.5 rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer"
                >
                  {copiedScript ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Manual Run Command */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">
                Option B: Manual Python CLI
              </label>
              <div className="rounded-2xl bg-slate-950 p-3 border border-slate-800">
                <pre className="font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {manualCliCommand}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 cursor-pointer"
              >
                Register Another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
