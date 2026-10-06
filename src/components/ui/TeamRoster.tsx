'use client';

import React from 'react';
import { Agent, Department } from '@/types/office';
import { X, User, MapPin, Coffee, Code, MessageSquare } from 'lucide-react';

interface TeamRosterProps {
  agents: Agent[];
  departments: Department[];
  selectedAgentId?: string;
  onSelectAgent: (agentId: string) => void;
  onClose: () => void;
}

export const TeamRoster: React.FC<TeamRosterProps> = ({
  agents,
  departments,
  selectedAgentId,
  onSelectAgent,
  onClose,
}) => {
  return (
    <div className="fixed inset-y-0 left-0 w-80 max-w-[calc(100vw-3rem)] bg-slate-900/95 backdrop-blur-2xl border-r border-slate-800 shadow-2xl z-50 flex flex-col text-slate-100 animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Office Personnel</h2>
            <p className="text-xs text-slate-400">{agents.length} Autonomous Agents</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Agents List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agents.map((agent) => {
          const dept = departments.find((d) => d.id === agent.departmentId);
          const isSelected = agent.id === selectedAgentId;

          return (
            <div
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 flex items-start gap-3 ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-500/70 ring-1 ring-cyan-500/40'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
              }`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-inner"
                style={{ backgroundColor: agent.avatarColor }}
              >
                {agent.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-xs text-white truncate">{agent.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full font-mono text-[9px] uppercase tracking-wider ${
                      agent.state === 'working'
                        ? 'bg-blue-500/20 text-blue-300'
                        : agent.state === 'walking'
                        ? 'bg-amber-500/20 text-amber-300'
                        : agent.state === 'talking'
                        ? 'bg-purple-500/20 text-purple-300'
                        : agent.state === 'coffee_break'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {agent.state.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-[11px] text-cyan-400 font-medium truncate">{agent.roleTitle}</div>
                {dept && (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span>{dept.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center gap-0.5">
                    <Code className="w-3 h-3 text-emerald-400" /> {agent.stats.linesOfCode} loc
                  </span>
                  <span className="flex items-center gap-0.5">
                    <MessageSquare className="w-3 h-3 text-purple-400" /> {agent.stats.collabCount} chats
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
