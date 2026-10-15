'use client';

import React, { useState, useEffect } from 'react';
import {
  Blocks,
  BookOpen,
  Wrench,
  Plus,
  Power,
  Check,
  X,
  RefreshCw,
  Folder,
  Code,
  Tag,
  Shield,
  Layers,
  Database,
  Search,
  Globe,
  Terminal,
  FileText,
  Sparkles,
} from 'lucide-react';
import { AgentRole } from '@/types/office';

interface McpServer {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  assignedRoles: AgentRole[] | 'all';
  enabled: boolean;
  isCatalogPreset?: boolean;
}

interface Skill {
  id: string;
  name: string;
  title: string;
  description: string;
  version: string;
  assignedRoles: AgentRole[] | 'all';
  tags: string[];
  instructions: string;
  filePath: string;
}

interface ExtensionHubModalProps {
  onClose: () => void;
}

export const ExtensionHubModal: React.FC<ExtensionHubModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'mcp' | 'skills'>('mcp');
  const [loading, setLoading] = useState(true);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsDir, setSkillsDir] = useState('~/.vigent/skills');
  const [mcpConfigFile, setMcpConfigFile] = useState('~/.vigent/mcp_config.json');

  // Preview Skill Modal
  const [previewSkill, setPreviewSkill] = useState<Skill | null>(null);

  // New Skill Creator Form
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);
  const [newSkillTitle, setNewSkillTitle] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillRoles, setNewSkillRoles] = useState<string>('all');
  const [newSkillInstructions, setNewSkillInstructions] = useState('');

  // New MCP Server Form
  const [isAddingMcp, setIsAddingMcp] = useState(false);
  const [newMcpName, setNewMcpName] = useState('');
  const [newMcpDesc, setNewMcpDesc] = useState('');
  const [newMcpCommand, setNewMcpCommand] = useState('npx');
  const [newMcpArgs, setNewMcpArgs] = useState('-y @modelcontextprotocol/server-...');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/extensions');
      const data = await res.json();
      if (data.success) {
        setMcpServers(data.mcpServers || []);
        setSkills(data.skills || []);
        setSkillsDir(data.skillsDir || '~/.vigent/skills');
        setMcpConfigFile(data.mcpConfigFile || '~/.vigent/mcp_config.json');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleMcp = async (serverId: string, currentEnabled: boolean) => {
    const nextState = !currentEnabled;
    setMcpServers((prev) =>
      prev.map((s) => (s.id === serverId ? { ...s, enabled: nextState } : s))
    );

    try {
      await fetch('/api/extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_mcp', serverId, enabled: nextState }),
      });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillTitle.trim() || !newSkillInstructions.trim()) return;

    const skillId = newSkillTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const assignedRoles: AgentRole[] | 'all' =
      newSkillRoles === 'all' ? 'all' : (newSkillRoles.split(',') as AgentRole[]);

    try {
      const res = await fetch('/api/extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_skill',
          skillId,
          title: newSkillTitle.trim(),
          description: newSkillDesc.trim(),
          assignedRoles,
          instructions: newSkillInstructions.trim(),
          tags: ['custom', 'office'],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCreatingSkill(false);
        setNewSkillTitle('');
        setNewSkillDesc('');
        setNewSkillInstructions('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCustomMcp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMcpName.trim()) return;

    const id = newMcpName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const argsArray = newMcpArgs.split(' ').filter(Boolean);

    try {
      const res = await fetch('/api/extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_mcp',
          server: {
            id,
            name: newMcpName.trim(),
            description: newMcpDesc.trim() || 'Custom MCP Server',
            command: newMcpCommand.trim(),
            args: argsArray,
            assignedRoles: 'all',
            enabled: true,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddingMcp(false);
        setNewMcpName('');
        setNewMcpDesc('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getMcpIcon = (id: string) => {
    if (id.includes('postgres') || id.includes('database')) return <Database className="w-5 h-5 text-emerald-400" />;
    if (id.includes('search') || id.includes('brave')) return <Search className="w-5 h-5 text-amber-400" />;
    if (id.includes('fetch') || id.includes('web')) return <Globe className="w-5 h-5 text-blue-400" />;
    if (id.includes('github') || id.includes('git')) return <Code className="w-5 h-5 text-purple-400" />;
    return <Wrench className="w-5 h-5 text-cyan-400" />;
  };

  return (
    <div className="fixed inset-0 bg-[#2c231c]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-[#2c231c] animate-in fade-in duration-200">
      <div className="bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#fdeed9] border border-[#e8ba8c] text-[#c85a2b]">
              <Blocks className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#2c231c]">CEO Virtual Extension & Skills Hub</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#eef2f8] text-[#2d4263] border border-[#c4d1e4] font-bold">
                  Model Context Protocol
                </span>
              </div>
              <p className="text-xs text-[#786653]">
                Toko modul ekstensi MCP dan SOP keahlian khusus divisi kantor virtual
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
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

        {/* Tabs & Path Sub-bar */}
        <div className="bg-[#faf5eb] border-b border-[#d6c5ad] px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('mcp')}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'mcp'
                  ? 'bg-[#c85a2b] text-white shadow-sm'
                  : 'text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1]'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>🔌 MCP Servers ({mcpServers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('skills')}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'skills'
                  ? 'bg-[#7d3b8f] text-white shadow-sm'
                  : 'text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>📚 Role Skills & SOPs ({skills.length})</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-[#786653]">
            <Folder className="w-3.5 h-3.5 text-[#c85a2b]" />
            <span>Config: {activeTab === 'mcp' ? mcpConfigFile : skillsDir}</span>
          </div>
        </div>

        {/* TAB 1: MCP SERVERS */}
        {activeTab === 'mcp' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#2c231c]">Active Model Context Protocol (MCP) Servers</h3>
                <p className="text-xs text-[#786653]">
                  Ekspos alat nyata (Database, GitHub, Web Search, Filesystem) langsung ke agen sesuai tugasnya.
                </p>
              </div>
              <button
                onClick={() => setIsAddingMcp(!isAddingMcp)}
                className="px-3 py-1.5 bg-[#fffdf9] hover:bg-[#ede2d1] text-[#2c231c] rounded-lg text-xs font-semibold flex items-center gap-1 border border-[#d6c5ad] transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#c85a2b]" />
                <span>Tambah Custom MCP</span>
              </button>
            </div>

            {/* Add Custom MCP Form */}
            {isAddingMcp && (
              <form onSubmit={handleAddCustomMcp} className="p-3 rounded-xl bg-[#fffdf9] border border-[#d6c5ad] space-y-2 text-xs">
                <div className="font-bold text-[#2c231c] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#c85a2b]" />
                  <span>Daftarkan Server MCP Baru</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nama Server (misal: Docker MCP)"
                    value={newMcpName}
                    onChange={(e) => setNewMcpName(e.target.value)}
                    className="bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c] placeholder-[#9c8976]"
                  />
                  <input
                    type="text"
                    placeholder="Deskripsi fungsi alat"
                    value={newMcpDesc}
                    onChange={(e) => setNewMcpDesc(e.target.value)}
                    className="bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c] placeholder-[#9c8976]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Command (npx)"
                    value={newMcpCommand}
                    onChange={(e) => setNewMcpCommand(e.target.value)}
                    className="bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c] font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Args (-y @modelcontextprotocol/...)"
                    value={newMcpArgs}
                    onChange={(e) => setNewMcpArgs(e.target.value)}
                    className="md:col-span-3 bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c] font-mono"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="px-3 py-1.5 bg-[#c85a2b] hover:bg-[#b54d22] text-white rounded-lg font-bold">
                    Simpan Server MCP
                  </button>
                  <button type="button" onClick={() => setIsAddingMcp(false)} className="px-2.5 py-1.5 text-[#786653] hover:text-[#2c231c]">
                    Batal
                  </button>
                </div>
              </form>
            )}

            {/* MCP Servers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mcpServers.map((server) => (
                <div
                  key={server.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    server.enabled
                      ? 'bg-[#fffdf9] border-[#d6c5ad] shadow-sm'
                      : 'bg-[#f4ebe1]/60 border-[#d6c5ad]/60 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-[#f4ebe1] border border-[#d6c5ad]">
                          {getMcpIcon(server.id)}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#2c231c] text-xs">{server.name}</h4>
                          <span className="text-[10px] font-mono text-[#c85a2b] font-medium">
                            {server.command} {server.args.slice(0, 2).join(' ')}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleMcp(server.id, server.enabled)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors border ${
                          server.enabled
                            ? 'bg-[#e6f4f2] text-[#1f6860] border-[#a2d8d0] hover:bg-[#d5eee9]'
                            : 'bg-[#fffdf9] text-[#786653] border-[#d6c5ad] hover:bg-[#ede2d1]'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{server.enabled ? 'Aktif' : 'Non-aktif'}</span>
                      </button>
                    </div>

                    <p className="text-[#615042] text-xs leading-relaxed mb-3">{server.description}</p>
                  </div>

                  <div className="pt-2 border-t border-[#d6c5ad] flex items-center justify-between text-[10px]">
                    <span className="text-[#786653]">Hak Akses Divisi:</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#f4ebe1] text-[#2c231c] border border-[#d6c5ad] font-mono font-bold">
                      {server.assignedRoles === 'all'
                        ? 'Semua Divisi'
                        : Array.isArray(server.assignedRoles)
                        ? server.assignedRoles.join(', ')
                        : 'Divisi'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: SKILLS & SOPS */}
        {activeTab === 'skills' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#2c231c]">Installed Skills & SOP Workflows</h3>
                <p className="text-xs text-[#786653]">
                  Panduan SOP dan best-practice yang otomatis diinjeksikan ke prompt agen saat mengerjakan tiket.
                </p>
              </div>
              <button
                onClick={() => setIsCreatingSkill(!isCreatingSkill)}
                className="px-3 py-1.5 bg-[#7d3b8f] hover:bg-[#682e78] text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Skill Baru</span>
              </button>
            </div>

            {/* Create Skill Form */}
            {isCreatingSkill && (
              <form onSubmit={handleCreateSkill} className="p-3.5 rounded-xl bg-[#fffdf9] border border-[#d6c5ad] space-y-2.5 text-xs">
                <div className="font-bold text-[#2c231c] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#7d3b8f]" />
                  <span>Buat Skill (SKILL.md) Baru</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Judul Skill (misal: FastAPI Architecture Specialist)"
                    value={newSkillTitle}
                    onChange={(e) => setNewSkillTitle(e.target.value)}
                    className="bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c]"
                  />
                  <input
                    type="text"
                    placeholder="Deskripsi singkat"
                    value={newSkillDesc}
                    onChange={(e) => setNewSkillDesc(e.target.value)}
                    className="bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c]"
                  />
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="# SOP & Aturan Koding&#10;1. Selalu gunakan Pydantic V2 untuk schema...&#10;2. Gunakan async def pada semua endpoint I/O..."
                  value={newSkillInstructions}
                  onChange={(e) => setNewSkillInstructions(e.target.value)}
                  className="w-full bg-[#fbf7ee] border border-[#d6c5ad] rounded-lg p-2.5 text-[#2c231c] font-mono text-xs"
                />
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-1.5 bg-[#7d3b8f] hover:bg-[#682e78] text-white rounded-lg font-bold">
                    Simpan Skill ke Disk
                  </button>
                  <button type="button" onClick={() => setIsCreatingSkill(false)} className="px-2.5 py-1.5 text-[#786653] hover:text-[#2c231c]">
                    Batal
                  </button>
                </div>
              </form>
            )}

            {/* Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  onClick={() => setPreviewSkill(skill)}
                  className="p-3.5 rounded-2xl bg-[#fffdf9] border border-[#d6c5ad] hover:border-[#7d3b8f] cursor-pointer transition-all flex flex-col justify-between group shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-[#fdf2fc] border border-[#eed0ed] text-[#7d3b8f] group-hover:scale-105 transition-transform">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#2c231c] text-xs">{skill.title}</h4>
                          <span className="text-[10px] text-[#7d3b8f] font-mono font-bold">v{skill.version}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f4ebe1] text-[#786653] border border-[#d6c5ad]">
                        SKILL.md
                      </span>
                    </div>

                    <p className="text-[#615042] text-xs leading-relaxed mb-3 line-clamp-2">
                      {skill.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#d6c5ad] flex items-center justify-between text-[10px]">
                    <div className="flex flex-wrap gap-1">
                      {skill.tags.map((t, idx) => (
                        <span key={idx} className="px-1.5 py-0.2 bg-[#f4ebe1] text-[#615042] rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <span className="text-[#7d3b8f] font-bold group-hover:underline">Buka SOP ➔</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview Skill Detail Modal */}
      {previewSkill && (
        <div className="fixed inset-0 bg-[#2c231c]/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl text-[#2c231c]">
            <div className="p-4 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#7d3b8f]" />
                <div>
                  <h3 className="font-bold text-sm text-[#2c231c]">{previewSkill.title}</h3>
                  <p className="text-[10px] text-[#786653] font-mono">{previewSkill.filePath}</p>
                </div>
              </div>
              <button onClick={() => setPreviewSkill(null)} className="p-1 text-[#786653] hover:text-[#2c231c] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto bg-[#fbf7ee] text-xs font-mono text-[#2c231c] flex-1">
              <pre className="whitespace-pre-wrap leading-relaxed">{previewSkill.instructions}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
