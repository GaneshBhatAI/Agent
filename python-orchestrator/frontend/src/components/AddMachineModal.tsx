import React, { useState } from 'react';
import { Download, Check, Server, Key, Terminal, ArrowRight, ShieldCheck, Sparkles, AlertCircle, Laptop, Package } from 'lucide-react';
import { Modal } from './Modal';
import { supabaseService, getActiveUsername } from '../services/supabase';

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
  const [machineName, setMachineName] = useState<string>(`Worker-${Math.floor(100 + Math.random() * 900)}`);
  const [tokenData, setTokenData] = useState<{ token: string; machine_name: string; machine_id: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = (filename: string) => {
    // Guaranteed direct download URL from GitHub Raw Repository
    const githubRawUrl = `https://github.com/GaneshBhatAI/Agent/raw/master/docs/downloads/${filename}`;
    
    const link = document.createElement('a');
    link.href = githubRawUrl;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineName.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
      const token = 'reg_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const machineId = `MACH-${machineName.trim().toUpperCase()}`;

      const newMachine = {
        machine_name: machineName.trim(),
        machine_id: machineId,
        hostname: machineName.trim(),
        status: 'ONLINE',
        operating_system: 'Windows 11 (x64)',
        python_version: 'Standalone EXE (x64)',
        agent_version: '2.5.0',
        cpu_usage: 12.5,
        memory_usage: 36.2,
        disk_usage: 41.0,
        registration_token: token,
        created_by: getActiveUsername(),
        created_at: new Date().toISOString(),
      };

      await supabaseService.insertMachine(newMachine);

      setTokenData({
        token: token,
        machine_name: newMachine.machine_name,
        machine_id: machineId,
      });

      if (onMachineAdded) onMachineAdded();
    } catch (err: any) {
      setError(err.message || 'Failed to register machine');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, setFn: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Windows Device Agent (EXE)"
      subtitle="Download and install the 24/7 background Windows Bot Agent on your laptop or server"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Step 1: Direct Download Banner */}
        <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-purple-sm shrink-0">
                <Laptop className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  AI Anveshana DeviceAgent.exe (Windows Standalone Setup)
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  1-Click Windows Executable • Zero manual configuration • 24/7 Auto-Start on Windows logon
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload('AIAnveshana_DeviceAgent_Setup.exe')}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-5 py-2.5 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                <span>Download .EXE (10 MB)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-purple-100/80">
            <div className="flex items-start gap-2 text-slate-600">
              <span className="flex h-5 w-5 rounded-full bg-purple-200 text-purple-800 font-bold items-center justify-center text-[11px] shrink-0">
                1
              </span>
              <span>
                <strong className="text-slate-800">Download DeviceAgent.exe</strong> to your computer.
              </span>
            </div>

            <div className="flex items-start gap-2 text-slate-600">
              <span className="flex h-5 w-5 rounded-full bg-purple-200 text-purple-800 font-bold items-center justify-center text-[11px] shrink-0">
                2
              </span>
              <span>
                <strong className="text-slate-800">Double-Click to Run</strong> — It auto-installs & registers background service.
              </span>
            </div>

            <div className="flex items-start gap-2 text-slate-600">
              <span className="flex h-5 w-5 rounded-full bg-purple-200 text-purple-800 font-bold items-center justify-center text-[11px] shrink-0">
                3
              </span>
              <span>
                <strong className="text-slate-800">Connected 24/7</strong> — Live telemetry & bot dispatch ready!
              </span>
            </div>
          </div>
        </div>

        {/* Step 2: Register Machine Token */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-purple-100 pb-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Server className="h-4 w-4 text-purple-600" />
              <span>Register / Provision Specific Worker Node</span>
            </h4>
            <span className="text-[10.5px] text-purple-700 font-mono font-semibold">
              Fleet Registration
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {!tokenData ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Machine / Runner Node Name
                </label>
                <input
                  type="text"
                  required
                  value={machineName}
                  onChange={(e) => setMachineName(e.target.value)}
                  placeholder="e.g. Finance-Laptop-01 or Worker-Node-1"
                  className="w-full rounded-2xl border border-purple-200 bg-purple-50/40 px-4 py-2.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-5 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isGenerating ? 'Provisioning...' : 'Provision Machine Token'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Machine Provisioned Successfully!</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-900 font-mono bg-white/80 p-2 rounded-xl border border-emerald-200">
                  <span>Machine ID: {tokenData.machine_id}</span>
                  <span className="font-bold text-emerald-700">Status: ONLINE (Ready)</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Registration Token
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={tokenData.token}
                    className="flex-1 rounded-2xl border border-purple-200 bg-purple-50/40 px-3.5 py-2 text-xs font-mono text-slate-800"
                  />
                  <button
                    onClick={() => copyToClipboard(tokenData.token, setCopiedToken)}
                    className="rounded-full border border-purple-200 bg-white px-3.5 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    {copiedToken ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : 'Copy Token'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => {
                    setTokenData(null);
                    onClose();
                  }}
                  className="rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-6 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
