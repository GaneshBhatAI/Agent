import React from 'react';
import { FileCode, FileText, Folder, Play } from 'lucide-react';
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
      <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-8 text-center text-xs text-slate-500 font-medium">
        No files discovered in repository branch.
      </div>
    );
  }

  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === 'dir' && b.type !== 'dir') return -1;
    if (a.type !== 'dir' && b.type === 'dir') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="rounded-2xl border border-purple-100 bg-white overflow-hidden shadow-2xs font-mono text-xs">
      <div className="border-b border-purple-100 bg-purple-50/60 px-4 py-2.5 flex items-center justify-between text-slate-600 font-sans font-bold text-xs">
        <span>Repository Files</span>
        <span className="text-[11px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-semibold">
          {files.length} items
        </span>
      </div>

      <div className="divide-y divide-purple-50">
        {sortedFiles.map((file) => {
          const isSelected = selectedFile === file.path;
          const isPython = file.is_python || file.name.endsWith('.py');
          const isDep =
            file.is_dependency_file ||
            file.name === 'requirements.txt' ||
            file.name === 'pyproject.toml';

          return (
            <div
              key={file.path}
              className={`flex items-center justify-between px-4 py-2.5 hover:bg-purple-50/60 transition-colors ${
                isSelected ? 'bg-purple-50/90' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {file.type === 'dir' ? (
                  <Folder className="h-4 w-4 text-amber-500" />
                ) : isPython ? (
                  <FileCode className="h-4 w-4 text-purple-600" />
                ) : (
                  <FileText className="h-4 w-4 text-slate-400" />
                )}

                <span
                  onClick={() => onSelectFile && onSelectFile(file.path)}
                  className={`cursor-pointer ${
                    isPython ? 'text-purple-900 font-bold' : 'text-slate-700 font-medium'
                  }`}
                >
                  {file.name}
                </span>

                {isPython && (
                  <span className="rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
                    Python Entry Point
                  </span>
                )}

                {isDep && (
                  <span className="rounded-full bg-indigo-100 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
                    Dependencies
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {file.size !== undefined && (
                  <span className="text-[11px] text-slate-400">{file.size} B</span>
                )}

                {isPython && onRunFile && (
                  <button
                    onClick={() => onRunFile(file.path)}
                    className="flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    <Play className="h-3 w-3 fill-purple-700" />
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
