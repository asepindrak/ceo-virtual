'use client';

import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  Terminal,
  ExternalLink,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Power,
  Server,
  Layers,
  X,
  Sparkles,
  Globe,
  GitBranch,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface WorkspaceProject {
  name: string;
  folderPath: string;
  filesCount: number;
  lastModified: number;
  files: { relativePath: string; size: number }[];
}

interface WorkspaceArtifact {
  name: string;
  category: string;
  folderPath: string;
  filesCount: number;
  lastModified: number;
  files: { relativePath: string; size: number }[];
}

interface WorkspaceModalProps {
  onClose: () => void;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [homeDir, setHomeDir] = useState<string>('~/.vigent');
  const [workspacesDir, setWorkspacesDir] = useState<string>('~/.vigent/projects');
  const [projectsDir, setProjectsDir] = useState<string>('~/.vigent/projects');
  const [artifactsDir, setArtifactsDir] = useState<string>('~/.vigent/artifacts');
  const [port, setPort] = useState<number>(28483);
  const [autorun, setAutorun] = useState<boolean>(false);

  // View Mode: 'projects' vs 'artifacts' (Option 3 Hybrid Separation)
  const [workspaceView, setWorkspaceView] = useState<'projects' | 'artifacts'>('projects');

  // Projects State
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<WorkspaceProject | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  // Artifacts State
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<WorkspaceArtifact | null>(null);
  const [selectedArtifactFile, setSelectedArtifactFile] = useState<string | null>(null);
  const [artifactFileContent, setArtifactFileContent] = useState<string | null>(null);
  const [artifactFileLoading, setArtifactFileLoading] = useState(false);

  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // GitHub Clone Options State
  const [projectMode, setProjectMode] = useState<'clone_github' | 'scaffold'>('clone_github');
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const [gitCustomFolder, setGitCustomFolder] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [cloneStatus, setCloneStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchWorkspaceData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workspace');
      const data = await res.json();
      if (data.success) {
        setHomeDir(data.homeDir);
        setWorkspacesDir(data.workspacesDir || '~/.vigent/projects');
        setProjectsDir(data.projectsDir || '~/.vigent/projects');
        setArtifactsDir(data.artifactsDir || '~/.vigent/artifacts');
        setPort(data.port);
        setAutorun(data.autorunAtStartup);
        setProjects(data.projects || []);
        setArtifacts(data.artifacts || []);
        if (data.projects && data.projects.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0]);
        }
        if (data.artifacts && data.artifacts.length > 0 && !selectedArtifact) {
          setSelectedArtifact(data.artifacts[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load workspace info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const handleOpenExplorer = async (targetPath?: string) => {
    try {
      await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open_folder', targetPath }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAutorun = async () => {
    const nextState = !autorun;
    setAutorun(nextState);
    try {
      await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_autorun', enable: nextState }),
      });
    } catch (err) {
      console.error(err);
      setAutorun(!nextState);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_task_code',
          projectName: newProjectName.trim(),
          taskTitle: `Proyek Baru: ${newProjectName.trim()}`,
          taskType: 'coding',
          agentName: 'Autonomous Agent',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewProjectName('');
        setIsCreatingProject(false);
        await fetchWorkspaceData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGitUrlChange = (val: string) => {
    setGitRepoUrl(val);
    const match = val.match(/(?:https?:\/\/(?:www\.)?github\.com\/|git@github\.com:)([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
    if (match) {
      let rawRepo = match[2].replace(/[),;!?>]+$/, '');
      let repo = rawRepo.replace(/\.git$/i, '');
      if (repo.endsWith('/')) repo = repo.slice(0, -1);
      const clean = repo.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '');
      if (clean) {
        setGitCustomFolder(clean);
      }
    }
  };

  const handleCloneRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitRepoUrl.trim() || isCloning) return;
    setIsCloning(true);
    setCloneStatus(null);
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clone_repo',
          repoUrl: gitRepoUrl.trim(),
          folderName: gitCustomFolder.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCloneStatus({
          type: 'success',
          message: `Berhasil meng-clone "${data.projectName}" (${data.filesCount} file) ke ~/.vigent/workspaces/${data.projectName}`,
        });
        setGitRepoUrl('');
        setGitCustomFolder('');
        await fetchWorkspaceData();
        if (data.projectName) {
          const resUpdated = await fetch('/api/workspace');
          const dataUpdated = await resUpdated.json();
          if (dataUpdated.success && dataUpdated.projects) {
            const found = dataUpdated.projects.find((p: WorkspaceProject) => p.name === data.projectName);
            if (found) {
              setSelectedProject(found);
              if (found.files && found.files.length > 0) {
                handleSelectFile(found.name, found.files[0].relativePath);
              }
            }
          }
        }
        setTimeout(() => {
          setIsCreatingProject(false);
          setCloneStatus(null);
        }, 2500);
      } else {
        setCloneStatus({
          type: 'error',
          message: data.error || data.message || 'Gagal meng-clone repository GitHub',
        });
      }
    } catch (err: any) {
      setCloneStatus({
        type: 'error',
        message: err.message || 'Terjadi kesalahan jaringan saat clone',
      });
    } finally {
      setIsCloning(false);
    }
  };

  const handleSelectFile = async (projectName: string, filePath: string) => {
    setSelectedFile(filePath);
    setFileLoading(true);
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_file', projectName, filePath }),
      });
      const data = await res.json();
      if (data.success) {
        setFileContent(data.content);
      } else {
        setFileContent('// File not found or empty');
      }
    } catch {
      setFileContent('// Error reading file content');
    } finally {
      setFileLoading(false);
    }
  };

  const handleSelectArtifactFile = async (category: string, artifactName: string, filePath: string) => {
    setSelectedArtifactFile(filePath);
    setArtifactFileLoading(true);
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_artifact', category, artifactFolder: artifactName, filePath }),
      });
      const data = await res.json();
      if (data.success) {
        setArtifactFileContent(data.content);
      } else {
        setArtifactFileContent('// Artifact file empty or not found');
      }
    } catch {
      setArtifactFileContent('// Error reading artifact file');
    } finally {
      setArtifactFileLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const ps1Cmd = 'irm https://raw.githubusercontent.com/asepindrak/vigent/main/install.ps1 | iex';
  const bashCmd = 'curl -fsSL https://raw.githubusercontent.com/asepindrak/vigent/main/install.sh | bash';

  return (
    <div className="fixed inset-0 bg-[#2c231c]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-[#2c231c] animate-in fade-in duration-200">
      <div className="bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#fdeed9] border border-[#e8ba8c] text-[#c85a2b]">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#2c231c]">CEO Virtual CLI & Autonomous Workspaces</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#eef2f8] text-[#2d4263] border border-[#c4d1e4] font-bold">
                  Port :{port}
                </span>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                    autorun
                      ? 'bg-[#e6f4f2] text-[#1f6860] border-[#a2d8d0]'
                      : 'bg-[#ede2d1] text-[#615042] border-[#d6c5ad]'
                  }`}
                >
                  {autorun ? '● Autorun ON' : '○ Autorun OFF'}
                </span>
              </div>
              <p className="text-xs text-[#786653] font-mono">
                Home: <span className="text-[#c85a2b] font-semibold">{workspacesDir}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenExplorer()}
              className="px-3 py-1.5 bg-[#c85a2b] hover:bg-[#b54d22] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              title="Buka Folder di Windows Explorer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Explorer</span>
            </button>
            <button
              onClick={fetchWorkspaceData}
              className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1-Line CLI Installers Banner */}
        <div className="bg-[#f4ebe1] border-b border-[#d6c5ad] p-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Windows PowerShell */}
          <div className="bg-[#fffdf9] border border-[#d6c5ad] rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-[#c85a2b] block mb-0.5">
                Windows PowerShell 1-Click Install:
              </span>
              <code className="text-[#2c231c] bg-[#fbf7ee] px-1 py-0.5 rounded border border-[#d6c5ad] font-mono text-[11px] select-all">{ps1Cmd}</code>
            </div>
            <button
              onClick={() => copyToClipboard(ps1Cmd, 'ps1')}
              className="shrink-0 p-1.5 bg-[#f4ebe1] hover:bg-[#ede2d1] text-[#2c231c] rounded-lg transition-colors border border-[#d6c5ad]"
              title="Copy Command"
            >
              {copiedCmd === 'ps1' ? <Check className="w-3.5 h-3.5 text-[#288279]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Linux / Mac Bash */}
          <div className="bg-[#fffdf9] border border-[#d6c5ad] rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-[#ab7a1a] block mb-0.5">
                Linux / macOS 1-Click Install:
              </span>
              <code className="text-[#2c231c] bg-[#fbf7ee] px-1 py-0.5 rounded border border-[#d6c5ad] font-mono text-[11px] select-all">{bashCmd}</code>
            </div>
            <button
              onClick={() => copyToClipboard(bashCmd, 'bash')}
              className="shrink-0 p-1.5 bg-[#f4ebe1] hover:bg-[#ede2d1] text-[#2c231c] rounded-lg transition-colors border border-[#d6c5ad]"
              title="Copy Command"
            >
              {copiedCmd === 'bash' ? <Check className="w-3.5 h-3.5 text-[#288279]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Autorun Toggle & Settings Sub-bar */}
        <div className="bg-[#faf5eb] border-b border-[#d6c5ad] px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#c85a2b]" />
              <span className="text-[#2c231c] font-semibold">Auto-start on Windows/PC boot:</span>
            </div>
            <button
              onClick={handleToggleAutorun}
              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 border ${
                autorun
                  ? 'bg-[#e6f4f2] text-[#1f6860] border-[#a2d8d0] hover:bg-[#d5eee9]'
                  : 'bg-[#fffdf9] text-[#786653] border-[#d6c5ad] hover:bg-[#ede2d1]'
              }`}
            >
              <Power className="w-3 h-3" />
              <span>{autorun ? 'Aktif (Startup Enabled)' : 'Non-aktif (Disabled)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsCreatingProject(!isCreatingProject);
                setCloneStatus(null);
              }}
              className="px-2.5 py-1 bg-[#c85a2b] hover:bg-[#b54d22] text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Proyek</span>
            </button>
          </div>
        </div>

        {/* New Project Creator Drawer with GitHub Clone Option */}
        {isCreatingProject && (
          <div className="bg-[#fffdf9] p-3.5 border-b border-[#d6c5ad] flex flex-col gap-3 text-xs animate-in slide-in-from-top-2 duration-150">
            {/* Mode Selector Tabs */}
            <div className="flex items-center justify-between border-b border-[#d6c5ad]/60 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProjectMode('clone_github');
                    setCloneStatus(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-xs border ${
                    projectMode === 'clone_github'
                      ? 'bg-[#c85a2b] text-white border-[#c85a2b] shadow-xs'
                      : 'bg-[#faf5eb] text-[#786653] border-[#d6c5ad] hover:text-[#2c231c]'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Clone dari GitHub</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProjectMode('scaffold');
                    setCloneStatus(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-xs border ${
                    projectMode === 'scaffold'
                      ? 'bg-[#c85a2b] text-white border-[#c85a2b] shadow-xs'
                      : 'bg-[#faf5eb] text-[#786653] border-[#d6c5ad] hover:text-[#2c231c]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Scaffold Proyek Baru</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsCreatingProject(false);
                  setCloneStatus(null);
                }}
                className="text-[#786653] hover:text-[#2c231c] text-xs font-semibold px-2 py-1"
              >
                Tutup
              </button>
            </div>

            {/* Form: Clone GitHub */}
            {projectMode === 'clone_github' && (
              <form onSubmit={handleCloneRepo} className="flex flex-col gap-2.5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <div className="md:col-span-8 flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[#786653]">Link Repository GitHub</label>
                    <input
                      type="text"
                      required
                      disabled={isCloning}
                      placeholder="https://github.com/facebook/react (atau git@github.com:...)"
                      value={gitRepoUrl}
                      onChange={(e) => handleGitUrlChange(e.target.value)}
                      className="w-full bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-3 py-1.5 text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b]"
                    />
                  </div>

                  <div className="md:col-span-4 flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[#786653]">Nama Folder di Workspaces (Opsional)</label>
                    <input
                      type="text"
                      disabled={isCloning}
                      placeholder="auto (misal: react)"
                      value={gitCustomFolder}
                      onChange={(e) => setGitCustomFolder(e.target.value)}
                      className="bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-3 py-1.5 text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="text-[11px] text-[#786653]">
                    💡 Proyek akan di-clone langsung ke:{' '}
                    <code className="bg-[#f4ebe1] px-1.5 py-0.5 rounded font-mono text-[#c85a2b] font-bold">
                      ~/.vigent/workspaces/{gitCustomFolder || '<nama-repo>'}
                    </code>
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isCloning || !gitRepoUrl.trim()}
                      className="px-3.5 py-1.5 bg-[#c85a2b] hover:bg-[#b54d22] disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      {isCloning ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sedang Meng-clone Repo...</span>
                        </>
                      ) : (
                        <>
                          <GitBranch className="w-3.5 h-3.5" />
                          <span>Clone ke Workspaces</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isCloning}
                      onClick={() => setIsCreatingProject(false)}
                      className="px-2.5 py-1.5 text-[#786653] hover:text-[#2c231c]"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Form: Scaffold Template Baru */}
            {projectMode === 'scaffold' && (
              <form onSubmit={handleCreateProject} className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-[#786653]">Nama Folder Proyek Baru</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="misal: payment-service-api"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="flex-1 bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-3 py-1.5 text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#c85a2b] hover:bg-[#b54d22] text-white rounded-lg font-semibold flex items-center gap-1 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Folder Proyek</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingProject(false)}
                    className="px-2.5 py-1.5 text-[#786653] hover:text-[#2c231c]"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}

            {/* Clone Status Alert */}
            {cloneStatus && (
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs animate-in fade-in ${
                  cloneStatus.type === 'success'
                    ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]'
                    : 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]'
                }`}
              >
                {cloneStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#059669]" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#dc2626]" />
                )}
                <span className="font-medium">{cloneStatus.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Main Body: Projects / Artifacts List (Left) + Viewer & Preview (Right) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Column: View Mode Switcher + List */}
          <div className="md:col-span-4 border-r border-[#d6c5ad] bg-[#f4ebe1] p-3 overflow-y-auto space-y-2">
            {/* View Mode Switcher Tab (Option 3 Hybrid) */}
            <div className="flex items-center gap-1 bg-[#ede2d1] p-1 rounded-xl mb-2 text-xs">
              <button
                onClick={() => setWorkspaceView('projects')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  workspaceView === 'projects'
                    ? 'bg-[#fffdf9] text-[#c85a2b] shadow-xs'
                    : 'text-[#786653] hover:text-[#2c231c]'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Proyek ({projects.length})</span>
              </button>
              <button
                onClick={() => setWorkspaceView('artifacts')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  workspaceView === 'artifacts'
                    ? 'bg-[#fffdf9] text-[#4338ca] shadow-xs'
                    : 'text-[#786653] hover:text-[#2c231c]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Artefak ({artifacts.length})</span>
              </button>
            </div>

            {/* PROJECTS LIST VIEW */}
            {workspaceView === 'projects' && (
              <>
                <div className="text-[11px] font-bold text-[#786653] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Folder Repositori & Codebase ({projects.length})</span>
                </div>

                {projects.length === 0 && (
                  <div className="text-center py-8 text-[#9c8976] text-xs italic">
                    Belum ada folder proyek di {projectsDir}
                  </div>
                )}

                {projects.map((proj) => {
                  const isSelected = selectedProject?.name === proj.name;
                  return (
                    <div
                      key={proj.name}
                      onClick={() => {
                        setSelectedProject(proj);
                        if (proj.files.length > 0) {
                          handleSelectFile(proj.name, proj.files[0].relativePath);
                        } else {
                          setSelectedFile(null);
                          setFileContent(null);
                        }
                      }}
                      className={`p-3 rounded-xl cursor-pointer border transition-all text-xs ${
                        isSelected
                          ? 'bg-[#fffdf9] border-2 border-[#c85a2b] shadow-md'
                          : 'bg-[#fffdf9] border-[#d6c5ad] hover:bg-[#faf5eb]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 font-bold text-[#2c231c] truncate">
                          {isSelected ? (
                            <FolderOpen className="w-4 h-4 text-[#c85a2b] shrink-0" />
                          ) : (
                            <Folder className="w-4 h-4 text-[#288279] shrink-0" />
                          )}
                          <span className="truncate">{proj.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenExplorer(proj.folderPath);
                          }}
                          className="p-1 text-[#786653] hover:text-[#c85a2b] hover:bg-[#ede2d1] rounded"
                          title="Buka Folder Ini di Windows Explorer"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#786653] font-mono">
                        <span>{proj.filesCount} file dibuat</span>
                        <span>{new Date(proj.lastModified).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ARTIFACTS LIST VIEW */}
            {workspaceView === 'artifacts' && (
              <>
                <div className="text-[11px] font-bold text-[#786653] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Task Deliverables & Specs ({artifacts.length})</span>
                  <button
                    onClick={() => handleOpenExplorer(artifactsDir)}
                    className="text-[10px] text-[#4338ca] hover:underline font-semibold flex items-center gap-0.5"
                  >
                    <span>Folder Artefak</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>

                {artifacts.length === 0 && (
                  <div className="text-center py-8 text-[#9c8976] text-xs italic">
                    Belum ada artefak task di {artifactsDir}
                  </div>
                )}

                {artifacts.map((art) => {
                  const isSelected = selectedArtifact?.name === art.name;
                  return (
                    <div
                      key={art.name}
                      onClick={() => {
                        setSelectedArtifact(art);
                        if (art.files.length > 0) {
                          handleSelectArtifactFile(art.category, art.name, art.files[0].relativePath);
                        } else {
                          setSelectedArtifactFile(null);
                          setArtifactFileContent(null);
                        }
                      }}
                      className={`p-3 rounded-xl cursor-pointer border transition-all text-xs ${
                        isSelected
                          ? 'bg-[#fffdf9] border-2 border-[#4338ca] shadow-md'
                          : 'bg-[#fffdf9] border-[#d6c5ad] hover:bg-[#faf5eb]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 font-bold text-[#2c231c] truncate">
                          <FileText className="w-4 h-4 text-[#4338ca] shrink-0" />
                          <span className="truncate">{art.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenExplorer(art.folderPath);
                          }}
                          className="p-1 text-[#786653] hover:text-[#4338ca] hover:bg-[#ede2d1] rounded"
                          title="Buka Folder Artefak Ini di Explorer"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#786653] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-[#eef2ff] text-[#4338ca] font-medium border border-[#c7d2fe]/60">
                          {art.category.replace(/^company-/, '')}
                        </span>
                        <span>{art.filesCount} file deliverable</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Right Column: Files & Code / Artifact Viewer */}
          <div className="md:col-span-8 flex flex-col bg-[#fffdf9] overflow-hidden">
            {/* PROJECTS VIEWER */}
            {workspaceView === 'projects' && (
              selectedProject ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Project Subheader */}
                  <div className="p-3 bg-[#f4ebe1] border-b border-[#d6c5ad] flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-[#2c231c] text-xs flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#c85a2b]" />
                        {selectedProject.name}
                      </h3>
                      <p className="text-[10px] text-[#786653] font-mono truncate">{selectedProject.folderPath}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(selectedProject.files.some((f) => f.relativePath === 'index.html') ||
                        selectedProject.name === 'shadowmove-landing-page') && (
                        <a
                          href="/preview/shadowmove/index.html"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-[#1f6860] hover:bg-[#164e48] text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors shadow-xs"
                          title="Buka preview website di browser baru"
                        >
                          <Globe className="w-3 h-3" />
                          <span>Preview Browser</span>
                        </a>
                      )}
                      <button
                        onClick={() => handleOpenExplorer(selectedProject.folderPath)}
                        className="px-2.5 py-1 bg-[#fffdf9] hover:bg-[#ede2d1] text-[#2c231c] text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors border border-[#d6c5ad]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Buka Folder</span>
                      </button>
                    </div>
                  </div>

                  {/* File list tabs */}
                  <div className="bg-[#faf5eb] border-b border-[#d6c5ad] px-3 py-1 flex items-center gap-1 overflow-x-auto text-xs">
                    {selectedProject.files.map((file) => {
                      const isSelected = selectedFile === file.relativePath;
                      return (
                        <button
                          key={file.relativePath}
                          onClick={() => handleSelectFile(selectedProject.name, file.relativePath)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-[#fffdf9] text-[#c85a2b] border border-[#d6c5ad] font-bold shadow-xs'
                              : 'text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1]'
                          }`}
                        >
                          <FileCode className="w-3 h-3 text-[#c85a2b]" />
                          <span>{file.relativePath}</span>
                        </button>
                      );
                    })}
                    {selectedProject.files.length === 0 && (
                      <span className="text-[11px] text-[#9c8976] italic py-1">Belum ada file di folder ini</span>
                    )}
                  </div>

                  {/* File Code Content Preview */}
                  <div className="flex-1 p-3 overflow-auto bg-[#fbf7ee] text-xs font-mono text-[#2c231c]">
                    {fileLoading ? (
                      <div className="flex items-center justify-center h-full text-[#9c8976]">
                        Memuat file dari disk...
                      </div>
                    ) : fileContent !== null ? (
                      <pre className="text-[#2c231c] leading-relaxed whitespace-pre font-mono">
                        {fileContent}
                      </pre>
                    ) : (
                      <div className="flex items-center justify-center h-full text-[#9c8976] italic">
                        Pilih file di atas untuk melihat isi kode asli dari disk
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#9c8976] text-xs italic">
                  Pilih sebuah proyek di sebelah kiri untuk melihat file yang di-generate.
                </div>
              )
            )}

            {/* ARTIFACTS VIEWER */}
            {workspaceView === 'artifacts' && (
              selectedArtifact ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Artifact Subheader */}
                  <div className="p-3 bg-[#f4ebe1] border-b border-[#d6c5ad] flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-[#2c231c] text-xs flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#4338ca]" />
                        {selectedArtifact.name}
                      </h3>
                      <p className="text-[10px] text-[#786653] font-mono truncate">{selectedArtifact.folderPath}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#4338ca] border border-[#c7d2fe] font-bold">
                        📑 Artefak Task
                      </span>
                      <button
                        onClick={() => handleOpenExplorer(selectedArtifact.folderPath)}
                        className="px-2.5 py-1 bg-[#fffdf9] hover:bg-[#ede2d1] text-[#2c231c] text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors border border-[#d6c5ad]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Buka Folder</span>
                      </button>
                    </div>
                  </div>

                  {/* Artifact File list tabs */}
                  <div className="bg-[#faf5eb] border-b border-[#d6c5ad] px-3 py-1 flex items-center gap-1 overflow-x-auto text-xs">
                    {selectedArtifact.files.map((file) => {
                      const isSelected = selectedArtifactFile === file.relativePath;
                      return (
                        <button
                          key={file.relativePath}
                          onClick={() => handleSelectArtifactFile(selectedArtifact.category, selectedArtifact.name, file.relativePath)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-[#fffdf9] text-[#4338ca] border border-[#d6c5ad] font-bold shadow-xs'
                              : 'text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1]'
                          }`}
                        >
                          <FileCode className="w-3 h-3 text-[#4338ca]" />
                          <span>{file.relativePath}</span>
                        </button>
                      );
                    })}
                    {selectedArtifact.files.length === 0 && (
                      <span className="text-[11px] text-[#9c8976] italic py-1">Belum ada file di folder artefak ini</span>
                    )}
                  </div>

                  {/* Artifact Content Preview */}
                  <div className="flex-1 p-3 overflow-auto bg-[#fbf7ee] text-xs font-mono text-[#2c231c]">
                    {artifactFileLoading ? (
                      <div className="flex items-center justify-center h-full text-[#9c8976]">
                        Memuat isi artefak dari disk...
                      </div>
                    ) : artifactFileContent !== null ? (
                      <pre className="text-[#2c231c] leading-relaxed whitespace-pre font-mono">
                        {artifactFileContent}
                      </pre>
                    ) : (
                      <div className="flex items-center justify-center h-full text-[#9c8976] italic">
                        Pilih file artefak di atas untuk membaca dokumen deliverable.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#9c8976] text-xs italic">
                  Pilih artefak tugas di sebelah kiri untuk membaca dokumen deliverable yang dihasilkan agen.
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
