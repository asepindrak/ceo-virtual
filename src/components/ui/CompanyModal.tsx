'use client';

import React, { useState } from 'react';
import { Company } from '@/types/office';
import { PRESET_COMPANIES, generateCustomCompany } from '@/lib/companyPresets';
import { X, Building2, Sparkles, Check, ArrowRight, Wand2 } from 'lucide-react';

interface CompanyModalProps {
  currentCompany: Company;
  onClose: () => void;
  onSelectCompany: (company: Company) => void;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  currentCompany,
  onClose,
  onSelectCompany,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [customName, setCustomName] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customIndustry.trim()) return;

    setIsGenerating(true);
    setTimeout(() => {
      const generated = generateCustomCompany(customName, customIndustry);
      onSelectCompany(generated);
      setIsGenerating(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Company & Office Setup</h2>
              <p className="text-xs text-slate-400">Configure your autonomous 3D workforce environment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'presets'
                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Curated Presets</span>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'custom'
                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-4 h-4 text-amber-400" />
            <span>Generate Custom Company</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'presets' ? (
            <div className="space-y-3.5">
              <div className="text-xs text-slate-400 mb-2">
                Select an existing organization template to instantly spawn their department structure:
              </div>
              {PRESET_COMPANIES.map((preset) => {
                const isSelected = preset.id === currentCompany.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      onSelectCompany(preset);
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start justify-between ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{preset.name}</span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-indigo-400 font-medium">{preset.industry}</div>
                      <p className="text-xs text-slate-400">{preset.description}</p>
                      <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400">
                        <span>👥 {preset.agents.length} Agents</span>
                        <span>🏢 {preset.departments.length} Divisions</span>
                        <span>📋 {preset.tasks.length} Active Tasks</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 mt-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  AI will automatically deduce the organization chart, generate specialized roles (PM, engineers, writers, QA), assign office desks, and seed initial backlog tickets.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Cyberlabs, Nova Studio, Quantum Finance"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Industry & Specialization</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Autonomous Cybersecurity & Threat Intelligence"
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Office & Staff...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate & Spawn 3D Office Team</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
