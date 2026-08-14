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
    setMachineName('Machine-A');
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Execution Machine"
      subtitle="Generate registration token and configure worker agent"
      maxWidth="2xl"
    >
      {!tokenData ? (
        <form onSubmit={handleGenerate} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-teal-400" />
              <span>Machine Identifier / Name</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Machine-A, Worker-Windows-01"
              value={machineName}
              onChange={(e) => setMachineName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Give this execution machine a unique name (e.g. Machine-A, Finance-Bot-Runner).
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !machineName.trim()}
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/20 hover:bg-teal-400 focus:outline-none disabled:opacity-50 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                  <span>Generating Token...</span>
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  <span>Generate Registration Token</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-5 animate-fadeIn">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
              <Check className="h-4 w-4" />
              <span>Token Generated for {tokenData.machine_name}</span>
            </div>
            <p className="text-xs text-slate-300">
              Use this registration token to connect your Windows Machine Agent to this Control Room.
            </p>
          </div>

          {/* Registration Token Display */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Registration Token (Single Use)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={tokenData.token}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-mono text-teal-300 select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(tokenData.token, setCopiedToken)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
              >
                {copiedToken ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedToken ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Quick Install Command */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-teal-400" />
              <span>Option 1: Windows PowerShell Automated Setup</span>
            </label>
            <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs font-mono text-slate-300 overflow-x-auto">
              <pre className="whitespace-pre-wrap">{powershellCommand}</pre>
              <button
                type="button"
                onClick={() => copyToClipboard(powershellCommand, setCopiedScript)}
                className="absolute right-2.5 top-2.5 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 flex items-center gap-1"
              >
                {copiedScript ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedScript ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Option 2: Direct CLI */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-indigo-400" />
              <span>Option 2: Direct Python Execution</span>
            </label>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs font-mono text-slate-300 overflow-x-auto">
              <pre className="whitespace-pre-wrap">{manualCliCommand}</pre>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Add Another Machine
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-teal-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-teal-400 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
