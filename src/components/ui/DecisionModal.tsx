'use client';

import React, { useState } from 'react';
import { HumanDecisionRequest, Agent } from '@/types/office';
import { ShieldAlert, CheckCircle2, XCircle, MessageSquare, Sparkles, UserCheck } from 'lucide-react';

interface DecisionModalProps {
  request: HumanDecisionRequest;
  agent: Agent;
  onApprove: (requestId: string, chosenOption: string, feedback: string) => void;
  onReject: (requestId: string, feedback: string) => void;
  onClose: () => void;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  request,
  agent,
  onApprove,
  onReject,
  onClose,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>(request.options[0] || '');
  const [feedback, setFeedback] = useState<string>('');

  const handleApprove = () => {
    onApprove(request.id, selectedOption, feedback);
    onClose();
  };

  const handleReject = () => {
    onReject(request.id, feedback);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#2c231c]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-3xl w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden text-[#2c231c] ring-4 ring-[#c85a2b]/10 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5] animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#fdeed9] text-[#c85a2b] font-mono font-bold tracking-wider uppercase border border-[#f0c8a5]">
                  Human-in-the-Loop
                </span>
                <span className="text-xs text-[#786653]">Persetujuan Owner Diperlukan</span>
              </div>
              <h2 className="text-base font-bold text-[#2c231c] mt-1">{request.title}</h2>
            </div>
          </div>
        </div>

        {/* Agent Info Banner */}
        <div className="px-6 py-3 bg-[#fffdf9] border-b border-[#d6c5ad] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs"
              style={{ backgroundColor: agent.avatarColor }}
            >
              {agent.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <div className="font-bold text-[#2c231c]">{agent.name}</div>
              <div className="text-[11px] text-[#c85a2b] font-semibold">{agent.roleTitle}</div>
            </div>
          </div>
          <span className="text-[11px] text-[#784620] bg-[#f0e3ce] px-2 py-1 rounded-lg border border-[#dccab3] font-mono font-semibold">
            Sedang menunggu di Meja Owner
          </span>
        </div>

        {/* Body Context */}
        <div className="p-6 space-y-4 text-xs flex-1 overflow-y-auto">
          <div>
            <div className="text-[#615042] font-semibold mb-1">Pertanyaan / Keputusan Kritis:</div>
            <p className="text-sm font-semibold text-[#2c231c] bg-[#fffdf9] p-3 rounded-xl border border-[#d6c5ad]">
              &ldquo;{request.question}&rdquo;
            </p>
          </div>

          <div>
            <div className="text-[#615042] font-semibold mb-1">Latar Belakang / Konteks Teknis:</div>
            <p className="text-[#4d3c2e] bg-[#fffdf9] p-3 rounded-xl border border-[#d6c5ad] leading-relaxed">
              {request.context}
            </p>
          </div>

          {/* Options */}
          <div>
            <label className="block text-[#615042] font-semibold mb-2">
              Pilih Opsi Keputusan yang Disetujui:
            </label>
            <div className="space-y-2">
              {request.options.map((opt, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedOption === opt
                      ? 'bg-[#fdeed9] border-2 border-[#c85a2b] text-[#2c231c] shadow-xs'
                      : 'bg-[#fffdf9] border-[#d6c5ad] text-[#4d3c2e] hover:border-[#c85a2b]'
                  }`}
                >
                  <input
                    type="radio"
                    name="decision_option"
                    value={opt}
                    checked={selectedOption === opt}
                    onChange={() => setSelectedOption(opt)}
                    className="accent-[#c85a2b]"
                  />
                  <span className="font-semibold text-xs text-[#2c231c]">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Optional Owner Feedback */}
          <div>
            <label className="block text-[#615042] font-semibold mb-1">
              Instruksi Tambahan dari Owner (Opsional):
            </label>
            <input
              type="text"
              placeholder="Contoh: Pastikan ada fallback cache dan jalankan load test dulu sebelum deploy..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full bg-[#fffdf9] border border-[#d6c5ad] rounded-xl px-3.5 py-2.5 text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b] text-xs"
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-5 border-t border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-end gap-3 text-xs font-semibold">
          <button
            onClick={handleReject}
            className="px-4 py-2.5 bg-[#fdf0f0] hover:bg-[#fae0e0] text-[#b93838] border border-[#f5c6c6] rounded-xl transition-colors flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            <span>Tolak Keputusan (Revisi)</span>
          </button>

          <button
            onClick={handleApprove}
            className="px-5 py-2.5 bg-[#288279] hover:bg-[#1f6860] text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 font-bold"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Setujui & Perintahkan Eksekusi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
