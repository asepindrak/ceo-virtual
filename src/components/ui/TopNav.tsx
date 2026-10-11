'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Company, TaskTicket } from '@/types/office';
import {
  Kanban,
  Users,
  Play,
  Pause,
  ShoppingBag,
  ShieldAlert,
  Terminal,
  Blocks,
  MessagesSquare,
  Radio,
  MoreHorizontal,
  MessageSquare,
  Coins,
  ChevronDown,
  Building2,
  Coffee,
  Cpu,
  Globe,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface TopNavProps {
  company: Company;
  tasks: TaskTicket[];
  isPaused: boolean;
  speed: number;
  userPoints: number;
  pendingDecisionsCount: number;
  onTogglePause: () => void;
  onChangeSpeed: (speed: number) => void;
  onOpenCompanyModal: () => void;
  onOpenTasksModal: () => void;
  onOpenRosterModal: () => void;
  onOpenOfficeChat: () => void;
  onOpenMarketplace: () => void;
  onOpenWallet: () => void;
  onOpenDecisions: () => void;
  onOpenWorkspace: () => void;
  onOpenExtensions: () => void;
  onOpenDevServers: () => void;
  onOpenWorldMap: () => void;
  onOpenCollabLogs?: () => void;
  onOpenActivityLogs?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  company,
  tasks,
  isPaused,
  speed,
  userPoints,
  pendingDecisionsCount,
  onTogglePause,
  onChangeSpeed,
  onOpenCompanyModal,
  onOpenTasksModal,
  onOpenRosterModal,
  onOpenOfficeChat,
  onOpenMarketplace,
  onOpenWallet,
  onOpenDecisions,
  onOpenWorkspace,
  onOpenExtensions,
  onOpenDevServers,
  onOpenWorldMap,
  onOpenCollabLogs,
  onOpenActivityLogs,
}) => {
  const [timeStr, setTimeStr] = useState('09:42 AM');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeTasksCount = tasks.filter((t) => t.status === 'in_progress').length;

  return (
    <header className="fixed top-3 inset-x-3 sm:inset-x-6 max-w-7xl mx-auto h-14 bg-[#faf5eb]/95 backdrop-blur-xl border-2 border-[#d6c5ad] rounded-2xl shadow-xl z-40 px-3 sm:px-4 flex items-center justify-between text-[#2c231c] transition-all">
      {/* 1. Left: Brand & Multi-Office Switcher */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={onOpenCompanyModal}
          className="flex items-center gap-2 p-1 -ml-1 hover:bg-[#ede2d1] rounded-xl transition-colors group text-left"
          title="Vigent (Virtual Agent Office) - Ganti Kantor Virtual atau Buat Kantor Baru"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#c85a2b] via-[#d97736] to-[#c68f23] flex items-center justify-center font-black text-white shadow-md border border-[#ad4b20] group-hover:scale-105 transition-transform tracking-wider text-xs">
            VG
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-[#2c231c] flex items-center gap-1.5 leading-tight">
              <span className="truncate max-w-[100px] sm:max-w-[140px] md:max-w-[180px]">
                {company.name}
              </span>
              <span className="hidden xs:inline-block text-[9px] px-1.5 py-0.2 bg-[#f0e3ce] text-[#784620] border border-[#dccab3] rounded-md font-mono">
                Kantor ▾
              </span>
            </div>
            <div className="text-[10px] text-[#786653] truncate max-w-[100px] sm:max-w-[140px] md:max-w-[180px]">
              {company.industry}
            </div>
          </div>
        </button>
      </div>

      {/* 2. Middle: Simulation Controls (Compact & Clean - Visible on xl+ to prevent overflow) */}
      <div className="hidden xl:flex items-center gap-2 bg-[#fffdf9] border border-[#d6c5ad] px-2.5 py-1 rounded-xl text-xs shadow-xs shrink-0">
        <span className="font-mono text-[#c85a2b] font-bold text-[11px]" suppressHydrationWarning>
          {timeStr}
        </span>
        <div className="h-3.5 w-px bg-[#d6c5ad]" />

        <button
          onClick={onTogglePause}
          className={`px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px] ${
            isPaused
              ? 'bg-[#fdeed9] text-[#c85a2b] border border-[#e8ba8c]'
              : 'text-[#5c4939] hover:text-[#2c231c] hover:bg-[#ede2d1]'
          }`}
          title={isPaused ? 'Lanjutkan Simulasi' : 'Jeda Simulasi'}
        >
          {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          <span>{isPaused ? 'Paused' : 'Live'}</span>
        </button>

        <div className="flex items-center gap-0.5 bg-[#f4ebe1] rounded-lg p-0.5 border border-[#d6c5ad]">
          {[1, 2, 5].map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
                speed === s
                  ? 'bg-[#c85a2b] text-white font-bold shadow-xs'
                  : 'text-[#6e5a48] hover:text-[#2c231c]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* 3. Right: Action Bar (Organized, No Overflow, Prominent Dev Server) */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Human Decisions Pending Alert (Conditional) */}
        {pendingDecisionsCount > 0 && (
          <button
            onClick={onOpenDecisions}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-[#fef3e7] hover:bg-[#fde9d2] text-[#c85a2b] border-2 border-[#c85a2b] text-xs font-bold rounded-xl animate-bounce shadow-md shrink-0"
            title="Ada keputusan penting yang membutuhkan approval Boss"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#c85a2b]" />
            <span className="hidden sm:inline">Approval</span>
            <span className="text-[10px] font-mono px-1 bg-[#c85a2b] text-white rounded">
              {pendingDecisionsCount}
            </span>
          </button>
        )}

        {/* 🌟 DEV SERVERS BUTTON (PROMINENT ON EXTERNAL HEADER) */}
        <button
          onClick={onOpenDevServers}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-[#1f6860] hover:bg-[#164e48] text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-[#1f6860]/20 hover:scale-[1.02] border border-[#2ea395] shrink-0 group"
          title="Buka Dev Server & Open Ports Manager (Docker Desktop Style) - Cek live web port :28483"
        >
          <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse shrink-0" />
          <span className="font-bold hidden sm:inline md:hidden">Dev</span>
          <span className="font-bold hidden md:inline">Dev Server</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/30 rounded text-emerald-300 border border-emerald-400/30 font-bold hidden 2xl:inline">
            :28483
          </span>
        </button>

        {/* Office Group Chat / War Room button */}
        <button
          onClick={onOpenOfficeChat}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-[#4338ca] hover:bg-[#3730a3] text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-[#4338ca]/20 shrink-0 group"
          title="Buka Office Group Chat War Room (Bisa tag @ & terhubung bot Telegram)"
        >
          <MessagesSquare className="w-3.5 h-3.5 group-hover:scale-110 transition-transform shrink-0" />
          <span className="hidden lg:inline">War Room</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white/20 rounded text-indigo-100 font-bold hidden 2xl:inline">
            @tag • 📱TG
          </span>
        </button>

        {/* Tasks / Kanban button */}
        <button
          onClick={onOpenTasksModal}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-[#fffdf9] hover:bg-[#f4ebe1] text-[#2c231c] text-xs font-medium rounded-xl transition-colors border border-[#d6c5ad] shrink-0"
          title="Buka Kanban Task Management"
        >
          <Kanban className="w-3.5 h-3.5 text-[#c85a2b] shrink-0" />
          <span className="hidden sm:inline">Tasks</span>
          {activeTasksCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5] text-[10px] font-bold">
              {activeTasksCount}
            </span>
          )}
        </button>

        {/* 🗺️ Open World Map button */}
        <button
          onClick={onOpenWorldMap}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-[#fffdf9] hover:bg-[#f4ebe1] text-[#2c231c] text-xs font-semibold rounded-xl transition-all border border-[#d6c5ad] shrink-0 group"
          title="Buka Peta Dunia Open World & Transit Antar-Regional"
        >
          <Globe className="w-3.5 h-3.5 text-[#c85a2b] group-hover:rotate-45 transition-transform shrink-0" />
          <span className="hidden sm:inline">Peta Kota</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#fdeed9] text-[#c85a2b] rounded font-bold border border-[#f0c8a5] hidden 2xl:inline">
            5 Sektor
          </span>
        </button>

        {/* User Points / Wallet */}
        <button
          onClick={onOpenWallet}
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#fffdf9] hover:bg-[#fbf4e8] border border-[#d6c5ad] hover:border-[#c68f23] rounded-xl transition-all shadow-xs shrink-0"
          title="Saldo Token & Topup Akun"
        >
          <Coins className="w-3.5 h-3.5 text-[#ab7a1a]" />
          <span className="font-mono font-bold text-xs text-[#ab7a1a]" suppressHydrationWarning>
            {formatNumber(userPoints)}
          </span>
        </button>

        {/* ⋯ "More Tools" Dropdown to prevent header overflow */}
        <div className="relative shrink-0" ref={moreMenuRef}>
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              isMoreMenuOpen
                ? 'bg-[#c85a2b] text-white border-[#ad4b20] shadow-sm'
                : 'bg-[#fffdf9] hover:bg-[#f4ebe1] text-[#2c231c] border-[#d6c5ad]'
            }`}
            title="Menu Alat & Fitur Kantor Lainnya"
          >
            <span className="hidden sm:inline">Alat</span>
            <MoreHorizontal className="w-4 h-4" />
            <ChevronDown className={`w-3 h-3 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu Modal/Popover */}
          {isMoreMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-2xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-2">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-[#786653] uppercase tracking-wider border-b border-[#d6c5ad] mb-1 flex items-center justify-between">
                <span>Alat Kantor Vigent</span>
                <span className="font-mono text-[#c85a2b]">v1.0</span>
              </div>

              {/* Roster / Karyawan */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenRosterModal();
                }}
                className="w-full text-left px-2.5 py-2 hover:bg-[#ede2d1] rounded-xl flex items-center justify-between text-[#2c231c] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#288279]" />
                  <span className="font-medium">Tim & Karyawan</span>
                </div>
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 bg-[#ede2d1] rounded text-[#4d3c2e]">
                  {company.agents.length} Agent
                </span>
              </button>

              {/* Setting Global LLM Perusahaan */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenCompanyModal();
                }}
                className="w-full text-left px-2.5 py-2 hover:bg-[#ede2d1] rounded-xl flex items-center justify-between text-[#2c231c] transition-colors"
                title="Atur provider LLM global kantor untuk Teks, Gambar, Fast, Vision, Audio"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#4f46e5]" />
                  <span className="font-medium">Global LLM Provider</span>
                </div>
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 bg-[#eef2ff] text-[#4f46e5] rounded border border-[#c7d2fe]">
                  5 Kategori
                </span>
              </button>

              {/* Pasar Agen / Marketplace */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenMarketplace();
                }}
                className="w-full text-left px-2.5 py-2 hover:bg-[#ede2d1] rounded-xl flex items-center gap-2 text-[#2c231c] transition-colors"
              >
                <ShoppingBag className="w-4 h-4 text-[#c85a2b]" />
                <span className="font-medium">Pasar Agen (Hire/Create)</span>
              </button>

              {/* Dedicated Workspace & CLI */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenWorkspace();
                }}
                className="w-full text-left px-2.5 py-2 hover:bg-[#ede2d1] rounded-xl flex items-center justify-between text-[#2c231c] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#2d4263]" />
                  <span className="font-medium">Workspace CLI (~/.vigent)</span>
                </div>
                <span className="text-[9px] font-mono px-1 bg-[#eef2f8] text-[#2d4263] rounded">
                  :28483
                </span>
              </button>

              {/* Skills & MCP Extension Hub */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenExtensions();
                }}
                className="w-full text-left px-2.5 py-2 hover:bg-[#ede2d1] rounded-xl flex items-center gap-2 text-[#2c231c] transition-colors"
              >
                <Blocks className="w-4 h-4 text-[#7d3b8f]" />
                <span className="font-medium">Skills & MCP Extensions</span>
              </button>

              {/* 🗺️ Open World Map Dropdown Item */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenWorldMap();
                }}
                className="w-full text-left px-2.5 py-2 hover:bg-[#ede2d1] rounded-xl flex items-center justify-between text-[#2c231c] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#c85a2b]" />
                  <span className="font-medium">Open World Map & Transit</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#fdeed9] text-[#c85a2b] rounded font-bold">
                  Kereta & Mobil
                </span>
              </button>

              {/* Log Kegiatan & Diskusi Antar Agent */}
              {onOpenActivityLogs && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenActivityLogs();
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-[#ede2d1] rounded-xl flex items-center gap-2 text-[#2c231c] transition-colors border-t border-[#ede2d1] mt-1 pt-2"
                >
                  <Coffee className="w-4 h-4 text-[#c85a2b]" />
                  <span className="font-medium">Log Kegiatan Karyawan (Pantry, Game, dll)</span>
                </button>
              )}

              {onOpenCollabLogs && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenCollabLogs();
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-[#ede2d1] rounded-xl flex items-center gap-2 text-[#2c231c] transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-[#4338ca]" />
                  <span className="font-medium">Log Diskusi Antar Agent</span>
                </button>
              )}

              {/* Top Up Wallet (Mobile view) */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenWallet();
                }}
                className="w-full text-left px-2.5 py-2 hover:bg-[#ede2d1] rounded-xl flex items-center justify-between text-[#2c231c] transition-colors lg:hidden border-t border-[#ede2d1] mt-1 pt-2"
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#ab7a1a]" />
                  <span className="font-medium">Saldo Token Poin</span>
                </div>
                <span className="font-mono text-[10px] font-bold text-[#ab7a1a]">
                  {formatNumber(userPoints)} PTS
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
