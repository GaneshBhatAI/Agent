import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check, Download, Search, Terminal as TerminalIcon, ArrowDownCircle } from 'lucide-react';
import { JobLog, LogLevel } from '../types';
import { format } from 'date-fns';

interface TerminalViewerProps {
  logs: JobLog[];
  isLoading?: boolean;
  jobId?: string;
  isLive?: boolean;
}

export const TerminalViewer: React.FC<TerminalViewerProps> = ({
  logs,
  isLoading = false,
  jobId,
  isLive = false,
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive if enabled
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Handle user manual scroll: if scrolled up, disable auto-scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      return log.message.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${jobId || 'execution'}-logs.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'ERROR':
        return 'text-rose-400 font-semibold bg-rose-950/40 border-rose-800/60';
      case 'WARNING':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/60';
      case 'DEBUG':
        return 'text-indigo-400 bg-indigo-950/40 border-indigo-800/60';
      case 'INFO':
      default:
        return 'text-teal-400 bg-teal-950/30 border-teal-800/40';
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
      {/* Terminal Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-300 ml-2">
            <TerminalIcon className="h-4 w-4 text-teal-400" />
            <span>Execution Console</span>
            {isLive && (
              <span className="flex items-center gap-1.5 rounded-full bg-teal-500/20 border border-teal-500/40 px-2 py-0.5 text-[10px] text-teal-300 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                LIVE STREAM
              </span>
            )}
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:outline-none w-36 sm:w-48"
            />
          </div>

          {/* Level Filter Tabs */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs font-medium text-slate-400">
            {['ALL', 'INFO', 'WARNING', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  filterLevel === lvl
                    ? 'bg-slate-800 text-teal-400 shadow-sm font-semibold'
                    : 'hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
              autoScroll
                ? 'border-teal-500/40 bg-teal-500/10 text-teal-300'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
            title="Auto-scroll on new logs"
          >
            <ArrowDownCircle className="h-3.5 w-3.5" />
            <span>Auto-scroll</span>
          </button>

          {/* Copy logs */}
          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Copy all logs"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Download logs */}
          <button
            onClick={handleDownloadLogs}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Download log file"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1 select-text bg-slate-950/90"
        style={{ minHeight: '380px', maxHeight: '580px' }}
      >
        {isLoading && logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-500 py-12">
            <span className="animate-spin rounded-full h-5 w-5 border-2 border-teal-500 border-t-transparent mr-3" />
            Connecting to remote execution log stream...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-500 py-16">
            <TerminalIcon className="h-10 w-10 text-slate-700 mb-2" />
            <p>No log messages recorded yet.</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Logs will appear here in real-time as the Machine Agent executes the Python process.
            </p>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            let formattedTime = '';
            try {
              formattedTime = format(new Date(log.timestamp), 'HH:mm:ss.SSS');
            } catch {
              formattedTime = log.timestamp;
            }

            return (
              <div
                key={log.id || index}
                className="flex items-start gap-2.5 hover:bg-slate-900/60 py-0.5 px-1.5 rounded transition-colors group"
              >
                {/* Line number */}
                <span className="text-slate-600 select-none w-8 text-right text-[11px]">
                  {index + 1}
                </span>

                {/* Timestamp */}
                <span className="text-slate-500 select-none text-[11px]">
                  {formattedTime}
                </span>

                {/* Level Pill */}
                <span
                  className={`text-[10px] uppercase px-1.5 py-0.2 rounded border font-semibold select-none ${getLevelColor(
                    log.level
                  )}`}
                >
                  {log.level}
                </span>

                {/* Message */}
                <span
                  className={`flex-1 break-all whitespace-pre-wrap ${
                    log.level === 'ERROR'
                      ? 'text-rose-300 font-medium'
                      : log.level === 'WARNING'
                      ? 'text-amber-300'
                      : 'text-slate-200'
                  }`}
                >
                  {log.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
