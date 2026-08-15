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

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

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
    link.download = `execution_${jobId || 'job'}_logs.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: LogLevel | string) => {
    switch (level) {
      case 'ERROR':
      case 'CRITICAL':
        return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      case 'WARNING':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'DEBUG':
        return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      case 'INFO':
      default:
        return 'text-purple-300 border-purple-500/30 bg-purple-500/10';
    }
  };

  return (
    <div className="flex flex-col rounded-3xl border border-purple-100 bg-white/90 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl overflow-hidden">
      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-purple-100 bg-purple-50/60 px-4 py-3 gap-3">
        {/* Terminal Window Dots & Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800 ml-2 font-sans">
            <TerminalIcon className="h-4 w-4 text-purple-600" />
            <span>Execution Console</span>
            {isLive && (
              <span className="flex items-center gap-1.5 rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] text-purple-800 font-semibold animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                LIVE STREAM
              </span>
            )}
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-full border border-purple-200 bg-white pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-600 focus:outline-none w-36 sm:w-44"
            />
          </div>

          {/* Level Filter Tabs */}
          <div className="flex items-center rounded-full border border-purple-200 bg-white p-0.5 text-xs font-bold text-slate-600">
            {['ALL', 'INFO', 'WARNING', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`rounded-full px-2.5 py-0.5 transition-colors cursor-pointer ${
                  filterLevel === lvl
                    ? 'bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] text-white shadow-2xs'
                    : 'hover:text-purple-900'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
              autoScroll
                ? 'border-purple-300 bg-purple-50 text-purple-800'
                : 'border-purple-200 bg-white text-slate-600 hover:bg-purple-50'
            }`}
            title="Auto-scroll on new logs"
          >
            <ArrowDownCircle className="h-3.5 w-3.5" />
            <span>Auto-scroll</span>
          </button>

          {/* Copy logs */}
          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1 rounded-full border border-purple-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-purple-50 transition-colors cursor-pointer"
            title="Copy all logs"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-purple-600" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Download logs */}
          <button
            onClick={handleDownloadLogs}
            className="flex items-center gap-1 rounded-full border border-purple-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-purple-50 transition-colors cursor-pointer"
            title="Download log file"
          >
            <Download className="h-3.5 w-3.5 text-purple-600" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1 select-text bg-[#18112e] text-slate-100"
        style={{ minHeight: '380px', maxHeight: '580px' }}
      >
        {isLoading && logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400 py-12">
            <span className="animate-spin rounded-full h-5 w-5 border-2 border-purple-400 border-t-transparent mr-3" />
            Connecting to remote execution log stream...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-400 py-16">
            <TerminalIcon className="h-10 w-10 text-purple-400/50 mb-2" />
            <p className="font-semibold text-slate-300">No log messages recorded yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">
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
                className="flex items-start gap-2.5 hover:bg-white/5 py-0.5 px-1.5 rounded transition-colors group"
              >
                {/* Line number */}
                <span className="text-purple-300/40 select-none w-8 text-right text-[11px]">
                  {index + 1}
                </span>

                {/* Timestamp */}
                <span className="text-purple-300/60 select-none text-[11px]">
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
                      : 'text-slate-100'
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
