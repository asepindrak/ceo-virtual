'use client';

import React, { useState, useEffect } from 'react';
import { Agent, TaskTicket, LLMConfig, Company, LLMCategory, CategoryLLMSetting } from '@/types/office';
import {
  X,
  MessageSquare,
  Coffee,
  ArrowLeft,
  Terminal,
  ShieldAlert,
  Cpu,
  Lock,
  Unlock,
  UserCheck,
  UserMinus,
  Save,
  Folder,
  Send,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Bot,
  Wrench,
  LayoutDashboard,
  CheckCircle2,
  Globe,
  Zap,
  Eye,
  Mic,
  Users,
} from 'lucide-react';

interface AgentInspectorProps {
  agent: Agent;
  allAgents: Agent[];
  currentTask?: TaskTicket;
  allTasks?: TaskTicket[];
  companyName?: string;
  company?: Company;
  onClose: () => void;
  onSendCollab: (senderId: string, targetId: string) => void;
  onSendCoffee: (agentId: string) => void;
  onSendSprint?: (agentId: string) => void;
  onReturnDesk: (agentId: string) => void;
  onTriggerHumanDecision: (agentId: string) => void;
  onFireAgent: (agentId: string) => void;
  onUpdateLLMConfig: (
    agentId: string,
    updatedConfig: LLMConfig,
    inheritedCategory?: LLMCategory | 'manual',
    applyToAllInCompany?: boolean
  ) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  toolResults?: Array<{ toolName: string; args: any; result: any; success: boolean }>;
}

