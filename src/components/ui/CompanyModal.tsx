'use client';

import React, { useState, useEffect } from 'react';
import { Company, CompanyGlobalLLMConfig, LLMCategory, CategoryLLMSetting, LLMConfig, CompanyMemoryItem, CompanyLevelProgress, MemoryType, OfficeLayoutTemplateId } from '@/types/office';
import { PRESET_COMPANIES, generateCustomCompany, DEFAULT_SHADOWMOVE_GLOBAL_LLM, OFFICE_LAYOUT_TEMPLATES } from '@/lib/companyPresets';
import {
  X,
  Building2,
  Sparkles,
  Check,
  ArrowRight,
  Wand2,
  Cpu,
  Layers,
  Zap,
  Image as ImageIcon,
  Eye,
  Mic,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  Globe,
  Brain,
  Database,
  Trophy,
  Trash2,
  Search,
  Plus,
  Award,
  RefreshCw,
  BookOpen,
  LayoutGrid,
} from 'lucide-react';

interface CompanyModalProps {
  currentCompany: Company;
  onClose: () => void;
  onSelectCompany: (company: Company) => void;
  onUpdateCompanyLLMConfig?: (config: CompanyGlobalLLMConfig) => void;
  initialTab?: 'presets' | 'custom' | 'layout' | 'global_llm' | 'memory';
}

const CATEGORY_META: Record<
  LLMCategory,
  {
    name: string;
    icon: any;
    color: string;
    description: string;
    modelSuggestions: string[];
    defaultModel: string;
  }
> = {
  text: {
    name: 'Text, Code & Architecture',
    icon: Cpu,
    color: '#4f46e5',
    description: 'Core model for logical reasoning, code refactoring, system architecture, and sprint dialogues.',
    modelSuggestions: ['gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro', 'deepseek-chat'],
    defaultModel: 'gpt-4o',
  },
  image: {
    name: 'Image Generation & UI Design',
    icon: ImageIcon,
    color: '#ec4899',
    description: 'Visual generative model for graphic assets, interface mockups, moodboards, and illustrations.',
    modelSuggestions: ['dall-e-3', 'stable-diffusion-xl', 'midjourney-v6'],
    defaultModel: 'dall-e-3',
  },
  fast: {
    name: 'Fast Execution & Task Triage',
    icon: Zap,
    color: '#eab308',
    description: 'Ultra-fast low-latency model for instant ticket triage, rapid audits, and action routing.',
    modelSuggestions: ['llama-3.3-70b-versatile', 'gemini-1.5-flash', 'gpt-4o-mini'],
    defaultModel: 'llama-3.3-70b-versatile',
  },
  vision: {
    name: 'Vision & UI/UX Inspection',
    icon: Eye,
    color: '#06b6d4',
    description: 'Multimodal model for visual auditing of mobile/desktop layouts and screenshot analysis.',
    modelSuggestions: ['claude-3-5-sonnet-20241022', 'gpt-4o', 'gemini-1.5-pro'],
    defaultModel: 'claude-3-5-sonnet-20241022',
  },
  audio: {
    name: 'Audio & Meeting Transcription',
    icon: Mic,
    color: '#10b981',
    description: 'Audio transcription for sprint standups, war room voice chats, and audio memos.',
    modelSuggestions: ['whisper-1', 'elevenlabs-multilingual'],
    defaultModel: 'whisper-1',
  },
};

