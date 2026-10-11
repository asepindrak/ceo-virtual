'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Train,
  Car,
  Building2,
  Users,
  Compass,
  ArrowRight,
  Send,
  CheckCircle2,
  Clock,
  Briefcase,
  ShoppingBag,
  Award,
  Coins,
  MapPin,
  ExternalLink,
  ChevronRight,
  Radio,
  FileCode,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Shield,
  Network,
  Wifi,
  Server,
  Copy,
  Check,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import {
  RegionalDistrict,
  RegionalCompanyInfo,
  TravelMission,
  CommuteMode,
  TravelMissionType,
  Company,
  Agent,
} from '@/types/office';

interface WorldMapModalProps {
  currentCompany: Company;
  agents: Agent[];
  onClose: () => void;
  onMissionCompleted?: (mission: TravelMission) => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  currentCompany,
  agents,
  onClose,
  onMissionCompleted,
}) => {
  const [activeTab, setActiveTab] = useState<'atlas' | 'dispatch' | 'missions' | 'p2p_mesh'>('atlas');
  const [districts, setDistricts] = useState<RegionalDistrict[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('region-jakarta');
  const [missions, setMissions] = useState<TravelMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // P2P Mesh Node State
  const [p2pStatus, setP2pStatus] = useState<any>(null);
  const [manualPeerUrl, setManualPeerUrl] = useState('');
  const [isConnectingPeer, setIsConnectingPeer] = useState(false);
  const [p2pNotice, setP2pNotice] = useState('');
  const [copiedNodeId, setCopiedNodeId] = useState(false);
  const [relayUrlInput, setRelayUrlInput] = useState('');
  const [isSavingRelay, setIsSavingRelay] = useState(false);
  const [isSyncingRelay, setIsSyncingRelay] = useState(false);

  // Fetch P2P Node Data
  const fetchP2pData = async () => {
    try {
      const res = await fetch('/api/p2p');
      const data = await res.json();
      if (data.success) {
        setP2pStatus(data);
        if (data.publicRelayUrl && !relayUrlInput) {
          setRelayUrlInput(data.publicRelayUrl);
        }
      }
    } catch (e) {
      console.error('Error fetching P2P status:', e);
    }
  };

  const handleSaveRelay = async (e?: React.FormEvent, overrideUrl?: string) => {
    if (e) e.preventDefault();
    setIsSavingRelay(true);
    const targetUrl = overrideUrl !== undefined ? overrideUrl : relayUrlInput.trim();
    try {
      const res = await fetch('/api/p2p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_relay_url', relayUrl: targetUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setP2pNotice(`🌐 ${data.message}`);
        fetchP2pData();
        setTimeout(() => setP2pNotice(''), 4000);
      } else {
        setP2pNotice(`❌ ${data.error || 'Gagal menyimpan URL Relay'}`);
        setTimeout(() => setP2pNotice(''), 4000);
      }
    } catch (err: any) {
      setP2pNotice(`❌ Gagal koneksi relay: ${err.message}`);
      setTimeout(() => setP2pNotice(''), 4000);
    } finally {
      setIsSavingRelay(false);
    }
  };

  const handleSyncRelay = async () => {
    setIsSyncingRelay(true);
    try {
      const res = await fetch('/api/p2p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_relay' }),
      });
      const data = await res.json();
      if (data.success) {
        setP2pNotice(`🔄 ${data.message}`);
        fetchP2pData();
        setTimeout(() => setP2pNotice(''), 4000);
      } else {
        setP2pNotice(`❌ ${data.message || 'Gagal sinkronisasi relay'}`);
        setTimeout(() => setP2pNotice(''), 4000);
      }
    } catch (err: any) {
      setP2pNotice(`❌ Gagal sinkronisasi: ${err.message}`);
      setTimeout(() => setP2pNotice(''), 4000);
    } finally {
      setIsSyncingRelay(false);
    }
  };

  const handleConnectPeer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPeerUrl.trim()) return;

    setIsConnectingPeer(true);
    try {
      const res = await fetch('/api/p2p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect_peer', peerUrl: manualPeerUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setP2pNotice(data.message || 'Berhasil terhubung ke node peer!');
        setManualPeerUrl('');
        fetchP2pData();
        setTimeout(() => setP2pNotice(''), 4000);
      } else {
        setP2pNotice(`❌ ${data.message || 'Gagal terhubung ke peer'}`);
        setTimeout(() => setP2pNotice(''), 4000);
      }
    } catch (err: any) {
      setP2pNotice(`❌ Gagal koneksi: ${err.message}`);
      setTimeout(() => setP2pNotice(''), 4000);
    } finally {
      setIsConnectingPeer(false);
    }
  };

  const handleBroadcastBeacon = async () => {
    try {
      const res = await fetch('/api/p2p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'broadcast' }),
      });
      const data = await res.json();
      setP2pNotice('📡 UDP Beacon dikirim ke jaringan lokal (LAN)!');
      fetchP2pData();
      setTimeout(() => setP2pNotice(''), 3000);
    } catch {}
  };

  const handleRemovePeer = async (nodeId: string) => {
    try {
      await fetch('/api/p2p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_peer', nodeId }),
      });
      fetchP2pData();
    } catch {}
  };

  // Dispatch Form State
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '');
  const [targetRegionId, setTargetRegionId] = useState<string>('region-bandung');
  const [targetCompanyId, setTargetCompanyId] = useState<string>('company-pixelforge');
  const [commuteMode, setCommuteMode] = useState<CommuteMode>('bullet_train');
  const [missionType, setMissionType] = useState<TravelMissionType>('b2b_pitch');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchNotice, setDispatchNotice] = useState('');

  // Fetch world map data from API
  const fetchWorldData = async () => {
    try {
      const res = await fetch('/api/world');
      const data = await res.json();
      if (data.success) {
        setDistricts(data.districts || []);
        setMissions(data.missions || []);
      }
    } catch (e) {
      console.error('Error fetching world data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorldData();
    fetchP2pData();
    const interval = setInterval(() => {
      fetchWorldData();
      fetchP2pData();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const activeDistrict = districts.find((d) => d.id === selectedDistrictId) || districts[0];
  const targetDistrict = districts.find((d) => d.id === targetRegionId) || districts[1];

  // Keep targetCompanyId synchronized when targetRegionId changes
  useEffect(() => {
    if (targetDistrict && targetDistrict.companies.length > 0) {
      if (!targetDistrict.companies.some((c) => c.id === targetCompanyId)) {
        setTargetCompanyId(targetDistrict.companies[0].id);
      }
    }
  }, [targetRegionId, targetDistrict, targetCompanyId]);

  const handleStartDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent || !targetDistrict) return;

    const targetCompany = targetDistrict.companies.find((c) => c.id === targetCompanyId);
    if (!targetCompany) return;

    setIsDispatching(true);
    try {
      const res = await fetch('/api/world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispatch',
          agentId: agent.id,
          agentName: agent.name,
          agentRole: agent.role,
          originRegionId: 'region-jakarta',
          originCompanyName: currentCompany.name,
          targetRegionId,
          targetCompanyId: targetCompany.id,
          targetCompanyName: targetCompany.name,
          commuteMode,
          missionType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDispatchNotice(data.message || 'Misi perjalanan berhasil dimulai!');
        setActiveTab('missions');
        fetchWorldData();
        setTimeout(() => setDispatchNotice(''), 4000);
      }
    } catch (err) {
      console.error('Error dispatching:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  const activeMissionsCount = missions.filter((m) => m.status !== 'completed').length;

  return (
    <div className="fixed inset-0 bg-[#2c231c]/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-3xl w-full max-w-5xl h-[90vh] shadow-2xl overflow-hidden text-[#2c231c] flex flex-col">
        {/* Header (shrink-0) */}
        <div className="p-4 sm:p-5 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5] shadow-xs">
              <Globe className="w-6 h-6 text-[#c85a2b]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#2c231c]">
                  Open World Atlas & Decentralized Regional Transit
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#4338ca] border border-[#c7d2fe] font-bold font-mono">
                  🌐 5 Sektor Kota
                </span>
              </div>
              <p className="text-xs text-[#786653]">
                Jelajahi distrik regional, pantau kantor tetangga, dan tugaskan karyawan naik kereta atau mobil untuk diplomasi B2B & trading.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection (shrink-0 z-10) */}
        <div className="flex border-b border-[#d6c5ad] bg-[#faf5eb] text-xs font-semibold overflow-x-auto shrink-0 z-10">
          <button
            onClick={() => setActiveTab('atlas')}
            className={`flex-1 min-w-[140px] py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'atlas'
                ? 'border-[#c85a2b] text-[#c85a2b] bg-[#fffdf9] font-bold shadow-xs'
                : 'border-transparent text-[#786653] hover:text-[#2c231c] hover:bg-[#f4ebe1]/60'
            }`}
          >
            <Compass className="w-4 h-4 text-[#c85a2b]" />
            <span>Peta Makro Dunia ({districts.length} Distrik)</span>
          </button>
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`flex-1 min-w-[140px] py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'dispatch'
                ? 'border-[#059669] text-[#059669] bg-[#fffdf9] font-bold shadow-xs'
                : 'border-transparent text-[#786653] hover:text-[#2c231c] hover:bg-[#f4ebe1]/60'
            }`}
          >
            <Send className="w-4 h-4 text-[#059669]" />
            <span>🚀 Tugaskan Karyawan Bepergian</span>
          </button>
          <button
            onClick={() => setActiveTab('missions')}
            className={`flex-1 min-w-[140px] py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 relative ${
              activeTab === 'missions'
                ? 'border-[#4f46e5] text-[#4f46e5] bg-[#fffdf9] font-bold shadow-xs'
                : 'border-transparent text-[#786653] hover:text-[#2c231c] hover:bg-[#f4ebe1]/60'
            }`}
          >
            <Train className="w-4 h-4 text-[#4f46e5]" />
            <span>Transit & Misi Perjalanan ({missions.length})</span>
            {activeMissionsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('p2p_mesh')}
            className={`flex-1 min-w-[140px] py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'p2p_mesh'
                ? 'border-[#0284c7] text-[#0284c7] bg-[#fffdf9] font-bold shadow-xs'
                : 'border-transparent text-[#786653] hover:text-[#2c231c] hover:bg-[#f4ebe1]/60'
            }`}
          >
            <Radio className="w-4 h-4 text-[#0284c7]" />
            <span>📡 Node P2P Mesh ({p2pStatus?.onlinePeersCount || 0} Peer)</span>
          </button>
        </div>

        {/* Content Area (flex-1 overflow-y-auto min-h-0) */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto min-h-0 space-y-4">
          {/* Notification banner */}
          {dispatchNotice && (
            <div className="p-3 bg-[#e6f4ea] border border-[#34a853] text-[#137333] rounded-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#137333]" />
              <span>{dispatchNotice}</span>
            </div>
          )}

          {/* TAB 1: PETA MAKRO DUNIA */}
          {activeTab === 'atlas' && (
            <div className="space-y-4">
              {/* Stylized Macro World Map Canvas / Graphic Banner */}
              <div className="relative rounded-2xl bg-gradient-to-br from-[#12100e] via-[#221c17] to-[#181410] border-2 border-[#3d3126] p-4 text-white overflow-hidden shadow-md">
                <div className="flex items-center justify-between pb-3 border-b border-[#3d3126] mb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Radio className="w-3.5 h-3.5 text-[#10b981] animate-pulse" />
                    <span className="font-mono text-[#a39382]">
                      Trans-Regional Decentralized Mesh • 5 Sectors Online
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#fbbf24]">
                    Kantor Anda: <strong>{currentCompany.name} (Neo-Jakarta)</strong>
                  </div>
                </div>

                {/* Simulated World Coordinates Grid */}
                <div className="relative h-56 sm:h-64 w-full bg-[#1a1512]/80 rounded-xl border border-[#3d3126] overflow-hidden flex items-center justify-center">
                  {/* Subtle Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#3d3126_1px,transparent_1px),linear-gradient(to_bottom,#3d3126_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 pointer-events-none" />

                  {/* SVG Transit Connecting Lines (Railways & Highways) */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line x1="28%" y1="55%" x2="38%" y2="64%" stroke="#c85a2b" strokeWidth="2" strokeDasharray="4 2" />
                    <line x1="38%" y1="64%" x2="55%" y2="62%" stroke="#059669" strokeWidth="2" strokeDasharray="4 2" />
                    <line x1="55%" y1="62%" x2="68%" y2="68%" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 2" />
                    <line x1="38%" y1="64%" x2="50%" y2="38%" stroke="#7c3aed" strokeWidth="2" strokeDasharray="6 3" />
                  </svg>

                  {/* Interactive District Nodes */}
                  {districts.map((district) => {
                    const isSelected = district.id === selectedDistrictId;
                    return (
                      <button
                        key={district.id}
                        onClick={() => setSelectedDistrictId(district.id)}
                        style={{
                          left: `${district.coordinates.x}%`,
                          top: `${district.coordinates.y}%`,
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 z-10 ${
                          isSelected ? 'scale-110' : 'hover:scale-105'
                        }`}
                      >
                        <div
                          className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all ${
                            isSelected
                              ? 'bg-[#fdeed9] text-[#2c231c] border-[#c85a2b] ring-2 ring-[#c85a2b]/60'
                              : 'bg-[#241c15]/90 text-white border-[#3d3126] hover:border-[#a39382]'
                          }`}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: district.color }}
                          />
                          <span className="font-bold text-[11px] whitespace-nowrap">
                            {district.name.split(' ')[0]}
                          </span>
                          <span className="text-[9px] px-1 bg-black/40 text-amber-300 rounded font-mono">
                            {district.companies.length}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* District Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {districts.map((d) => {
                  const isSelected = d.id === selectedDistrictId;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDistrictId(d.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#fdeed9] border-2 border-[#c85a2b] shadow-xs'
                          : 'bg-[#fffdf9] border-[#d6c5ad] hover:border-[#c85a2b]'
                      }`}
                    >
                      <div className="text-[10px] font-mono font-bold" style={{ color: d.color }}>
                        {d.codename}
                      </div>
                      <div className="font-bold text-xs text-[#2c231c] truncate mt-0.5">{d.name}</div>
                      <div className="text-[10px] text-[#786653] flex items-center gap-1 mt-1">
                        <Building2 className="w-3 h-3" />
                        <span>{d.companies.length} Kantor</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected District Details & Companies Showcase */}
              {activeDistrict && (
                <div className="p-4 rounded-2xl bg-[#fffdf9] border border-[#d6c5ad] space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ede2d1] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f4ebe1] text-[#786653] font-bold font-mono">
                          {activeDistrict.badge}
                        </span>
                        <h3 className="text-sm font-bold text-[#2c231c]">{activeDistrict.name}</h3>
                      </div>
                      <p className="text-xs text-[#786653] mt-1">{activeDistrict.description}</p>
                    </div>
                    <div className="text-right text-[11px] text-[#786653]">
                      <div className="flex items-center gap-1 font-mono">
                        <Train className="w-3 h-3 text-[#4f46e5]" />
                        <span>{activeDistrict.transitHubName}</span>
                      </div>
                      <div className="text-[10px] text-[#9e8b78]">
                        Commute: <strong>~{activeDistrict.trainTravelSeconds}s Bullet Train</strong> •{' '}
                        <strong>~{activeDistrict.carTravelSeconds}s Highway</strong>
                      </div>
                    </div>
                  </div>

                  {/* List of Companies in this District */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-[#2c231c] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#c85a2b]" />
                      <span>Daftar Kantor & Perusahaan di {activeDistrict.name}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeDistrict.companies.map((comp) => {
                        const isMyCompany = comp.id === currentCompany.id;
                        return (
                          <div
                            key={comp.id}
                            className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                              isMyCompany
                                ? 'bg-[#fef8e7] border-[#c85a2b]'
                                : 'bg-[#faf5eb] border-[#d6c5ad] hover:border-[#c85a2b]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-bold text-xs text-[#2c231c]">{comp.name}</h4>
                                  <span className="text-[9px] px-1.5 py-0.2 bg-[#3d3126] text-[#fbbf24] rounded-full font-bold">
                                    Lv {comp.level}
                                  </span>
                                  {isMyCompany && (
                                    <span className="text-[9px] px-1.5 py-0.2 bg-[#c85a2b] text-white rounded font-bold">
                                      Kantor Anda
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#c85a2b] font-medium">
                                  {comp.industry}
                                </div>
                                <div className="text-[10px] text-[#786653]">
                                  Owner: <strong>{comp.ownerName}</strong> • {comp.buildingType}
                                </div>
                              </div>

                              {!isMyCompany && (
                                <button
                                  onClick={() => {
                                    setTargetRegionId(activeDistrict.id);
                                    setTargetCompanyId(comp.id);
                                    setActiveTab('dispatch');
                                  }}
                                  className="px-2.5 py-1.5 bg-[#059669] hover:bg-[#047857] text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors shrink-0 shadow-xs"
                                >
                                  <span>Kirim Karyawan</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Bounties & Market Items Pills */}
                            <div className="text-[10px] space-y-1.5 pt-1 border-t border-[#ede2d1]">
                              <div className="flex items-center justify-between text-[#786653]">
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-3 h-3 text-[#c85a2b]" />
                                  <span>Open Bounties ({comp.openBounties.length})</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <ShoppingBag className="w-3 h-3 text-[#4f46e5]" />
                                  <span>Produk Pasar ({comp.marketOffers.length})</span>
                                </span>
                              </div>

                              {comp.openBounties.length > 0 && (
                                <div className="p-2 rounded-lg bg-[#fffdf9] border border-[#ede2d1] text-[11px]">
                                  <div className="font-semibold text-[#2c231c] truncate">
                                    📋 {comp.openBounties[0].title}
                                  </div>
                                  <div className="text-[9px] text-[#786653] font-mono flex items-center justify-between mt-0.5">
                                    <span>Reward: +{comp.openBounties[0].rewardXp} XP</span>
                                    <span className="text-[#ab7a1a] font-bold">
                                      {comp.openBounties[0].budgetCoins} Coins
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TUGASKAN KARYAWAN BEPERGIAN */}
          {activeTab === 'dispatch' && (
            <form onSubmit={handleStartDispatch} className="space-y-4 max-w-2xl mx-auto">
              <div className="p-4 bg-[#fef8e7] border border-[#fae4a8] rounded-2xl text-xs text-[#784620] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#ab7a1a]" />
                  <span>Kirim Karyawan Menembus Batas Regional Virtual</span>
                </div>
                <p className="leading-relaxed">
                  Karyawan Anda akan keluar dari meja kantor, bepergian menggunakan kereta aerorail atau mobil kantor, lalu check-in di lobi perusahaan tujuan untuk melakukan negosiasi B2B, membeli modul skill, atau membangun aliansi dagang.
                </p>
              </div>

              {/* 1. Pilih Karyawan */}
              <div className="p-4 rounded-2xl bg-[#fffdf9] border border-[#d6c5ad] space-y-2">
                <label className="text-xs font-bold text-[#2c231c] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#c85a2b]" />
                  <span>1. Pilih Karyawan yang Ditugaskan</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {agents.map((ag) => {
                    const isSelected = ag.id === selectedAgentId;
                    return (
                      <div
                        key={ag.id}
                        onClick={() => setSelectedAgentId(ag.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-[#fdeed9] border-2 border-[#c85a2b] shadow-xs'
                            : 'bg-[#faf5eb] border-[#d6c5ad] hover:border-[#c85a2b]'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#2c231c] text-[#fdf6e2] font-black text-xs flex items-center justify-center shrink-0">
                          {ag.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#2c231c] truncate">{ag.name}</div>
                          <div className="text-[10px] text-[#786653] font-mono">{ag.roleTitle}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Destinasi Regional & Perusahaan */}
              <div className="p-4 rounded-2xl bg-[#fffdf9] border border-[#d6c5ad] space-y-3">
                <label className="text-xs font-bold text-[#2c231c] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#059669]" />
                  <span>2. Pilih Destinasi Kota & Kantor Tujuan</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-[#786653] block mb-1">
                      Distrik / Regional Tujuan:
                    </label>
                    <select
                      value={targetRegionId}
                      onChange={(e) => setTargetRegionId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#faf5eb] border border-[#d6c5ad] rounded-xl text-xs focus:outline-none focus:border-[#059669]"
                    >
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.codename})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#786653] block mb-1">
                      Perusahaan yang Dikunjungi:
                    </label>
                    <select
                      value={targetCompanyId}
                      onChange={(e) => setTargetCompanyId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#faf5eb] border border-[#d6c5ad] rounded-xl text-xs focus:outline-none focus:border-[#059669]"
                    >
                      {targetDistrict.companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.industry})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Moda Transportasi & Tujuan Misi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Commute Mode */}
                <div className="p-4 rounded-2xl bg-[#fffdf9] border border-[#d6c5ad] space-y-2">
                  <label className="font-bold text-[#2c231c] flex items-center gap-1.5">
                    <Train className="w-3.5 h-3.5 text-[#4f46e5]" />
                    <span>3. Moda Transportasi</span>
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setCommuteMode('bullet_train')}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        commuteMode === 'bullet_train'
                          ? 'bg-[#eef2ff] border-2 border-[#4f46e5] text-[#2c231c]'
                          : 'bg-[#faf5eb] border-[#d6c5ad] text-[#786653]'
                      }`}
                    >
                      <Train className="w-5 h-5 text-[#4f46e5] shrink-0" />
                      <div>
                        <div className="font-bold text-xs">Express Bullet Train</div>
                        <div className="text-[10px] text-[#786653]">
                          Kereta rel aerorail, ramah lingkungan & ada obrolan gerbong
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCommuteMode('company_car')}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        commuteMode === 'company_car'
                          ? 'bg-[#eef2ff] border-2 border-[#4f46e5] text-[#2c231c]'
                          : 'bg-[#faf5eb] border-[#d6c5ad] text-[#786653]'
                      }`}
                    >
                      <Car className="w-5 h-5 text-[#059669] shrink-0" />
                      <div>
                        <div className="font-bold text-xs">Company Cyber-Car</div>
                        <div className="text-[10px] text-[#786653]">
                          Mobil operasional kantor, rute highway cepat sub-detik
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Mission Purpose */}
                <div className="p-4 rounded-2xl bg-[#fffdf9] border border-[#d6c5ad] space-y-2">
                  <label className="font-bold text-[#2c231c] flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#c85a2b]" />
                    <span>4. Tujuan Kunjungan</span>
                  </label>
                  <select
                    value={missionType}
                    onChange={(e) => setMissionType(e.target.value as TravelMissionType)}
                    className="w-full px-3 py-2.5 bg-[#faf5eb] border border-[#d6c5ad] rounded-xl text-xs focus:outline-none focus:border-[#c85a2b]"
                  >
                    <option value="b2b_pitch">🤝 B2B Partnership Pitch (Tawarkan Jasa/Proyek)</option>
                    <option value="buy_trade">🛒 Beli Skill/Lisensi Template dari Pasar Mereka</option>
                    <option value="market_research">🔍 Riset Tren Industri & Benchmark</option>
                    <option value="friendly_visit">☕ Kunjungan Silaturahmi & Pererat Aliansi</option>
                  </select>

                  <div className="p-2.5 rounded-xl bg-[#faf5eb] border border-[#ede2d1] text-[10px] text-[#786653]">
                    💡 Menyelesaikan misi perjalanan akan memberikan bonus <strong>+150 hingga +350 XP</strong> dan Koin Kantor untuk perusahaan Anda!
                  </div>
                </div>
              </div>

              {/* Submit Dispatch */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isDispatching}
                  className="px-6 py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isDispatching ? 'Menyiapkan Keberangkatan...' : 'Berangkatkan Karyawan Sekarang'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: TRANSIT TRACKER & LOG MISI */}
          {activeTab === 'missions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[#2c231c] flex items-center gap-1.5">
                  <Train className="w-4 h-4 text-[#4f46e5]" />
                  <span>Status Perjalanan & Misi Karyawan ({missions.length})</span>
                </div>
                <button
                  onClick={fetchWorldData}
                  className="px-2.5 py-1 text-[11px] bg-[#fffdf9] hover:bg-[#ede2d1] border border-[#d6c5ad] rounded-lg flex items-center gap-1 text-[#786653]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Refresh Status</span>
                </button>
              </div>

              {missions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#786653] bg-[#fffdf9] border border-dashed border-[#d6c5ad] rounded-2xl">
                  Belum ada karyawan yang ditugaskan bepergian. Buka tab <strong>"Tugaskan Karyawan Bepergian"</strong> untuk memulai ekspedisi antar-regional perdana!
                </div>
              ) : (
                <div className="space-y-3">
                  {missions.map((mission) => {
                    const isCompleted = mission.status === 'completed';
                    return (
                      <div
                        key={mission.id}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          isCompleted
                            ? 'bg-[#fffdf9] border-[#d6c5ad]'
                            : 'bg-[#faf5eb] border-[#4f46e5] shadow-xs'
                        }`}
                      >
                        {/* Mission Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-[#eef2ff] text-[#4f46e5] border border-[#c7d2fe]">
                              {mission.commuteMode === 'bullet_train' ? (
                                <Train className="w-4 h-4" />
                              ) : (
                                <Car className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-xs text-[#2c231c]">
                                  {mission.agentName} ({mission.agentRole})
                                </h4>
                                <span
                                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase font-mono ${
                                    isCompleted
                                      ? 'bg-[#e6f4ea] text-[#137333] border border-[#34a853]'
                                      : 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a] animate-pulse'
                                  }`}
                                >
                                  {mission.status.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#786653]">
                                Dari <strong>{mission.originCompanyName}</strong> ➔ Ke{' '}
                                <strong>{mission.targetCompanyName}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="text-right text-[10px] text-[#786653] font-mono">
                            {new Date(mission.departedAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full bg-[#e8dece] rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#4f46e5] to-[#10b981] transition-all duration-500 rounded-full"
                              style={{ width: `${mission.progressPercent}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-[#786653] font-mono">
                            <span className="italic">{mission.currentStepMessage}</span>
                            <span>{mission.progressPercent}%</span>
                          </div>
                        </div>

                        {/* Travel Logs & Dialogs */}
                        <div className="p-2.5 rounded-xl bg-[#f5efe4] border border-[#ede2d1] space-y-1.5 text-xs">
                          <div className="text-[10px] font-bold text-[#786653] uppercase tracking-wider">
                            Catatan Log Perjalanan:
                          </div>
                          {mission.dialogLogs.map((log, idx) => (
                            <div key={idx} className="text-[11px] flex items-start gap-1.5">
                              <span className="text-[#9e8b78] font-mono text-[9px] shrink-0 pt-0.5">
                                [{log.time}]
                              </span>
                              <div className="leading-relaxed">
                                <strong className="text-[#2c231c]">{log.speaker}:</strong>{' '}
                                <span className="text-[#5c4939]">{log.text}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Outcome Box (if completed) */}
                        {mission.outcome && (
                          <div className="p-2.5 rounded-xl bg-[#e6f4ea] border border-[#34a853] text-[#137333] text-xs flex items-center justify-between">
                            <div>
                              <strong>Hasil Misi:</strong> {mission.outcome.summary}
                            </div>
                            <div className="flex items-center gap-2 font-mono font-bold shrink-0">
                              <span className="text-[#137333]">+{mission.outcome.earnedXp} XP</span>
                              <span className="text-[#ab7a1a]">+{mission.outcome.earnedCoins} Coins</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DECENTRALIZED P2P MESH & PEER DISCOVERY */}
          {activeTab === 'p2p_mesh' && (
            <div className="space-y-4">
              {p2pNotice && (
                <div className="p-3 bg-[#e6f4ea] border border-[#34a853] text-[#137333] rounded-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#137333]" />
                  <span>{p2pNotice}</span>
                </div>
              )}

              {/* Node Identity Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#101923] via-[#1a2530] to-[#0c131a] text-white border-2 border-[#1e3a5f] shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#243d5c]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0284c7] to-[#38bdf8] flex items-center justify-center text-white font-black shadow-lg ring-2 ring-[#0284c7]/40 shrink-0">
                      <Network className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/30 font-bold font-mono flex items-center gap-1">
                          <Radio className="w-3 h-3 text-[#34d399] animate-pulse" />
                          <span>P2P DAEMON ONLINE</span>
                        </span>
                        <span className="text-xs text-[#94a3b8] font-mono">
                          Zero-Config LAN UDP Active
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-white mt-0.5">
                        Identitas Node Desentralisasi PC Anda
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={handleBroadcastBeacon}
                    className="px-3.5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-colors shrink-0"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Broadcast Beacon LAN</span>
                  </button>
                </div>

                {/* Node Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-[#121d28] p-3 rounded-xl border border-[#243d5c]">
                    <div className="text-[10px] text-[#94a3b8]">Node ID Kriptografis</div>
                    <div className="font-mono text-xs font-bold text-[#38bdf8] mt-1 flex items-center justify-between">
                      <span className="truncate">{p2pStatus?.nodeId || 'vigent-node-local'}</span>
                      <button
                        onClick={() => {
                          if (p2pStatus?.nodeId) {
                            navigator.clipboard.writeText(p2pStatus.nodeId);
                            setCopiedNodeId(true);
                            setTimeout(() => setCopiedNodeId(false), 2000);
                          }
                        }}
                        className="text-[#94a3b8] hover:text-white ml-1 shrink-0"
                      >
                        {copiedNodeId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#121d28] p-3 rounded-xl border border-[#243d5c]">
                    <div className="text-[10px] text-[#94a3b8]">Port HTTP / Discovery</div>
                    <div className="font-mono text-xs font-bold text-white mt-1">
                      :{p2pStatus?.httpPort || 28483} • UDP:{p2pStatus?.udpPort || 28484}
                    </div>
                  </div>

                  <div className="bg-[#121d28] p-3 rounded-xl border border-[#243d5c]">
                    <div className="text-[10px] text-[#94a3b8]">Peer Terkoneksi (Mesh)</div>
                    <div className="font-mono text-sm font-bold text-[#34d399] mt-0.5">
                      {p2pStatus?.onlinePeersCount || 0} Peer Online
                    </div>
                  </div>

                  <div className="bg-[#121d28] p-3 rounded-xl border border-[#243d5c]">
                    <div className="text-[10px] text-[#94a3b8]">Regional Sektor Lokal</div>
                    <div className="font-mono text-xs font-bold text-[#fbbf24] mt-1 truncate">
                      {p2pStatus?.regionalSector || 'region-jakarta'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 1: Dokploy VPS Community Relay Hub */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121f2d] to-[#0c1520] border border-[#234263] text-white shadow-md space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#0284c7]/20 border border-[#0284c7]/40 flex items-center justify-center text-[#38bdf8]">
                      <Globe className="w-4 h-4 animate-spin" style={{ animationDuration: '12s' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xs tracking-wide text-white">🌐 Public Community Relay Hub (Dokploy VPS)</h3>
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-semibold bg-[#0369a1]/40 text-[#7dd3fc] border border-[#0284c7]/30">
                          Dokploy Ready
                        </span>
                      </div>
                      <p className="text-[10px] text-[#94a3b8] mt-0.5">
                        Menghubungkan semua node Vigent di seluruh dunia secara otomatis tanpa hambatan router/NAT
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {p2pStatus?.isRelayConfigured ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        Terhubung ke Dokploy VPS Hub
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Mode LAN / Mandiri (Belum ada VPS Hub)
                      </span>
                    )}
                  </div>
                </div>

                {/* Form Input URL Dokploy Relay */}
                <form onSubmit={(e) => handleSaveRelay(e)} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={relayUrlInput}
                      onChange={(e) => setRelayUrlInput(e.target.value)}
                      placeholder="Masukkan URL Relay Dokploy VPS (contoh: https://relay.domainanda.com atau http://IP_VPS:3000)..."
                      className="w-full pl-3 pr-8 py-2 bg-[#091119] border border-[#1e3956] rounded-xl text-xs font-mono text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]"
                    />
                    {relayUrlInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setRelayUrlInput('');
                          handleSaveRelay(undefined, '');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 text-xs"
                        title="Hapus dan Nonaktifkan Relay"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="submit"
                      disabled={isSavingRelay || !relayUrlInput.trim()}
                      className="px-3.5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSavingRelay ? 'Menyimpan...' : 'Simpan & Sinkronkan'}</span>
                    </button>

                    {p2pStatus?.isRelayConfigured && (
                      <button
                        type="button"
                        onClick={handleSyncRelay}
                        disabled={isSyncingRelay}
                        className="px-3 py-2 bg-[#1e293b] hover:bg-[#334155] text-[#38bdf8] font-bold text-xs rounded-xl flex items-center gap-1.5 border border-[#334155] transition-all disabled:opacity-40"
                        title="Tarik daftar peer terbaru dari Dokploy Relay"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRelay ? 'animate-spin' : ''}`} />
                        <span>{isSyncingRelay ? 'Sinkronisasi...' : 'Tarik Peer'}</span>
                      </button>
                    )}
                  </div>
                </form>

                <div className="flex items-center justify-between text-[10px] text-[#64748b] pt-1 border-t border-[#1a2d42]">
                  <span>
                    📦 Template Dokploy sudah siap di folder <code className="text-[#38bdf8] font-mono">relay-server/Dockerfile</code> (Port default: 3000)
                  </span>
                  <span>Otomatis heartbeat setiap 20 detik</span>
                </div>
              </div>

              {/* Form Manual Peering (Lintas IP / Tailscale / WAN) */}
              <div className="p-4 rounded-2xl bg-[#fffdf9] border border-[#d6c5ad] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-[#2c231c] flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-[#0284c7]" />
                    <span>Hubungkan Manual ke Node Teman / PC Lain (IP / Tailscale)</span>
                  </div>
                  <span className="text-[10px] text-[#786653]">
                    Port default :28483
                  </span>
                </div>

                <form onSubmit={handleConnectPeer} className="flex gap-2">
                  <input
                    type="text"
                    value={manualPeerUrl}
                    onChange={(e) => setManualPeerUrl(e.target.value)}
                    placeholder="Masukkan IP atau host peer (contoh: 192.168.1.50:28483 atau 100.x.x.x Tailscale)..."
                    className="flex-1 px-3 py-2 bg-[#faf5eb] border border-[#d6c5ad] rounded-xl text-xs focus:outline-none focus:border-[#0284c7] font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isConnectingPeer || !manualPeerUrl.trim()}
                    className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 shrink-0"
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>{isConnectingPeer ? 'Menghubungkan...' : 'Kirim Handshake'}</span>
                  </button>
                </form>
              </div>

              {/* Daftar Peer yang Terhubung (Peer Table) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-[#2c231c] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Daftar Node Peer yang Dikenal ({p2pStatus?.peers?.length || 0})</span>
                  </div>
                  <span className="text-[10px] text-[#786653]">
                    Otomatis diperbarui via UDP broadcast
                  </span>
                </div>

                {(!p2pStatus?.peers || p2pStatus.peers.length === 0) ? (
                  <div className="p-8 text-center text-xs text-[#786653] bg-[#fffdf9] border border-dashed border-[#d6c5ad] rounded-2xl space-y-2">
                    <Radio className="w-8 h-8 text-[#9e8b78] mx-auto animate-pulse" />
                    <div className="font-semibold text-[#2c231c]">
                      Menunggu Deteksi Peer di Jaringan Anda...
                    </div>
                    <p className="max-w-md mx-auto text-[11px] leading-relaxed">
                      Daemon UDP sedang memancarkan beacon di port 28484. Begitu ada PC lain yang menjalankan Vigent di Wi-Fi/LAN yang sama, node tersebut akan otomatis muncul di sini! Anda juga bisa menghubungkan PC rekan secara manual melalui form IP di atas.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {p2pStatus.peers.map((peer: any) => (
                      <div
                        key={peer.nodeId}
                        className="p-3.5 rounded-xl border border-[#d6c5ad] bg-[#fffdf9] hover:border-[#0284c7] transition-all flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${peer.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xs text-[#2c231c]">{peer.companyName}</h4>
                              <span className="text-[9px] px-1.5 py-0.2 bg-[#f0e3ce] text-[#784620] rounded font-mono">
                                {peer.regionalSector}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${
                                peer.discoveredVia === 'public_relay'
                                  ? 'bg-[#0369a1]/20 text-[#0284c7] border border-[#0284c7]/30'
                                  : peer.discoveredVia === 'lan_udp'
                                  ? 'bg-[#eef2ff] text-[#4f46e5]'
                                  : 'bg-[#f0fdf4] text-[#16a34a]'
                              }`}>
                                {peer.discoveredVia === 'public_relay'
                                  ? '🌐 Dokploy Relay'
                                  : peer.discoveredVia === 'lan_udp'
                                  ? '📡 LAN UDP'
                                  : '🔗 Direct IP'}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#786653] font-mono mt-0.5">
                              Endpoint: <strong>{peer.endpointUrl}</strong> • ID: {peer.nodeId}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-bold ${peer.isOnline ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {peer.isOnline ? 'ONLINE' : 'OFFLINE'}
                          </span>
                          <button
                            onClick={() => handleRemovePeer(peer.nodeId)}
                            className="p-1 text-[#9e8b78] hover:text-red-500 rounded transition-colors"
                            title="Hapus peer dari daftar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Zero-Knowledge & Security Architecture Card */}
              <div className="p-4 rounded-2xl bg-[#f5efe4] border border-[#d6c5ad] text-xs text-[#5c4939] space-y-2">
                <div className="font-bold text-[#2c231c] flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#059669]" />
                  <span>Prinsip Keamanan & Desentralisasi Multi-Tenant Vigent</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  <strong>100% Zero-Knowledge untuk Dokumen Privat:</strong> Komunikasi P2P antar-node hanya membagikan paket telemetri publik (nama kantor, avatar di lobi, ketersediaan bursa bounty). Seluruh obrolan LLM internal, kode proyek di <code>~/.vigent/projects</code>, artefak tugas, dan API key rahasia Anda <strong>TIDAK PERNAH dikirimkan ke node rekan</strong> dan tetap terisolasi di disk PC lokal Anda.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
