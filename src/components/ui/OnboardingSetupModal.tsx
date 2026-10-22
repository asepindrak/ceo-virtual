'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  FileText, 
  Globe2, 
  Building2, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  Cpu, 
  Zap, 
  Key, 
  RefreshCw,
  Layers,
  Network
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { NodeRegion, NodeSetupPayload } from '@/types/office';

interface OnboardingSetupModalProps {
  isOpen: boolean;
  onComplete: (companyName: string, industry: string, regionId: string, address: string) => void;
}

export function OnboardingSetupModal({ isOpen, onComplete }: OnboardingSetupModalProps) {
  // Navigation State
  const [mode, setMode] = useState<'create' | 'restore'>('create');
  const [step, setStep] = useState<number>(1); // 1: Mode/Identity, 2: Region, 3: Company Profile

  // Generated Identity Data
  const [mnemonic, setMnemonic] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [publicKey, setPublicKey] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [hasConfirmedBackup, setHasConfirmedBackup] = useState<boolean>(false);

  // Restore State
  const [restoreText, setRestoreText] = useState<string>('');
  const [restoreError, setRestoreError] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Region State
  const [regions, setRegions] = useState<NodeRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('apac-jakarta-1');
  const [isLoadingRegions, setIsLoadingRegions] = useState<boolean>(false);

  // Company Profile
  const [companyName, setCompanyName] = useState<string>('DevNexus Labs');
  const [industry, setIndustry] = useState<string>('Software Engineering');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');

  // 1. Fetch Regions & Generate initial candidate mnemonic on mount
  useEffect(() => {
    if (!isOpen) return;
    fetchRegions();
    if (!mnemonic) {
      generateFreshIdentity();
    }
  }, [isOpen]);

  const fetchRegions = async () => {
    setIsLoadingRegions(true);
    try {
      const res = await fetch('/api/node/regions');
      const data = await res.json();
      if (data.regions && data.regions.length > 0) {
        setRegions(data.regions);
        // Select optimal region by default
        const optimal = data.regions.find((r: NodeRegion) => r.status === 'optimal') || data.regions[0];
        setSelectedRegionId(optimal.id);
      }
    } catch (err) {
      console.error('Failed to load regions:', err);
    } finally {
      setIsLoadingRegions(false);
    }
  };

  const generateFreshIdentity = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/node/generate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMnemonic(data.mnemonic);
        setAddress(data.address);
        setPublicKey(data.publicKey);
        setHasCopied(false);
        setHasConfirmedBackup(false);
      }
    } catch (err) {
      console.error('Failed to generate identity:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy 12 words to clipboard
  const handleCopyMnemonic = () => {
    const textToCopy = mode === 'create' ? mnemonic : restoreText;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 3000);
  };

  // Download Backup .txt File
  const handleDownloadBackupTxt = () => {
    const words = mode === 'create' ? mnemonic : restoreText;
    const addr = address || 'Pending Creation';
    const content = `======================================================================
👑 CEO VIRTUAL - KODE CADANGAN PEMULIHAN KANTOR (PRIVATE RECOVERY)
======================================================================
Perusahaan    : ${companyName || 'My Virtual Company'}
Node Address  : ${addr}
Tanggal Dibuat: ${new Date().toLocaleString('id-ID')}
Industri      : ${industry}

12 KATA KUNCI PEMULIHAN (SEED PHRASE):
${words}

======================================================================
PENTING & RAHASIA:
1. Jangan bagikan file ini atau 12 kata ini kepada siapapun!
2. Simpan file ini di tempat aman (Flashdisk, Password Manager, dsb).
3. Jika PC Anda di-install ulang atau Anda berganti komputer:
   - Buka CEO Virtual di browser
   - Pilih menu "Pulihkan Kantor"
   - Cukup upload file ini atau paste 12 kata di atas.
======================================================================
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (companyName || 'ceo-virtual').toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.href = url;
    link.download = `ceo-virtual-backup-${safeName}-${Date.now().toString().slice(-4)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setHasConfirmedBackup(true);
  };

  // Handle Drag & Drop / File Upload for Restore
  const handleFileRestore = (file: File) => {
    if (!file) return;
    setRestoreError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      // Extract 12 words: check if it contains "12 KATA KUNCI PEMULIHAN" or plain text
      let foundWords = '';
      if (text.includes('SEED PHRASE):')) {
        const parts = text.split('SEED PHRASE):');
        if (parts[1]) {
          const lines = parts[1].split('===')[0].trim();
          foundWords = lines;
        }
      } else {
        foundWords = text.trim();
      }

      const wordsList = foundWords.split(/\s+/).filter(w => /^[a-z]+$/i.test(w));
      if (wordsList.length >= 12) {
        setRestoreText(wordsList.slice(0, 12).join(' '));
      } else {
        setRestoreError('File tidak berisi 12 kata pemulihan yang valid. Silakan periksa kembali file cadangan Anda.');
      }
    };
    reader.readAsText(file);
  };

  // Final Submit: Launch Company & Anchor Node
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    const activeMnemonic = mode === 'create' ? mnemonic : restoreText.trim();
    const words = activeMnemonic.split(/\s+/).filter(Boolean);
    if (words.length !== 12) {
      setSubmitError('Seed phrase harus tepat 12 kata.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: NodeSetupPayload = {
        mode,
        mnemonic: activeMnemonic,
        companyName: companyName.trim(),
        industry,
        regionId: selectedRegionId,
      };

      const res = await fetch('/api/node/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setSubmitError(data.error || 'Gagal menyimpan konfigurasi node.');
        setIsSubmitting(false);
        return;
      }

      // Success! Fire celebratory confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });

      onComplete(companyName, industry, selectedRegionId, data.identity.ownerAddress);
    } catch (err: any) {
      setSubmitError(err.message || 'Terjadi kesalahan sistem saat peluncuran node.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const mnemonicWords = mnemonic.split(' ').filter(Boolean);
  const restoreWordsCount = restoreText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-gray-900/95 via-gray-900 to-black border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden my-auto">
        
        {/* Glow Header Accents */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />
        
        {/* Modal Top Header */}
        <div className="px-6 py-5 border-b border-gray-800/80 flex items-center justify-between bg-gray-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  👑 CEO Virtual <span className="text-cyan-400 font-mono text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 uppercase">P2P Node Setup</span>
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Inisialisasi identitas kriptografis, cluster region, dan kantor virtual Anda
              </p>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
              step === 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-gray-800/40 border-gray-700 text-gray-400'
            }`}>
              <Key className="w-3.5 h-3.5" />
              <span>1. Identitas</span>
            </div>
            <div className="w-4 h-0.5 bg-gray-800" />
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
              step === 2 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-gray-800/40 border-gray-700 text-gray-400'
            }`}>
              <Globe2 className="w-3.5 h-3.5" />
              <span>2. Region</span>
            </div>
            <div className="w-4 h-0.5 bg-gray-800" />
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
              step === 3 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-gray-800/40 border-gray-700 text-gray-400'
            }`}>
              <Building2 className="w-3.5 h-3.5" />
              <span>3. Kantor</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          
          {/* ============================================================= */}
          {/* STEP 1: MODE & CRYPTOGRAPHIC IDENTITY                         */}
          {/* ============================================================= */}
          {step === 1 && (
            <div className="space-y-6">
              
              {/* Mode Toggle Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className={`text-left p-4 rounded-xl border transition-all relative overflow-hidden ${
                    mode === 'create'
                      ? 'bg-cyan-950/40 border-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400'
                      : 'bg-gray-900/40 border-gray-800 hover:border-gray-700 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${mode === 'create' ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-300'}`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">Buat Kantor Baru</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Generate wallet, 12 kata seed, & identitas node baru</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('restore')}
                  className={`text-left p-4 rounded-xl border transition-all relative overflow-hidden ${
                    mode === 'restore'
                      ? 'bg-purple-950/40 border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-400'
                      : 'bg-gray-900/40 border-gray-800 hover:border-gray-700 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${mode === 'restore' ? 'bg-purple-500 text-black' : 'bg-gray-800 text-gray-300'}`}>
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">Pulihkan Kantor</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Pindah PC / Install ulang lewat file atau 12 kata</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* A. CREATE MODE: Seed Phrase Display */}
              {mode === 'create' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Kunci Pemulihan Cadangan (BIP-39 Mnemonic)</span>
                      <p className="text-xs text-gray-400 mt-0.5">Catat atau unduh 12 kata ini. Jangan sampai hilang jika ingin memulihkan kantor Anda di PC lain.</p>
                    </div>
                    <button
                      type="button"
                      onClick={generateFreshIdentity}
                      disabled={isGenerating}
                      className="text-xs text-gray-400 hover:text-cyan-400 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-md bg-gray-800/60 border border-gray-700/60"
                      title="Generate ulang 12 kata baru"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-cyan-400' : ''}`} />
                      <span>Acak Baru</span>
                    </button>
                  </div>

                  {/* 12 Words Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 rounded-xl bg-gray-950/80 border border-gray-800 shadow-inner">
                    {mnemonicWords.map((word, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center gap-2 p-2 rounded-lg bg-gray-900/90 border border-gray-800/80 hover:border-cyan-500/40 transition-colors"
                      >
                        <span className="text-[10px] font-mono font-bold text-gray-500 w-5 text-right">{idx + 1}.</span>
                        <span className="text-sm font-mono font-semibold text-cyan-200 select-all">{word}</span>
                      </div>
                    ))}
                  </div>

                  {/* Address Badge Preview */}
                  {address && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-950/50 border border-gray-800/80 text-xs font-mono">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Key className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Node Owner Address:</span>
                      </div>
                      <span className="text-cyan-400 font-semibold">{address}</span>
                    </div>
                  )}

                  {/* Action Buttons: Copy & Download .txt */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyMnemonic}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-sm font-medium text-gray-200 hover:text-white transition-all shadow-sm active:scale-95"
                    >
                      {hasCopied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Tersalin ke Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-gray-400" />
                          <span>Salin 12 Kata</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadBackupTxt}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/80 text-sm font-semibold text-cyan-300 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] active:scale-95"
                    >
                      <Download className="w-4 h-4 text-cyan-400" />
                      <span>Unduh File Cadangan (.txt)</span>
                    </button>
                  </div>

                  {/* Safety Checkbox */}
                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/40 cursor-pointer mt-2 group">
                    <input
                      type="checkbox"
                      checked={hasConfirmedBackup}
                      onChange={(e) => setHasConfirmedBackup(e.target.checked)}
                      className="mt-0.5 rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-xs text-gray-300 leading-relaxed group-hover:text-white transition-colors">
                      Saya telah menyimpan 12 kata kode pemulihan ini di tempat yang aman (atau mengunduh file <span className="font-mono text-cyan-400">.txt</span> cadangan).
                    </span>
                  </label>
                </div>
              )}

              {/* B. RESTORE MODE: Upload File or Paste Words */}
              {mode === 'restore' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Pemulihan Kantor Lama</span>
                    <p className="text-xs text-gray-400">Upload file backup <span className="font-mono text-purple-300">.txt</span> yang pernah Anda unduh, atau paste 12 kata pemulihan secara manual.</p>
                  </div>

                  {/* Drag & Drop File Upload Area */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileRestore(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative ${
                      isDraggingFile 
                        ? 'border-purple-400 bg-purple-950/40 shadow-[0_0_25px_rgba(168,85,247,0.2)]' 
                        : 'border-gray-800 hover:border-purple-500/50 bg-gray-950/40'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileRestore(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <FileText className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-80" />
                    <p className="text-sm font-medium text-white">Tarik & Letakkan file cadangan (.txt) ke sini</p>
                    <p className="text-xs text-gray-400 mt-1">atau klik untuk memilih file dari komputer Anda</p>
                  </div>

                  {/* Manual Textarea Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-gray-400">Atau Paste 12 Kata Pemulihan:</label>
                      <span className={`font-mono ${restoreWordsCount === 12 ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                        {restoreWordsCount} / 12 kata
                      </span>
                    </div>
                    <textarea
                      value={restoreText}
                      onChange={(e) => { setRestoreText(e.target.value); setRestoreError(''); }}
                      placeholder="Contoh: matrix dynamic ocean quantum timber harvest rocket velvet whisper orbit shield alpha"
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-sm font-mono text-purple-200 placeholder:text-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                    />
                  </div>

                  {restoreError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{restoreError}</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 2: REGION SELECTION & AUTO-SHARDING                      */}
          {/* ============================================================= */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Pilih Klaster Region Node P2P</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  Region menentukan klaster sinkronisasi state terdekat untuk komunikasi real-time berlatensi rendah antar agen & node.
                </p>
              </div>

              {/* Dynamic Auto-Shard Info Alert */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-gray-300">
                <Network className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-cyan-300">Dynamic Auto-Sharding Protocol Aktif:</span>
                  <p className="text-gray-400 leading-relaxed">
                    Jika sebuah region mencapai kapasitas $\ge 90\%$, protokol konsensus node akan otomatis men-spawn shard region baru (misal: <span className="font-mono text-cyan-300">APAC Jakarta Shard-2</span>) untuk menjaga kecepatan jaringan.
                  </p>
                </div>
              </div>

              {/* Regions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {regions.map((region) => {
                  const isSelected = selectedRegionId === region.id;
                  const isHighLoad = region.capacityPercentage >= 90;

                  return (
                    <div
                      key={region.id}
                      onClick={() => setSelectedRegionId(region.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all relative ${
                        isSelected 
                          ? 'bg-cyan-950/50 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400' 
                          : 'bg-gray-950/60 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{region.flag}</span>
                          <div>
                            <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                              {region.name}
                              {region.isAutoSpawned && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 border border-purple-800 text-purple-300 font-mono">
                                  Auto-Spawned
                                </span>
                              )}
                            </h4>
                            <span className="text-[11px] font-mono text-gray-400">{region.id}</span>
                          </div>
                        </div>

                        {/* Ping Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-900 border border-gray-800 text-xs font-mono">
                          <Zap className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">{region.pingMs}ms</span>
                        </div>
                      </div>

                      {/* Capacity Progress Bar */}
                      <div className="space-y-1.5 mt-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400">Kapasitas Node Shard</span>
                          <span className={`font-mono font-medium ${isHighLoad ? 'text-amber-400' : 'text-cyan-400'}`}>
                            {region.currentSlots}/{region.maxSlots} Slot ({region.capacityPercentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isHighLoad 
                                ? 'bg-gradient-to-r from-amber-500 to-red-500' 
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                            }`}
                            style={{ width: `${Math.min(region.capacityPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 3: COMPANY PROFILE & FINAL LAUNCH                         */}
          {/* ============================================================= */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Profil Kantor & Genesis Block</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tentukan nama kantor Anda. Sistem akan menandatangani Genesis Block dengan kunci kriptografis lokal.
                </p>
              </div>

              <div className="space-y-4">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-300">Nama Perusahaan / Kantor Virtual:</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Contoh: Nusantara AI Dynamics"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>

                {/* Industry Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-300">Bidang Industri:</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer"
                  >
                    <option value="Software Engineering">Software Engineering & SaaS Startup</option>
                    <option value="Digital Marketing Agency">Digital Marketing & SEO Agency</option>
                    <option value="Game Studio">Game Development & Creative Studio</option>
                    <option value="Content & Media House">Content Writing & Media House</option>
                    <option value="AI & Data Labs">AI Research & Data Analytics</option>
                    <option value="Legal & Consulting">Legal & Strategic Consulting Firm</option>
                  </select>
                </div>

                {/* Summary Card */}
                <div className="p-4 rounded-xl bg-gray-950/80 border border-gray-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-gray-800/60">
                    <span className="text-gray-400">Mode Inisialisasi:</span>
                    <span className="font-semibold text-white uppercase">{mode === 'create' ? 'Kantor Baru' : 'Pemulihan Backup'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-800/60">
                    <span className="text-gray-400">Region Klaster:</span>
                    <span className="font-mono text-cyan-400 font-semibold">{selectedRegionId}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-800/60">
                    <span className="text-gray-400">Proof-of-Ownership:</span>
                    <span className="font-mono text-purple-300">BIP-39 Asymmetric Signature</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-400">Lokasi Keystore:</span>
                    <span className="font-mono text-gray-300">~/.ceo-virtual/keystore.json</span>
                  </div>
                </div>

                {submitError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-gray-800/80 bg-gray-950/60 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              disabled={
                (mode === 'create' && !hasConfirmedBackup) ||
                (mode === 'restore' && restoreWordsCount !== 12)
              }
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-bold text-black transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <span>Lanjut ke {step === 1 ? 'Pilih Region' : 'Profil Kantor'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting || !companyName.trim()}
              onClick={handleFinalSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 text-xs font-bold text-black transition-all shadow-[0_0_25px_rgba(16,185,129,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menandatangani Genesis Block...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>🚀 Luncurkan Kantor Virtual</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
