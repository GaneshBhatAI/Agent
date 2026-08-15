import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  GitBranch,
  Key,
  Play,
  Check,
  ExternalLink,
  Lock,
  Globe,
  FileCode,
  RotateCw,
  GitCommit,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Eye,
  FileText,
  Code2,
  FileSpreadsheet,
  Search,
  Layers,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import { GitHubBranchItem, GitHubCommitItem, GitHubFileItem, GitHubRepoItem } from '../types';
import { RunJobModal } from '../components/RunJobModal';
import { CodeViewerModal } from '../components/CodeViewerModal';
import { formatDistanceToNow } from 'date-fns';

interface TreeNode {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'file';
  fileType?: 'python' | 'json' | 'excel' | 'text' | 'yaml' | 'markdown';
  children?: TreeNode[];
  content?: string;
  size?: string;
  isPython?: boolean;
}

const SAMPLE_BOT_TREE: TreeNode[] = [
  {
    id: 'loan-team',
    name: 'Loan Team',
    path: 'Loan/Loan Team',
    type: 'folder',
    children: [
      {
        id: 'active-loans-process',
        name: 'Active Loans Process',
        path: 'Loan/Loan Team/Active Loans Process',
        type: 'folder',
        children: [
          {
            id: 'active-loans-bots',
            name: 'Bots',
            path: 'Loan/Loan Team/Active Loans Process/Bots',
            type: 'folder',
            children: [
              {
                id: 'master-active-loans',
                name: 'Master_ActiveLoansProcess.py',
                path: 'Loan/Loan Team/Active Loans Process/Bots/Master_ActiveLoansProcess.py',
                type: 'file',
                fileType: 'python',
                isPython: true,
                size: '9.8 KB',
                content: `"""
===============================================================================
Active Loans Process - Master Bot
===============================================================================
Master Bot for Active Loans Process built using AIAnveshana Framework.
Config path: [PROD]\\Loan\\Loan Team\\Active Loans Process\\Config\\Config_Active Loans Process.xlsx
"""

import os
import sys
import traceback

# Dynamically add PROD directory containing framework_components to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
prod_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".."))
if prod_dir not in sys.path:
    sys.path.insert(0, prod_dir)

if current_dir not in sys.path:
    sys.path.append(current_dir)

from framework_components.ApplicationCleaner import application_clean
from framework_components.ConfigReader import read_config
from framework_components.EmailNotifier import send_gmail
from framework_components.Logger import log
from framework_components.ScreenshotTaker import take_screenshot
from framework_components.Utilities import (
    get_bot_name,
    get_date_str,
    get_device_name,
    get_username,
)

# Import Child Bot
from Child_ActiveLoansProcess import execute_child_bot


def main():
    config_file_path = os.path.abspath(os.path.join(current_dir, "..", "Config", "Config_Active Loans Process.xlsx"))
    dicUserConfig = {}

    try:
        # =====================================================================
        # 1. INITIAL ASSIGNMENT
        # =====================================================================
        strBotName = get_bot_name()
        strTodayDate = get_date_str("%d%b%Y")
        strUserName = get_username()
        strDeviceName = get_device_name()

        print("=" * 70)
        print(f"   STARTING MASTER BOT: {strBotName}   ")
        print(f"   Date: {strTodayDate} | User: {strUserName} | Device: {strDeviceName}   ")
        print("=" * 70)

        # 2. READ CONFIG & INITIALIZE
        dicUserConfig = read_config(config_file_path)
        log("Master Bot Initialized successfully with Config", "INFO")

        # 3. EXECUTE WORKFLOW
        execute_child_bot(dicUserConfig)
        log("Active Loans Workflow Executed with 0 Exceptions", "SUCCESS")

    except Exception as e:
        err_trace = traceback.format_exc()
        print(f"[FATAL ERROR] {str(e)}\\n{err_trace}")
        log(f"Process Failed: {str(e)}", "ERROR")
        take_screenshot("MasterBot_Failure")
        sys.exit(1)


if __name__ == "__main__":
    main()
`,
              },
              {
                id: 'child-active-loans',
                name: 'Child_ActiveLoansProcess.py',
                path: 'Loan/Loan Team/Active Loans Process/Bots/Child_ActiveLoansProcess.py',
                type: 'file',
                fileType: 'python',
                isPython: true,
                size: '6.4 KB',
                content: `"""
===============================================================================
Active Loans Process - Child Bot
===============================================================================
Performs loan statement scraping, data validation, and ERP ledger posting.
"""

import os
import sys
import pandas as pd

def execute_child_bot(config):
    print(">>> [CHILD BOT] Starting Loan Record Processing...")
    
    # 1. Load active loans queue
    print(">>> Reading input transactions from queue...")
    records_processed = 42
    
    # 2. Processing iterations
    for i in range(1, 6):
        print(f"    - Processing Loan Account #LN-2026-00{i} -> Verified (Status: APPROVED)")
        
    print(f">>> Completed processing {records_processed} loan statements successfully.")
    return True
`,
              },
            ],
          },
          {
            id: 'active-loans-config',
            name: 'Config',
            path: 'Loan/Loan Team/Active Loans Process/Config',
            type: 'folder',
            children: [
              {
                id: 'config-json',
                name: 'config.json',
                path: 'Loan/Loan Team/Active Loans Process/Config/config.json',
                type: 'file',
                fileType: 'json',
                size: '1.2 KB',
                content: `{
  "process_name": "Active Loans Process",
  "version": "1.0.0",
  "environment": "PRODUCTION",
  "max_retries": 3,
  "timeout_seconds": 1800,
  "notification_recipients": [
    "operations@aianveshana.com",
    "lead.developer@aianveshana.com"
  ],
  "input_directory": "C:\\\\AutomationData\\\\Input",
  "output_directory": "C:\\\\AutomationData\\\\Output"
}`,
              },
              {
                id: 'config-requirements',
                name: 'requirements.txt',
                path: 'Loan/Loan Team/Active Loans Process/Config/requirements.txt',
                type: 'file',
                fileType: 'text',
                size: '420 B',
                content: `pandas>=2.2.0
openpyxl>=3.1.2
requests>=2.31.0
pydantic>=2.5.0
cryptography>=42.0.0
psutil>=5.9.0
`,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'framework-components',
    name: 'framework_components',
    path: 'framework_components',
    type: 'folder',
    children: [
      {
        id: 'excel-manager-folder',
        name: 'Excel_Manager',
        path: 'framework_components/Excel_Manager',
        type: 'folder',
        children: [
          {
            id: 'excel-manager-py',
            name: 'excel_manager.py',
            path: 'framework_components/Excel_Manager/excel_manager.py',
            type: 'file',
            fileType: 'python',
            isPython: true,
            size: '5.2 KB',
            content: `"""
Framework Component: Excel Manager
Automates reading, writing, and formatting Excel workbooks with openpyxl.
"""

import openpyxl
import pandas as pd

class ExcelManager:
    def __init__(self, file_path: str):
        self.file_path = file_path
        
    def read_sheet(self, sheet_name: str = None) -> pd.DataFrame:
        print(f"[EXCEL] Reading sheet from {self.file_path}")
        return pd.read_excel(self.file_path, sheet_name=sheet_name)
        
    def write_sheet(self, df: pd.DataFrame, sheet_name: str = "Sheet1"):
        print(f"[EXCEL] Writing DataFrame with {len(df)} rows to {self.file_path}")
        df.to_excel(self.file_path, sheet_name=sheet_name, index=False)
`,
          },
        ],
      },
      {
        id: 'file-handler-folder',
        name: 'File_Handler',
        path: 'framework_components/File_Handler',
        type: 'folder',
        children: [
          {
            id: 'file-handler-py',
            name: 'file_handler.py',
            path: 'framework_components/File_Handler/file_handler.py',
            type: 'file',
            fileType: 'python',
            isPython: true,
            size: '3.8 KB',
            content: `"""
Framework Component: File Handler
Utility module for directory creation, archiving, and safe file moves.
"""

import os
import shutil

def ensure_directory(dir_path: str):
    if not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)
        print(f"[FILE HANDLER] Created directory: {dir_path}")

def archive_file(source: str, archive_dir: str):
    ensure_directory(archive_dir)
    dest = os.path.join(archive_dir, os.path.basename(source))
    shutil.move(source, dest)
    print(f"[FILE HANDLER] Archived {source} -> {dest}")
`,
          },
        ],
      },
    ],
  },
  {
    id: 'orchestrator-agent-folder',
    name: 'orchestrator_agent',
    path: 'orchestrator_agent',
    type: 'folder',
    children: [
      {
        id: 'agent-py',
        name: 'agent.py',
        path: 'orchestrator_agent/agent.py',
        type: 'file',
        fileType: 'python',
        isPython: true,
        size: '8.4 KB',
        content: `"""
Ai Anveshana Windows Machine Agent
Executes Python automation scripts in isolated environments with real-time log streaming.
"""

import psutil
import subprocess
import sys
import time

def get_telemetry():
    return {
        "cpu_usage": psutil.cpu_percent(interval=1),
        "memory_usage": psutil.virtual_memory().percent,
        "disk_usage": psutil.disk_usage('C:\\\\').percent
    }

if __name__ == "__main__":
    print("[AGENT] Starting Machine Worker Daemon...")
    print(f"[TELEMETRY] Current Hardware: {get_telemetry()}")
`,
      },
      {
        id: 'device-node-py',
        name: 'device_node.py',
        path: 'orchestrator_agent/device_node.py',
        type: 'file',
        fileType: 'python',
        isPython: true,
        size: '4.1 KB',
        content: `"""
Device Node Management & WebSocket Heartbeat Dispatcher.
"""
`,
      },
    ],
  },
];

export const Repositories: React.FC = () => {
  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);
  const [branches, setBranches] = useState<GitHubBranchItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Folder Hierarchy State (Automation Anywhere style)
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'loan-team': true,
    'active-loans-process': true,
    'active-loans-bots': true,
    'framework-components': true,
  });
  const [currentFolder, setCurrentFolder] = useState<TreeNode | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['Bots', 'Loan Team', 'Active Loans Process', 'Bots']);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Code Viewer Modal State
  const [viewingFile, setViewingFile] = useState<{
    fileName: string;
    filePath: string;
    content: string;
    language: string;
  } | null>(null);

  // Run Job Modal State
  const [isRunModalOpen, setIsRunModalOpen] = useState<boolean>(false);
  const [targetEntryPoint, setTargetEntryPoint] = useState<string>('Master_ActiveLoansProcess.py');

  const fetchRepositories = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/github/repositories');
      setRepos(res.data);
      if (res.data.length > 0 && !selectedRepo) {
        setSelectedRepo(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load repositories', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
    // Default folder view to the active loans bots folder
    const loanTeam = SAMPLE_BOT_TREE[0];
    const activeProcess = loanTeam?.children?.[0];
    const botsFolder = activeProcess?.children?.[0];
    if (botsFolder) {
      setCurrentFolder(botsFolder);
    }
  }, []);

  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleSelectFolder = (node: TreeNode, pathCrumbs: string[]) => {
    setCurrentFolder(node);
    setBreadcrumbs(pathCrumbs);
  };

  const handleOpenFile = (fileNode: TreeNode) => {
    const lang = fileNode.fileType || (fileNode.name.endsWith('.py') ? 'python' : fileNode.name.endsWith('.json') ? 'json' : 'text');
    setViewingFile({
      fileName: fileNode.name,
      filePath: fileNode.path,
      content: fileNode.content || `# Source content for ${fileNode.name}\n\nprint("Executing ${fileNode.name}...")\n`,
      language: lang,
    });
  };

  const handleRunFile = (filePath: string) => {
    setTargetEntryPoint(filePath);
    setIsRunModalOpen(true);
  };

  // Get flat list of all files in current folder
  const currentItems = currentFolder?.children || SAMPLE_BOT_TREE[0]?.children?.[0]?.children?.[0]?.children || [];
  const filteredItems = currentItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FolderGit2 className="h-6 w-6 text-purple-600" />
            Automation Repository & Bot Explorer
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Hierarchical directory tree navigation • Inspect code & dispatch bots
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3.5 py-1.5 text-xs font-mono text-slate-800 shadow-2xs">
            <GitBranch className="h-3.5 w-3.5 text-purple-600" />
            <span className="font-bold">Branch:</span>
            <span className="text-purple-700 font-semibold">{selectedBranch}</span>
          </div>

          <button
            onClick={fetchRepositories}
            className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 shadow-2xs cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5 text-purple-600" />
            <span>Sync Repos</span>
          </button>
        </div>
      </div>

      {/* Main Bot Explorer Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left 4 Cols: Tree Structure (Hierarchy) */}
        <div className="lg:col-span-4 rounded-3xl border border-purple-100 bg-white/90 p-4 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl flex flex-col space-y-3">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Bot Folders Hierarchy
              </span>
            </div>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
              Workspace Tree
            </span>
          </div>

          {/* Tree View Component */}
          <div className="flex-1 overflow-y-auto space-y-1 font-sans text-xs select-none pr-1">
            {/* Root Node */}
            <div
              onClick={() => handleSelectFolder({ id: 'root', name: 'Bots', path: '', type: 'folder', children: SAMPLE_BOT_TREE }, ['Bots'])}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-purple-900 font-bold hover:bg-purple-50 cursor-pointer"
            >
              <FolderOpen className="h-4 w-4 text-purple-600 shrink-0" />
              <span>📁 My Automation Bots (Root)</span>
            </div>

            {/* Recursive Tree Render */}
            {SAMPLE_BOT_TREE.map((node) => (
              <RenderTreeItem
                key={node.id}
                node={node}
                level={1}
                expandedFolders={expandedFolders}
                onToggle={toggleFolder}
                onSelectFolder={handleSelectFolder}
                currentPathCrumbs={['Bots', node.name]}
                selectedFolderId={currentFolder?.id}
              />
            ))}
          </div>
        </div>

        {/* Right 8 Cols: Folder Content Table & File Explorer */}
        <div className="lg:col-span-8 rounded-3xl border border-purple-100 bg-white/90 p-6 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl flex flex-col space-y-4">
          {/* Breadcrumb Navigation Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-purple-100 pb-4">
            <div className="flex items-center flex-wrap gap-1.5 text-xs">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                  <span
                    className={`font-semibold ${
                      idx === breadcrumbs.length - 1
                        ? 'text-purple-800 font-bold bg-purple-100/70 px-2 py-0.5 rounded-full'
                        : 'text-slate-500 hover:text-purple-700'
                    }`}
                  >
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
              <input
                type="text"
                placeholder="Search in this folder..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-purple-200 bg-purple-50/40 pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Files / Subfolders Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-purple-50/50 text-slate-600 uppercase tracking-wider font-bold border-b border-purple-100 text-[11px]">
                <tr>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50 text-slate-700">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const isFolder = item.type === 'folder';
                    const isPy = item.isPython || item.name.endsWith('.py');
                    const isJson = item.name.endsWith('.json');

                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          if (isFolder) {
                            handleSelectFolder(item, [...breadcrumbs, item.name]);
                          } else {
                            handleOpenFile(item);
                          }
                        }}
                        className="hover:bg-purple-50/60 cursor-pointer transition-colors group"
                      >
                        {/* Name & Icon */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {isFolder ? (
                              <Folder className="h-4 w-4 text-purple-600 shrink-0" />
                            ) : isPy ? (
                              <FileCode className="h-4 w-4 text-purple-600 shrink-0" />
                            ) : isJson ? (
                              <Code2 className="h-4 w-4 text-indigo-600 shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                            <div>
                              <span className="font-bold text-slate-900 group-hover:text-purple-800 transition-colors">
                                {item.name}
                              </span>
                              <p className="text-[10px] text-slate-500 font-mono">{item.path}</p>
                            </div>
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td className="px-4 py-3.5">
                          {isFolder ? (
                            <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                              Directory
                            </span>
                          ) : isPy ? (
                            <span className="rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-900">
                              🤖 Python Bot
                            </span>
                          ) : isJson ? (
                            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                              Config (JSON)
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              Document
                            </span>
                          )}
                        </td>

                        {/* Size */}
                        <td className="px-4 py-3.5 font-mono text-slate-500">
                          {isFolder ? `${item.children?.length || 0} items` : item.size || '2.4 KB'}
                        </td>

                        {/* Actions: View Content / Run Bot */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {!isFolder && (
                              <button
                                onClick={() => handleOpenFile(item)}
                                title="Open & Inspect file content"
                                className="flex items-center gap-1 rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-bold text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Eye className="h-3.5 w-3.5 text-purple-600" />
                                <span>View</span>
                              </button>
                            )}

                            {isPy && (
                              <button
                                onClick={() => handleRunFile(item.path)}
                                title="Dispatch this Python Bot"
                                className="flex items-center gap-1 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-3.5 py-1 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
                              >
                                <Play className="h-3 w-3 fill-white" />
                                <span>Run</span>
                              </button>
                            )}

                            {isFolder && (
                              <button
                                onClick={() => handleSelectFolder(item, [...breadcrumbs, item.name])}
                                className="flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900"
                              >
                                <span>Open →</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500 font-medium">
                      No files or bots found in this folder.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Interactive Code & Content Viewer Modal */}
      {viewingFile && (
        <CodeViewerModal
          isOpen={!!viewingFile}
          onClose={() => setViewingFile(null)}
          fileName={viewingFile.fileName}
          filePath={viewingFile.filePath}
          content={viewingFile.content}
          language={viewingFile.language}
          onRun={(path) => handleRunFile(path)}
        />
      )}

      {/* Run Job Modal */}
      <RunJobModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        defaultRepo={selectedRepo || undefined}
        defaultBranch={selectedBranch}
        defaultEntryPoint={targetEntryPoint}
      />
    </div>
  );
};

interface RenderTreeItemProps {
  node: TreeNode;
  level: number;
  expandedFolders: Record<string, boolean>;
  onToggle: (id: string, e: React.MouseEvent) => void;
  onSelectFolder: (node: TreeNode, pathCrumbs: string[]) => void;
  currentPathCrumbs: string[];
  selectedFolderId?: string;
}

const RenderTreeItem: React.FC<RenderTreeItemProps> = ({
  node,
  level,
  expandedFolders,
  onToggle,
  onSelectFolder,
  currentPathCrumbs,
  selectedFolderId,
}) => {
  const isFolder = node.type === 'folder';
  if (!isFolder) return null; // In left tree view, show folders

  const isExpanded = expandedFolders[node.id];
  const isSelected = selectedFolderId === node.id;
  const paddingLeft = `${level * 16}px`;

  return (
    <div>
      <div
        onClick={() => onSelectFolder(node, currentPathCrumbs)}
        style={{ paddingLeft }}
        className={`flex items-center justify-between py-1.5 px-2 rounded-xl cursor-pointer transition-colors ${
          isSelected
            ? 'bg-purple-100 text-purple-900 font-bold shadow-2xs'
            : 'text-slate-700 hover:bg-purple-50/80 font-medium'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <button
            onClick={(e) => onToggle(node.id, e)}
            className="p-0.5 text-slate-400 hover:text-purple-700 cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-purple-600 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-purple-500 shrink-0" />
          )}

          <span className="truncate">{node.name}</span>
        </div>

        {node.children && (
          <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded-full font-mono font-semibold">
            {node.children.length}
          </span>
        )}
      </div>

      {isExpanded && node.children && (
        <div className="space-y-0.5">
          {node.children.map((child) => (
            <RenderTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              onSelectFolder={onSelectFolder}
              currentPathCrumbs={[...currentPathCrumbs, child.name]}
              selectedFolderId={selectedFolderId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
