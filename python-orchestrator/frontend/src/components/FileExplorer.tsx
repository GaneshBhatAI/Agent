import React from 'react';
import { FileCode, FileText, Folder, Play, Check } from 'lucide-react';
import { GitHubFileItem } from '../types';

interface FileExplorerProps {
  files: GitHubFileItem[];
  selectedFile?: string;
  onSelectFile?: (filePath: string) => void;
  onRunFile?: (filePath: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  selectedFile,
  onSelectFile,
  onRunFile,
}) => {
  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-xs text-slate-400">
        No files discovered in repository branch.
      </div>
    );
  }

  // Sort directories first, then files
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === 'dir' && b.type !== 'dir') return -1;
    if (a.type !== 'dir' && b.type === 'dir') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner font-mono text-xs">
      <div className="border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 flex items-center justify-between text-slate-400 font-sans font-medium text-xs">
        <span>Repository Files</span>
        <span>{files.length} items</span>
      </div>

      <div className="divide-y divide-slate-850">
        {sortedFiles.map((file) => {
          const isSelected = selectedFile === file.path;
          const isPython = file.is_python || file.name.endsWith('.py');
          const isDep = file.is_dependency_file || file.name === 'requirements.txt' || file.name === 'pyproject.toml';

          return (
            <div
              key={file.path}
              className={`flex items-center justify-between px-4 py-2.5 hover:bg-slate-900/60 transition-colors ${
                isSelected ? 'bg-teal-500/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {file.type === 'dir' ? (
                  <Folder className="h-4 w-4 text-amber-400" />
                ) : isPython ? (
                  <FileCode className="h-4 w-4 text-teal-400" />
                ) : (
                  <FileText className="h-4 w-4 text-slate-400" />
                )}

                <span
                  onClick={() => onSelectFile && onSelectFile(file.path)}
                  className={`cursor-pointer ${
                    isPython ? 'text-teal-300 font-semibold' : 'text-slate-200'
                  }`}
                >
                  {file.name}
                </span>

                {isPython && (
                  <span className="rounded bg-teal-500/20 border border-teal-500/30 px-1.5 py-0.5 text-[10px] text-teal-300">
                    Python Entry Point
                  </span>
                )}

                {isDep && (
                  <span className="rounded bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 text-[10px] text-indigo-300">
                    Dependencies
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {file.size !== undefined && (
                  <span className="text-[11px] text-slate-500">{file.size} B</span>
                )}

                {isPython && onRunFile && (
                  <button
                    onClick={() => onRunFile(file.path)}
                    className="flex items-center gap-1 rounded-md bg-teal-500/20 border border-teal-500/40 px-2 py-1 text-[11px] text-teal-300 hover:bg-teal-500/30 transition-colors"
                  >
                    <Play className="h-3 w-3 fill-teal-300" />
                    <span>Run</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
