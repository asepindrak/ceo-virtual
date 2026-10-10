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
    <div className="fixed inset-y-0 left-0 w-80 max-w-[calc(100vw-3rem)] bg-[#faf5eb] border-r-2 border-[#d6c5ad] shadow-2xl z-50 flex flex-col text-[#2c231c] animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-4 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#2c231c]">Office Personnel</h2>
            <p className="text-xs text-[#786653]">{agents.length} Autonomous Agents</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors"
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
                  ? 'bg-[#fdeed9] border-2 border-[#c85a2b] shadow-xs'
                  : 'bg-[#fffdf9] border-[#d6c5ad] hover:border-[#c85a2b]'
              }`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm"
                style={{ backgroundColor: agent.avatarColor }}
              >
                {agent.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-[#2c231c] truncate">{agent.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full font-mono text-[9px] uppercase tracking-wider font-bold ${
                      agent.state === 'working'
                        ? 'bg-[#e6f4f2] text-[#1f6860] border border-[#a2d8d0]'
                        : agent.state === 'walking'
                        ? 'bg-[#fef8e7] text-[#ab7a1a] border border-[#fae4a8]'
                        : agent.state === 'talking'
                        ? 'bg-[#fdf2fc] text-[#7d3b8f] border border-[#eed0ed]'
                        : agent.state === 'coffee_break'
                        ? 'bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5]'
                        : 'bg-[#ede2d1] text-[#615042]'
                    }`}
                  >
                    {agent.state.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-[11px] text-[#c85a2b] font-semibold truncate">{agent.roleTitle}</div>
                {dept && (
                  <div className="text-[10px] text-[#786653] flex items-center gap-1 mt-1 font-medium">
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span>{dept.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#786653] font-mono">
                  <span className="flex items-center gap-0.5">
                    <Code className="w-3 h-3 text-[#288279]" /> {agent.stats.linesOfCode} loc
                  </span>
                  <span className="flex items-center gap-0.5">
                    <MessageSquare className="w-3 h-3 text-[#7d3b8f]" /> {agent.stats.collabCount} chats
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
