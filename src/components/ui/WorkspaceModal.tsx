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
} from 'lucide-react';

interface WorkspaceProject {
  name: string;
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
  const [homeDir, setHomeDir] = useState<string>('~/.realagent');
  const [workspacesDir, setWorkspacesDir] = useState<string>('~/.realagent/workspaces');
  const [port, setPort] = useState<number>(28483);
  const [autorun, setAutorun] = useState<boolean>(false);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<WorkspaceProject | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const fetchWorkspaceData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workspace');
      const data = await res.json();
      if (data.success) {
        setHomeDir(data.homeDir);
        setWorkspacesDir(data.workspacesDir);
        setPort(data.port);
        setAutorun(data.autorunAtStartup);
        setProjects(data.projects || []);
        if (data.projects && data.projects.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0]);
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const ps1Cmd = 'irm https://antigravity.google/cli/install.ps1 | iex';
  const bashCmd = 'curl -fsSL https://antigravity.google/cli/install.sh | bash';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-100 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Dedicated CLI & Workspace System</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Port :{port}
                </span>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                    autorun
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {autorun ? '● Autorun ON' : '○ Autorun OFF'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Home: <span className="text-cyan-300">{workspacesDir}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenExplorer()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
              title="Buka Folder di Windows Explorer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Explorer</span>
            </button>
            <button
              onClick={fetchWorkspaceData}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1-Line CLI Installers Banner */}
        <div className="bg-slate-950/90 border-b border-slate-800 p-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Windows PowerShell */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-0.5">
                Windows PowerShell 1-Click Install:
              </span>
              <code className="text-slate-300 font-mono text-[11px] select-all">{ps1Cmd}</code>
            </div>
            <button
              onClick={() => copyToClipboard(ps1Cmd, 'ps1')}
              className="shrink-0 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
              title="Copy Command"
            >
              {copiedCmd === 'ps1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Linux / Mac Bash */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">
                Linux / macOS 1-Click Install:
              </span>
              <code className="text-slate-300 font-mono text-[11px] select-all">{bashCmd}</code>
            </div>
            <button
              onClick={() => copyToClipboard(bashCmd, 'bash')}
              className="shrink-0 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
              title="Copy Command"
            >
              {copiedCmd === 'bash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Autorun Toggle & Settings Sub-bar */}
        <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300 font-medium">Auto-start on Windows/PC boot:</span>
            </div>
            <button
              onClick={handleToggleAutorun}
              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 border ${
                autorun
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Power className="w-3 h-3" />
              <span>{autorun ? 'Aktif (Startup Enabled)' : 'Non-aktif (Disabled)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingProject(!isCreatingProject)}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Proyek Baru</span>
            </button>
          </div>
        </div>

        {/* New Project Creator Input */}
        {isCreatingProject && (
          <form onSubmit={handleCreateProject} className="bg-slate-950 p-3 border-b border-slate-800 flex items-center gap-2 text-xs">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <input
              type="text"
              required
              placeholder="Nama folder proyek baru (misal: payment-service-api)"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold"
            >
              Generate Project Folder
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingProject(false)}
              className="px-2 py-1.5 text-slate-400 hover:text-white"
            >
              Batal
            </button>
          </form>
        )}

        {/* Main Body: Project List (Left) + File Explorer & Preview (Right) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Projects Column */}
          <div className="md:col-span-4 border-r border-slate-800 bg-slate-950/40 p-3 overflow-y-auto space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Folder Proyek di Home ({projects.length})</span>
            </div>

            {projects.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs italic">
                Belum ada folder proyek di {workspacesDir}
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
                      ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-semibold text-slate-200 truncate">
                      {isSelected ? (
                        <FolderOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
                      )}
                      <span className="truncate">{proj.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenExplorer(proj.folderPath);
                      }}
                      className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded"
                      title="Buka Folder Ini di Windows Explorer"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{proj.filesCount} file dibuat</span>
                    <span>{new Date(proj.lastModified).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Files & Code Viewer Column */}
          <div className="md:col-span-8 flex flex-col bg-slate-900/50 overflow-hidden">
            {selectedProject ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Project Subheader */}
                <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      {selectedProject.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{selectedProject.folderPath}</p>
                  </div>
                  <button
                    onClick={() => handleOpenExplorer(selectedProject.folderPath)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs rounded-lg flex items-center gap-1 transition-colors border border-slate-700"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Buka Folder</span>
                  </button>
                </div>

                {/* File list tabs */}
                <div className="bg-slate-950/90 border-b border-slate-800 px-3 py-1 flex items-center gap-1 overflow-x-auto text-xs">
                  {selectedProject.files.map((file) => {
                    const isSelected = selectedFile === file.relativePath;
                    return (
                      <button
                        key={file.relativePath}
                        onClick={() => handleSelectFile(selectedProject.name, file.relativePath)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        <FileCode className="w-3 h-3 text-cyan-400" />
                        <span>{file.relativePath}</span>
                      </button>
                    );
                  })}
                  {selectedProject.files.length === 0 && (
                    <span className="text-[11px] text-slate-500 italic py-1">Belum ada file di folder ini</span>
                  )}
                </div>

                {/* File Code Content Preview */}
                <div className="flex-1 p-3 overflow-auto bg-slate-950 text-xs font-mono">
                  {fileLoading ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      Memuat file dari disk...
                    </div>
                  ) : fileContent !== null ? (
                    <pre className="text-slate-300 leading-relaxed whitespace-pre font-mono">
                      {fileContent}
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-600 italic">
                      Pilih file di atas untuk melihat isi kode asli dari disk
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs italic">
                Pilih sebuah proyek di sebelah kiri untuk melihat file yang di-generate.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
