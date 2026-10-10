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
    <div className="fixed bottom-5 left-5 w-80 max-w-[calc(100vw-2.5rem)] bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-2xl shadow-xl z-30 overflow-hidden text-[#2c231c] transition-all duration-200">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 bg-[#f4ebe1] flex items-center justify-between cursor-pointer hover:bg-[#ede2d1] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#288279] animate-pulse" />
          <span className="text-xs font-bold text-[#2c231c]">Office Live Ticker</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-[#f0e3ce] text-[#784620] rounded-full font-mono font-bold">
            {events.length}
          </span>
        </div>
        <button className="text-[#786653] hover:text-[#2c231c]">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* When collapsed: show single latest line */}
      {!isExpanded && recentEvents.length > 0 && (
        <div className="px-3 py-2 text-[11px] text-[#4d3c2e] truncate font-mono bg-[#fffdf9] border-t border-[#d6c5ad] flex items-center gap-2">
          <span>⚡</span>
          <span className="truncate">{recentEvents[0].description}</span>
        </div>
      )}

      {/* Expanded list */}
      {isExpanded && (
        <div className="p-3 space-y-2 max-h-60 overflow-y-auto text-xs border-t border-[#d6c5ad] bg-[#fffdf9]">
          {recentEvents.map((ev) => (
            <div key={ev.id} className="flex items-start gap-2 text-[11px] leading-tight text-[#4d3c2e]">
              <span className="mt-0.5 shrink-0">
                {ev.type === 'collaboration' ? (
                  <MessageSquare className="w-3.5 h-3.5 text-[#288279]" />
                ) : ev.type === 'break' ? (
                  <Coffee className="w-3.5 h-3.5 text-[#ab7a1a]" />
                ) : ev.type === 'task_complete' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-[#288279]" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 text-[#c85a2b]" />
                )}
              </span>
              <div className="flex-1">
                <span className="font-medium text-[#2c231c]">{ev.description}</span>
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
