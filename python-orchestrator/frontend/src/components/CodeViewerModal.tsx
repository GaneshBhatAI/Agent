import React, { useState } from 'react';
import {
  FileCode,
  FileText,
  Copy,
  Check,
  Download,
  Play,
  X,
  Maximize2,
  Minimize2,
  Code2,
} from 'lucide-react';

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  filePath: string;
  content: string;
  language?: string;
  onRun?: (path: string) => void;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({
  isOpen,
  onClose,
  fileName,
  filePath,
  content,
  language = 'python',
  onRun,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  if (!isOpen) return null;

  const lines = content.split('\n');
  const isPython = fileName.endsWith('.py');
  const isJson = fileName.endsWith('.json');

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`relative w-full ${
          isMaximized ? 'max-w-7xl h-[92vh]' : 'max-w-5xl h-[82vh]'
        } flex flex-col rounded-3xl border border-purple-200 bg-white shadow-2xl shadow-purple-950/20 overflow-hidden z-10 animate-scaleUp transition-all duration-300`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-100 bg-purple-50/70 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-purple-100 p-2.5 text-purple-700">
              {isPython ? (
                <FileCode className="h-5 w-5" />
              ) : isJson ? (
                <Code2 className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {fileName}
                </h3>
                <span className="rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 font-mono">
                  {language.toUpperCase()}
                </span>
                <span className="text-[11px] text-slate-400 font-medium font-mono">
                  {lines.length} lines • {(new Blob([content]).size / 1024).toFixed(1)} KB
                </span>
              </div>
              <p className="text-[11px] text-purple-700 font-mono font-semibold mt-0.5">
                {filePath}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPython && onRun && (
              <button
                onClick={() => {
                  onClose();
                  onRun(filePath);
                }}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4 py-1.5 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer mr-2"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Run this Bot</span>
              </button>
            )}

            <button
              onClick={handleCopy}
              title="Copy code"
              className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-purple-50 transition-colors cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-purple-600" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              title="Download file"
              className="rounded-full border border-purple-200 bg-white p-2 text-slate-600 hover:bg-purple-50 cursor-pointer shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 text-purple-600" />
            </button>

            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore size' : 'Maximize window'}
              className="rounded-full border border-purple-200 bg-white p-2 text-slate-600 hover:bg-purple-50 cursor-pointer shadow-2xs"
            >
              {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={onClose}
              title="Close viewer"
              className="rounded-full border border-purple-200 bg-white p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Code Content Viewer */}
        <div className="flex-1 overflow-y-auto bg-[#140e26] p-4 text-slate-100 font-mono text-xs leading-relaxed select-text">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="w-12 pr-4 text-right select-none text-purple-300/30 text-[11px] font-mono border-r border-purple-900/40">
                    {idx + 1}
                  </td>
                  <td className="pl-4 whitespace-pre font-mono text-slate-200 py-0.5">
                    {formatSyntax(line, language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="border-t border-purple-100 bg-purple-50/50 px-6 py-2.5 flex items-center justify-between text-xs text-slate-500 shrink-0 font-medium">
          <span>Read-only source inspector</span>
          <span className="font-mono text-[11px]">UTF-8 • Ready for Dispatch</span>
        </div>
      </div>
    </div>
  );
};

function formatSyntax(line: string, lang: string): React.ReactNode {
  // Simple syntax colorizer for Python, JSON, text
  if (line.trim().startsWith('#') || line.trim().startsWith('//')) {
    return <span className="text-purple-300/50 italic">{line}</span>;
  }
  if (line.trim().startsWith('"""') || line.trim().startsWith("'''")) {
    return <span className="text-emerald-400 italic">{line}</span>;
  }
  if (lang === 'python') {
    // Highlight def, import, from, return, class, if, else, try, except
    const parts = line.split(/(\b(?:def|class|import|from|return|if|else|elif|try|except|finally|for|while|in|as|with|pass|break|continue|True|False|None)\b)/g);
    return (
      <>
        {parts.map((part, i) => {
          if (
            /^(def|class|import|from|return|if|else|elif|try|except|finally|for|while|in|as|with|pass|break|continue)$/.test(
              part
            )
          ) {
            return (
              <span key={i} className="text-purple-400 font-bold">
                {part}
              </span>
            );
          }
          if (/^(True|False|None)$/.test(part)) {
            return (
              <span key={i} className="text-amber-400 font-bold">
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  }
  return <span>{line}</span>;
}
