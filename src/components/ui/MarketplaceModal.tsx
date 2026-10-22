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
  
  // Gender & Visual styling setup
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [hairStyle, setHairStyle] = useState<string>('undercut');
  const [hairColor, setHairColor] = useState('#0f172a');
  const [eyeColor, setEyeColor] = useState('#38bdf8');
  const [accessory, setAccessory] = useState<string>('none');

  // Personality MBTI & Enneagram setup
  const [mbti, setMbti] = useState('INTJ');
  const [enneagram, setEnneagram] = useState('5w6');
  const [archetype, setArchetype] = useState('The Mastermind Architect');
  const [speakingStyle, setSpeakingStyle] = useState('To-the-point, logical and solution-oriented');
  
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
        msg: `Insufficient point balance! Requires ${agent.pricePoints} PTS, your balance is ${userAccount.pointsBalance} PTS. Please Top Up.`,
      });
      return;
    }

    const success = onHireAgent(agent);
    if (success) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setNotification({
        type: 'success',
        msg: `Successfully hired ${agent.name}! Employee is entering the office lobby.`,
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setNotification({
        type: 'error',
        msg: 'All desks in the office are full! Fire or clear a desk first.',
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
      personality: {
        mbti,
        enneagram,
        archetype,
        traits: ['Professional', 'Adaptive', 'Focused'],
        speakingStyle,
        interests: ['Technology', 'Problem Solving', 'Innovation'],
      },
      gender,
      hairStyle: hairStyle as any,
      hairColor,
      eyeColor,
      accessory: accessory as any,
      skills: skills.length > 0 ? skills : ['Autonomous Execution', 'Problem Solving'],
      pricePoints,
      avatarColor,
      shirtColor,
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
      msg: `Congratulations! Agent "${name}" published to Marketplace for hire.`,
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
                <h2 className="text-lg font-bold font-mono text-[#2c231c] tracking-tight">AI Worker Marketplace</h2>
                <span className="px-2 py-0.5 rounded-full bg-[#c68f23]/20 text-[#8c6214] font-mono text-[11px] font-bold border border-[#c68f23]/40">
                  Creator Economy
                </span>
              </div>
              <p className="text-xs text-[#6e5d4f]">
                Hire talented AI Agents from the community or create and monetize your own agents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Balance Display */}
            <button
              onClick={onOpenWallet}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#fffdf9] border-2 border-[#c68f23]/50 rounded-xl hover:border-[#c68f23] transition-colors shadow-sm"
              title="Top Up Point Balance"
            >
              <span className="text-base">🪙</span>
              <div className="text-left">
                <div className="text-[10px] text-[#6e5d4f] leading-none">Point Balance</div>
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
            <span>Agent Market ({marketplaceAgents.length})</span>
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
            <span>Create & Publish New Agent</span>
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
                  placeholder="Search agent name, skills, or role..."
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
                              {mktAgent.creatorName} {isCreatedByMe && '(You)'}
                            </span>
                          </span>
                          <div className="flex items-center gap-1 text-[#8c6214] font-mono font-bold">
                            <Star className="w-3.5 h-3.5 fill-[#c68f23] text-[#c68f23]" />
                            <span>{mktAgent.rating.toFixed(1)}</span>
                            <span className="text-[#8c7b6c] font-normal">({mktAgent.hiresCount} hires)</span>
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-[#2c231c] text-sm font-mono">{mktAgent.name}</h3>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                                  mktAgent.gender === 'female'
                                    ? 'bg-[#fce7f3] text-[#be185d] border border-[#fbcfe8]'
                                    : 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]'
                                }`}
                              >
                                {mktAgent.gender === 'female' ? '♀ Female' : '♂ Male'}
                              </span>
                            </div>
                            <div className="text-[#c85a2b] font-semibold text-xs">{mktAgent.roleTitle}</div>
                          </div>
                        </div>

                        <p className="text-[#5c4a3d] text-xs mb-2.5 leading-relaxed line-clamp-2">
                          {mktAgent.bio}
                        </p>

                        {/* Personality MBTI & Enneagram Profile */}
                        {mktAgent.personality && (
                          <div className="mb-2.5 p-2 bg-[#fdf2f8]/70 border border-[#fbcfe8] rounded-xl text-[11px]">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5 font-bold text-[#be185d]">
                                <Sparkles className="w-3.5 h-3.5 text-[#ec4899]" />
                                <span>MBTI: {mktAgent.personality.mbti} • Enneagram: {mktAgent.personality.enneagram}</span>
                              </div>
                              <span className="text-[10px] text-[#9d174d] font-semibold bg-[#fce7f3] px-1.5 py-0.2 rounded-md font-mono">
                                {mktAgent.personality.archetype}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#5c4a3d] italic mb-1.5">
                              "{mktAgent.personality.speakingStyle}"
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {mktAgent.personality.traits.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.2 rounded bg-white/80 border border-[#fbcfe8] text-[9px] text-[#be185d] font-semibold"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

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
                                <Unlock className="w-3 h-3 text-[#288279]" /> BYOK (Custom)
                              </span>
                            )}
                          </div>
                          {mktAgent.llmConfig.isLocked ? (
                            <div className="text-[10px] text-[#6e5d4f]">
                              Tokens covered by creator. Token sub:{' '}
                              <span className="text-[#8c6214] font-bold font-mono">
                                {mktAgent.llmConfig.monthlySubscriptionPoints} PTS/mo
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-[#6e5d4f]">
                              User provides own API Key, unlimited local tokens.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hire Action & Pricing */}
                      <div className="pt-2 border-t border-[#ebdcc9] flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-[#6e5d4f]">Permanent Hire Price</div>
                          <div className="text-sm font-bold font-mono text-[#c85a2b]" suppressHydrationWarning>
                            🪙 {formatNumber(mktAgent.pricePoints)} PTS
                          </div>
                        </div>

                        <button
                          onClick={() => handleHire(mktAgent)}
                          className="px-4 py-2 bg-[#c85a2b] hover:bg-[#b04a1f] text-white font-bold rounded-xl transition-all shadow-sm text-xs flex items-center gap-1.5"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Hire Employee</span>
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
                  Publish your custom-crafted agent to the market. Other users can hire this agent with points that credit directly to your account!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5c4a3d] font-bold mb-1">Agent Name</label>
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
                  <label className="block text-[#5c4a3d] font-bold mb-1">Role Title</label>
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
                  <label className="block text-[#5c4a3d] font-bold mb-1">Role Category</label>
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
                  <label className="block text-[#5c4a3d] font-bold mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => {
                      const newGender = e.target.value as 'male' | 'female';
                      setGender(newGender);
                      if (newGender === 'female' && (hairStyle === 'undercut' || hairStyle === 'short_messy')) {
                        setHairStyle('twintails');
                      } else if (newGender === 'male' && (hairStyle === 'twintails' || hairStyle === 'bob_cut')) {
                        setHairStyle('undercut');
                      }
                    }}
                    className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-1.5 text-[#2c231c]"
                  >
                    <option value="male">♂ Male</option>
                    <option value="female">♀ Female</option>
                  </select>
                </div>
              </div>

              {/* Visual Hair, Eyes, & Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#fdfaf5] border-2 border-[#d6c5ad] rounded-xl">
                <div>
                  <label className="block text-[#6e5d4f] text-[11px] font-bold mb-1">Hair Style</label>
                  <select
                    value={hairStyle}
                    onChange={(e) => setHairStyle(e.target.value)}
                    className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-2.5 py-1.5 text-[#2c231c] text-xs font-mono"
                  >
                    {gender === 'female' ? (
                      <>
                        <option value="twintails">🎀 Twintails</option>
                        <option value="bob_cut">💇 Bob Cut</option>
                        <option value="long_flowing">✨ Long Flowing</option>
                        <option value="ponytail">🐎 Ponytail</option>
                      </>
                    ) : (
                      <>
                        <option value="undercut">⚡ Undercut</option>
                        <option value="short_messy">🌪️ Short Messy</option>
                        <option value="slick_back">👔 Slick Back</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[#6e5d4f] text-[11px] font-bold mb-1">Character Accessory</label>
                  <select
                    value={accessory}
                    onChange={(e) => setAccessory(e.target.value)}
                    className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-2.5 py-1.5 text-[#2c231c] text-xs"
                  >
                    <option value="none">None</option>
                    <option value="glasses">👓 Glasses</option>
                    <option value="cyber_earpiece">🎧 Cyber Earpiece</option>
                    <option value="hairclip">🌸 Hairclip</option>
                    <option value="ribbon">🎀 Ribbon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#6e5d4f] text-[11px] font-bold mb-1">Character Colors</label>
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-col items-center">
                      <input
                        type="color"
                        value={hairColor}
                        onChange={(e) => setHairColor(e.target.value)}
                        className="w-7 h-7 rounded-md cursor-pointer border border-[#d6c5ad]"
                        title="Hair Color"
                      />
                      <span className="text-[9px] text-[#6e5d4f]">Hair</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <input
                        type="color"
                        value={eyeColor}
                        onChange={(e) => setEyeColor(e.target.value)}
                        className="w-7 h-7 rounded-md cursor-pointer border border-[#d6c5ad]"
                        title="Eye Color"
                      />
                      <span className="text-[9px] text-[#6e5d4f]">Eyes</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <input
                        type="color"
                        value={shirtColor}
                        onChange={(e) => setShirtColor(e.target.value)}
                        className="w-7 h-7 rounded-md cursor-pointer border border-[#d6c5ad]"
                        title="Shirt Color"
                      />
                      <span className="text-[9px] text-[#6e5d4f]">Shirt</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <input
                        type="color"
                        value={avatarColor}
                        onChange={(e) => setAvatarColor(e.target.value)}
                        className="w-7 h-7 rounded-md cursor-pointer border border-[#d6c5ad]"
                        title="Accent Color"
                      />
                      <span className="text-[9px] text-[#6e5d4f]">Accent</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[#5c4a3d] font-bold mb-1">Bio / Specialization Persona</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe the strengths, tools, and working style of this agent..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-2 text-[#2c231c] placeholder-[#9c8978] focus:outline-none focus:border-[#c85a2b]"
                />
              </div>

              <div>
                <label className="block text-[#5c4a3d] font-bold mb-1">Skills (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Next.js, Docker, Tailwind, Prompt Engineering"
                  value={skillsStr}
                  onChange={(e) => setSkillsStr(e.target.value)}
                  className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-2 text-[#2c231c] placeholder-[#9c8978] focus:outline-none focus:border-[#c85a2b]"
                />
              </div>

              {/* Personality: MBTI & Enneagram */}
              <div className="p-3.5 rounded-xl bg-[#fdf2f8]/60 border-2 border-[#fbcfe8] space-y-2.5">
                <div className="font-bold text-[#be185d] flex items-center gap-1.5 text-xs font-mono">
                  <Sparkles className="w-4 h-4 text-[#ec4899]" />
                  <span>Human Personality (MBTI & Enneagram)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#9d174d] text-[11px] font-bold mb-1">MBTI Type</label>
                    <select
                      value={mbti}
                      onChange={(e) => setMbti(e.target.value)}
                      className="w-full bg-[#fffdf9] border-2 border-[#fbcfe8] rounded-xl px-3 py-1.5 text-[#2c231c] text-xs font-mono"
                    >
                      {['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#9d174d] text-[11px] font-bold mb-1">Enneagram Type</label>
                    <select
                      value={enneagram}
                      onChange={(e) => setEnneagram(e.target.value)}
                      className="w-full bg-[#fffdf9] border-2 border-[#fbcfe8] rounded-xl px-3 py-1.5 text-[#2c231c] text-xs font-mono"
                    >
                      {['1w9', '1w2', '2w1', '2w3', '3w2', '3w4', '4w3', '4w5', '5w4', '5w6', '6w5', '6w7', '7w6', '7w8', '8w7', '8w9', '9w8', '9w1'].map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#9d174d] text-[11px] font-bold mb-1">Archetype / Title</label>
                    <input
                      type="text"
                      placeholder="e.g. The Mastermind Architect"
                      value={archetype}
                      onChange={(e) => setArchetype(e.target.value)}
                      className="w-full bg-[#fffdf9] border-2 border-[#fbcfe8] rounded-xl px-3 py-1.5 text-[#2c231c] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#9d174d] text-[11px] font-bold mb-1">Unique Speaking Style</label>
                    <input
                      type="text"
                      placeholder="e.g. To-the-point, logical and articulate"
                      value={speakingStyle}
                      onChange={(e) => setSpeakingStyle(e.target.value)}
                      className="w-full bg-[#fffdf9] border-2 border-[#fbcfe8] rounded-xl px-3 py-1.5 text-[#2c231c] text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* LLM Configuration Box */}
              <div className="p-4 rounded-xl bg-[#f4ebe1] border-2 border-[#d6c5ad] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[#c85a2b] flex items-center gap-1.5 font-mono">
                    <Cpu className="w-4 h-4" />
                    <span>LLM Configuration & Token Monetization</span>
                  </div>

                  {/* Lock Switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#6e5d4f] font-medium">
                      {isLocked ? '🔒 Lock Provider (Subscription Token)' : '🔓 BYOK (Custom Key)'}
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
                    <label className="block text-[#6e5d4f] text-[11px] font-bold mb-1">Base URL (Optional)</label>
                    <input
                      type="text"
                      placeholder="https://api.openai.com/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-1.5 text-[#2c231c] font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#6e5d4f] text-[11px] font-bold mb-1">Creator API Key (If Locked)</label>
                    <input
                      type="password"
                      placeholder={isLocked ? 'sk-...' : '(Optional if BYOK)'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-[#fffdf9] border-2 border-[#d6c5ad] rounded-xl px-3 py-1.5 text-[#2c231c] font-mono text-[11px]"
                    />
                  </div>
                </div>

                {isLocked && (
                  <div className="p-2.5 rounded-xl bg-[#c68f23]/10 border border-[#c68f23]/30 flex items-center justify-between">
                    <span className="text-[#8c6214] text-[11px] font-medium">
                      Monthly Token Subscription Fee Charged to Hirer:
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
                      <span className="text-[#8c6214] font-bold font-mono">PTS/mo</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Setting */}
              <div className="grid grid-cols-2 gap-3 items-center pt-1">
                <div>
                  <label className="block text-[#5c4a3d] font-bold mb-1">
                    Initial Hire Price (Points)
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
                  <div className="text-[11px] text-[#6e5d4f] mb-1">Estimated Point Royalties</div>
                  <div className="text-xs text-[#288279] font-bold">
                    100% of Points credit directly to your balance on hire
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="px-4 py-2.5 bg-[#e8dac4] text-[#5c4a3d] font-bold rounded-xl hover:bg-[#d6c5ad] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#c85a2b] hover:bg-[#b04a1f] text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Publish to Marketplace</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
