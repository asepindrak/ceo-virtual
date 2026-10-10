'use client';

import React, { useState } from 'react';
import { MarketplaceAgent, UserAccount, AgentRole, LLMConfig } from '@/types/office';
import { formatNumber } from '@/lib/utils';
import { X, ShoppingBag, Plus, Star, Lock, Unlock, Key, Cpu, Sparkles, Check, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MarketplaceModalProps {
  marketplaceAgents: MarketplaceAgent[];
  userAccount: UserAccount;
  onClose: () => void;
  onHireAgent: (mktAgent: MarketplaceAgent) => boolean; // returns true if success
  onCreateMarketplaceAgent: (newAgent: MarketplaceAgent) => void;
  onOpenWallet: () => void;
}

export const MarketplaceModal: React.FC<MarketplaceModalProps> = ({
  marketplaceAgents,
  userAccount,
  onClose,
  onHireAgent,
  onCreateMarketplaceAgent,
  onOpenWallet,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Form states for creating a new agent
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [role, setRole] = useState<AgentRole>('fullstack_dev');
  const [bio, setBio] = useState('');
  const [skillsStr, setSkillsStr] = useState('');
  const [pricePoints, setPricePoints] = useState(1000);
  const [shirtColor, setShirtColor] = useState('#2563eb');
  const [avatarColor, setAvatarColor] = useState('#3b82f6');
  
  // LLM setup
  const [llmProvider, setLlmProvider] = useState<LLMConfig['provider']>('openai');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [isLocked, setIsLocked] = useState(true);
  const [monthlySubscriptionPoints, setMonthlySubscriptionPoints] = useState(250);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const filteredAgents = marketplaceAgents.filter((agent) => {
    const matchesFilter = filterRole === 'all' || agent.role.includes(filterRole);
    const matchesSearch =
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.roleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleHire = (agent: MarketplaceAgent) => {
    if (userAccount.pointsBalance < agent.pricePoints) {
      setNotification({
        type: 'error',
        msg: `Saldo poin tidak cukup! Butuh ${agent.pricePoints} PTS, saldo Anda ${userAccount.pointsBalance} PTS. Silakan Top Up.`,
      });
      return;
    }

    const success = onHireAgent(agent);
    if (success) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setNotification({
        type: 'success',
        msg: `Berhasil merekrut ${agent.name}! Karyawan sedang masuk kantor melalui pintu masuk.`,
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setNotification({
        type: 'error',
        msg: 'Semua meja kerja di kantor penuh! Pecat atau kosongkan meja terlebih dahulu.',
      });
    }
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roleTitle.trim()) return;

    const skills = skillsStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newAgent: MarketplaceAgent = {
      id: `mkt-${Date.now()}`,
      creatorUserId: userAccount.id,
      creatorName: userAccount.name,
      name,
      role,
      roleTitle,
      bio,
      skills: skills.length > 0 ? skills : ['Autonomous Execution', 'Problem Solving'],
      pricePoints,
      avatarColor,
      shirtColor,
      hairColor: '#0f172a',
      skinColor: '#fde047',
      llmConfig: {
        provider: llmProvider,
        baseUrl: baseUrl.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
        model: model.trim() || 'default-model',
        isLocked,
        monthlySubscriptionPoints: isLocked ? monthlySubscriptionPoints : undefined,
      },
      rating: 5.0,
      hiresCount: 0,
      sampleOutput: [
        `// ${name} Initialization Script`,
        `console.log("Ready to execute tasks for ${roleTitle}");`,
      ],
    };

    onCreateMarketplaceAgent(newAgent);
    confetti({ particleCount: 80, spread: 70 });
    setActiveTab('browse');
    setNotification({
      type: 'success',
      msg: `Selamat! Agen "${name}" berhasil dipublikasikan ke Marketplace untuk disewa pengguna lain.`,
    });
  };

  return (
    <div className="fixed inset-0 bg-[#2c231c]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden text-[#2c231c] flex flex-col font-sans">
        {/* Header */}
        <div className="p-4 border-b-2 border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#c85a2b]/15 text-[#c85a2b] border border-[#c85a2b]/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-[#2c231c] tracking-tight">Marketplace AI Worker</h2>
                <span className="px-2 py-0.5 rounded-full bg-[#c68f23]/20 text-[#8c6214] font-mono text-[11px] font-bold border border-[#c68f23]/40">
                  Creator Economy
                </span>
              </div>
              <p className="text-xs text-[#6e5d4f]">
                Rekrut AI Agent berbakat dari komunitas atau buat dan monetisasi agen buatanmu sendiri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Balance Display */}
            <button
              onClick={onOpenWallet}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#fffdf9] border-2 border-[#c68f23]/50 rounded-xl hover:border-[#c68f23] transition-colors shadow-sm"
              title="Isi Ulang Saldo Poin"
            >
              <span className="text-base">🪙</span>
              <div className="text-left">
                <div className="text-[10px] text-[#6e5d4f] leading-none">Saldo Poin</div>
                <div className="text-xs font-bold font-mono text-[#8c6214]" suppressHydrationWarning>
                  {formatNumber(userAccount.pointsBalance)} PTS
                </div>
              </div>
              <span className="text-[10px] bg-[#c68f23]/20 text-[#8c6214] px-1.5 py-0.5 rounded ml-1 font-bold">
                + Top Up
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#6e5d4f] hover:text-[#2c231c] hover:bg-[#e8dac4] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b-2 border-[#d6c5ad] bg-[#f4ebe1]/80 text-xs font-bold font-mono px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`py-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 rounded-t-lg ${
              activeTab === 'browse'
                ? 'border-[#c85a2b] text-[#c85a2b] bg-[#fffdf9] border-t-2 border-l-2 border-r-2 border-[#d6c5ad] shadow-sm'
                : 'border-transparent text-[#6e5d4f] hover:text-[#2c231c]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Pasar Agen ({marketplaceAgents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 rounded-t-lg ${
              activeTab === 'create'
                ? 'border-[#c85a2b] text-[#c85a2b] bg-[#fffdf9] border-t-2 border-l-2 border-r-2 border-[#d6c5ad] shadow-sm'
                : 'border-transparent text-[#6e5d4f] hover:text-[#2c231c]'
            }`}
          >
            <Plus className="w-4 h-4 text-[#c85a2b]" />
            <span>Buat & Publikasikan Agen Baru</span>
          </button>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
              notification.type === 'success'
                ? 'bg-[#d2e4db] text-[#1b5e4b] border-[#a3c9b8]'
                : 'bg-[#fcdcd3] text-[#9c2d1b] border-[#f5b8a6]'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <Check className="w-4 h-4 text-[#288279]" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#c85a2b]" />
              )}
              <span className="font-medium">{notification.msg}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-[#6e5d4f] hover:text-[#2c231c]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs bg-[#faf5eb]">
          {activeTab === 'browse' ? (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <input
                  type="text"
                  placeholder="Cari nama agen, keahlian, atau posisi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-72 bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3.5 py-2 text-[#2c231c] placeholder-[#9c8978] focus:outline-none focus:border-[#c85a2b] text-xs font-mono"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {['all', 'dev', 'writer', 'qa', 'manager'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterRole(cat)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors text-[11px] uppercase font-mono ${
                        filterRole === cat
                          ? 'bg-[#c85a2b] text-white border-2 border-[#a6451c]'
                          : 'bg-[#fffdf9] text-[#6e5d4f] hover:text-[#2c231c] border-2 border-[#d6c5ad]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAgents.map((mktAgent) => {
                  const isCreatedByMe = mktAgent.creatorUserId === userAccount.id;

                  return (
                    <div
                      key={mktAgent.id}
                      className="bg-[#fffdf9] border-2 border-[#d6c5ad] hover:border-[#c85a2b]/60 rounded-xl p-4 flex flex-col justify-between transition-all duration-200 shadow-sm group"
                    >
                      <div>
                        {/* Top bar with Creator and Rating */}
                        <div className="flex items-center justify-between text-[11px] pb-2 mb-2 border-b border-[#ebdcc9]">
                          <span className="text-[#6e5d4f]">
                            By:{' '}
                            <span className="font-bold text-[#2c231c]">
                              {mktAgent.creatorName} {isCreatedByMe && '(Anda)'}
                            </span>
                          </span>
                          <div className="flex items-center gap-1 text-[#8c6214] font-mono font-bold">
                            <Star className="w-3.5 h-3.5 fill-[#c68f23] text-[#c68f23]" />
                            <span>{mktAgent.rating.toFixed(1)}</span>
                            <span className="text-[#8c7b6c] font-normal">({mktAgent.hiresCount} hire)</span>
                          </div>
                        </div>

                        {/* Agent identity */}
                        <div className="flex items-start gap-3 mb-2.5">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base text-white shrink-0 shadow-inner group-hover:scale-105 transition-transform"
                            style={{ backgroundColor: mktAgent.avatarColor }}
                          >
                            {mktAgent.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="font-bold text-[#2c231c] text-sm font-mono">{mktAgent.name}</h3>
                            <div className="text-[#c85a2b] font-semibold text-xs">{mktAgent.roleTitle}</div>
                          </div>
                        </div>

                        <p className="text-[#5c4a3d] text-xs mb-3 leading-relaxed line-clamp-2">
                          {mktAgent.bio}
                        </p>

                        {/* Skills */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {mktAgent.skills.slice(0, 4).map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-[#f4ebe1] border border-[#d6c5ad] text-[10px] text-[#5c4a3d] font-mono"
                            >
                              {s}
                            </span>
                          ))}
                        </div>

                        {/* LLM Provider Status Badge */}
                        <div className="p-2.5 rounded-xl bg-[#fbf7ee] border border-[#d6c5ad] mb-3 text-[11px]">
                          <div className="flex items-center justify-between font-mono mb-1">
                            <span className="text-[#5c4a3d] flex items-center gap-1">
                              <Cpu className="w-3 h-3 text-[#288279]" /> Model: {mktAgent.llmConfig.model}
                            </span>
                            {mktAgent.llmConfig.isLocked ? (
                              <span className="text-[#8c6214] flex items-center gap-1 font-semibold">
                                <Lock className="w-3 h-3 text-[#c68f23]" /> Locked LLM
                              </span>
                            ) : (
                              <span className="text-[#1b5e4b] flex items-center gap-1 font-semibold">
                                <Unlock className="w-3 h-3 text-[#288279]" /> BYOK (Kustom)
                              </span>
                            )}
                          </div>
                          {mktAgent.llmConfig.isLocked ? (
                            <div className="text-[10px] text-[#6e5d4f]">
                              Token ditanggung kreator. Sub token:{' '}
                              <span className="text-[#8c6214] font-bold font-mono">
                                {mktAgent.llmConfig.monthlySubscriptionPoints} PTS/bln
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-[#6e5d4f]">
                              Pengguna memasukkan API Key sendiri, token bebas limit lokal.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hire Action & Pricing */}
                      <div className="pt-2 border-t border-[#ebdcc9] flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-[#6e5d4f]">Harga Rekrut Permanen</div>
                          <div className="text-sm font-bold font-mono text-[#c85a2b]" suppressHydrationWarning>
                            🪙 {formatNumber(mktAgent.pricePoints)} PTS
                          </div>
                        </div>

                        <button
                          onClick={() => handleHire(mktAgent)}
                          className="px-4 py-2 bg-[#c85a2b] hover:bg-[#b04a1f] text-white font-bold rounded-xl transition-all shadow-sm text-xs flex items-center gap-1.5"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Rekrut Karyawan</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Tab 2: Create Agent Form */
            <form onSubmit={handleCreateAgent} className="max-w-2xl mx-auto space-y-4">
              <div className="p-3 bg-[#ebdcc9]/40 border border-[#d6c5ad] rounded-xl text-[#5c4a3d] flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#c85a2b] shrink-0 mt-0.5" />
                <p>
                  Publikasikan agen kustom buatanmu ke pasar. Pengguna lain dapat merekrut agen ini dengan poin yang akan masuk ke saldo akunmu!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5c4a3d] font-bold mb-1">Nama Agen</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Satoshi Coder, Luna Writer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-2 text-[#2c231c] placeholder-[#9c8978] focus:outline-none focus:border-[#c85a2b]"
                  />
                </div>
                <div>
                  <label className="block text-[#5c4a3d] font-bold mb-1">Jabatan / Role Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lead Next.js Architect"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-2 text-[#2c231c] placeholder-[#9c8978] focus:outline-none focus:border-[#c85a2b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5c4a3d] font-bold mb-1">Kategori Peran</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AgentRole)}
                    className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-2 text-[#2c231c] focus:outline-none focus:border-[#c85a2b]"
                  >
                    <option value="fullstack_dev">💻 Fullstack Developer</option>
                    <option value="frontend_dev">🎨 Frontend Engineer</option>
                    <option value="backend_dev">⚙️ Backend Architect</option>
                    <option value="content_writer">✍️ Content Writer</option>
                    <option value="seo_specialist">📈 SEO Specialist</option>
                    <option value="qa_engineer">🛡️ QA & Security</option>
                    <option value="project_manager">👔 Project Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#5c4a3d] font-bold mb-1">Warna Avatar & Baju</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={avatarColor}
                      onChange={(e) => setAvatarColor(e.target.value)}
                      className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border-2 border-[#d6c5ad]"
                      title="Warna Avatar"
                    />
                    <input
                      type="color"
                      value={shirtColor}
                      onChange={(e) => setShirtColor(e.target.value)}
                      className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border-2 border-[#d6c5ad]"
                      title="Warna Baju"
                    />
                    <span className="text-[#6e5d4f] text-[11px]">Pilih palet visual 3D</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[#5c4a3d] font-bold mb-1">Bio / Persona Spesialisasi</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Deskripsikan keunggulan dan metode kerja agen ini..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-2 text-[#2c231c] placeholder-[#9c8978] focus:outline-none focus:border-[#c85a2b]"
                />
              </div>

              <div>
                <label className="block text-[#5c4a3d] font-bold mb-1">Keahlian (Pisahkan koma)</label>
                <input
                  type="text"
                  placeholder="e.g. Next.js, Docker, Tailwind, Prompt Engineering"
                  value={skillsStr}
                  onChange={(e) => setSkillsStr(e.target.value)}
                  className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-2 text-[#2c231c] placeholder-[#9c8978] focus:outline-none focus:border-[#c85a2b]"
                />
              </div>

              {/* LLM Configuration Box */}
              <div className="p-4 rounded-xl bg-[#f4ebe1] border-2 border-[#d6c5ad] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[#c85a2b] flex items-center gap-1.5 font-mono">
                    <Cpu className="w-4 h-4" />
                    <span>Konfigurasi LLM & Monetisasi Token</span>
                  </div>

                  {/* Lock Switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#6e5d4f] font-medium">
                      {isLocked ? '🔒 Kunci Provider (Token Langganan)' : '🔓 BYOK (Bebas Kustomisasi)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLocked(!isLocked)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        isLocked ? 'bg-[#c85a2b]' : 'bg-[#d6c5ad]'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          isLocked ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#6e5d4f] text-[11px] font-bold mb-1">LLM Provider</label>
                    <select
                      value={llmProvider}
                      onChange={(e) => setLlmProvider(e.target.value as LLMConfig['provider'])}
                      className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-1.5 text-[#2c231c]"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="groq">Groq (Ultra-Fast)</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="custom">Custom (vLLM / Ollama)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#6e5d4f] text-[11px] font-bold mb-1">Model Name</label>
                    <input
                      type="text"
                      placeholder="e.g. gpt-4o, claude-3-5-sonnet, gemini-1.5-pro"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-1.5 text-[#2c231c] font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#6e5d4f] text-[11px] font-bold mb-1">Base URL (Opsional)</label>
                    <input
                      type="text"
                      placeholder="https://api.openai.com/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-1.5 text-[#2c231c] font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#6e5d4f] text-[11px] font-bold mb-1">API Key Kreator (Jika Dikunci)</label>
                    <input
                      type="password"
                      placeholder={isLocked ? 'sk-...' : '(Opsional jika BYOK)'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-1.5 text-[#2c231c] font-mono text-[11px]"
                    />
                  </div>
                </div>

                {isLocked && (
                  <div className="p-2.5 rounded-xl bg-[#c68f23]/10 border border-[#c68f23]/30 flex items-center justify-between">
                    <span className="text-[#8c6214] text-[11px] font-medium">
                      Biaya Langganan Token Bulanan yang Dibebankan ke Penyewa:
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={50}
                        max={5000}
                        value={monthlySubscriptionPoints}
                        onChange={(e) => setMonthlySubscriptionPoints(Number(e.target.value))}
                        className="w-20 bg-[#fffdf9] border-2 border-[#c68f23]/50 rounded-lg px-2 py-1 text-right text-[#8c6214] font-mono text-xs font-bold"
                      />
                      <span className="text-[#8c6214] font-bold font-mono">PTS/bln</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Setting */}
              <div className="grid grid-cols-2 gap-3 items-center pt-1">
                <div>
                  <label className="block text-[#5c4a3d] font-bold mb-1">
                    Harga Beli Perekrutan Awal (Poin)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={50}
                    value={pricePoints}
                    onChange={(e) => setPricePoints(Number(e.target.value))}
                    className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3.5 py-2 text-[#c85a2b] font-bold font-mono text-sm"
                  />
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-[#6e5d4f] mb-1">Estimasi Royalti Poin</div>
                  <div className="text-xs text-[#288279] font-bold">
                    100% Poin masuk ke saldo Anda tiap ada yang rekrut
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="px-4 py-2.5 bg-[#e8dac4] text-[#5c4a3d] font-bold rounded-xl hover:bg-[#d6c5ad] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#c85a2b] hover:bg-[#b04a1f] text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Publikasikan ke Marketplace</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
