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
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Eye,
  FileText,
  Code2,
  Search,
  Layers,
  Plus,
  Trash2,
  Sparkles,
  Database,
  SlidersHorizontal,
  Settings2,
  RefreshCw,
} from 'lucide-react';
import { supabaseService } from '../services/supabase';
import { GitHubBranchItem, GitHubFileItem, GitHubRepoItem } from '../types';
import { RunJobModal } from '../components/RunJobModal';
import { CodeViewerModal } from '../components/CodeViewerModal';
import { ConnectRepoModal } from '../components/ConnectRepoModal';

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
  sha?: string;
}

export const Repositories: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'manage'>('explorer');
  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('master');
  const [patToken, setPatToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTreeLoading, setIsTreeLoading] = useState<boolean>(false);

  // Folder Hierarchy State
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [currentFolder, setCurrentFolder] = useState<TreeNode | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [manageSearch, setManageSearch] = useState<string>('');

  // Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [viewingFile, setViewingFile] = useState<{
    fileName: string;
    filePath: string;
    content: string;
    language: string;
  } | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState<boolean>(false);
  const [targetEntryPoint, setTargetEntryPoint] = useState<string>('main.py');

  const fetchRepositories = async () => {
    setIsLoading(true);
    try {
      const [fetchedRepos, creds] = await Promise.all([
        supabaseService.getRepositories(),
        supabaseService.getCredentials(),
      ]);

      const repoList = Array.isArray(fetchedRepos) ? fetchedRepos : [];
      setRepos(repoList);

      // Check for user's saved GITHUB_PAT token in Credential Vault
      const foundToken = creds?.find((c: any) => c.credential_type === 'GITHUB_PAT');
      if (foundToken && foundToken.encrypted_value) {
        setPatToken(foundToken.encrypted_value);
      }

      if (repoList.length > 0) {
        // If current selected repo is still valid, keep it; otherwise select first
        if (!selectedRepo || !repoList.some((r: any) => r.id === selectedRepo.id || r.repository_name === selectedRepo.repository_name)) {
          setSelectedRepo(repoList[0]);
          setSelectedBranch(repoList[0].default_branch || 'master');
        }
      } else {
        setSelectedRepo(null);
        setTreeData([]);
        setCurrentFolder(null);
      }
    } catch (err) {
      console.error('Failed to load repositories from Supabase', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  // Fetch Live Tree from GitHub API for Selected Repository
  const loadRepoTree = () => {
    if (!selectedRepo) {
      setTreeData([]);
      setCurrentFolder(null);
      return;
    }

    const owner = selectedRepo.github_owner || selectedRepo.owner || '';
    const name = selectedRepo.repository_name || selectedRepo.name || '';
    const branch = selectedBranch || selectedRepo.default_branch || 'master';

    if (!owner || !name) return;

    setIsTreeLoading(true);

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (patToken.trim()) {
      headers.Authorization = `Bearer ${patToken.trim()}`;
    }

    fetch(`https://api.github.com/repos/${owner}/${name}/git/trees/${branch}?recursive=1`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.tree && Array.isArray(data.tree)) {
          const parsed = buildTreeFromGitHubGitTree(data.tree);
          setTreeData(parsed);
          setCurrentFolder(parsed[0] || null);
          setBreadcrumbs([selectedRepo.repository_name || name, parsed[0]?.name || 'Workspace']);

          // Auto-expand top level folders
          const autoExpand: Record<string, boolean> = {};
          parsed.forEach((n) => {
            if (n.type === 'folder') autoExpand[n.id] = true;
          });
          setExpandedFolders(autoExpand);
        } else {
          // Fallback to /contents
          fetch(`https://api.github.com/repos/${owner}/${name}/contents`, { headers })
            .then((res) => (res.ok ? res.json() : []))
            .then((contents) => {
              if (Array.isArray(contents)) {
                const flatNodes: TreeNode[] = contents.map((c: any) => ({
                  id: c.path,
                  name: c.name,
                  path: c.path,
                  type: c.type === 'dir' ? 'folder' : 'file',
                  fileType: c.name.endsWith('.py') ? 'python' : c.name.endsWith('.json') ? 'json' : 'text',
                  isPython: c.name.endsWith('.py'),
                  size: c.size ? `${(c.size / 1024).toFixed(1)} KB` : undefined,
                  children: c.type === 'dir' ? [] : undefined,
                }));
                setTreeData(flatNodes);
                setCurrentFolder({ id: 'root', name: name, path: '', type: 'folder', children: flatNodes });
                setBreadcrumbs([name]);
              } else {
                setTreeData([]);
              }
            })
            .catch(() => {
              setTreeData([]);
            });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch tree from GitHub API', err);
        setTreeData([]);
      })
      .finally(() => {
        setIsTreeLoading(false);
      });
  };

  useEffect(() => {
    loadRepoTree();
  }, [selectedRepo, selectedBranch, patToken]);

  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleSelectFolder = (node: TreeNode, pathCrumbs: string[]) => {
    setCurrentFolder(node);
    setBreadcrumbs(pathCrumbs);
  };

  const handleOpenFile = async (fileNode: TreeNode) => {
    const lang =
      fileNode.fileType ||
      (fileNode.name.endsWith('.py')
        ? 'python'
        : fileNode.name.endsWith('.json')
        ? 'json'
        : 'text');

    if (selectedRepo) {
      const owner = selectedRepo.github_owner || selectedRepo.owner || '';
      const name = selectedRepo.repository_name || selectedRepo.name || '';
      const branch = selectedBranch || selectedRepo.default_branch || 'master';

      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
      };
      if (patToken.trim()) {
        headers.Authorization = `Bearer ${patToken.trim()}`;
      }

      try {
        const ghRes = await fetch(
          `https://api.github.com/repos/${owner}/${name}/contents/${fileNode.path}?ref=${branch}`,
          { headers }
        );
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          if (ghData.content) {
            const decoded = atob(ghData.content.replace(/\s/g, ''));
            setViewingFile({
              fileName: fileNode.name,
              filePath: fileNode.path,
              content: decoded,
              language: lang,
            });
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch live file from GitHub API', err);
      }
    }

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

  const handleDeleteRepo = async (repoId?: number, repoName?: string) => {
    if (!repoId) return;
    if (!window.confirm(`Disconnect repository "${repoName || 'selected'}" from your workspace?`)) return;
    await supabaseService.deleteRepository(repoId);
    await fetchRepositories();
  };

  const handleOpenInExplorer = (repo: GitHubRepoItem) => {
    setSelectedRepo(repo);
    setSelectedBranch(repo.default_branch || 'master');
    setActiveTab('explorer');
  };

  const currentItems = currentFolder?.children || treeData || [];
  const filteredItems = currentItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredManageRepos = repos.filter(
    (r) =>
      r.repository_name.toLowerCase().includes(manageSearch.toLowerCase()) ||
      r.github_owner.toLowerCase().includes(manageSearch.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(manageSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FolderGit2 className="h-6 w-6 text-purple-600" />
            Automation Repository & Bot Explorer
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Multi-tenant bot workspace • Connect multiple repositories via GitHub PAT • Inspect live code & dispatch bots
          </p>
        </div>

        {/* Tab Switcher & Quick Add Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-purple-200 bg-white p-1 shadow-2xs">
            <button
              onClick={() => setActiveTab('explorer')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'explorer'
                  ? 'bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-purple-800'
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span>Bot Explorer</span>
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'manage'
                  ? 'bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-purple-800'
              }`}
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Manage Repos ({repos.length})</span>
            </button>
          </div>

          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4 py-2 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Connect Repos (PAT)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BOT EXPLORER */}
      {activeTab === 'explorer' && (
        <>
          {repos.length === 0 ? (
            /* Clean Empty State when no repository has been connected yet */
            <div className="rounded-3xl border border-purple-200/80 bg-white/90 p-12 text-center shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl space-y-5">
              <div className="mx-auto w-16 h-16 rounded-3xl bg-purple-100/80 flex items-center justify-center text-purple-700 shadow-purple-sm">
                <FolderGit2 className="h-8 w-8" />
              </div>

              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900">
                  No Repositories Connected Yet
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Connect your GitHub account with a Personal Access Token (PAT) to select and load only the bot repositories you want in your private workspace.
                </p>
              </div>

              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-6 py-2.5 text-xs font-bold text-white shadow-purple-md hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer"
              >
                <Key className="h-4 w-4" />
                <span>Connect GitHub Account (PAT)</span>
              </button>
            </div>
          ) : (
            /* Repository Explorer Workspace */
            <div className="space-y-4">
              {/* Repository Selector Sub-Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 border border-purple-100 p-3 rounded-2xl shadow-2xs backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600">Active Repository:</span>
                  <div className="flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50/40 px-3 py-1 text-xs font-bold text-slate-800">
                    <Database className="h-3.5 w-3.5 text-purple-600" />
                    <select
                      value={selectedRepo?.id || ''}
                      onChange={(e) => {
                        const found = repos.find((r) => String(r.id) === e.target.value);
                        if (found) {
                          setSelectedRepo(found);
                          setSelectedBranch(found.default_branch || 'master');
                        }
                      }}
                      className="bg-transparent focus:outline-none cursor-pointer text-xs font-bold text-slate-800"
                    >
                      {repos.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.github_owner}/{r.repository_name} ({r.default_branch || 'master'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={loadRepoTree}
                    title="Re-sync repository files from GitHub"
                    className="flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-white border border-purple-200 px-3 py-1 rounded-full shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Sync Tree</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('manage')}
                    className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-purple-900 bg-white border border-purple-200 px-3 py-1 rounded-full shadow-2xs cursor-pointer"
                  >
                    <SlidersHorizontal className="h-3 w-3 text-purple-600" />
                    <span>Manage Repos</span>
                  </button>
                </div>
              </div>

              {/* Explorer Grid */}
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
                    {isTreeLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <span className="animate-spin rounded-full h-5 w-5 border-2 border-purple-600 border-t-transparent" />
                        <span className="text-xs">Fetching repository tree from GitHub...</span>
                      </div>
                    ) : treeData.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No files found in repository {selectedRepo?.repository_name}.
                      </div>
                    ) : (
                      <>
                        {/* Root Node */}
                        <div
                          onClick={() =>
                            handleSelectFolder(
                              { id: 'root', name: selectedRepo?.repository_name || 'Bots', path: '', type: 'folder', children: treeData },
                              [selectedRepo?.repository_name || 'Bots']
                            )
                          }
                          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-purple-900 font-bold hover:bg-purple-50 cursor-pointer"
                        >
                          <FolderOpen className="h-4 w-4 text-purple-600 shrink-0" />
                          <span>📁 {selectedRepo?.repository_name} (Root)</span>
                        </div>

                        {/* Recursive Tree Render */}
                        {treeData.map((node) => (
                          <RenderTreeItem
                            key={node.id}
                            node={node}
                            level={1}
                            expandedFolders={expandedFolders}
                            onToggle={toggleFolder}
                            onSelectFolder={handleSelectFolder}
                            currentPathCrumbs={[selectedRepo?.repository_name || 'Bots', node.name]}
                            selectedFolderId={currentFolder?.id}
                          />
                        ))}
                      </>
                    )}
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
                                  <div
                                    className="flex items-center justify-end gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
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
                                        onClick={() =>
                                          handleSelectFolder(item, [...breadcrumbs, item.name])
                                        }
                                        className="flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
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
            </div>
          )}
        </>
      )}

      {/* TAB 2: MANAGE REPOSITORIES SECTION */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-purple-100 bg-white/90 p-6 shadow-[0_4px_20px_rgba(111,83,163,0.03)] backdrop-blur-xl space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-purple-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="h-4 w-4 text-purple-600" />
                  <span>Connected GitHub Repositories</span>
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                    {repos.length} Active
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Manage repositories connected to your isolated workspace. All changes are saved in Supabase.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                  <input
                    type="text"
                    placeholder="Search connected repos..."
                    value={manageSearch}
                    onChange={(e) => setManageSearch(e.target.value)}
                    className="w-full rounded-full border border-purple-200 bg-purple-50/40 pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:border-purple-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => setIsConnectModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F53A3] to-[#4F3A8A] px-4 py-1.5 text-xs font-bold text-white shadow-purple-sm hover:from-[#5E4391] hover:to-[#3F2B75] transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Multiple Repos</span>
                </button>
              </div>
            </div>

            {/* Repositories Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-purple-50/50 text-slate-600 uppercase tracking-wider font-bold border-b border-purple-100 text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Repository</th>
                    <th className="px-4 py-3">Default Branch</th>
                    <th className="px-4 py-3">Visibility</th>
                    <th className="px-4 py-3">Database ID</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50 text-slate-700">
                  {filteredManageRepos.length > 0 ? (
                    filteredManageRepos.map((repo) => {
                      const isSelected = selectedRepo?.id === repo.id;
                      return (
                        <tr key={repo.id} className="hover:bg-purple-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                                <FolderGit2 className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900 font-mono">
                                    {repo.github_owner}/{repo.repository_name}
                                  </span>
                                  {isSelected && (
                                    <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.2 text-[9.5px] font-bold border border-purple-200">
                                      Active in Explorer
                                    </span>
                                  )}
                                </div>
                                {repo.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                    {repo.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="flex items-center gap-1 font-mono text-purple-700 font-semibold bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 w-fit">
                              <GitBranch className="h-3 w-3" />
                              <span>{repo.default_branch || 'master'}</span>
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                repo.is_private
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {repo.is_private ? 'Private' : 'Public'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-slate-400 text-[11px]">
                            #{repo.id}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenInExplorer(repo)}
                                className="flex items-center gap-1 rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-bold text-purple-700 hover:bg-purple-50 shadow-2xs transition-colors cursor-pointer"
                              >
                                <FolderOpen className="h-3.5 w-3.5" />
                                <span>Browse Bots</span>
                              </button>

                              <a
                                href={repo.repository_url || `https://github.com/${repo.github_owner}/${repo.repository_name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-full border border-purple-200 bg-white text-slate-500 hover:text-purple-700 hover:bg-purple-50 shadow-2xs transition-colors cursor-pointer"
                                title="Open on GitHub"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>

                              <button
                                onClick={() => handleDeleteRepo(repo.id, repo.repository_name)}
                                className="p-1.5 rounded-full border border-purple-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 shadow-2xs transition-colors cursor-pointer"
                                title="Disconnect Repository"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500 font-medium">
                        {repos.length === 0
                          ? 'No repositories connected yet. Click "+ Add Multiple Repos" to connect your GitHub repositories.'
                          : `No repositories matched "${manageSearch}".`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Connect Custom GitHub Repository Modal */}
      <ConnectRepoModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onRepoConnected={fetchRepositories}
      />

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
  if (!isFolder) return null;

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

// Helper: Parse GitHub recursive tree JSON into nested TreeNodes
function buildTreeFromGitHubGitTree(gitTreeItems: any[]): TreeNode[] {
  const rootMap: Record<string, TreeNode> = {};

  gitTreeItems.forEach((item) => {
    const parts = item.path.split('/');
    let currentPath = '';

    parts.forEach((part: string, idx: number) => {
      const isLast = idx === parts.length - 1;
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!rootMap[currentPath]) {
        const isFile = isLast && item.type === 'blob';
        const isPy = isFile && part.endsWith('.py');
        const isJson = isFile && part.endsWith('.json');

        rootMap[currentPath] = {
          id: currentPath.replace(/[\/\s]/g, '-'),
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          fileType: isPy ? 'python' : isJson ? 'json' : 'text',
          isPython: isPy,
          size: item.size ? `${(item.size / 1024).toFixed(1)} KB` : undefined,
          sha: item.sha,
          children: isFile ? undefined : [],
        };

        if (parentPath && rootMap[parentPath] && rootMap[parentPath].children) {
          rootMap[parentPath].children!.push(rootMap[currentPath]);
        }
      }
    });
  });

  return Object.values(rootMap).filter((node) => !node.path.includes('/'));
}
