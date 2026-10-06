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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Marketplace AI Worker</h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-semibold border border-cyan-500/30">
                  Creator Economy
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Rekrut AI Agent berbakat dari komunitas atau buat dan monetisasi agen buatanmu sendiri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Balance Display */}
            <button
              onClick={onOpenWallet}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-amber-500/40 rounded-xl hover:border-amber-500 transition-colors"
              title="Isi Ulang Saldo Poin"
            >
              <span className="text-base">🪙</span>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 leading-none">Saldo Poin</div>
                <div className="text-xs font-bold font-mono text-amber-300" suppressHydrationWarning>
                  {formatNumber(userAccount.pointsBalance)} PTS
                </div>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded ml-1 font-bold">
                + Top Up
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs font-semibold px-4 pt-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`py-3 px-5 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'browse'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Pasar Agen ({marketplaceAgents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 px-5 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'create'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Buat & Publikasikan Agen Baru</span>
          </button>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-800/80'
                : 'bg-rose-950/80 text-rose-200 border-rose-800/80'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{notification.msg}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs">
          {activeTab === 'browse' ? (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <input
                  type="text"
                  placeholder="Cari nama agen, keahlian, atau posisi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-72 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {['all', 'dev', 'writer', 'qa', 'manager'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterRole(cat)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-[11px] uppercase ${
                        filterRole === cat
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
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
                      className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-md group"
                    >
                      <div>
                        {/* Top bar with Creator and Rating */}
                        <div className="flex items-center justify-between text-[11px] pb-2 mb-2 border-b border-slate-800/80">
                          <span className="text-slate-400">
                            By:{' '}
                            <span className="font-semibold text-slate-300">
                              {mktAgent.creatorName} {isCreatedByMe && '(Anda)'}
                            </span>
                          </span>
                          <div className="flex items-center gap-1 text-amber-400 font-mono font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{mktAgent.rating.toFixed(1)}</span>
                            <span className="text-slate-500 font-normal">({mktAgent.hiresCount} hire)</span>
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
                            <h3 className="font-bold text-white text-sm">{mktAgent.name}</h3>
                            <div className="text-cyan-400 font-medium text-xs">{mktAgent.roleTitle}</div>
                          </div>
                        </div>

                        <p className="text-slate-300 text-xs mb-3 leading-relaxed line-clamp-2">
                          {mktAgent.bio}
                        </p>

                        {/* Skills */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {mktAgent.skills.slice(0, 4).map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300"
                            >
                              {s}
                            </span>
                          ))}
                        </div>

                        {/* LLM Provider Status Badge */}
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 mb-3 text-[11px]">
                          <div className="flex items-center justify-between font-mono mb-1">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Cpu className="w-3 h-3 text-cyan-400" /> Model: {mktAgent.llmConfig.model}
                            </span>
                            {mktAgent.llmConfig.isLocked ? (
                              <span className="text-amber-400 flex items-center gap-1 font-semibold">
                                <Lock className="w-3 h-3" /> Locked LLM
                              </span>
                            ) : (
                              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                                <Unlock className="w-3 h-3" /> BYOK (Kustom)
                              </span>
                            )}
                          </div>
                          {mktAgent.llmConfig.isLocked ? (
                            <div className="text-[10px] text-slate-400">
                              Token ditanggung kreator. Sub token:{' '}
                              <span className="text-amber-300 font-bold font-mono">
                                {mktAgent.llmConfig.monthlySubscriptionPoints} PTS/bln
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400">
                              Pengguna memasukkan API Key sendiri, token bebas limit lokal.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hire Action & Pricing */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400">Harga Rekrut Permanen</div>
                          <div className="text-sm font-bold font-mono text-cyan-300" suppressHydrationWarning>
                            🪙 {formatNumber(mktAgent.pricePoints)} PTS
                          </div>
                        </div>

                        <button
                          onClick={() => handleHire(mktAgent)}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-cyan-600/20 text-xs flex items-center gap-1.5"
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
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  Publikasikan agen kustom buatanmu ke pasar. Pengguna lain dapat merekrut agen ini dengan poin yang akan masuk ke saldo akunmu!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nama Agen</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Satoshi Coder, Luna Writer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Jabatan / Role Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lead Next.js Architect"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Kategori Peran</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AgentRole)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
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
                  <label className="block text-slate-300 font-medium mb-1">Warna Avatar & Baju</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={avatarColor}
                      onChange={(e) => setAvatarColor(e.target.value)}
                      className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border border-slate-700"
                      title="Warna Avatar"
                    />
                    <input
                      type="color"
                      value={shirtColor}
                      onChange={(e) => setShirtColor(e.target.value)}
                      className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border border-slate-700"
                      title="Warna Baju"
                    />
                    <span className="text-slate-400 text-[11px]">Pilih palet visual 3D</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Bio / Persona Spesialisasi</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Deskripsikan keunggulan dan metode kerja agen ini..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Keahlian (Pisahkan koma)</label>
                <input
                  type="text"
                  placeholder="e.g. Next.js, Docker, Tailwind, Prompt Engineering"
                  value={skillsStr}
                  onChange={(e) => setSkillsStr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* LLM Configuration Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" />
                    <span>Konfigurasi LLM & Monetisasi Token</span>
                  </div>

                  {/* Lock Switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">
                      {isLocked ? '🔒 Kunci Provider (Token Langganan)' : '🔓 BYOK (Bebas Kustomisasi)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLocked(!isLocked)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        isLocked ? 'bg-cyan-600' : 'bg-slate-700'
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
                    <label className="block text-slate-400 text-[11px] mb-1">LLM Provider</label>
                    <select
                      value={llmProvider}
                      onChange={(e) => setLlmProvider(e.target.value as LLMConfig['provider'])}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100"
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
                    <label className="block text-slate-400 text-[11px] mb-1">Model Name</label>
                    <input
                      type="text"
                      placeholder="e.g. gpt-4o, claude-3-5-sonnet, gemini-1.5-pro"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Base URL (Opsional)</label>
                    <input
                      type="text"
                      placeholder="https://api.openai.com/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">API Key Kreator (Jika Dikunci)</label>
                    <input
                      type="password"
                      placeholder={isLocked ? 'sk-...' : '(Opsional jika BYOK)'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100 font-mono text-[11px]"
                    />
                  </div>
                </div>

                {isLocked && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <span className="text-amber-300 text-[11px]">
                      Biaya Langganan Token Bulanan yang Dibebankan ke Penyewa:
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={50}
                        max={5000}
                        value={monthlySubscriptionPoints}
                        onChange={(e) => setMonthlySubscriptionPoints(Number(e.target.value))}
                        className="w-20 bg-slate-900 border border-amber-500/40 rounded-lg px-2 py-1 text-right text-amber-200 font-mono text-xs"
                      />
                      <span className="text-amber-300 font-bold font-mono">PTS/bln</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Setting */}
              <div className="grid grid-cols-2 gap-3 items-center pt-1">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Harga Beli Perekrutan Awal (Poin)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={50}
                    value={pricePoints}
                    onChange={(e) => setPricePoints(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-cyan-300 font-bold font-mono"
                  />
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-400 mb-1">Estimasi Royalti Poin</div>
                  <div className="text-xs text-emerald-400 font-semibold">
                    100% Poin masuk ke saldo Anda tiap ada yang rekrut
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-600/20 flex items-center gap-2"
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
