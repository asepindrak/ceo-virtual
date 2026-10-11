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
  const [homeDir, setHomeDir] = useState<string>('~/.vigent');
  const [workspacesDir, setWorkspacesDir] = useState<string>('~/.vigent/workspaces');
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
                <h2 className="text-lg font-bold text-[#2c231c]">Vigent CLI & Autonomous Workspaces</h2>
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
              onClick={() => setIsCreatingProject(!isCreatingProject)}
              className="px-2.5 py-1 bg-[#c85a2b] hover:bg-[#b54d22] text-white rounded-lg font-semibold flex items-center gap-1 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Proyek Baru</span>
            </button>
          </div>
        </div>

        {/* New Project Creator Input */}
        {isCreatingProject && (
          <form onSubmit={handleCreateProject} className="bg-[#fffdf9] p-3 border-b border-[#d6c5ad] flex items-center gap-2 text-xs">
            <Sparkles className="w-4 h-4 text-[#c85a2b]" />
            <input
              type="text"
              required
              placeholder="Nama folder proyek baru (misal: payment-service-api)"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="flex-1 bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-3 py-1.5 text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#c85a2b] hover:bg-[#b54d22] text-white rounded-lg font-semibold"
            >
              Generate Project Folder
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingProject(false)}
              className="px-2 py-1.5 text-[#786653] hover:text-[#2c231c]"
            >
              Batal
            </button>
          </form>
        )}

        {/* Main Body: Project List (Left) + File Explorer & Preview (Right) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Projects Column */}
          <div className="md:col-span-4 border-r border-[#d6c5ad] bg-[#f4ebe1] p-3 overflow-y-auto space-y-2">
            <div className="text-[11px] font-bold text-[#786653] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Folder Proyek di Home ({projects.length})</span>
            </div>

            {projects.length === 0 && (
              <div className="text-center py-8 text-[#9c8976] text-xs italic">
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
          </div>

          {/* Files & Code Viewer Column */}
          <div className="md:col-span-8 flex flex-col bg-[#fffdf9] overflow-hidden">
            {selectedProject ? (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
