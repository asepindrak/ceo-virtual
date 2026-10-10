'use client';

import React, { useState, useEffect } from 'react';
import { Company, TaskTicket } from '@/types/office';
import { Building2, Kanban, Users, Play, Pause, ShoppingBag, ShieldAlert, CreditCard, Terminal, Blocks } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface TopNavProps {
  company: Company;
  tasks: TaskTicket[];
  isPaused: boolean;
  speed: number;
  userPoints: number;
  pendingDecisionsCount: number;
  viewMode: '2d' | '3d';
  onToggleViewMode: () => void;
  onTogglePause: () => void;
  onChangeSpeed: (speed: number) => void;
  onOpenCompanyModal: () => void;
  onOpenTasksModal: () => void;
  onOpenRosterModal: () => void;
  onOpenMarketplace: () => void;
  onOpenWallet: () => void;
  onOpenDecisions: () => void;
  onOpenWorkspace: () => void;
  onOpenExtensions: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  company,
  tasks,
  isPaused,
  speed,
  userPoints,
  pendingDecisionsCount,
  viewMode,
  onToggleViewMode,
  onTogglePause,
  onChangeSpeed,
  onOpenCompanyModal,
  onOpenTasksModal,
  onOpenRosterModal,
  onOpenMarketplace,
  onOpenWallet,
  onOpenDecisions,
  onOpenWorkspace,
  onOpenExtensions,
}) => {
  const [timeStr, setTimeStr] = useState('09:42 AM');

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

  const activeTasksCount = tasks.filter((t) => t.status === 'in_progress').length;

  return (
    <header className="fixed top-4 inset-x-4 max-w-7xl mx-auto h-14 bg-[#faf5eb]/95 backdrop-blur-xl border-2 border-[#d6c5ad] rounded-2xl shadow-xl z-40 px-3.5 flex items-center justify-between text-[#2c231c]">
      {/* Brand & Multi-Office Switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCompanyModal}
          className="flex items-center gap-2.5 p-1 -ml-1 hover:bg-[#ede2d1] rounded-xl transition-colors group"
          title="Vigent (Virtual Office Agent) - Ganti Kantor Virtual atau Buat Kantor Baru"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c85a2b] via-[#d97736] to-[#c68f23] flex items-center justify-center font-black text-white shadow-md border border-[#ad4b20] group-hover:scale-105 transition-transform tracking-wider text-xs">
            VG
          </div>
          <div className="text-left">
            <div className="font-bold text-sm text-[#2c231c] flex items-center gap-1.5 leading-tight">
              <span>{company.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-[#f0e3ce] text-[#784620] border border-[#dccab3] rounded-md font-mono">
                Kantor ▾
              </span>
            </div>
            <div className="text-[11px] text-[#786653] truncate max-w-[160px] md:max-w-xs">
              {company.industry}
            </div>
          </div>
        </button>
      </div>

      {/* Middle: Simulation Controls */}
      <div className="hidden lg:flex items-center gap-2 bg-[#fffdf9] border border-[#d6c5ad] px-3 py-1 rounded-xl text-xs shadow-sm">
        <span className="font-mono text-[#c85a2b] font-bold" suppressHydrationWarning>{timeStr}</span>
        <div className="h-4 w-px bg-[#d6c5ad] mx-1" />

        <button
          onClick={onTogglePause}
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 font-semibold ${
            isPaused
              ? 'bg-[#fdeed9] text-[#c85a2b] border border-[#e8ba8c]'
              : 'text-[#5c4939] hover:text-[#2c231c] hover:bg-[#ede2d1]'
          }`}
          title={isPaused ? 'Lanjutkan Simulasi' : 'Jeda Simulasi'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          <span>{isPaused ? 'Paused' : 'Live'}</span>
        </button>

        <div className="flex items-center gap-1 bg-[#f4ebe1] rounded-lg p-0.5 border border-[#d6c5ad]">
          {[1, 2, 5].map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
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

      {/* Right Action Bar: ViewMode, Marketplace, Wallet, Decisions, Kanban, Roster */}
      <div className="flex items-center gap-2">
        {/* View Mode Toggle: 2.5D Isometric vs 3D WebGL */}
        <button
          onClick={onToggleViewMode}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
            viewMode === '2d'
              ? 'bg-[#e6f4f2] text-[#1f6860] border-[#9fd3cc] hover:bg-[#d8ece9]'
              : 'bg-[#fbf0f8] text-[#862e6b] border-[#e2bad8] hover:bg-[#f5e0f0]'
          }`}
          title={viewMode === '2d' ? 'Mode 2.5D Isometric Aktif (Super Ringan). Klik untuk beralih ke 3D' : 'Mode 3D WebGL Aktif. Klik untuk beralih ke 2.5D Ringan'}
        >
          <span>{viewMode === '2d' ? '📐 2.5D (Ringan)' : '🎮 3D WebGL'}</span>
        </button>

        {/* Human Decisions Pending Alert */}
        {pendingDecisionsCount > 0 && (
          <button
            onClick={onOpenDecisions}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fef3e7] hover:bg-[#fde9d2] text-[#c85a2b] border-2 border-[#c85a2b] text-xs font-bold rounded-xl animate-bounce shadow-md"
          >
            <ShieldAlert className="w-4 h-4 text-[#c85a2b]" />
            <span>Butuh Approval ({pendingDecisionsCount})</span>
          </button>
        )}

        {/* User Points & Top Up */}
        <button
          onClick={onOpenWallet}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#fffdf9] hover:bg-[#fbf4e8] border border-[#d6c5ad] hover:border-[#c68f23] rounded-xl transition-all shadow-xs"
          title="Isi Saldo Poin Akun"
        >
          <span className="text-sm">🪙</span>
          <span className="font-mono font-bold text-xs text-[#ab7a1a]" suppressHydrationWarning>
            {formatNumber(userPoints)} PTS
          </span>
          <span className="hidden sm:inline text-[9px] bg-[#fef8e7] text-[#ab7a1a] border border-[#fae4a8] px-1 py-0.2 rounded font-bold">
            +Topup
          </span>
        </button>

        {/* Marketplace Worker Button */}
        <button
          onClick={onOpenMarketplace}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c85a2b] hover:bg-[#b34d21] text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-[#c85a2b]/20"
          title="Buka Marketplace AI Worker untuk merekrut atau membuat agen"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pasar Agen</span>
        </button>

        {/* Team Roster button */}
        <button
          onClick={onOpenRosterModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fffdf9] hover:bg-[#f4ebe1] text-[#2c231c] text-xs font-medium rounded-xl transition-colors border border-[#d6c5ad]"
        >
          <Users className="w-3.5 h-3.5 text-[#288279]" />
          <span className="hidden sm:inline">Karyawan</span>
          <span className="px-1.5 py-0.2 rounded-full bg-[#ede2d1] text-[10px] text-[#4d3c2e] font-bold">
            {company.agents.length}
          </span>
        </button>

        {/* Tasks / Kanban button */}
        <button
          onClick={onOpenTasksModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fffdf9] hover:bg-[#f4ebe1] text-[#2c231c] text-xs font-medium rounded-xl transition-colors border border-[#d6c5ad]"
        >
          <Kanban className="w-3.5 h-3.5 text-[#c85a2b]" />
          <span className="hidden sm:inline">Tasks</span>
          {activeTasksCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5] text-[10px] font-bold">
              {activeTasksCount}
            </span>
          )}
        </button>

        {/* Dedicated CLI & Workspace button */}
        <button
          onClick={onOpenWorkspace}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fffdf9] hover:bg-[#f4ebe1] text-[#2c231c] text-xs font-semibold rounded-xl transition-all border border-[#d6c5ad] shadow-xs"
          title="Buka Vigent CLI & Folder Workspace (~/.vigent)"
        >
          <Terminal className="w-3.5 h-3.5 text-[#2d4263]" />
          <span className="hidden md:inline">CLI</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#eef2f8] text-[#2d4263] rounded border border-[#c4d1e4]">
            :28483
          </span>
        </button>

        {/* Extension Hub (Skills & MCP) button */}
        <button
          onClick={onOpenExtensions}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fffdf9] hover:bg-[#f4ebe1] text-[#2c231c] text-xs font-semibold rounded-xl transition-all border border-[#d6c5ad] shadow-xs"
          title="Buka Toko Ekstensi MCP & Panduan Role Skills"
        >
          <Blocks className="w-3.5 h-3.5 text-[#7d3b8f]" />
          <span className="hidden md:inline">Skills & MCP</span>
        </button>
      </div>
    </header>
  );
};