export const AgentInspector: React.FC<AgentInspectorProps> = ({
  agent,
  allAgents,
  currentTask,
  allTasks = [],
  companyName = 'ShadowMove',
  company,
  onClose,
  onSendCollab,
  onSendCoffee,
  onSendSprint,
  onReturnDesk,
  onTriggerHumanDecision,
  onFireAgent,
  onUpdateLLMConfig,
}) => {
  const [selectedColleagueId, setSelectedColleagueId] = useState<string>(
    allAgents.find((a) => a.id !== agent.id)?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'screen' | 'chat' | 'llm' | 'bio'>('chat');
  const [confirmFire, setConfirmFire] = useState(false);

  // Global LLM vs Manual Mode state:
  // Default to 'global' if agent hasn't explicitly configured manual BYOK with an active API Key
  const hasManualCustomKey = agent.inheritedLLMCategory === 'manual' && Boolean(agent.llmConfig?.apiKey);
  const [llmMode, setLlmMode] = useState<'global' | 'manual'>(
    hasManualCustomKey ? 'manual' : 'global'
  );
  const [selectedGlobalCategory, setSelectedGlobalCategory] = useState<LLMCategory>(
    agent.inheritedLLMCategory && agent.inheritedLLMCategory !== 'manual'
      ? agent.inheritedLLMCategory
      : 'text'
  );

  // Editable LLM Config state (Manual BYOK)
  const [provider, setProvider] = useState<LLMConfig['provider']>(
    agent.llmConfig?.provider || 'openai'
  );
  const [baseUrl, setBaseUrl] = useState(agent.llmConfig?.baseUrl || '');
  const [apiKey, setApiKey] = useState(agent.llmConfig?.apiKey || '');
  const [model, setModel] = useState(agent.llmConfig?.model || 'gpt-4o');
  
  // Loading & notification states
  const [isApplyingGlobal, setIsApplyingGlobal] = useState(false);
  const [appliedGlobalMsg, setAppliedGlobalMsg] = useState<string | null>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [savedLLMMsg, setSavedLLMMsg] = useState(false);

  // Connection testing state
  const [testState, setTestState] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  // Live Chat & Vision state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Halo Boss! Saya ${agent.name} (${agent.roleTitle}). Siap mengerjakan tugas koding, menulis konten, atau analisis arsitektur. Anda juga bisa mengunggah screenshot gambar untuk saya review.`,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // When selected agent changes or opens, always default to Live Chat tab & re-seed state
  useEffect(() => {
    setActiveTab('chat');
    const hasManualKey = agent.inheritedLLMCategory === 'manual' && Boolean(agent.llmConfig?.apiKey);
    if (hasManualKey) {
      setLlmMode('manual');
      setProvider(agent.llmConfig?.provider || 'openai');
      setBaseUrl(agent.llmConfig?.baseUrl || '');
      setApiKey(agent.llmConfig?.apiKey || '');
      setModel(agent.llmConfig?.model || 'gpt-4o');
    } else {
      setLlmMode('global');
      const cat = (agent.inheritedLLMCategory && agent.inheritedLLMCategory !== 'manual')
        ? agent.inheritedLLMCategory
        : 'text';
      setSelectedGlobalCategory(cat);
      const catSetting = company?.globalLLMConfig?.[cat] || company?.globalLLMConfig?.text;
      setProvider(catSetting?.provider || 'openai');
      setBaseUrl(catSetting?.baseUrl || '');
      setApiKey(catSetting?.apiKey || '');
      setModel(catSetting?.model || 'gpt-4o');
    }

    setSelectedColleagueId(allAgents.find((a) => a.id !== agent.id)?.id || '');
    setChatMessages([
      {
        role: 'assistant',
        content: `Halo Boss! Saya ${agent.name} (${agent.roleTitle}). Siap mengerjakan tugas koding, menulis konten, atau analisis arsitektur. Anda juga bisa mengunggah screenshot gambar untuk saya review.`,
      },
    ]);
  }, [agent.id, company?.id]);

  const isLocked = agent.llmConfig?.isLocked ?? false;
  const otherAgents = allAgents.filter((a) => a.id !== agent.id);

  const handleApplyGlobalLLM = async (applyToAll: boolean = false) => {
    setIsApplyingGlobal(true);
    setAppliedGlobalMsg(null);

    try {
      const catSetting = company?.globalLLMConfig?.[selectedGlobalCategory] || company?.globalLLMConfig?.text;
      const effectiveConfig: LLMConfig = {
        provider: catSetting?.provider || 'openai',
        baseUrl: catSetting?.baseUrl,
        apiKey: catSetting?.apiKey,
        model: catSetting?.model || 'gpt-4o',
        isLocked: false,
      };

      onUpdateLLMConfig(agent.id, effectiveConfig, selectedGlobalCategory, applyToAll);

      // Loading delay for visual feedback
      await new Promise((r) => setTimeout(r, 450));

      setIsApplyingGlobal(false);
      if (applyToAll) {
        setAppliedGlobalMsg(`✓ Model global ${effectiveConfig.provider.toUpperCase()} (${effectiveConfig.model}) berhasil diterapkan ke SELURUH agen kantor ${company?.name || ''} & tersimpan persisten!`);
      } else {
        setAppliedGlobalMsg(`✓ Model global ${effectiveConfig.provider.toUpperCase()} (${effectiveConfig.model}) berhasil diterapkan ke ${agent.name} & tersimpan persisten!`);
      }

      setTimeout(() => setAppliedGlobalMsg(null), 5000);
    } catch (err: any) {
      setIsApplyingGlobal(false);
      setTestState({ status: 'error', message: err.message || 'Gagal menerapkan model global' });
    }
  };

  const handleSaveLLM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setIsSavingManual(true);
    setSavedLLMMsg(false);

    try {
      const manualConfig: LLMConfig = {
        provider,
        baseUrl: baseUrl.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
        model: model.trim() || 'default-model',
        isLocked: false,
      };

      onUpdateLLMConfig(agent.id, manualConfig, 'manual', false);

      await new Promise((r) => setTimeout(r, 400));
      setIsSavingManual(false);
      setSavedLLMMsg(true);
      setTimeout(() => setSavedLLMMsg(false), 3500);
    } catch {
      setIsSavingManual(false);
    }
  };

  const handleTestConnection = async () => {
    setTestState({ status: 'testing', message: 'Menghubungkan ke provider...' });
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            provider,
            baseUrl: baseUrl.trim() || undefined,
            apiKey: apiKey.trim() || undefined,
            model: model.trim() || undefined,
          },
          isTestConnection: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestState({
          status: 'success',
          message: `✓ Terhubung ke ${data.provider} (${data.model})`,
        });
      } else {
        setTestState({
          status: 'error',
          message: data.error || 'Koneksi gagal',
        });
      }
    } catch (err: any) {
      setTestState({
        status: 'error',
        message: err.message || 'Gagal menghubungi backend API',
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageAttachment(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !imageAttachment) return;

    const userText = chatInput.trim();
    const userImg = imageAttachment;

    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: userText, image: userImg || undefined },
    ]);
    setChatInput('');
    setImageAttachment(null);
    setIsSending(true);

    try {
      // Build API messages payload with optional vision content
      const apiPayloadMessages: any[] = chatMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      if (userImg) {
        apiPayloadMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: userText || 'Tolong analisa gambar screenshot ini:' },
            { type: 'image_url', image_url: { url: userImg } },
          ],
        });
      } else {
        apiPayloadMessages.push({
          role: 'user',
          content: userText,
        });
      }

      let activeConfig: LLMConfig;
      if (llmMode === 'global') {
        const catSetting = company?.globalLLMConfig?.[selectedGlobalCategory] || company?.globalLLMConfig?.text;
        activeConfig = {
          provider: catSetting?.provider || 'openai',
          baseUrl: catSetting?.baseUrl,
          apiKey: catSetting?.apiKey,
          model: catSetting?.model || 'gpt-4o',
          isLocked: false,
        };
      } else {
        activeConfig = {
          provider,
          baseUrl: baseUrl.trim() || undefined,
          apiKey: apiKey.trim() || undefined,
          model: model.trim() || 'gpt-4o',
          isLocked: false,
        };
        // Fallback to company global text if manual apiKey is empty
        if (!activeConfig.apiKey && company?.globalLLMConfig?.text?.apiKey) {
          activeConfig.apiKey = company.globalLLMConfig.text.apiKey;
          activeConfig.provider = company.globalLLMConfig.text.provider;
          activeConfig.baseUrl = company.globalLLMConfig.text.baseUrl;
          activeConfig.model = company.globalLLMConfig.text.model;
        }
      }

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: activeConfig,
          messages: apiPayloadMessages,
          agentName: agent.name,
          agentRole: agent.roleTitle,
          currentTask,
          allTasks,
          companyName,
          companyId: company?.id,
          activeProject: currentTask?.projectName,
          agentPersonality: agent.personality,
          enableTools: true,
          autoExecuteTools: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.content || '(Tugas dan tools telah dieksekusi)',
            toolResults: data.toolResults || [],
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ Error dari LLM Provider: ${data.error}`,
          },
        ]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Gagal menghubungi server: ${err.message}`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed top-20 right-6 w-[420px] max-w-[calc(100vw-2rem)] h-[85vh] bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden text-[#2c231c] animate-in fade-in slide-in-from-right duration-200">
      {/* Header with Avatar & Status */}
      <div className="p-4 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-base relative"
            style={{ backgroundColor: agent.avatarColor }}
          >
            {agent.name.charAt(0)}
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#faf5eb] ${
                agent.state === 'working'
                  ? 'bg-emerald-500'
                  : agent.state === 'walking'
                  ? 'bg-blue-500'
                  : agent.state === 'talking'
                  ? 'bg-purple-500'
                  : agent.state === 'seeking_approval'
                  ? 'bg-amber-500'
                  : 'bg-stone-400'
              }`}
            />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#2c231c] flex items-center gap-1.5 flex-wrap">
              <span>{agent.name}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                  agent.gender === 'female' || ['Rei', 'Yuki', 'Maya', 'Elena', 'Chloe', 'Sarah', 'Aurora', 'Sofia', 'Aria'].some((fn) => agent.name.includes(fn))
                    ? 'bg-[#fce7f3] text-[#be185d] border border-[#fbcfe8]'
                    : 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]'
                }`}
              >
                {agent.gender === 'female' || ['Rei', 'Yuki', 'Maya', 'Elena', 'Chloe', 'Sarah', 'Aurora', 'Sofia', 'Aria'].some((fn) => agent.name.includes(fn)) ? '♀ Wanita' : '♂ Pria'}
              </span>
              {agent.personality && (
                <span className="text-[10px] px-1.5 py-0.2 bg-[#fdf2f8] text-[#be185d] border border-[#fbcfe8] rounded-md font-sans font-bold">
                  {agent.personality.mbti} • {agent.personality.enneagram}
                </span>
              )}
            </h3>
            <p className="text-xs text-[#c85a2b] font-semibold">{agent.roleTitle}</p>
            <div className="text-[10px] text-[#786653] capitalize mt-0.5 font-mono">
              Status: <span className="text-[#2c231c] font-bold">{agent.state.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* State Message / Speech quote */}
      <div className="px-4 py-2 bg-[#fffdf9] text-xs text-[#4d3c2e] border-b border-[#d6c5ad] italic">
        &ldquo;{agent.stateMessage}&rdquo;
      </div>

      {/* Quick Physical Action Buttons */}
      <div className="p-3 bg-[#f4ebe1] border-b border-[#d6c5ad] flex items-center gap-1.5 flex-wrap">
        <div className="w-full flex gap-1.5">
          <select
            value={selectedColleagueId}
            onChange={(e) => setSelectedColleagueId(e.target.value)}
            className="flex-1 bg-[#fffdf9] border border-[#d6c5ad] text-xs rounded-lg px-2 py-1.5 text-[#2c231c] focus:outline-none focus:border-[#c85a2b]"
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
            className="px-2.5 py-1.5 bg-[#c85a2b] hover:bg-[#b54d22] text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors shadow-xs"
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
              className="p-1.5 bg-[#fef8e7] hover:bg-[#fdeed9] text-[#ab7a1a] border border-[#fae4a8] rounded-lg transition-colors"
              title="Kirim istirahat kopi ke pantry"
            >
              <Coffee className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSendSprint?.(agent.id)}
              className="p-1.5 bg-[#e6f7f6] hover:bg-[#d0f0ee] text-[#0891b2] border border-[#a5e8e4] rounded-lg transition-colors"
              title="Kirim agen ke Sprint Station untuk review kanban & roadmap"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReturnDesk(agent.id)}
              className="p-1.5 bg-[#fffdf9] hover:bg-[#ede2d1] text-[#5c4939] border border-[#d6c5ad] rounded-lg transition-colors"
              title="Kembali ke meja kerja"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => onTriggerHumanDecision(agent.id)}
              className="px-2 py-1 bg-[#fef3e7] hover:bg-[#fde9d2] text-[#c85a2b] border border-[#f0c8a5] rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold"
              title="Minta agen jalan ke meja Owner untuk minta persetujuan keputusan"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#c85a2b]" />
              <span>Minta Approval</span>
            </button>

            {!confirmFire ? (
              <button
                onClick={() => setConfirmFire(true)}
                className="px-2 py-1 bg-[#fdf0f0] hover:bg-[#fae0e0] text-[#b93838] border border-[#f5c6c6] rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold"
              >
                <UserMinus className="w-3.5 h-3.5 text-[#b93838]" />
                <span>Pecat</span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onFireAgent(agent.id)}
                  className="px-2 py-1 bg-[#b93838] hover:bg-[#9e2d2d] text-white rounded-lg text-[10px] font-bold"
                >
                  Ya, Pecat!
                </button>
                <button
                  onClick={() => setConfirmFire(false)}
                  className="px-1.5 py-1 text-[#786653] hover:text-[#2c231c] text-[10px]"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Live Chat / Terminal / LLM / Bio) */}
      <div className="flex border-b border-[#d6c5ad] bg-[#f4ebe1] text-xs font-semibold">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-[#c85a2b] text-[#c85a2b] bg-[#fffdf9]'
              : 'border-transparent text-[#786653] hover:text-[#2c231c]'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Live Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('screen')}
          className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 border-b-2 transition-colors ${
            activeTab === 'screen'
              ? 'border-[#c85a2b] text-[#c85a2b] bg-[#fffdf9]'
              : 'border-transparent text-[#786653] hover:text-[#2c231c]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Terminal</span>
        </button>
        <button
          onClick={() => setActiveTab('llm')}
          className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 border-b-2 transition-colors ${
            activeTab === 'llm'
              ? 'border-[#c85a2b] text-[#c85a2b] bg-[#fffdf9]'
              : 'border-transparent text-[#786653] hover:text-[#2c231c]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>LLM Config</span>
        </button>
        <button
          onClick={() => setActiveTab('bio')}
          className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 border-b-2 transition-colors ${
            activeTab === 'bio'
              ? 'border-[#c85a2b] text-[#c85a2b] bg-[#fffdf9]'
              : 'border-transparent text-[#786653] hover:text-[#2c231c]'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Profil</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 text-xs space-y-3 font-sans flex flex-col">
        {/* TAB 1: SCREEN / TERMINAL */}
        {activeTab === 'screen' && (
          <div>
            {currentTask && (
              <div
                className={`mb-3 p-2.5 rounded-lg border ${
                  currentTask.status === 'done'
                    ? 'bg-[#ecfdf5] border-[#a7f3d0]'
                    : 'bg-[#fffdf9] border-[#d6c5ad]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider mb-1">
                  <span className={currentTask.status === 'done' ? 'text-[#065f46]' : 'text-[#786653]'}>
                    {currentTask.status === 'done' ? '✓ Tiket Selesai (100%)' : 'Tiket yang Ditugaskan'}
                  </span>
                  <span className="font-mono">{Math.round(currentTask.progress)}%</span>
                </div>
                <div className="font-semibold text-[#2c231c] mb-1">{currentTask.title}</div>
                <div className="w-full bg-[#ebdcc9] h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      currentTask.status === 'done'
                        ? 'bg-[#10b981]'
                        : 'bg-gradient-to-r from-[#c85a2b] to-[#d97736]'
                    }`}
                    style={{ width: `${currentTask.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Vintage CRT Terminal Display */}
            <div className="rounded-lg bg-[#18231c] p-3 border-2 border-[#bfa787] font-mono text-[11px] text-[#4ade80] leading-relaxed overflow-x-auto shadow-inner">
              <div className="flex items-center justify-between text-[10px] text-[#86a892] pb-2 mb-2 border-b border-[#2d3f32]">
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
                    className="flex items-center gap-1 text-[9px] bg-[#27382d] hover:bg-[#344b3d] text-[#86efac] px-1.5 py-0.5 rounded border border-[#3b5544] transition-colors"
                    title="Buka Folder Disk (~/.vigent/workspaces)"
                  >
                    <Folder className="w-2.5 h-2.5" />
                    <span>Workspace Disk</span>
                  </button>
                </div>
                {agent.state === 'working' ? (
                  <span className="flex items-center gap-1 text-[#4ade80]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-ping" />
                    Streaming
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[#86a892]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#86a892]" />
                    Standby / Idle
                  </span>
                )}
              </div>
              {agent.liveCodeOutput.map((line, idx) => (
                <div key={idx} className="whitespace-pre">
                  {line.startsWith('//') || line.startsWith('#') ? (
                    <span className="text-[#86efac]/70">{line}</span>
                  ) : line.includes('function') || line.includes('const') || line.includes('export') ? (
                    <span className="text-[#fef08a]">{line}</span>
                  ) : (
                    <span>{line}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE CHAT & VISION + TOOL CALLING */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col h-full space-y-2">
            {/* Active Task Context Banner */}
            {currentTask ? (
              <div
                className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                  currentTask.status === 'done'
                    ? 'bg-[#ecfdf5] border-[#a7f3d0]'
                    : 'bg-[#e6f4f2] border-[#a2d8d0]'
                }`}
              >
                <div className="truncate mr-2">
                  <div
                    className={`font-bold flex items-center gap-1.5 truncate ${
                      currentTask.status === 'done' ? 'text-[#065f46]' : 'text-[#1f6860]'
                    }`}
                  >
                    <span>
                      {currentTask.status === 'done' ? '✓ Selesai 100%:' : '📌 Task:'} {currentTask.title}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        currentTask.status === 'done'
                          ? 'bg-[#d1fae5] text-[#047857]'
                          : 'bg-[#d1ede8] text-[#134e48]'
                      }`}
                    >
                      {Math.round(currentTask.progress)}%
                    </span>
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      currentTask.status === 'done' ? 'text-[#047857]' : 'text-[#42736e]'
                    }`}
                  >
                    Project:{' '}
                    <span className="font-semibold">{currentTask.projectName || 'General'}</span> | Status:{' '}
                    <span className="uppercase font-mono font-bold">{currentTask.status}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-[#f4ebe1] border border-[#d6c5ad] text-[11px] text-[#786653] italic">
                💤 Belum ada task aktif yang di-assign ke {agent.name.split(' ')[0]}.
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[300px]">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-2.5 rounded-xl text-xs space-y-1.5 ${
                    msg.role === 'user'
                      ? 'bg-[#fdeed9] border-2 border-[#e8ba8c] ml-4 text-[#2c231c]'
                      : 'bg-[#fffdf9] border border-[#d6c5ad] mr-2 text-[#2c231c]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-[#786653] font-bold">
                    <span>{msg.role === 'user' ? 'Boss (Anda)' : agent.name}</span>
                  </div>

                  {msg.image && (
                    <div className="my-1 rounded-lg overflow-hidden border border-[#d6c5ad] max-h-40">
                      <img src={msg.image} alt="Attached screenshot" className="w-full object-cover" />
                    </div>
                  )}

                  <p className="text-[#2c231c] leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                  {/* Tool Execution Logs */}
                  {msg.toolResults && msg.toolResults.length > 0 && (
                    <div className="pt-1.5 border-t border-[#d6c5ad] space-y-1">
                      <div className="text-[10px] font-mono text-[#c85a2b] font-bold flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        <span>Tools Executed on Machine:</span>
                      </div>
                      {msg.toolResults.map((tr, i) => (
                        <div key={i} className="text-[10px] font-mono bg-[#f4ebe1] p-1.5 rounded border border-[#d6c5ad] text-[#1f6860] font-semibold">
                          ✓ {tr.toolName}: {typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isSending && (
                <div className="p-2.5 rounded-xl bg-[#fffdf9] border border-[#d6c5ad] text-xs flex items-center gap-2 text-[#c85a2b] font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{agent.name} sedang berpikir & mengeksekusi...</span>
                </div>
              )}
            </div>

            {/* Image Preview if selected */}
            {imageAttachment && (
              <div className="relative p-1 bg-[#fffdf9] rounded-lg border border-[#c85a2b] flex items-center gap-2">
                <img src={imageAttachment} alt="Preview" className="w-10 h-10 object-cover rounded" />
                <span className="text-[10px] text-[#c85a2b] font-semibold">Gambar/Screenshot terlampir</span>
                <button
                  onClick={() => setImageAttachment(null)}
                  className="ml-auto p-1 text-[#786653] hover:text-[#2c231c]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Action Suggestion Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              <button
                type="button"
                onClick={() => setChatInput('Bagaimana progres task kamu saat ini? Apakah sudah beres?')}
                className="px-2 py-0.5 bg-[#fffdf9] hover:bg-[#fdeed9] text-[#784620] border border-[#d6c5ad] hover:border-[#c85a2b] rounded-lg shrink-0 transition-colors"
              >
                📊 Cek Status Task
              </button>
              <button
                type="button"
                onClick={() => setChatInput('Tampilkan potongan kode dan file yang sedang kamu kerjakan')}
                className="px-2 py-0.5 bg-[#fffdf9] hover:bg-[#fdeed9] text-[#784620] border border-[#d6c5ad] hover:border-[#c85a2b] rounded-lg shrink-0 transition-colors"
              >
                💻 Kode Terkini
              </button>
              <button
                type="button"
                onClick={() => setChatInput('Apa saja deliverable dan file yang sudah berhasil kamu selesaikan?')}
                className="px-2 py-0.5 bg-[#fffdf9] hover:bg-[#fdeed9] text-[#784620] border border-[#d6c5ad] hover:border-[#c85a2b] rounded-lg shrink-0 transition-colors"
              >
                📁 Cek Deliverables
              </button>
              <button
                type="button"
                onClick={() => setChatInput('Tolong fokus selesaikan task ini dengan standar kualitas tertinggi!')}
                className="px-2 py-0.5 bg-[#fffdf9] hover:bg-[#fdeed9] text-[#784620] border border-[#d6c5ad] hover:border-[#c85a2b] rounded-lg shrink-0 transition-colors"
              >
                ⚡ Selesaikan Task
              </button>
            </div>

            {/* Input Form with Vision Attachment */}
            <form onSubmit={handleSendMessage} className="pt-2 border-t border-[#d6c5ad] flex items-center gap-1.5">
              <label
                className="p-2 bg-[#fffdf9] hover:bg-[#ede2d1] text-[#5c4939] border border-[#d6c5ad] rounded-lg cursor-pointer transition-colors"
                title="Lampirkan Gambar / Screenshot UI untuk Vision Analysis"
              >
                <ImageIcon className="w-4 h-4 text-[#c85a2b]" />
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>

              <input
                type="text"
                placeholder="Perintah atau pertanyaan..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isSending}
                className="flex-1 bg-[#fffdf9] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b] text-xs"
              />

              <button
                type="submit"
                disabled={isSending || (!chatInput.trim() && !imageAttachment)}
                className="p-2 bg-[#c85a2b] hover:bg-[#b54d22] disabled:opacity-50 text-white rounded-lg transition-colors shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: LLM CONFIGURATION */}
        {activeTab === 'llm' && (
          <div className="space-y-3.5 text-xs">
            {/* Header info & Mode Segment Control */}
            <div className="p-1 bg-[#f4ebe1] rounded-xl border border-[#d6c5ad] flex gap-1">
              <button
                type="button"
                onClick={() => setLlmMode('global')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  llmMode === 'global'
                    ? 'bg-[#4f46e5] text-white shadow-xs'
                    : 'text-[#5c4939] hover:bg-[#ede2d1]'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>🏢 Global Perusahaan</span>
              </button>
              <button
                type="button"
                onClick={() => setLlmMode('manual')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  llmMode === 'manual'
                    ? 'bg-[#c85a2b] text-white shadow-xs'
                    : 'text-[#5c4939] hover:bg-[#ede2d1]'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>🛠️ Input Manual (BYOK)</span>
              </button>
            </div>

            {/* Saved message banner */}
            {savedLLMMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Konfigurasi LLM agent {agent.name} berhasil diperbarui!</span>
              </div>
            )}

            {/* MODE 1: GLOBAL COMPANY LLM SELECTION */}
            {llmMode === 'global' ? (
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-[#eef2ff] border border-[#c7d2fe] text-[#312e81]">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#4f46e5]" />
                    <span>Mewarisi Pengaturan Kantor {companyName}</span>
                  </div>
                  <p className="text-[11px] text-[#4338ca] mt-0.5">
                    Agent akan menggunakan model, provider, dan API Key yang telah dikonfigurasi secara terpusat untuk kantor ini.
                  </p>
                </div>

                <div>
                  <label className="block text-[#615042] text-[11px] font-bold mb-1.5">
                    Pilih Kategori Kemampuan LLM:
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { id: 'text' as LLMCategory, name: '📝 Teks, Coding & Arsitektur', desc: 'Penalaran logis & kode software' },
                      { id: 'image' as LLMCategory, name: '🎨 Generasi Gambar & Desain UI', desc: 'Mockup antarmuka & ilustrasi' },
                      { id: 'fast' as LLMCategory, name: '⚡ Eksekusi Cepat & Triage Task', desc: 'Audit kilat & respon instan' },
                      { id: 'vision' as LLMCategory, name: '👁️ Vision & Inspeksi UI/UX', desc: 'Tangkapan layar & review desain' },
                      { id: 'audio' as LLMCategory, name: '🎙️ Audio & Transkripsi Rapat', desc: 'Voice memo & audio meeting' },
                    ].map((cat) => {
                      const isSelected = selectedGlobalCategory === cat.id;
                      const catSetting = company?.globalLLMConfig?.[cat.id];
                      return (
                        <div
                          key={cat.id}
                          onClick={() => setSelectedGlobalCategory(cat.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#fffdf9] border-2 border-[#4f46e5] shadow-xs'
                              : 'bg-[#faf5eb] border-[#d6c5ad] hover:border-[#4f46e5]'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs text-[#2c231c]">{cat.name}</div>
                            <div className="text-[10px] text-[#786653]">{cat.desc}</div>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded bg-white text-[#4f46e5] border border-[#c7d2fe] font-mono text-[10px] font-bold block">
                              {catSetting?.model || 'gpt-4o'}
                            </span>
                            <span className="text-[9px] text-[#786653] font-mono">
                              via {catSetting?.provider || 'openai'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Preview Box of Selected Category */}
                {(() => {
                  const setting = company?.globalLLMConfig?.[selectedGlobalCategory];
                  return (
                    <div className="p-3 bg-[#fffdf9] rounded-xl border border-[#d6c5ad] space-y-1.5">
                      <div className="font-bold text-[#2c231c] flex items-center justify-between">
                        <span>Detail Model Global Terpilih:</span>
                        <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${setting?.isEnabled !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'}`}>
                          {setting?.isEnabled !== false ? '● Siap Digunakan' : '⚪ Nonaktif'}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-[#4f46e5] bg-[#eef2ff] px-2 py-1 rounded-md">
                        {setting?.provider?.toUpperCase() || 'OPENAI'} / {setting?.model || 'gpt-4o'}
                      </div>
                      <p className="text-[10px] text-[#786653]">
                        {setting?.description || 'Model default terkonfigurasi pada tingkat organisasi kantor.'}
                      </p>
                    </div>
                  );
                })()}

                {/* Action buttons for Global mode */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const setting = company?.globalLLMConfig?.[selectedGlobalCategory];
                      setTestState({ status: 'testing', message: 'Menguji model global...' });
                      try {
                        const res = await fetch('/api/agent/chat', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            config: {
                              provider: setting?.provider || 'openai',
                              baseUrl: setting?.baseUrl,
                              apiKey: setting?.apiKey,
                              model: setting?.model || 'gpt-4o',
                              isLocked: false,
                            },
                            isTestConnection: true,
                          }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          setTestState({ status: 'success', message: `Model global ${setting?.model} terhubung aktif!` });
                        } else {
                          setTestState({ status: 'error', message: data.error || 'Gagal terhubung' });
                        }
                      } catch (err: any) {
                        setTestState({ status: 'error', message: err.message || 'Error tes koneksi' });
                      }
                    }}
                    disabled={testState.status === 'testing'}
                    className="flex-1 py-2 bg-[#fffdf9] hover:bg-[#ede2d1] border border-[#d6c5ad] text-[#2c231c] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {testState.status === 'testing' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4f46e5]" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-[#4f46e5]" />
                    )}
                    <span>Tes Model Global</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyGlobalLLM(false)}
                    disabled={isApplyingGlobal}
                    className={`flex-1 py-2 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                      isApplyingGlobal
                        ? 'bg-[#4f46e5]/80 text-white cursor-wait opacity-90'
                        : appliedGlobalMsg
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                        : 'bg-[#4f46e5] hover:bg-[#4338ca] text-white active:scale-[0.98]'
                    }`}
                  >
                    {isApplyingGlobal ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Menerapkan...</span>
                      </>
                    ) : appliedGlobalMsg ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Tersimpan!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Terapkan ke {agent.name.split(' ')[0]}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyGlobalLLM(true)}
                    disabled={isApplyingGlobal}
                    title={`Terapkan LLM global ini ke seluruh agen di kantor ${company?.name || ''}`}
                    className="py-2 px-3 bg-[#f5efe6] hover:bg-[#ede2d1] border border-[#d6c5ad] text-[#2c231c] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs active:scale-[0.98] shrink-0"
                  >
                    <Users className="w-3.5 h-3.5 text-[#4f46e5]" />
                    <span>Ke Semua Agen</span>
                  </button>
                </div>

                {appliedGlobalMsg && (
                  <div className="p-2.5 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-[11px] font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{appliedGlobalMsg}</span>
                  </div>
                )}

                {testState.status === 'success' && (
                  <div className="p-2 rounded-lg bg-[#e6f4f2] border border-[#a2d8d0] text-[#1f6860] text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{testState.message}</span>
                  </div>
                )}
                {testState.status === 'error' && (
                  <div className="p-2 rounded-lg bg-[#fdf0f0] border border-[#f5c6c6] text-[#b93838] text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{testState.message}</span>
                  </div>
                )}
              </div>
            ) : (
              /* MODE 2: MANUAL BYOK CONFIGURATION */
              <form onSubmit={handleSaveLLM} className="space-y-3">
                <div className="p-2.5 rounded-xl bg-[#fffdf9] border border-[#d6c5ad] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-[#c68f23]" />
                    ) : (
                      <Unlock className="w-4 h-4 text-[#288279]" />
                    )}
                    <div>
                      <div className="font-semibold text-[#2c231c]">
                        {isLocked ? 'Provider Dikunci Kreator' : 'Kustom BYOK (Bawa Kunci Sendiri)'}
                      </div>
                      <div className="text-[10px] text-[#786653]">
                        {isLocked
                          ? 'Token ditanggung kreator agen via langganan'
                          : 'Kustomisasi endpoint, model, dan API Key khusus untuk agent ini saja'}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[#615042] text-[11px] mb-1 font-medium">Provider</label>
                  <select
                    disabled={isLocked}
                    value={provider}
                    onChange={(e) => {
                      const p = e.target.value as LLMConfig['provider'];
                      setProvider(p);
                      if (p === 'groq') {
                        setModel('llama-3.3-70b-versatile');
                        setBaseUrl('https://api.groq.com/openai/v1');
                      } else if (p === 'deepseek') {
                        setModel('deepseek-chat');
                        setBaseUrl('https://api.deepseek.com');
                      } else if (p === 'anthropic') {
                        setModel('claude-3-5-sonnet-20241022');
                        setBaseUrl('');
                      } else if (p === 'gemini') {
                        setModel('gemini-1.5-flash');
                        setBaseUrl('');
                      } else if (p === 'custom') {
                        setModel('llama3');
                        setBaseUrl('http://localhost:11434/v1');
                      } else {
                        setModel('gpt-4o');
                        setBaseUrl('https://api.openai.com/v1');
                      }
                    }}
                    className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c] disabled:opacity-60"
                  >
                    <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                    <option value="groq">Groq (Ultra-Fast Llama 3.3)</option>
                    <option value="deepseek">DeepSeek (V3 / R1)</option>
                    <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                    <option value="gemini">Google Gemini (1.5 Flash / Pro)</option>
                    <option value="custom">Custom (Ollama / vLLM / OpenRouter)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#615042] text-[11px] mb-1 font-medium">Model Name</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c] disabled:opacity-60 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[#615042] text-[11px] mb-1 font-medium">Base URL</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    placeholder="https://api.openai.com/v1"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c] font-mono text-[11px] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[#615042] text-[11px] mb-1 font-medium">API Key Anda</label>
                  <input
                    type="password"
                    disabled={isLocked}
                    placeholder={isLocked ? '••••••••••••••••' : 'sk-... (kunci pribadi Anda)'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c] font-mono text-[11px] disabled:opacity-60"
                  />
                </div>

                {/* Test Connection Button & Status */}
                <div className="pt-1 space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testState.status === 'testing'}
                      className="flex-1 py-1.5 bg-[#fffdf9] hover:bg-[#ede2d1] border border-[#d6c5ad] text-[#2c231c] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      {testState.status === 'testing' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c85a2b]" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-[#c85a2b]" />
                      )}
                      <span>Test Koneksi</span>
                    </button>

                    {!isLocked && (
                      <button
                        type="submit"
                        disabled={isSavingManual}
                        className={`flex-1 py-1.5 font-semibold rounded-lg flex items-center justify-center gap-1 transition-all shadow-xs ${
                          isSavingManual
                            ? 'bg-[#c85a2b]/80 text-white cursor-wait opacity-90'
                            : savedLLMMsg
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-[#c85a2b] hover:bg-[#b54d22] text-white active:scale-[0.98]'
                        }`}
                      >
                        {isSavingManual ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Menyimpan...</span>
                          </>
                        ) : savedLLMMsg ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Tersimpan!</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Simpan Manual</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {savedLLMMsg && (
                    <div className="p-2.5 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-[11px] font-semibold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>✓ Pengaturan LLM manual untuk {agent.name} berhasil disimpan dan aktif permanen!</span>
                    </div>
                  )}

                  {testState.status === 'success' && (
                    <div className="p-2 rounded-lg bg-[#e6f4f2] border border-[#a2d8d0] text-[#1f6860] text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>{testState.message}</span>
                    </div>
                  )}

                  {testState.status === 'error' && (
                    <div className="p-2 rounded-lg bg-[#fdf0f0] border border-[#f5c6c6] text-[#b93838] text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{testState.message}</span>
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 4: PROFILE & BIO */}
        {activeTab === 'bio' && (
          <div className="space-y-3">
            {/* Personality MBTI & Enneagram Profile */}
            {agent.personality && (
              <div className="p-3 bg-[#fdf2f8]/80 border-2 border-[#fbcfe8] rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#be185d]">
                    <Sparkles className="w-4 h-4 text-[#ec4899]" />
                    <span>MBTI: {agent.personality.mbti} • Enneagram: {agent.personality.enneagram}</span>
                  </div>
                  <span className="text-[10px] text-[#9d174d] font-bold bg-[#fce7f3] px-2 py-0.5 rounded-md font-mono">
                    {agent.personality.archetype}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-[#be185d] tracking-wider mb-0.5">
                    Gaya Bicara Unik
                  </div>
                  <div className="text-[11px] text-[#4a3b32] italic bg-white/70 p-2 rounded-lg border border-[#fbcfe8]">
                    &ldquo;{agent.personality.speakingStyle}&rdquo;
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-[#be185d] tracking-wider mb-1">
                    Ciri Karakter & Nilai
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.personality.traits.map((trait, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#fffdf9] text-[#be185d] border border-[#fbcfe8] text-[10px] font-semibold"
                      >
                        #{trait}
                      </span>
                    ))}
                  </div>
                </div>

                {agent.personality.interests && agent.personality.interests.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#be185d] tracking-wider mb-1">
                      Topik Favorit & Hobi
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {agent.personality.interests.map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-[#fdf2f8] text-[#701a75] border border-[#f5d0fe] text-[10px] font-mono"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="text-[10px] uppercase font-bold text-[#786653] tracking-wider mb-1">
                Karakteristik Visual & Fisik
              </div>
              <div className="grid grid-cols-2 gap-2 bg-[#fffdf9] p-2.5 rounded-lg border border-[#d6c5ad] text-xs">
                <div>
                  <span className="text-[#6e5d4f] text-[10px] block">Gender:</span>
                  <span className="font-bold text-[#2c231c]">
                    {agent.gender === 'female' || ['Rei', 'Yuki', 'Maya', 'Elena', 'Chloe', 'Sarah', 'Aurora', 'Sofia', 'Aria'].some((fn) => agent.name.includes(fn))
                      ? '♀ Perempuan'
                      : '♂ Laki-laki'}
                  </span>
                </div>
                <div>
                  <span className="text-[#6e5d4f] text-[10px] block">Gaya Rambut:</span>
                  <span className="font-mono font-bold text-[#2c231c] capitalize">
                    {agent.hairStyle || (agent.gender === 'female' ? 'Twintails' : 'Undercut')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: agent.hairColor || '#0f172a' }} />
                  <div>
                    <span className="text-[#6e5d4f] text-[10px] block">Warna Rambut</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: agent.eyeColor || (agent.gender === 'female' ? '#ec4899' : '#38bdf8') }} />
                  <div>
                    <span className="text-[#6e5d4f] text-[10px] block">Warna Mata</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#786653] tracking-wider mb-1">
                Bio & Persona
              </div>
              <p className="text-[#2c231c] leading-relaxed bg-[#fffdf9] p-2.5 rounded-lg border border-[#d6c5ad]">
                {agent.bio}
              </p>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#786653] tracking-wider mb-1.5">
                Keahlian & Kemampuan
              </div>
              <div className="flex flex-wrap gap-1.5">
                {agent.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-[#f0e3ce] text-[#784620] border border-[#dccab3] text-[11px] font-semibold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[#d6c5ad]">
              <div className="text-[10px] uppercase font-bold text-[#786653] tracking-wider mb-2">
                Statistik Kerja
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-[#fffdf9] p-2 rounded-lg border border-[#d6c5ad]">
                  <div className="text-base font-bold text-[#c85a2b]">{agent.stats.tasksCompleted}</div>
                  <div className="text-[10px] text-[#786653]">Tugas Selesai</div>
                </div>
                <div className="bg-[#fffdf9] p-2 rounded-lg border border-[#d6c5ad]">
                  <div className="text-base font-bold text-[#288279]">{agent.stats.linesOfCode}</div>
                  <div className="text-[10px] text-[#786653]">Baris Kode</div>
                </div>
                <div className="bg-[#fffdf9] p-2 rounded-lg border border-[#d6c5ad]">
                  <div className="text-base font-bold text-[#ab7a1a]">{agent.stats.wordsWritten}</div>
                  <div className="text-[10px] text-[#786653]">Kata Ditulis</div>
                </div>
                <div className="bg-[#fffdf9] p-2 rounded-lg border border-[#d6c5ad]">
                  <div className="text-base font-bold text-[#7d3b8f]">{agent.stats.collabCount}</div>
                  <div className="text-[10px] text-[#786653]">Kolaborasi Fisik</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
