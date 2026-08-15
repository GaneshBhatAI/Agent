import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

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

  const modalElement = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
      {/* Backdrop covering entire screen */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-fadeIn z-[99998]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`relative w-full ${
          isMaximized ? 'max-w-[96vw] h-[94vh]' : 'max-w-5xl h-[84vh]'
        } max-h-[92vh] flex flex-col rounded-3xl border border-purple-200 bg-white shadow-2xl shadow-purple-950/40 overflow-hidden z-[99999] animate-scaleUp transition-all duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-100 bg-purple-50/80 px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-2xl bg-purple-100 p-2 text-purple-700 shrink-0">
              {isPython ? (
                <FileCode className="h-5 w-5" />
              ) : isJson ? (
                <Code2 className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight font-mono truncate">
                  {fileName}
                </h3>
                <span className="rounded-full bg-purple-100 border border-purple-200 px-2 py-0.2 text-[9.5px] font-bold text-purple-800 font-mono">
                  {language.toUpperCase()}
                </span>
                <span className="text-[10.5px] text-slate-400 font-medium font-mono">
                  {lines.length} lines • {(new Blob([content]).size / 1024).toFixed(1)} KB
                </span>
              </div>
              <p className="text-[11px] text-purple-700 font-mono font-semibold mt-0.5 truncate">
                {filePath}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isPython && onRun && (
              <button
                onClick={() => {
                  onClose();
                  onRun(filePath);
                }}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4 py-1.5 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Run this Bot</span>
              </button>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-full border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-purple-50 transition-colors cursor-pointer shadow-2xs"
              title="Copy Code"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 rounded-full border border-purple-200 bg-white text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer shadow-2xs"
              title="Download File"
            >
              <Download className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-full border border-purple-200 bg-white text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer shadow-2xs"
              title={isMaximized ? 'Restore size' : 'Maximize'}
            >
              {isMaximized ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full border border-purple-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Code Content Body with Line Numbers */}
        <div className="flex-1 overflow-auto bg-[#0d091a] text-slate-200 font-mono text-xs p-4 sm:p-6 leading-relaxed select-text min-h-0">
          <div className="table w-full">
            {lines.map((line, idx) => (
              <div key={idx} className="table-row hover:bg-white/5 transition-colors group">
                <span className="table-cell text-right pr-6 py-0.5 text-slate-600 select-none w-12 font-mono text-[11px] group-hover:text-purple-400">
                  {idx + 1}
                </span>
                <span className="table-cell py-0.5 pl-2 whitespace-pre text-slate-100 font-mono">
                  {renderHighlightedLine(line, isPython, isJson)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-purple-100 bg-purple-50/50 px-6 py-2.5 text-xs text-slate-500 shrink-0">
          <span className="font-semibold text-[11px]">
            AI Anveshana Code Inspector
          </span>
          <span className="font-mono text-[10.5px] text-purple-700 font-bold">
            UTF-8 • Ready for Dispatch
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
};

// Simple Lightweight Syntax Colorizer for Code Inspector
function renderHighlightedLine(line: string, isPython: boolean, isJson: boolean) {
  if (line.trim().startsWith('#') || line.trim().startsWith('//')) {
    return <span className="text-slate-500 italic">{line}</span>;
  }
  if (line.trim().startsWith('"""') || line.trim().startsWith("'''")) {
    return <span className="text-emerald-400 italic">{line}</span>;
  }
  if (isPython) {
    if (
      line.includes('def ') ||
      line.includes('import ') ||
      line.includes('from ') ||
      line.includes('class ') ||
      line.includes('return ') ||
      line.includes('if ') ||
      line.includes('else:') ||
      line.includes('try:') ||
      line.includes('except ') ||
      line.includes('async ') ||
      line.includes('await ')
    ) {
      return <span className="text-purple-300 font-semibold">{line}</span>;
    }
  }
  if (isJson) {
    if (line.includes(':')) {
      const parts = line.split(':');
      return (
        <span>
          <span className="text-cyan-300">{parts[0]}</span>:
          <span className="text-amber-300">{parts.slice(1).join(':')}</span>
        </span>
      );
    }
  }
  return <span>{line}</span>;
}