export const CompanyModal: React.FC<CompanyModalProps> = ({
  currentCompany,
  onClose,
  onSelectCompany,
  onUpdateCompanyLLMConfig,
  initialTab = 'presets',
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'layout' | 'global_llm' | 'memory'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [selectedLayout, setSelectedLayout] = useState<OfficeLayoutTemplateId>(currentCompany.officeLayoutTemplate || 'tech_startup');
  const [customLayout, setCustomLayout] = useState<OfficeLayoutTemplateId>('tech_startup');
  const [customName, setCustomName] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [agentCount, setAgentCount] = useState<number>(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatusMsg, setGenStatusMsg] = useState('');

  // LLM Option for new company generation
  const [llmSourceOption, setLlmSourceOption] = useState<'global' | 'custom' | 'template'>('global');
  const [newCompanyProvider, setNewCompanyProvider] = useState<string>('openai');
  const [newCompanyModel, setNewCompanyModel] = useState<string>('gpt-4o');
  const [newCompanyApiKey, setNewCompanyApiKey] = useState<string>('');
  const [newCompanyBaseUrl, setNewCompanyBaseUrl] = useState<string>('');

  // Global LLM Config state
  const [globalLLM, setGlobalLLM] = useState<CompanyGlobalLLMConfig>(() => ({
    ...DEFAULT_SHADOWMOVE_GLOBAL_LLM,
    ...(currentCompany.globalLLMConfig || {}),
  }));
  const [activeCategory, setActiveCategory] = useState<LLMCategory>('text');
  const [isSavingLLM, setIsSavingLLM] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<{ [cat in LLMCategory]?: { loading?: boolean; success?: boolean; msg?: string } }>({});

  useEffect(() => {
    if (currentCompany?.globalLLMConfig) {
      setGlobalLLM((prev) => ({
        ...DEFAULT_SHADOWMOVE_GLOBAL_LLM,
        ...currentCompany.globalLLMConfig,
      }));
    }
  }, [currentCompany?.id, currentCompany?.globalLLMConfig]);

  // Memory & Progression State
  const [memories, setMemories] = useState<CompanyMemoryItem[]>([]);
  const [memoryProgress, setMemoryProgress] = useState<CompanyLevelProgress | null>(null);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [memorySearchQuery, setMemorySearchQuery] = useState('');
  const [memoryFilterType, setMemoryFilterType] = useState<string>('all');
  const [newLoreTitle, setNewLoreTitle] = useState('');
  const [newLoreContent, setNewLoreContent] = useState('');
  const [newLoreType, setNewLoreType] = useState<MemoryType>('lore');
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [memoryNotice, setMemoryNotice] = useState<string>('');

  const fetchCompanyMemories = async (query?: string) => {
    if (!currentCompany?.id) return;
    setIsLoadingMemories(true);
    try {
      const url = query && query.trim()
        ? `/api/company/memory?companyId=${currentCompany.id}&query=${encodeURIComponent(query.trim())}`
        : `/api/company/memory?companyId=${currentCompany.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMemories(data.memories || []);
        if (data.progress) setMemoryProgress(data.progress);
      }
    } catch (e) {
      console.error('Failed to load company memories:', e);
    } finally {
      setIsLoadingMemories(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'memory' && currentCompany?.id) {
      fetchCompanyMemories();
    }
  }, [activeTab, currentCompany?.id]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoreTitle.trim() || !newLoreContent.trim()) return;
    setIsAddingMemory(true);
    try {
      const res = await fetch('/api/company/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: currentCompany.id,
          action: 'add',
          memory: {
            title: newLoreTitle.trim(),
            content: newLoreContent.trim(),
            type: newLoreType,
            tags: ['manual', newLoreType],
            authorAgent: 'Founder',
            importance: 8,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewLoreTitle('');
        setNewLoreContent('');
        setMemoryNotice('✨ Memory indexed to company Vector DB!');
        setTimeout(() => setMemoryNotice(''), 3000);
        fetchCompanyMemories();
      }
    } catch (e) {
      console.error('Error adding memory:', e);
    } finally {
      setIsAddingMemory(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!confirm('Delete this memory entry from company archives?')) return;
    try {
      const res = await fetch(`/api/company/memory?companyId=${currentCompany.id}&memoryId=${memoryId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
        fetchCompanyMemories();
      }
    } catch (e) {
      console.error('Error deleting memory:', e);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customIndustry.trim()) return;

    setIsGenerating(true);
    setGenStatusMsg('Contacting AI to architect office structure...');

    let selectedConfig: LLMConfig | undefined = undefined;
    if (llmSourceOption === 'global') {
      const textSetting = globalLLM.text;
      if (textSetting && textSetting.isEnabled) {
        selectedConfig = {
          provider: textSetting.provider,
          baseUrl: textSetting.baseUrl,
          apiKey: textSetting.apiKey,
          model: textSetting.model,
          isLocked: false,
        };
      }
    } else if (llmSourceOption === 'custom') {
      selectedConfig = {
        provider: newCompanyProvider as any,
        baseUrl: newCompanyBaseUrl || undefined,
        apiKey: newCompanyApiKey || undefined,
        model: newCompanyModel || 'gpt-4o',
        isLocked: false,
      };
    }

    try {
      setGenStatusMsg('Composing departments, employee personas & sprint tickets...');
      const res = await fetch('/api/company/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName,
          industry: customIndustry,
          agentCount,
          config: selectedConfig,
          layoutTemplate: customLayout,
        }),
      });

      const data = await res.json();
      if (data.success && data.company) {
        onSelectCompany(data.company);
        setIsGenerating(false);
        onClose();
        return;
      }
    } catch (err) {
      console.error('Error calling /api/company/generate:', err);
    }

    // Fallback if needed
    const generated = generateCustomCompany(customName, customIndustry, customLayout);
    onSelectCompany(generated);
    setIsGenerating(false);
    onClose();
  };

  const currentCategorySetting: CategoryLLMSetting = globalLLM[activeCategory] || {
    provider: 'openai',
    model: CATEGORY_META[activeCategory].defaultModel,
    description: CATEGORY_META[activeCategory].description,
    isEnabled: true,
  };

  const updateActiveCategorySetting = (patch: Partial<CategoryLLMSetting>) => {
    setGlobalLLM((prev) => ({
      ...prev,
      [activeCategory]: {
        ...currentCategorySetting,
        ...patch,
      },
    }));
  };

  const handleSaveGlobalLLM = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingLLM(true);
    setSaveSuccessMsg(null);

    try {
      const safeModel = currentCategorySetting.model?.trim() || CATEGORY_META[activeCategory].defaultModel;
      const updatedCategorySetting: CategoryLLMSetting = {
        ...currentCategorySetting,
        model: safeModel,
      };

      const fullConfig: CompanyGlobalLLMConfig = {
        ...DEFAULT_SHADOWMOVE_GLOBAL_LLM,
        ...globalLLM,
        [activeCategory]: updatedCategorySetting,
      };

      setGlobalLLM(fullConfig);

      // Call parent updater
      await Promise.resolve(onUpdateCompanyLLMConfig?.(fullConfig));

      // Realistic visual feedback delay so loading is clearly perceived
      await new Promise((resolve) => setTimeout(resolve, 500));

      setIsSavingLLM(false);
      setSaveSuccessMsg(`Global LLM settings for "${currentCompany.name}" successfully saved and applied to all agents!`);

      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 5000);
    } catch (err: any) {
      setIsSavingLLM(false);
      console.error('Error saving global LLM settings:', err);
    }
  };

  const handleTestCategoryConnection = async () => {
    const setting = currentCategorySetting;
    setTestStatus((prev) => ({
      ...prev,
      [activeCategory]: { loading: true, msg: 'Testing connection...' },
    }));

    try {
      const testConfig: LLMConfig = {
        provider: setting.provider,
        baseUrl: setting.baseUrl,
        apiKey: setting.apiKey,
        model: setting.model,
        isLocked: false,
      };

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: testConfig,
          isTestConnection: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestStatus((prev) => ({
          ...prev,
          [activeCategory]: {
            loading: false,
            success: true,
            msg: `Successfully connected to ${data.provider} (${data.model})!`,
          },
        }));
      } else {
        setTestStatus((prev) => ({
          ...prev,
          [activeCategory]: {
            loading: false,
            success: false,
            msg: data.error || 'Failed to reach model endpoint',
          },
        }));
      }
    } catch (err: any) {
      setTestStatus((prev) => ({
        ...prev,
        [activeCategory]: {
          loading: false,
          success: false,
          msg: err.message || 'Network connection error',
        },
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-[#2c231c]/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden text-[#2c231c] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5] shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#2c231c]">
                  Company & Workspace Setup
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5] font-bold font-mono">
                  {currentCompany.name}
                </span>
              </div>
              <p className="text-xs text-[#786653]">
                Manage office presets, create new companies, configure Global LLM providers, or review team memory & leveling.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-[#d6c5ad] bg-[#faf5eb] text-xs font-semibold overflow-x-auto shrink-0 z-10 scrollbar-none">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 min-w-[120px] py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'presets'
                ? 'border-[#c85a2b] text-[#c85a2b] bg-[#fffdf9] font-bold shadow-xs'
                : 'border-transparent text-[#786653] hover:text-[#2c231c] hover:bg-[#f4ebe1]/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Office Presets</span>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 min-w-[130px] py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'custom'
                ? 'border-[#c85a2b] text-[#c85a2b] bg-[#fffdf9] font-bold shadow-xs'
                : 'border-transparent text-[#786653] hover:text-[#2c231c] hover:bg-[#f4ebe1]/60'
            }`}
          >
            <Wand2 className="w-4 h-4 text-[#ab7a1a]" />
            <span>Create Company</span>
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`flex-1 min-w-[130px] py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'layout'
                ? 'border-[#c85a2b] text-[#c85a2b] bg-[#fffdf9] font-bold shadow-xs'
                : 'border-transparent text-[#786653] hover:text-[#2c231c] hover:bg-[#f4ebe1]/60'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-[#c85a2b]" />
            <span>Office Layout</span>
          </button>
          <button
            onClick={() => setActiveTab('global_llm')}
            className={`flex-1 min-w-[140px] py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'global_llm'
                ? 'border-[#4f46e5] text-[#4f46e5] bg-[#fffdf9] font-bold shadow-xs'
                : 'border-transparent text-[#786653] hover:text-[#2c231c] hover:bg-[#f4ebe1]/60'
            }`}
          >
            <Cpu className="w-4 h-4 text-[#4f46e5]" />
            <span>Global LLM</span>
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`flex-1 min-w-[140px] py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'memory'
                ? 'border-[#059669] text-[#059669] bg-[#fffdf9] font-bold shadow-xs'
                : 'border-transparent text-[#786653] hover:text-[#2c231c] hover:bg-[#f4ebe1]/60'
            }`}
          >
            <Brain className="w-4 h-4 text-[#059669]" />
            <span>🧠 Memory & Leveling</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto min-h-0">
          {activeTab === 'presets' ? (
            <div className="space-y-3.5">
              <div className="text-xs text-[#786653] mb-2 font-medium">
                Select a curated organization template to deploy departments, team members, and sprint workflows:
              </div>
              {PRESET_COMPANIES.map((preset) => {
                const isSelected = preset.id === currentCompany.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      onSelectCompany(preset);
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start justify-between ${
                      isSelected
                        ? 'bg-[#fdeed9] border-2 border-[#c85a2b] shadow-xs'
                        : 'bg-[#fffdf9] border-[#d6c5ad] hover:border-[#c85a2b]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#2c231c] text-sm">{preset.name}</span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5] text-[10px] flex items-center gap-1 font-bold">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#c85a2b] font-semibold">{preset.industry}</div>
                      <p className="text-xs text-[#615042]">{preset.description}</p>
                      <div className="flex items-center gap-3 pt-2 text-[11px] text-[#786653] font-medium">
                        <span>👥 {preset.agents.length} Agents</span>
                        <span>🏢 {preset.departments.length} Departments</span>
                        <span>📋 {preset.tasks.length} Sprint Tickets</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#786653] mt-2 shrink-0" />
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'custom' ? (
            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              <div className="p-3 bg-[#fef8e7] border border-[#fae4a8] rounded-xl text-[#784620] flex items-start gap-2.5 font-medium">
                <Sparkles className="w-4 h-4 text-[#ab7a1a] shrink-0 mt-0.5" />
                <p>
                  AI will automatically architect departments, employee personas (MBTI, bio, skills), 3D desk layout, and initial sprint backlog tailored to your industry.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#615042] font-semibold mb-1.5">Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DentalCare AI, Apex Cyberlabs"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-xl px-3.5 py-2.5 text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b]"
                  />
                </div>

                <div>
                  <label className="block text-[#615042] font-semibold mb-1.5">Number of Employees / Agents</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAgentCount(num)}
                        className={`py-2 rounded-xl font-bold transition-all border text-center ${
                          agentCount === num
                            ? 'bg-[#c85a2b] text-white border-[#c85a2b] shadow-xs'
                            : 'bg-[#fffdf9] text-[#615042] border-[#d6c5ad] hover:border-[#c85a2b]'
                        }`}
                      >
                        {num} Agents
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[#615042] font-semibold mb-1.5">Industry & Specialization</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Digital Dental Clinic, Autonomous Robotics, E-commerce Logistics"
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-xl px-3.5 py-2.5 text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b]"
                />
              </div>

              {/* LLM Engine Selection */}
              <div className="border border-[#e7dacb] rounded-2xl p-3 bg-[#f8f1e7] space-y-3">
                <label className="block text-[#615042] font-bold">
                  Select LLM Engine to Architect Office:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLlmSourceOption('global')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      llmSourceOption === 'global'
                        ? 'bg-[#fffdf9] border-2 border-[#c85a2b] shadow-xs'
                        : 'bg-[#f4ebe1] border-[#d6c5ad] hover:border-[#c85a2b]'
                    }`}
                  >
                    <div className="font-bold text-[#2c231c] flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#c85a2b]" /> Global LLM
                    </div>
                    <div className="text-[10px] text-[#786653] mt-0.5">
                      {globalLLM.text?.provider || 'openai'} ({globalLLM.text?.model || 'gpt-4o'})
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLlmSourceOption('custom')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      llmSourceOption === 'custom'
                        ? 'bg-[#fffdf9] border-2 border-[#c85a2b] shadow-xs'
                        : 'bg-[#f4ebe1] border-[#d6c5ad] hover:border-[#c85a2b]'
                    }`}
                  >
                    <div className="font-bold text-[#2c231c] flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#4f46e5]" /> Custom BYOK
                    </div>
                    <div className="text-[10px] text-[#786653] mt-0.5">
                      Direct API Key / Provider input
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLlmSourceOption('template')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      llmSourceOption === 'template'
                        ? 'bg-[#fffdf9] border-2 border-[#c85a2b] shadow-xs'
                        : 'bg-[#f4ebe1] border-[#d6c5ad] hover:border-[#c85a2b]'
                    }`}
                  >
                    <div className="font-bold text-[#2c231c] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#d97706]" /> Instant Template
                    </div>
                    <div className="text-[10px] text-[#786653] mt-0.5">
                      Intelligent generator without API quotas
                    </div>
                  </button>
                </div>

                {/* BYOK Custom Fields if selected */}
                {llmSourceOption === 'custom' && (
                  <div className="p-3 bg-[#fffdf9] border border-[#d6c5ad] rounded-xl space-y-2.5 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#615042] mb-1">Provider</label>
                        <select
                          value={newCompanyProvider}
                          onChange={(e) => setNewCompanyProvider(e.target.value)}
                          className="w-full bg-[#faf5eb] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c] font-medium"
                        >
                          <option value="openai">OpenAI</option>
                          <option value="groq">Groq</option>
                          <option value="anthropic">Anthropic (Claude)</option>
                          <option value="gemini">Google Gemini</option>
                          <option value="deepseek">DeepSeek</option>
                          <option value="custom">Custom / Local (Ollama/vLLM)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#615042] mb-1">Model</label>
                        <input
                          type="text"
                          value={newCompanyModel}
                          onChange={(e) => setNewCompanyModel(e.target.value)}
                          placeholder="Contoh: gpt-4o, llama-3.3-70b"
                          className="w-full bg-[#faf5eb] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#615042] mb-1">API Key</label>
                      <input
                        type="password"
                        value={newCompanyApiKey}
                        onChange={(e) => setNewCompanyApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-[#faf5eb] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c] font-mono"
                      />
                    </div>

                    {newCompanyProvider === 'custom' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-[#615042] mb-1">Base URL</label>
                        <input
                          type="text"
                          value={newCompanyBaseUrl}
                          onChange={(e) => setNewCompanyBaseUrl(e.target.value)}
                          placeholder="http://localhost:11434/v1"
                          className="w-full bg-[#faf5eb] border border-[#d6c5ad] rounded-lg px-2.5 py-1.5 text-[#2c231c] font-mono"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Template Layout Selection for Custom Company */}
              <div className="border border-[#e7dacb] rounded-2xl p-3 bg-[#f8f1e7] space-y-2.5">
                <label className="block text-[#615042] font-bold">
                  Select Interior Architectural Layout Template:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {OFFICE_LAYOUT_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setCustomLayout(tmpl.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        customLayout === tmpl.id
                          ? 'bg-[#fffdf9] border-2 border-[#c85a2b] shadow-xs ring-1 ring-[#c85a2b]/30'
                          : 'bg-[#f4ebe1] border-[#d6c5ad] hover:border-[#c85a2b]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#2c231c]">
                        <span>{tmpl.icon}</span>
                        <span className="truncate">{tmpl.name}</span>
                      </div>
                      <div className="text-[10px] text-[#786653] truncate mt-0.5">
                        {tmpl.tagline}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full mt-2 py-3 bg-[#c85a2b] hover:bg-[#b54d22] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{genStatusMsg || 'Building Office & Agent Team...'}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate & Launch New Office</span>
                  </>
                )}
              </button>
            </form>
          ) : activeTab === 'layout' ? (
            /* TAB: OFFICE LAYOUT TEMPLATES */
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-[#fdf5eb] border border-[#e8ba8c] rounded-xl text-[#78350f] flex items-start justify-between gap-3 font-medium">
                <div className="flex items-start gap-2.5">
                  <LayoutGrid className="w-4 h-4 text-[#c85a2b] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm text-[#2c231c]">
                      Select Office Layout & Architecture: {currentCompany.name}
                    </p>
                    <p className="text-[11px] text-[#786653] mt-0.5">
                      Every company possesses a distinct identity and operational flow. Select a specialized interior template to apply instantly to your 2.5D office.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {OFFICE_LAYOUT_TEMPLATES.map((tmpl) => {
                  const isCurrent = (currentCompany.officeLayoutTemplate || 'tech_startup') === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => {
                        setSelectedLayout(tmpl.id);
                        onSelectCompany({
                          ...currentCompany,
                          officeLayoutTemplate: tmpl.id,
                        });
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-[#fffdf9] border-[#c85a2b] shadow-md ring-2 ring-[#c85a2b]/20'
                          : 'bg-[#faf5eb] border-[#d6c5ad] hover:border-[#c85a2b] hover:bg-[#fffdf9]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl p-1.5 rounded-xl bg-white border border-[#d6c5ad] shadow-2xs">
                              {tmpl.icon}
                            </span>
                            <div>
                              <div className="font-bold text-xs text-[#2c231c]">{tmpl.name}</div>
                              <div className="text-[10px] text-[#786653] font-medium">{tmpl.tagline}</div>
                            </div>
                          </div>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                            style={{
                              backgroundColor: `${tmpl.color}15`,
                              color: tmpl.color,
                              borderColor: `${tmpl.color}40`,
                            }}
                          >
                            {tmpl.badge}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#4d3c2e] leading-relaxed mb-3">
                          {tmpl.description}
                        </p>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {tmpl.highlights.map((h, i) => (
                            <span
                              key={i}
                              className="text-[9px] px-2 py-0.5 rounded-md bg-[#f4ebe1] text-[#615042] border border-[#d6c5ad] font-medium"
                            >
                              • {h}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-[#d6c5ad] flex items-center justify-between">
                        {isCurrent ? (
                          <span className="text-xs font-bold text-[#c85a2b] flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-[#c85a2b]" />
                            Currently Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="text-xs font-semibold text-[#786653] hover:text-[#c85a2b] flex items-center gap-1 transition-colors"
                          >
                            Apply This Layout &rarr;
                          </button>
                        )}
                        <span className="text-[10px] text-[#a8947e] font-mono">33x24 Standard Parcel</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'global_llm' ? (
            /* TAB 3: GLOBAL LLM PROVIDER SETTING PER CATEGORY */
            <form onSubmit={handleSaveGlobalLLM} className="space-y-4 text-xs">
              {/* Introduction Banner */}
              <div className="p-3 bg-[#eef2ff] border border-[#c7d2fe] rounded-xl text-[#312e81] flex items-start justify-between gap-3 font-medium">
                <div className="flex items-start gap-2.5">
                  <Cpu className="w-4 h-4 text-[#4f46e5] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      Global Office LLM Provider Setup: {currentCompany.name}
                    </p>
                    <p className="text-[11px] text-[#4338ca] mt-0.5">
                      Configure the default AI model for each capability category. Every agent in this company can automatically inherit these settings or override them individually.
                    </p>
                  </div>
                </div>
                {saveSuccessMsg && (
                  <span className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saved & Applied!
                  </span>
                )}
              </div>

              {/* Category Pills Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.keys(CATEGORY_META) as LLMCategory[]).map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const Icon = meta.icon;
                  const isSelected = activeCategory === cat;
                  const catSetting = globalLLM[cat];
                  const isEnabled = catSetting?.isEnabled ?? true;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#fffdf9] border-2 border-[#4f46e5] shadow-xs'
                          : 'bg-[#faf5eb] border-[#d6c5ad] hover:border-[#4f46e5]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon className="w-4 h-4" style={{ color: meta.color }} />
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isEnabled ? 'bg-emerald-500' : 'bg-stone-300'
                          }`}
                        />
                      </div>
                      <div className="font-bold text-[11px] truncate text-[#2c231c]">
                        {cat === 'text'
                          ? '📝 Text & Code'
                          : cat === 'image'
                          ? '🎨 Images'
                          : cat === 'fast'
                          ? '⚡ Fast/Triage'
                          : cat === 'vision'
                          ? '👁️ Vision UI'
                          : '🎙️ Audio'}
                      </div>
                      <div className="text-[9px] font-mono text-[#786653] truncate mt-0.5">
                        {catSetting?.model || meta.defaultModel}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Category Config Card */}
              <div className="bg-[#fffdf9] p-4 rounded-2xl border border-[#d6c5ad] space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#d6c5ad] pb-2.5">
                  <div className="flex items-center gap-2">
                    {React.createElement(CATEGORY_META[activeCategory].icon, {
                      className: 'w-4 h-4',
                      style: { color: CATEGORY_META[activeCategory].color },
                    })}
                    <div>
                      <h4 className="font-bold text-[#2c231c] text-xs">
                        Category: {CATEGORY_META[activeCategory].name}
                      </h4>
                      <p className="text-[10px] text-[#786653]">
                        {CATEGORY_META[activeCategory].description}
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[11px] font-semibold text-[#5c4939]">
                      {currentCategorySetting.isEnabled ? 'Active' : 'Inactive'}
                    </span>
                    <input
                      type="checkbox"
                      checked={currentCategorySetting.isEnabled ?? true}
                      onChange={(e) => updateActiveCategorySetting({ isEnabled: e.target.checked })}
                      className="w-4 h-4 accent-[#4f46e5] cursor-pointer"
                    />
                  </label>
                </div>

                {/* Provider Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#615042] font-semibold mb-1">
                      Provider Engine
                    </label>
                    <select
                      value={currentCategorySetting.provider}
                      onChange={(e) => {
                        const p = e.target.value as CategoryLLMSetting['provider'];
                        let defModel = 'gpt-4o';
                        let defBaseUrl: string | undefined = undefined;
                        if (p === 'groq') {
                          defModel = 'llama-3.3-70b-versatile';
                          defBaseUrl = 'https://api.groq.com/openai/v1';
                        } else if (p === 'deepseek') {
                          defModel = 'deepseek-chat';
                          defBaseUrl = 'https://api.deepseek.com';
                        } else if (p === 'anthropic') {
                          defModel = 'claude-3-5-sonnet-20241022';
                        } else if (p === 'gemini') {
                          defModel = 'gemini-1.5-flash';
                        } else if (p === 'custom') {
                          defModel = 'llama3';
                          defBaseUrl = 'http://localhost:11434/v1';
                        }
                        updateActiveCategorySetting({ provider: p, model: defModel, baseUrl: defBaseUrl });
                      }}
                      className="w-full bg-white border border-[#d6c5ad] rounded-xl px-3 py-2 text-[#2c231c] font-medium focus:outline-none focus:border-[#4f46e5]"
                    >
                      <option value="openai">OpenAI (GPT-4o / DALL-E / Whisper)</option>
                      <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                      <option value="gemini">Google Gemini (1.5 Pro / Flash)</option>
                      <option value="groq">Groq (Ultra-Fast Llama 3.3)</option>
                      <option value="deepseek">DeepSeek (V3 / R1)</option>
                      <option value="custom">Custom (BYOK / Ollama / Local Endpoint)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#615042] font-semibold mb-1">
                      Model Name
                    </label>
                    <input
                      type="text"
                      required
                      value={currentCategorySetting.model}
                      onChange={(e) => updateActiveCategorySetting({ model: e.target.value })}
                      className="w-full bg-white border border-[#d6c5ad] rounded-xl px-3 py-2 text-[#2c231c] font-mono text-xs focus:outline-none focus:border-[#4f46e5]"
                    />
                  </div>
                </div>

                {/* Quick Model Recommendation Chips */}
                <div>
                  <span className="text-[10px] text-[#786653] font-medium block mb-1">
                    Popular Model Recommendations:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_META[activeCategory].modelSuggestions.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updateActiveCategorySetting({ model: m })}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono transition-colors ${
                          currentCategorySetting.model === m
                            ? 'bg-[#4f46e5] text-white border-[#4f46e5] font-bold'
                            : 'bg-white hover:bg-[#ede2d1] text-[#4f46e5] border-[#c7d2fe]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Base URL (Optional) */}
                <div>
                  <label className="block text-[#615042] font-semibold mb-1 flex items-center justify-between">
                    <span>Base URL (Optional)</span>
                    <span className="text-[10px] text-[#786653] font-normal">
                      Leave blank for official provider endpoint
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. https://api.openai.com/v1 or http://localhost:11434/v1"
                    value={currentCategorySetting.baseUrl || ''}
                    onChange={(e) => updateActiveCategorySetting({ baseUrl: e.target.value || undefined })}
                    className="w-full bg-white border border-[#d6c5ad] rounded-xl px-3 py-2 text-[#2c231c] font-mono text-[11px] focus:outline-none focus:border-[#4f46e5]"
                  />
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-[#615042] font-semibold mb-1 flex items-center justify-between">
                    <span>Private / Company API Key</span>
                    <span className="text-[10px] text-[#786653] font-normal">
                      Stored securely in per-company profile
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="sk-••••••••••••••••••••••••"
                      value={currentCategorySetting.apiKey || ''}
                      onChange={(e) => updateActiveCategorySetting({ apiKey: e.target.value || undefined })}
                      className="w-full bg-white border border-[#d6c5ad] rounded-xl px-3 py-2 text-[#2c231c] font-mono text-[11px] focus:outline-none focus:border-[#4f46e5]"
                    />
                  </div>
                </div>

                {/* Test Feedback */}
                {testStatus[activeCategory]?.msg && (
                  <div
                    className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                      testStatus[activeCategory]?.success
                        ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]'
                        : 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]'
                    }`}
                  >
                    {testStatus[activeCategory]?.loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4f46e5]" />
                    ) : testStatus[activeCategory]?.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{testStatus[activeCategory]?.msg}</span>
                  </div>
                )}

                {/* Category Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestCategoryConnection}
                    disabled={testStatus[activeCategory]?.loading}
                    className="flex-1 py-2 bg-[#f4ebe1] hover:bg-[#ede2d1] border border-[#d6c5ad] text-[#2c231c] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {testStatus[activeCategory]?.loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4f46e5]" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-[#4f46e5]" />
                    )}
                    <span>Test Connection: {CATEGORY_META[activeCategory].name.split(' ')[0]}</span>
                  </button>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#d6c5ad]/60">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#5c4939] hover:bg-[#ede2d1] transition-colors"
                  >
                    Close
                  </button>
                  {saveSuccessMsg && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-xs font-semibold animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate max-w-[280px] sm:max-w-md">{saveSuccessMsg}</span>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSavingLLM}
                  className={`px-5 py-2.5 font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 shrink-0 ${
                    isSavingLLM
                      ? 'bg-[#4f46e5]/80 text-white cursor-wait opacity-90'
                      : saveSuccessMsg
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                      : 'bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-indigo-500/20 active:scale-[0.98]'
                  }`}
                >
                  {isSavingLLM ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving Settings...</span>
                    </>
                  ) : saveSuccessMsg ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Saved & Applied!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save All Global LLM Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : activeTab === 'memory' ? (
            <div className="space-y-5">
              {/* Notification Banner */}
              {memoryNotice && (
                <div className="p-3 bg-[#e6f4ea] border border-[#34a853] text-[#137333] rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#137333]" />
                  <span>{memoryNotice}</span>
                </div>
              )}

              {/* Company Level & Progression Header */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#1a1512] via-[#2c221a] to-[#120f0c] text-white shadow-md border border-[#3d3126]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#f59e0b] to-[#fbbf24] flex items-center justify-center text-[#1a1512] font-black text-xl shadow-lg ring-2 ring-[#f59e0b]/40 shrink-0">
                      <Trophy className="w-5 h-5 text-[#1a1512]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#fbbf24]">
                          LEVEL {memoryProgress?.level || 1}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3d3126] text-[#e0cfbe] font-medium">
                          {currentCompany.name}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-[#fdf6e2]">
                        {memoryProgress?.levelTitle || 'Visionary Startup'}
                      </h3>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-xs text-[#c5b29f]">Total Experience (XP)</div>
                    <div className="text-base sm:text-lg font-black text-[#fbbf24]">
                      {memoryProgress?.xp || 0}{' '}
                      <span className="text-xs font-normal text-[#9e8b78]">
                        / {memoryProgress?.nextLevelXp || 1000} XP
                      </span>
                    </div>
                  </div>
                </div>

                {/* XP Progress Bar */}
                <div className="w-full bg-[#3d3126] rounded-full h-2.5 overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-[#f59e0b] to-[#10b981] h-full rounded-full transition-all duration-500 shadow-sm"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          6,
                          Math.round(
                            ((memoryProgress?.xp || 0) / (memoryProgress?.nextLevelXp || 1000)) * 100
                          )
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#9e8b78] mt-1.5 font-mono">
                  <span>Progress to Next Level</span>
                  <span>
                    {Math.round(
                      ((memoryProgress?.xp || 0) / (memoryProgress?.nextLevelXp || 1000)) * 100
                    )}
                    %
                  </span>
                </div>

                {/* Quick stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5 pt-3.5 border-t border-[#3d3126]/80 text-xs">
                  <div className="bg-[#241c15] p-2.5 rounded-xl border border-[#3d3126]">
                    <div className="text-[10px] text-[#9e8b78] flex items-center gap-1">
                      <Brain className="w-3 h-3 text-[#10b981]" /> Indexed Memories
                    </div>
                    <div className="text-sm font-bold text-[#fdf6e2] mt-0.5">
                      {memoryProgress?.totalMemoriesCount || memories.length} Items
                    </div>
                  </div>
                  <div className="bg-[#241c15] p-2.5 rounded-xl border border-[#3d3126]">
                    <div className="text-[10px] text-[#9e8b78] flex items-center gap-1">
                      <Award className="w-3 h-3 text-[#f59e0b]" /> Completed Tasks
                    </div>
                    <div className="text-sm font-bold text-[#fdf6e2] mt-0.5">
                      {memoryProgress?.totalTasksCompleted || 0} Tickets
                    </div>
                  </div>
                  <div className="bg-[#241c15] p-2.5 rounded-xl border border-[#3d3126]">
                    <div className="text-[10px] text-[#9e8b78] flex items-center gap-1">
                      <Database className="w-3 h-3 text-[#06b6d4]" /> Vector Engine
                    </div>
                    <div className="text-xs font-semibold text-[#34d399] mt-0.5">
                      Dual-Mode Active
                    </div>
                  </div>
                  <div className="bg-[#241c15] p-2.5 rounded-xl border border-[#3d3126]">
                    <div className="text-[10px] text-[#9e8b78] flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#a855f7]" /> Tenant Isolation
                    </div>
                    <div className="text-xs font-semibold text-[#fdf6e2] mt-0.5 truncate">
                      {currentCompany.id}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Column Responsive Layout for Memory & Knowledge Management */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column (7 cols): Search & Memory Archives */}
                <div className="lg:col-span-7 space-y-3.5">
                  {/* Semantic Vector Search Test */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#2c231c] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-[#059669]" />
                        Semantic Vector Search & Memory Recall (Cosine Similarity)
                      </span>
                      {memorySearchQuery && (
                        <button
                          onClick={() => {
                            setMemorySearchQuery('');
                            fetchCompanyMemories();
                          }}
                          className="text-[11px] text-[#c85a2b] hover:underline"
                        >
                          Reset Filter
                        </button>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={memorySearchQuery}
                          onChange={(e) => setMemorySearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              fetchCompanyMemories(memorySearchQuery);
                            }
                          }}
                          placeholder="Search lore, SOPs, architecture, bugs, etc..."
                          className="w-full pl-9 pr-3 py-2 bg-[#fffdf9] border border-[#d6c5ad] rounded-xl text-xs focus:outline-none focus:border-[#059669]"
                        />
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#a89887]" />
                      </div>
                      <button
                        onClick={() => fetchCompanyMemories(memorySearchQuery)}
                        disabled={isLoadingMemories}
                        className="px-3.5 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
                      >
                        {isLoadingMemories ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        <span>Vector Search</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills & Counter */}
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <div className="font-bold text-xs text-[#2c231c] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#059669]" />
                      <span>Memory Archives ({memories.length})</span>
                    </div>
                    <div className="flex gap-1 text-[10px] overflow-x-auto">
                      {['all', 'task_experience', 'lore', 'rule', 'milestone'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setMemoryFilterType(t)}
                          className={`px-2 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
                            memoryFilterType === t
                              ? 'bg-[#059669] text-white'
                              : 'bg-[#faf5eb] text-[#786653] hover:text-[#2c231c]'
                          }`}
                        >
                          {t === 'all'
                            ? 'All'
                            : t === 'task_experience'
                            ? 'Completed Tasks'
                            : t === 'lore'
                            ? 'Lore'
                            : t === 'rule'
                            ? 'Rules'
                            : 'Milestones'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Memory Archive List */}
                  {isLoadingMemories ? (
                    <div className="p-8 text-center text-xs text-[#786653] flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#059669]" />
                      <span>Loading vector memory archives...</span>
                    </div>
                  ) : memories.length === 0 ? (
                    <div className="p-6 rounded-xl bg-[#faf5eb] border border-dashed border-[#d6c5ad] text-center text-xs text-[#786653]">
                      No memories recorded yet. Add guidelines or complete sprint tasks to accumulate office experience!
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                      {memories
                        .filter((m) =>
                          memoryFilterType === 'all' ? true : m.type === memoryFilterType
                        )
                        .map((mem) => {
                          const isTask = mem.type === 'task_experience' || mem.type === 'episodic';
                          const isRule = mem.type === 'rule' || mem.type === 'procedural';
                          const badgeBg = isTask
                            ? 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]'
                            : isRule
                            ? 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]'
                            : 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]';

                          return (
                            <div
                              key={mem.id}
                              className="p-3.5 rounded-xl border border-[#d6c5ad] bg-[#fffdf9] hover:border-[#059669] transition-all space-y-2 group shadow-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${badgeBg}`}
                                  >
                                    {mem.type.replace('_', ' ')}
                                  </span>
                                  <h4 className="font-bold text-xs text-[#2c231c]">{mem.title}</h4>
                                  <span className="text-[10px] text-[#9e8b78] font-mono">
                                    Vector {mem.embedding?.length || 64}D
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteMemory(mem.id)}
                                  title="Delete memory"
                                  className="text-[#a89887] hover:text-[#dc2626] p-1 rounded transition-colors opacity-60 group-hover:opacity-100 shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <p className="text-xs text-[#5c4939] leading-relaxed bg-[#faf5eb] p-2 rounded-lg border border-[#ede2d1]">
                                {mem.content}
                              </p>

                              <div className="flex items-center justify-between text-[10px] text-[#9e8b78] pt-1 flex-wrap gap-1">
                                <div className="flex items-center gap-2">
                                  <span>
                                    Archived by: <strong>{mem.authorAgent || 'System'}</strong>
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {new Date(mem.createdAt).toLocaleDateString('en-US', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                  {(mem.tags || []).map((tag, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="px-1.5 py-0.5 rounded bg-[#ede2d1] text-[#786653] font-mono text-[9px]"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Right Column (5 cols): Add Memory & Architecture Info */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Form Add Lore / Office Rule */}
                  <form
                    onSubmit={handleAddMemory}
                    className="p-4 rounded-xl border border-[#d6c5ad] bg-[#fffdf9] space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-[#2c231c] flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-[#c85a2b]" />
                        <span>Add New Culture / Rule</span>
                      </div>
                      <span className="text-[10px] text-[#786653]">
                        Auto-indexed
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] font-semibold text-[#786653] block mb-1">
                          Memory Title
                        </label>
                        <input
                          type="text"
                          value={newLoreTitle}
                          onChange={(e) => setNewLoreTitle(e.target.value)}
                          placeholder="e.g. TypeScript Code Style Guidelines..."
                          className="w-full px-3 py-2 bg-[#faf5eb] border border-[#d6c5ad] rounded-xl text-xs focus:outline-none focus:border-[#c85a2b]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[#786653] block mb-1">
                          Knowledge Type
                        </label>
                        <select
                          value={newLoreType}
                          onChange={(e) => setNewLoreType(e.target.value as MemoryType)}
                          className="w-full px-3 py-2 bg-[#faf5eb] border border-[#d6c5ad] rounded-xl text-xs focus:outline-none focus:border-[#c85a2b]"
                        >
                          <option value="lore">Culture & Lore</option>
                          <option value="rule">Working Guidelines</option>
                          <option value="milestone">Company Milestones</option>
                          <option value="knowledge">General Knowledge</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[#786653] block mb-1">
                          Memory Content
                        </label>
                        <textarea
                          value={newLoreContent}
                          onChange={(e) => setNewLoreContent(e.target.value)}
                          placeholder="Provide guidelines and context that agents must adhere to when discussing and executing tasks..."
                          rows={3}
                          className="w-full px-3 py-2 bg-[#faf5eb] border border-[#d6c5ad] rounded-xl text-xs focus:outline-none focus:border-[#c85a2b]"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isAddingMemory || !newLoreTitle.trim() || !newLoreContent.trim()}
                        className="w-full py-2 bg-[#c85a2b] hover:bg-[#b54f24] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isAddingMemory ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>Save to Office Memory</span>
                      </button>
                    </div>
                  </form>

                  {/* Vector Engine Architecture Info Card */}
                  <div className="p-3.5 rounded-xl bg-[#f5efe4] border border-[#d6c5ad] text-xs text-[#5c4939] space-y-1.5">
                    <div className="font-bold text-[#2c231c] flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-[#059669]" />
                      <span>Zero-Setup Vector DB & Embeddings</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Memories are isolated per-tenant in{' '}
                      <code className="px-1 py-0.5 bg-[#e8dece] rounded text-[#2c231c] font-mono font-semibold text-[10px]">
                        ~/.ceo-virtual/memories_{currentCompany.id}.json
                      </code>
                      . Powered by a Dual Vector Engine (automatic embedding API or 64-dim local cosine index) requiring zero external Docker or database dependencies.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
