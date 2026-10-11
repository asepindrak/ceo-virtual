'use client';

import React, { useState } from 'react';
import { ActivityEvent } from '@/types/office';
import { ChevronDown, ChevronUp, MessageSquare, Coffee, CheckCircle, Navigation, ExternalLink, Sparkles } from 'lucide-react';

interface ActivityFeedProps {
  events: ActivityEvent[];
  onOpenCollabLogs?: () => void;
  onOpenActivityLogs?: () => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events, onOpenCollabLogs, onOpenActivityLogs }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const recentEvents = events.slice(-8).reverse();

  return (
    <div className="fixed bottom-5 left-4 sm:left-6 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-[#faf5eb]/95 backdrop-blur-xl border-2 border-[#d6c5ad] rounded-2xl shadow-xl z-30 overflow-hidden text-[#2c231c] transition-all duration-200">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-2 bg-[#f4ebe1] border-b border-[#d6c5ad] flex items-center justify-between cursor-pointer hover:bg-[#ede2d1] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#1f6860] animate-pulse" />
          <span className="text-xs font-bold text-[#2c231c]">Office Live Ticker</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-[#f0e3ce] text-[#784620] border border-[#dccab3] rounded-full font-mono font-bold">
            {events.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {onOpenActivityLogs && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenActivityLogs();
              }}
              className="text-[10px] font-bold text-[#c85a2b] hover:text-[#9a3412] bg-[#fdeed9] hover:bg-[#fbdcb7] px-2 py-0.5 rounded-lg border border-[#f0c8a5] shadow-2xs transition-colors"
              title="Buka seluruh log kegiatan karyawan (kopi, game, sprint, dll)"
            >
              <span>Log Kegiatan ↗</span>
            </button>
          )}
          <button className="text-[#786653] hover:text-[#2c231c] p-0.5 rounded">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* When collapsed: show single latest line */}
      {!isExpanded && recentEvents.length > 0 && (
        <div
          onClick={onOpenActivityLogs || onOpenCollabLogs}
          className="px-3 py-1.5 text-[11px] text-[#4d3c2e] truncate font-mono bg-[#fffdf9] flex items-center gap-2 cursor-pointer hover:bg-[#fcf8f0] transition-colors"
          title="Klik untuk buka riwayat kegiatan karyawan"
        >
          {recentEvents[0].categoryTag ? (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-[#fdf2f8] text-[#be185d] border border-[#fbcfe8] rounded-md font-sans font-bold">
              {recentEvents[0].categoryTag}
            </span>
          ) : (
            <span className="text-[#c85a2b]">⚡</span>
          )}
          <span className="truncate flex-1">{recentEvents[0].description}</span>
          <span className="text-[10px] text-[#c85a2b] font-bold shrink-0">Lihat Semua ↗</span>
        </div>
      )}

      {/* Expanded list */}
      {isExpanded && (
        <div className="p-3 space-y-2 max-h-64 overflow-y-auto text-xs bg-[#fffdf9]">
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            {onOpenActivityLogs && (
              <button
                onClick={onOpenActivityLogs}
                className="py-1.5 px-2 bg-[#fdeed9] hover:bg-[#fbdcb7] text-[#c85a2b] rounded-xl text-[10.5px] font-bold flex items-center justify-between border border-[#f0c8a5] transition-colors shadow-2xs"
              >
                <span>☕ Log Kegiatan</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </button>
            )}
            {onOpenCollabLogs && (
              <button
                onClick={onOpenCollabLogs}
                className="py-1.5 px-2 bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#4338ca] rounded-xl text-[10.5px] font-bold flex items-center justify-between border border-[#c7d2fe] transition-colors shadow-2xs"
              >
                <span>💬 Log Diskusi</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </button>
            )}
          </div>

          {recentEvents.map((ev) => (
            <div key={ev.id} className="flex items-start gap-2 text-[11px] leading-tight text-[#4d3c2e]">
              <span className="mt-0.5 shrink-0">
                {ev.type === 'casual_talk' ? (
                  <Sparkles className="w-3.5 h-3.5 text-[#ec4899]" />
                ) : ev.type === 'collaboration' ? (
                  <MessageSquare className="w-3.5 h-3.5 text-[#1f6860]" />
                ) : ev.type === 'break' ? (
                  <Coffee className="w-3.5 h-3.5 text-[#c85a2b]" />
                ) : ev.type === 'task_complete' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-[#1f6860]" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 text-[#4338ca]" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ev.categoryTag && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-[#fdf2f8] text-[#be185d] border border-[#fbcfe8] rounded-md font-sans font-bold">
                      {ev.categoryTag}
                    </span>
                  )}
                  <span className="font-medium text-[#2c231c]">{ev.description}</span>
                </div>
                <span className="block text-[9px] text-[#9c8976] font-mono mt-0.5" suppressHydrationWarning>
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {recentEvents.length === 0 && (
            <div className="text-center py-4 text-[#9c8976] text-xs italic">
              Agents are starting their shift...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
