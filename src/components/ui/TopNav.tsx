'use client';

import React, { useState, useEffect } from 'react';
import { Company, TaskTicket } from '@/types/office';
import { Building2, Kanban, Users, Play, Pause, ShoppingBag, ShieldAlert, CreditCard, Terminal } from 'lucide-react';
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
    <header className="fixed top-4 inset-x-4 max-w-7xl mx-auto h-14 bg-slate-900/85 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-40 px-3.5 flex items-center justify-between text-slate-100">
      {/* Brand & Multi-Office Switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCompanyModal}
          className="flex items-center gap-2.5 p-1 -ml-1 hover:bg-slate-800 rounded-xl transition-colors group"
          title="Ganti Kantor Virtual atau Buat Kantor Baru"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-black text-white shadow-md group-hover:scale-105 transition-transform">
            3D
          </div>
          <div className="text-left">
            <div className="font-bold text-sm text-white flex items-center gap-1.5 leading-tight">
              <span>{company.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md font-mono">
                Kantor ▾
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[160px] md:max-w-xs">
              {company.industry}
            </div>
          </div>
        </button>
      </div>

      {/* Middle: Simulation Controls */}
      <div className="hidden lg:flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-1 rounded-xl text-xs">
        <span className="font-mono text-cyan-400 font-medium" suppressHydrationWarning>{timeStr}</span>
        <div className="h-4 w-px bg-slate-800 mx-1" />

        <button
          onClick={onTogglePause}
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium ${
            isPaused
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title={isPaused ? 'Lanjutkan Simulasi' : 'Jeda Simulasi'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          <span>{isPaused ? 'Paused' : 'Live'}</span>
        </button>

        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
          {[1, 2, 5].map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                speed === s
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
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
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
              : 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
          }`}
          title={viewMode === '2d' ? 'Mode 2.5D Isometric Aktif (Super Ringan). Klik untuk beralih ke 3D' : 'Mode 3D WebGL Aktif. Klik untuk beralih ke 2.5D Ringan'}
        >
          <span>{viewMode === '2d' ? '📐 2.5D (Ringan)' : '🎮 3D WebGL'}</span>
        </button>

        {/* Human Decisions Pending Alert */}
        {pendingDecisionsCount > 0 && (
          <button
            onClick={onOpenDecisions}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-bold rounded-xl animate-bounce shadow-lg shadow-amber-500/20"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Butuh Approval ({pendingDecisionsCount})</span>
          </button>
        )}

        {/* User Points & Top Up */}
        <button
          onClick={onOpenWallet}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400 rounded-xl transition-all"
          title="Isi Saldo Poin Akun"
        >
          <span className="text-sm">🪙</span>
          <span className="font-mono font-bold text-xs text-amber-300" suppressHydrationWarning>
            {formatNumber(userPoints)} PTS
          </span>
          <span className="hidden sm:inline text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-bold">
            +Topup
          </span>
        </button>

        {/* Marketplace Worker Button */}
        <button
          onClick={onOpenMarketplace}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-cyan-600/20"
          title="Buka Marketplace AI Worker untuk merekrut atau membuat agen"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pasar Agen</span>
        </button>

        {/* Team Roster button */}
        <button
          onClick={onOpenRosterModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors border border-slate-700/60"
        >
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Karyawan</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-[10px]">
            {company.agents.length}
          </span>
        </button>

        {/* Tasks / Kanban button */}
        <button
          onClick={onOpenTasksModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors border border-slate-700/60"
        >
          <Kanban className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Tasks</span>
          {activeTasksCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-900 text-cyan-200 text-[10px] font-bold">
              {activeTasksCount}
            </span>
          )}
        </button>

        {/* Dedicated CLI & Workspace button */}
        <button
          onClick={onOpenWorkspace}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-300 hover:text-white text-xs font-semibold rounded-xl transition-all border border-indigo-500/40 shadow-sm"
          title="Buka CLI & Folder Workspace (~/.realagent)"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Workspace CLI</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
            :28483
          </span>
        </button>
      </div>
    </header>
  );
};
