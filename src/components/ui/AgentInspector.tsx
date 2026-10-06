'use client';

import React, { useState } from 'react';
import { Agent, TaskTicket, LLMConfig } from '@/types/office';
import { X, MessageSquare, Coffee, ArrowLeft, Terminal, ShieldAlert, Cpu, Lock, Unlock, UserCheck, UserMinus, Save, Folder, ExternalLink } from 'lucide-react';

interface AgentInspectorProps {
  agent: Agent;
  allAgents: Agent[];
  currentTask?: TaskTicket;
  onClose: () => void;
  onSendCollab: (senderId: string, targetId: string) => void;
  onSendCoffee: (agentId: string) => void;
  onReturnDesk: (agentId: string) => void;
  onTriggerHumanDecision: (agentId: string) => void;
  onFireAgent: (agentId: string) => void;
  onUpdateLLMConfig: (agentId: string, updatedConfig: LLMConfig) => void;
}

export const AgentInspector: React.FC<AgentInspectorProps> = ({
  agent,
  allAgents,
  currentTask,
  onClose,
  onSendCollab,
  onSendCoffee,
  onReturnDesk,
  onTriggerHumanDecision,
  onFireAgent,
  onUpdateLLMConfig,
}) => {
  const [selectedColleagueId, setSelectedColleagueId] = useState<string>(
    allAgents.find((a) => a.id !== agent.id)?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'screen' | 'llm' | 'bio'>('screen');
  const [confirmFire, setConfirmFire] = useState(false);

  // Editable LLM Config state
  const [provider, setProvider] = useState<LLMConfig['provider']>(
    agent.llmConfig?.provider || 'openai'
  );
  const [baseUrl, setBaseUrl] = useState(agent.llmConfig?.baseUrl || '');
  const [apiKey, setApiKey] = useState(agent.llmConfig?.apiKey || '');
  const [model, setModel] = useState(agent.llmConfig?.model || 'gpt-4o');
  const [savedLLMMsg, setSavedLLMMsg] = useState(false);

  const isLocked = agent.llmConfig?.isLocked ?? false;
  const otherAgents = allAgents.filter((a) => a.id !== agent.id);

  const handleSaveLLM = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    onUpdateLLMConfig(agent.id, {
      provider,
      baseUrl: baseUrl.trim() || undefined,
      apiKey: apiKey.trim() || undefined,
      model: model.trim() || 'default-model',
      isLocked: false,
    });

    setSavedLLMMsg(true);
    setTimeout(() => setSavedLLMMsg(false), 2000);
  };

  return (
    <div className="fixed top-20 right-6 w-96 max-w-[calc(100vw-3rem)] max-h-[85vh] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden text-slate-100 animate-in fade-in slide-in-from-right duration-200">
      {/* Header with Avatar & Status */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner ring-2 ring-white/10"
            style={{ backgroundColor: agent.avatarColor }}
          >
            {agent.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <h3 className="font-semibold text-white text-base leading-tight flex items-center gap-2">
              {agent.name}
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-xs text-cyan-400 font-medium">{agent.roleTitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Physical State Badge */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Status:</span>
          <span
            className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-medium uppercase tracking-wider ${
              agent.state === 'working'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : agent.state === 'walking'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : agent.state === 'talking'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : agent.state === 'seeking_approval'
                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 animate-pulse'
                : agent.state === 'coffee_break'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            {agent.state.replace('_', ' ')}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Meja ({agent.deskPosition.x.toFixed(1)}, {agent.deskPosition.z.toFixed(1)})
        </span>
      </div>

      <div className="px-4 py-2 bg-slate-950/40 text-xs text-slate-300 border-b border-slate-800/60 italic">
        &ldquo;{agent.stateMessage}&rdquo;
      </div>

      {/* Quick Physical Action Buttons */}
      <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center gap-1.5 flex-wrap">
        <div className="w-full flex gap-1.5">
          <select
            value={selectedColleagueId}
            onChange={(e) => setSelectedColleagueId(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 text-xs rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {otherAgents.map((other) => (
              <option key={other.id} value={other.id}>
                {other.name} ({other.roleTitle.split(' ')[0]})
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (selectedColleagueId) onSendCollab(agent.id, selectedColleagueId);
            }}
            className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
            title="Walk to colleague desk and collaborate"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Walk & Talk</span>
          </button>
        </div>

        <div className="w-full flex items-center justify-between gap-1.5 pt-1">
          <div className="flex gap-1.5">
            <button
              onClick={() => onSendCoffee(agent.id)}
              className="p-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded-lg transition-colors"
              title="Kirim istirahat kopi ke pantry"
            >
              <Coffee className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReturnDesk(agent.id)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              title="Kembali ke meja kerja"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1.5">
            {/* Human in the loop trigger button */}
            <button
              onClick={() => onTriggerHumanDecision(agent.id)}
              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-medium"
              title="Minta agen jalan ke meja Owner untuk minta persetujuan keputusan"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Minta Approval</span>
            </button>

            {/* Fire Agent Button */}
            {!confirmFire ? (
              <button
                onClick={() => setConfirmFire(true)}
                className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-medium"
                title="Pecat agen ini dari kantor"
              >
                <UserMinus className="w-3.5 h-3.5 text-rose-400" />
                <span>Pecat</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 animate-in fade-in">
                <button
                  onClick={() => {
                    onFireAgent(agent.id);
                    onClose();
                  }}
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[10px]"
                >
                  Yakin Pecat?
                </button>
                <button
                  onClick={() => setConfirmFire(false)}
                  className="px-1.5 py-1 text-slate-400 hover:text-white text-[10px]"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs font-medium">
        <button
          onClick={() => setActiveTab('screen')}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'screen'
              ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Live Screen</span>
        </button>
        <button
          onClick={() => setActiveTab('llm')}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'llm'
              ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>LLM Engine</span>
        </button>
        <button
          onClick={() => setActiveTab('bio')}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'bio'
              ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Profil</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 text-xs space-y-3 font-sans">
        {activeTab === 'screen' ? (
          <div>
            {currentTask && (
              <div className="mb-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  Tiket yang Ditugaskan
                </div>
                <div className="font-medium text-slate-200 mb-1">{currentTask.title}</div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${currentTask.progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto shadow-inner">
              <div className="flex items-center justify-between text-[10px] text-slate-400 pb-2 mb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span>TERMINAL_OUTPUT.log</span>
                  <button
                    onClick={() => {
                      fetch('/api/workspace', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'open_folder' }),
                      }).catch(console.error);
                    }}
                    className="flex items-center gap-1 text-[9px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-1.5 py-0.5 rounded border border-slate-700 transition-colors"
                    title="Buka Folder Disk (~/.realagent/workspaces)"
                  >
                    <Folder className="w-2.5 h-2.5" />
                    <span>Workspace Disk</span>
                  </button>
                </div>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Streaming
                </span>
              </div>
              {agent.liveCodeOutput.map((line, idx) => (
                <div key={idx} className="whitespace-pre">
                  {line.startsWith('//') || line.startsWith('#') ? (
                    <span className="text-emerald-400/80">{line}</span>
                  ) : line.includes('function') || line.includes('const') || line.includes('export') ? (
                    <span className="text-cyan-300">{line}</span>
                  ) : (
                    <span>{line}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'llm' ? (
          /* LLM Configuration Tab */
          <form onSubmit={handleSaveLLM} className="space-y-3">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLocked ? (
                  <Lock className="w-4 h-4 text-amber-400" />
                ) : (
                  <Unlock className="w-4 h-4 text-emerald-400" />
                )}
                <div>
                  <div className="font-semibold text-slate-200">
                    {isLocked ? 'Provider Dikunci Kreator' : 'BYOK (Bebas Kustomisasi)'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isLocked
                      ? 'Token ditanggung kreator agen via langganan'
                      : 'Anda dapat mengatur Base URL dan API Key sendiri'}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Provider</label>
              <select
                disabled={isLocked}
                value={provider}
                onChange={(e) => setProvider(e.target.value as LLMConfig['provider'])}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 disabled:opacity-60"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq (Ultra-Fast)</option>
                <option value="deepseek">DeepSeek</option>
                <option value="custom">Custom (Ollama / vLLM)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Model Name</label>
              <input
                type="text"
                disabled={isLocked}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Base URL</label>
              <input
                type="text"
                disabled={isLocked}
                placeholder="https://api.openai.com/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-[11px] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">API Key Anda</label>
              <input
                type="password"
                disabled={isLocked}
                placeholder={isLocked ? '••••••••••••••••' : 'sk-... (kunci pribadi Anda)'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-[11px] disabled:opacity-60"
              />
            </div>

            {!isLocked && (
              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Konfigurasi LLM</span>
                </button>
                {savedLLMMsg && (
                  <div className="text-center text-emerald-400 text-[11px] mt-1">
                    ✓ Konfigurasi LLM agen berhasil diperbarui!
                  </div>
                )}
              </div>
            )}
          </form>
        ) : (
          /* Profile & Bio Tab */
          <div className="space-y-3">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Bio & Persona
              </div>
              <p className="text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                {agent.bio}
              </p>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                Keahlian & Kemampuan
              </div>
              <div className="flex flex-wrap gap-1.5">
                {agent.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                Statistik Kerja
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-base font-bold text-cyan-400">{agent.stats.tasksCompleted}</div>
                  <div className="text-[10px] text-slate-400">Tugas Selesai</div>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-base font-bold text-emerald-400">{agent.stats.linesOfCode}</div>
                  <div className="text-[10px] text-slate-400">Baris Kode</div>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-base font-bold text-amber-400">{agent.stats.wordsWritten}</div>
                  <div className="text-[10px] text-slate-400">Kata Ditulis</div>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-base font-bold text-purple-400">{agent.stats.collabCount}</div>
                  <div className="text-[10px] text-slate-400">Kolaborasi Fisik</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
