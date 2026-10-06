'use client';

import React, { useState } from 'react';
import { ActivityEvent } from '@/types/office';
import { Activity, ChevronDown, ChevronUp, MessageSquare, Coffee, CheckCircle, Navigation } from 'lucide-react';

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const recentEvents = events.slice(-8).reverse();

  return (
    <div className="fixed bottom-5 left-5 w-80 max-w-[calc(100vw-2.5rem)] bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl z-30 overflow-hidden text-slate-100 transition-all duration-200">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 bg-slate-950/80 flex items-center justify-between cursor-pointer hover:bg-slate-950 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">Office Live Ticker</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded-full font-mono">
            {events.length}
          </span>
        </div>
        <button className="text-slate-400 hover:text-white">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* When collapsed: show single latest line */}
      {!isExpanded && recentEvents.length > 0 && (
        <div className="px-3 py-2 text-[11px] text-slate-300 truncate font-mono bg-slate-900/60 border-t border-slate-800/60 flex items-center gap-2">
          <span>⚡</span>
          <span className="truncate">{recentEvents[0].description}</span>
        </div>
      )}

      {/* Expanded list */}
      {isExpanded && (
        <div className="p-3 space-y-2 max-h-60 overflow-y-auto text-xs border-t border-slate-800/80">
          {recentEvents.map((ev) => (
            <div key={ev.id} className="flex items-start gap-2 text-[11px] leading-tight text-slate-300">
              <span className="mt-0.5 shrink-0">
                {ev.type === 'collaboration' ? (
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                ) : ev.type === 'break' ? (
                  <Coffee className="w-3.5 h-3.5 text-amber-400" />
                ) : ev.type === 'task_complete' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 text-blue-400" />
                )}
              </span>
              <div className="flex-1">
                <span>{ev.description}</span>
                <span className="block text-[9px] text-slate-500 font-mono mt-0.5" suppressHydrationWarning>
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {recentEvents.length === 0 && (
            <div className="text-center py-4 text-slate-500 text-xs italic">
              Agents are starting their shift...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
