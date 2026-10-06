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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 ring-4 ring-amber-500/10">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-amber-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold tracking-wider uppercase border border-amber-500/30">
                  Human-in-the-Loop
                </span>
                <span className="text-xs text-slate-400">Persetujuan Owner Diperlukan</span>
              </div>
              <h2 className="text-base font-bold text-white mt-1">{request.title}</h2>
            </div>
          </div>
        </div>

        {/* Agent Info Banner */}
        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white"
              style={{ backgroundColor: agent.avatarColor }}
            >
              {agent.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <div className="font-semibold text-slate-200">{agent.name}</div>
              <div className="text-[11px] text-cyan-400">{agent.roleTitle}</div>
            </div>
          </div>
          <span className="text-[11px] text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 font-mono">
            Sedang menunggu di Meja Owner
          </span>
        </div>

        {/* Body Context */}
        <div className="p-6 space-y-4 text-xs">
          <div>
            <div className="text-slate-400 font-medium mb-1">Pertanyaan / Keputusan Kritis:</div>
            <p className="text-sm font-semibold text-slate-100 bg-slate-950 p-3 rounded-xl border border-slate-800">
              &ldquo;{request.question}&rdquo;
            </p>
          </div>

          <div>
            <div className="text-slate-400 font-medium mb-1">Latar Belakang / Konteks Teknis:</div>
            <p className="text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
              {request.context}
            </p>
          </div>

          {/* Options */}
          <div>
            <label className="block text-slate-400 font-medium mb-2">
              Pilih Opsi Keputusan yang Disetujui:
            </label>
            <div className="space-y-2">
              {request.options.map((opt, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedOption === opt
                      ? 'bg-amber-500/15 border-amber-500 text-amber-100 ring-1 ring-amber-500/50'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="decision_option"
                    value={opt}
                    checked={selectedOption === opt}
                    onChange={() => setSelectedOption(opt)}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span className="font-medium text-xs">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Optional Owner Feedback */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Instruksi Tambahan dari Owner (Opsional):
            </label>
            <input
              type="text"
              placeholder="Contoh: Pastikan ada fallback cache dan jalankan load test dulu sebelum deploy..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3 text-xs font-semibold">
          <button
            onClick={handleReject}
            className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            <span>Tolak Keputusan (Revisi)</span>
          </button>

          <button
            onClick={handleApprove}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Setujui & Perintahkan Eksekusi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
