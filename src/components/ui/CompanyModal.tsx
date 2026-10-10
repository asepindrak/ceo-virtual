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
    <div className="fixed inset-0 bg-[#2c231c]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-[#2c231c]">
        {/* Header */}
        <div className="p-5 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2c231c]">Company & Office Setup</h2>
              <p className="text-xs text-[#786653]">Configure your autonomous 3D workforce environment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-[#d6c5ad] bg-[#faf5eb] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'presets'
                ? 'border-[#c85a2b] text-[#c85a2b] bg-[#fffdf9]'
                : 'border-transparent text-[#786653] hover:text-[#2c231c]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Curated Presets</span>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'custom'
                ? 'border-[#c85a2b] text-[#c85a2b] bg-[#fffdf9]'
                : 'border-transparent text-[#786653] hover:text-[#2c231c]'
            }`}
          >
            <Wand2 className="w-4 h-4 text-[#ab7a1a]" />
            <span>Generate Custom Company</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'presets' ? (
            <div className="space-y-3.5">
              <div className="text-xs text-[#786653] mb-2 font-medium">
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
                        ? 'bg-[#fdeed9] border-2 border-[#c85a2b] shadow-xs'
                        : 'bg-[#fffdf9] border-[#d6c5ad] hover:border-[#c85a2b]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#2c231c] text-sm">{preset.name}</span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5] text-[10px] flex items-center gap-1 font-bold">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#c85a2b] font-semibold">{preset.industry}</div>
                      <p className="text-xs text-[#615042]">{preset.description}</p>
                      <div className="flex items-center gap-3 pt-2 text-[11px] text-[#786653] font-medium">
                        <span>👥 {preset.agents.length} Agents</span>
                        <span>🏢 {preset.departments.length} Divisions</span>
                        <span>📋 {preset.tasks.length} Active Tasks</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#786653] mt-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              <div className="p-3 bg-[#fef8e7] border border-[#fae4a8] rounded-xl text-[#784620] flex items-start gap-2.5 font-medium">
                <Sparkles className="w-4 h-4 text-[#ab7a1a] shrink-0 mt-0.5" />
                <p>
                  AI will automatically deduce the organization chart, generate specialized roles (PM, engineers, writers, QA), assign office desks, and seed initial backlog tickets.
                </p>
              </div>

              <div>
                <label className="block text-[#615042] font-semibold mb-1.5">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Cyberlabs, Nova Studio, Quantum Finance"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-xl px-3.5 py-2.5 text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b]"
                />
              </div>

              <div>
                <label className="block text-[#615042] font-semibold mb-1.5">Industry & Specialization</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Autonomous Cybersecurity & Threat Intelligence"
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-xl px-3.5 py-2.5 text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b]"
                />
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full mt-2 py-3 bg-[#c85a2b] hover:bg-[#b54d22] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Office & Staff...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate & Spawn Office Team</span>
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
