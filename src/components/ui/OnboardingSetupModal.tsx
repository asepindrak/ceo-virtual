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
  Network,
  MapPin,
  Compass,
  Navigation,
  Bot,
  Eye,
  EyeOff,
  Users,
  CheckCircle2,
  ChevronRight,
  Briefcase,
  Wrench,
  ShoppingBag,
  Shield,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  NodeRegion, 
  NodeSetupPayload, 
  Company, 
  Department, 
  Agent, 
  TaskTicket, 
  CompanyGlobalLLMConfig, 
  OfficeLayoutTemplateId 
} from '@/types/office';

// Haversine distance formula in kilometers
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface OnboardingCompletionData {
  companyName: string;
  industry: string;
  regionId: string;
  address: string;
  globalLLMConfig?: CompanyGlobalLLMConfig;
  officeLayoutTemplate?: OfficeLayoutTemplateId;
  description?: string;
  departments?: Department[];
  agents?: Agent[];
  tasks?: TaskTicket[];
}

interface OnboardingSetupModalProps {
  isOpen: boolean;
  onComplete: (data: OnboardingCompletionData) => void;
}

export function OnboardingSetupModal({ isOpen, onComplete }: OnboardingSetupModalProps) {
  // Navigation State
  const [mode, setMode] = useState<'create' | 'restore'>('create');
  const [step, setStep] = useState<number>(1); // 1: Mode/Identity, 2: Region, 3: Company Profile & LLM

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

  // Region & GPS State
  const [regions, setRegions] = useState<NodeRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('apac-jakarta-1');
  const [isLoadingRegions, setIsLoadingRegions] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number; city?: string } | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<string>('');

  // Company Profile
  const [companyName, setCompanyName] = useState<string>('DevNexus Labs');
  const [industry, setIndustry] = useState<string>('Software Engineering');
  const [autorun, setAutorun] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');

  // Step 3: Setup Mode (AI Generator + Global LLM vs Manual Genesis/Marketplace)
  const [creationMethod, setCreationMethod] = useState<'ai' | 'manual'>('ai');

  // LLM Setup State
  const [llmProvider, setLlmProvider] = useState<'groq' | 'gemini' | 'deepseek' | 'openai' | 'anthropic' | 'custom'>('groq');
  const [llmModel, setLlmModel] = useState<string>('llama-3.3-70b-versatile');
  const [llmApiKey, setLlmApiKey] = useState<string>('');
  const [llmBaseUrl, setLlmBaseUrl] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showAdvancedLLM, setShowAdvancedLLM] = useState<boolean>(false);
  const [businessPrompt, setBusinessPrompt] = useState<string>('');

  // AI Generation State
  const [isGeneratingCompany, setIsGeneratingCompany] = useState<boolean>(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [generationError, setGenerationError] = useState<string>('');
  const [generatedCompany, setGeneratedCompany] = useState<Company | null>(null);

  // 1. Fetch Regions & Generate initial candidate mnemonic on mount
  useEffect(() => {
    if (!isOpen) return;
    fetchRegions();
    if (!mnemonic) {
      generateFreshIdentity();
    }
  }, [isOpen]);

  // Auto-detect GPS when reaching Step 2
  useEffect(() => {
    if (step === 2 && !userCoords && !isDetectingLocation) {
      detectLocation();
    }
  }, [step]);

  const detectLocation = async () => {
    setIsDetectingLocation(true);
    setLocationStatus('Detecting device GPS coordinates...');

    const applyCoords = (lat: number, lon: number, cityName: string) => {
      setUserCoords({ latitude: lat, longitude: lon, city: cityName });
      setLocationStatus(`Location detected: ${cityName} (${lat.toFixed(2)}, ${lon.toFixed(2)})`);

      setRegions((prev) => {
        const updated = prev.map((reg) => {
          if (reg.coordinates) {
            const dist = calculateHaversineKm(lat, lon, reg.coordinates.latitude, reg.coordinates.longitude);
            const realPing = Math.max(8, Math.round(dist * 0.035 + 8));
            return { ...reg, distanceKm: dist, pingMs: realPing };
          }
          return reg;
        });

        // Auto-select nearest region
        const sorted = [...updated].sort((a, b) => (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999));
        if (sorted[0]) {
          setSelectedRegionId(sorted[0].id);
        }
        return updated;
      });
      setIsDetectingLocation(false);
    };

    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          applyCoords(pos.coords.latitude, pos.coords.longitude, 'Browser GPS');
        },
        async () => {
          // Fallback to IP detection API
          try {
            const res = await fetch('/api/node/detect-location');
            const data = await res.json();
            if (data.success) {
              applyCoords(data.latitude, data.longitude, `${data.city}, ${data.countryCode}`);
            } else {
              setLocationStatus('Automatic detection unavailable, please select region manually.');
              setIsDetectingLocation(false);
            }
          } catch {
            setLocationStatus('Automatic detection unavailable, please select region manually.');
            setIsDetectingLocation(false);
          }
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    } else {
      try {
        const res = await fetch('/api/node/detect-location');
        const data = await res.json();
        if (data.success) {
          applyCoords(data.latitude, data.longitude, `${data.city}, ${data.countryCode}`);
        } else {
          setIsDetectingLocation(false);
        }
      } catch {
        setIsDetectingLocation(false);
      }
    }
  };

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
👑 CEO VIRTUAL - OFFICE RECOVERY BACKUP KEY (PRIVATE RECOVERY)
======================================================================
Company       : ${companyName || 'My Virtual Company'}
Node Address  : ${addr}
Created At    : ${new Date().toLocaleString('en-US')}
Industry      : ${industry}

12 RECOVERY SEED WORDS (BIP-39 SEED PHRASE):
${words}

======================================================================
IMPORTANT & CONFIDENTIAL:
1. Never share this file or these 12 words with anyone!
2. Store this file in a safe place (Flash drive, Password Manager, etc.).
3. If you reinstall your OS or switch to another computer:
   - Open CEO Virtual in your browser
   - Select "Restore Office"
   - Simply upload this file or paste the 12 words above.
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
        setRestoreError('File does not contain 12 valid recovery words. Please verify your backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleProviderChange = (newProvider: 'groq' | 'gemini' | 'deepseek' | 'openai' | 'anthropic' | 'custom') => {
    setLlmProvider(newProvider);
    switch (newProvider) {
      case 'groq':
        setLlmModel('llama-3.3-70b-versatile');
        setLlmBaseUrl('');
        break;
      case 'gemini':
        setLlmModel('gemini-1.5-flash');
        setLlmBaseUrl('');
        break;
      case 'deepseek':
        setLlmModel('deepseek-chat');
        setLlmBaseUrl('');
        break;
      case 'openai':
        setLlmModel('gpt-4o-mini');
        setLlmBaseUrl('');
        break;
      case 'anthropic':
        setLlmModel('claude-3-5-sonnet-20241022');
        setLlmBaseUrl('');
        break;
      case 'custom':
        setLlmModel('llama3:latest');
        setLlmBaseUrl('http://localhost:11434/v1');
        break;
    }
  };

  const handleGenerateAICompany = async () => {
    if (!businessPrompt.trim() && !companyName.trim()) {
      setGenerationError('Please enter your business idea or company name.');
      return;
    }

    setIsGeneratingCompany(true);
    setGenerationError('');
    setGenerationStatus('Connecting to LLM Engine & architecting structure...');

    try {
      const payload = {
        name: companyName.trim(),
        industry,
        businessPrompt: businessPrompt.trim(),
        agentCount: 4,
        config: (llmApiKey.trim() || llmProvider === 'custom') ? {
          provider: llmProvider,
          apiKey: llmApiKey.trim(),
          baseUrl: llmBaseUrl.trim() || undefined,
          model: llmModel.trim(),
          isLocked: false,
        } : undefined,
      };

      const res = await fetch('/api/company/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setGenerationError(data.error || 'Failed to generate company structure.');
        setIsGeneratingCompany(false);
        return;
      }

      setGeneratedCompany(data.company);
      if (data.company.name) setCompanyName(data.company.name);
      if (data.company.industry) setIndustry(data.company.industry);
      setGenerationStatus('Company structure, AI team, and sprint tasks successfully generated!');
    } catch (err: any) {
      setGenerationError(err.message || 'A system error occurred while contacting AI generator.');
    } finally {
      setIsGeneratingCompany(false);
    }
  };

  // Final Submit: Launch Company & Anchor Node
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    const activeMnemonic = mode === 'create' ? mnemonic : restoreText.trim();
    const words = activeMnemonic.split(/\s+/).filter(Boolean);
    if (words.length !== 12) {
      setSubmitError('Seed phrase must contain exactly 12 words.');
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
        autorun,
        geoCoordinates: userCoords || undefined,
      };

      const res = await fetch('/api/node/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setSubmitError(data.error || 'Failed to save node configuration.');
        setIsSubmitting(false);
        return;
      }

      // Success! Fire celebratory confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });

      // Prepare Global LLM Config
      let finalGlobalLLM: CompanyGlobalLLMConfig | undefined = undefined;
      if (creationMethod === 'ai' && (llmApiKey.trim() || llmProvider === 'custom')) {
        const textSetting = {
          provider: llmProvider,
          apiKey: llmApiKey.trim(),
          baseUrl: llmBaseUrl.trim() || undefined,
          model: llmModel.trim(),
          isEnabled: true,
          description: `Global LLM Provider (${llmProvider} - ${llmModel}) configured during initial onboarding.`,
        };
        finalGlobalLLM = generatedCompany?.globalLLMConfig || {
          text: textSetting,
          fast: textSetting,
        };
      }

      onComplete({
        companyName: companyName.trim(),
        industry,
        regionId: selectedRegionId,
        address: data.identity?.ownerAddress || address || 'owner-node',
        globalLLMConfig: finalGlobalLLM,
        officeLayoutTemplate: generatedCompany?.officeLayoutTemplate || 'tech_startup',
        description: generatedCompany?.description,
        departments: creationMethod === 'ai' ? (generatedCompany?.departments || []) : [],
        agents: creationMethod === 'ai' ? (generatedCompany?.agents || []) : [],
        tasks: creationMethod === 'ai' ? (generatedCompany?.tasks || []) : [],
      });
    } catch (err: any) {
      setSubmitError(err.message || 'A system error occurred during node launch.');
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
                Initialize your cryptographic identity, regional cluster, and virtual office
              </p>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
              step === 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-gray-800/40 border-gray-700 text-gray-400'
            }`}>
              <Key className="w-3.5 h-3.5" />
              <span>1. Identity</span>
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
              <span>3. Office</span>
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
                      <h3 className="font-semibold text-white text-sm">Create New Office</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Generate wallet, 12 seed words, & fresh node identity</p>
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
                      <h3 className="font-semibold text-white text-sm">Restore Office</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Migrate PC / Reinstall via backup file or 12 words</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* A. CREATE MODE: Seed Phrase Display */}
              {mode === 'create' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Backup Recovery Key (BIP-39 Mnemonic)</span>
                      <p className="text-xs text-gray-400 mt-0.5">Write down or download these 12 words. Keep them safe to restore your office on any computer.</p>
                    </div>
                    <button
                      type="button"
                      onClick={generateFreshIdentity}
                      disabled={isGenerating}
                      className="text-xs text-gray-400 hover:text-cyan-400 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-md bg-gray-800/60 border border-gray-700/60"
                      title="Generate new 12 words"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-cyan-400' : ''}`} />
                      <span>Roll New</span>
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
                          <span className="text-emerald-400 font-semibold">Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-gray-400" />
                          <span>Copy 12 Words</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadBackupTxt}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/80 text-sm font-semibold text-cyan-300 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] active:scale-95"
                    >
                      <Download className="w-4 h-4 text-cyan-400" />
                      <span>Download Backup (.txt)</span>
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
                      I have safely saved these 12 recovery words in a secure location (or downloaded the backup <span className="font-mono text-cyan-400">.txt</span> file).
                    </span>
                  </label>
                </div>
              )}

              {/* B. RESTORE MODE: Upload File or Paste Words */}
              {mode === 'restore' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Restore Existing Office</span>
                    <p className="text-xs text-gray-400">Upload your backup <span className="font-mono text-purple-300">.txt</span> file, or paste your 12 recovery words manually.</p>
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
                    <p className="text-sm font-medium text-white">Drag & Drop backup file (.txt) here</p>
                    <p className="text-xs text-gray-400 mt-1">or click to select a file from your computer</p>
                  </div>

                  {/* Manual Textarea Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-gray-400">Or Paste 12 Recovery Words:</label>
                      <span className={`font-mono ${restoreWordsCount === 12 ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                        {restoreWordsCount} / 12 words
                      </span>
                    </div>
                    <textarea
                      value={restoreText}
                      onChange={(e) => { setRestoreText(e.target.value); setRestoreError(''); }}
                      placeholder="e.g. matrix dynamic ocean quantum timber harvest rocket velvet whisper orbit shield alpha"
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
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Select P2P Node Region Cluster</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  Region determines the closest state synchronization cluster for ultra low-latency real-time P2P agent communication.
                </p>
              </div>

              {/* 📍 GPS & Spatial Location Detection Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-purple-950/40 border border-cyan-500/30">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <MapPin className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">GPS Location Detection & Nearby Office</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                        Spatial P2P
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300 mt-0.5">
                      {locationStatus || 'Automatic GPS detection to recommend the closest shard and enable Nearby Office discovery.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isDetectingLocation}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all shrink-0 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Compass className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                  <span>{isDetectingLocation ? 'Detecting...' : '📍 Re-check GPS'}</span>
                </button>
              </div>

              {/* Dynamic Auto-Shard Info Alert */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-950/60 border border-gray-800/80 text-xs text-gray-300">
                <Network className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-cyan-300 text-[11px]">Dynamic Auto-Sharding Protocol:</span>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    If a region reaches capacity $\ge 90\%$, the consensus protocol automatically spawns a new region shard (e.g., <span className="font-mono text-cyan-300">APAC Jakarta Shard-2</span>).
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
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{region.flag}</span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-semibold text-white text-sm">
                                {region.name}
                              </h4>
                              {region.isAutoSpawned && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 border border-purple-800 text-purple-300 font-mono">
                                  Auto-Spawned
                                </span>
                              )}
                              {region.distanceKm !== undefined && region.distanceKm < 200 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/90 border border-emerald-700 text-emerald-300 font-semibold font-mono">
                                  ★ Closest
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-gray-400">{region.city || region.id}</span>
                          </div>
                        </div>

                        {/* Ping & Distance Badges */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-900 border border-gray-800 text-[11px] font-mono">
                            <Zap className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">{region.pingMs}ms</span>
                          </div>
                          {region.distanceKm !== undefined && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-800 text-[10px] font-mono text-cyan-300">
                              <MapPin className="w-2.5 h-2.5 text-cyan-400" />
                              <span>~{region.distanceKm} km</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Capacity Progress Bar */}
                      <div className="space-y-1.5 mt-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400">Active P2P Nodes in Shard</span>
                          <span className={`font-mono font-medium ${isHighLoad ? 'text-amber-400' : 'text-cyan-400'}`}>
                            {region.currentSlots} Active Nodes (Max Capacity: {region.maxSlots})
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
          {/* STEP 3: COMPANY PROFILE, GLOBAL LLM & AI GENERATION            */}
          {/* ============================================================= */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Office Profile & Genesis Block</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  Configure your company profile. Use AI Generator to architect an autonomous team with a Global LLM, or start from clean slate.
                </p>
              </div>

              {/* Setup Mode Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-950/80 border border-gray-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCreationMethod('ai')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    creationMethod === 'ai'
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                      : 'text-gray-400 hover:text-gray-200 border border-transparent'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>✨ AI Company Generator</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Recommended
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreationMethod('manual')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    creationMethod === 'manual'
                      ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                      : 'text-gray-400 hover:text-gray-200 border border-transparent'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                  <span>🛠️ Clean Slate / Marketplace</span>
                </button>
              </div>

              {/* ========================================================= */}
              {/* TAB 1: AI COMPANY GENERATOR & GLOBAL LLM SETUP             */}
              {/* ========================================================= */}
              {creationMethod === 'ai' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Global LLM Explanation Banner */}
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-500/30 text-xs">
                    <Bot className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">Global Company LLM Setup</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
                          Universal Auto-Inherit
                        </span>
                      </div>
                      <p className="text-gray-300 text-[11px] mt-0.5 leading-relaxed">
                        The LLM provider you configure here becomes the <strong className="text-cyan-300">Global LLM Provider</strong> across all office agents. Every new agent automatically inherits this model!
                      </p>
                    </div>
                  </div>

                  {/* Provider Selector Grid */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                      <span>Select Global LLM Provider:</span>
                      <span className="text-[11px] text-gray-500">Supports OpenAI, Gemini, Groq, DeepSeek, Claude, & Ollama</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'groq', name: '⚡ Groq Cloud', desc: 'Llama 3.3 70B (Ultra Fast)', color: 'border-orange-500/40 text-orange-400' },
                        { id: 'gemini', name: '🌐 Google Gemini', desc: 'Gemini 1.5 Flash (Large Context)', color: 'border-blue-500/40 text-blue-400' },
                        { id: 'deepseek', name: '🧠 DeepSeek', desc: 'DeepSeek-V3 / Chat (Cost-Effective)', color: 'border-cyan-500/40 text-cyan-400' },
                        { id: 'openai', name: '🟢 OpenAI', desc: 'GPT-4o Mini / GPT-4o', color: 'border-emerald-500/40 text-emerald-400' },
                        { id: 'anthropic', name: '🟣 Anthropic', desc: 'Claude 3.5 Sonnet', color: 'border-purple-500/40 text-purple-400' },
                        { id: 'custom', name: '🖥️ Ollama / Custom', desc: 'Local host:11434 or Proxy', color: 'border-gray-500/40 text-gray-300' },
                      ].map((p) => {
                        const isSelected = llmProvider === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleProviderChange(p.id as any)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400'
                                : 'bg-gray-950/80 border-gray-800 hover:border-gray-700'
                            }`}
                          >
                            <div className="font-semibold text-xs text-white flex items-center justify-between">
                              <span>{p.name}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">{p.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Model & API Key Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-300">Model Name:</label>
                      <input
                        type="text"
                        value={llmModel}
                        onChange={(e) => setLlmModel(e.target.value)}
                        placeholder="e.g. llama-3.3-70b-versatile"
                        className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-300">API Key Provider:</label>
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                        >
                          {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showApiKey ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={llmApiKey}
                        onChange={(e) => setLlmApiKey(e.target.value)}
                        placeholder={llmProvider === 'custom' ? 'Optional for local Ollama' : 'gsk_... / AIzaSy... / sk-...'}
                        className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Advanced Base URL Toggle (or shown if custom) */}
                  {(llmProvider === 'custom' || showAdvancedLLM) && (
                    <div className="space-y-1 animate-in fade-in duration-200">
                      <label className="text-xs font-medium text-gray-300">Custom Base URL Endpoint:</label>
                      <input
                        type="text"
                        value={llmBaseUrl}
                        onChange={(e) => setLlmBaseUrl(e.target.value)}
                        placeholder="http://localhost:11434/v1"
                        className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  )}

                  {/* Business Idea Prompt */}
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-gray-950/80 border border-gray-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Business Preferences & Office Concept:</span>
                      </label>
                      <span className="text-[11px] text-gray-500">AI designs name, departments, agents & tasks</span>
                    </div>

                    <textarea
                      rows={3}
                      value={businessPrompt}
                      onChange={(e) => setBusinessPrompt(e.target.value)}
                      placeholder="e.g. SaaS CRM and cloud POS platform for culinary businesses with automated loyalty points and inventory reconciliation..."
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none leading-relaxed"
                    />

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Company Name (optional)"
                          className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs text-white focus:outline-none focus:border-cyan-500 w-48"
                        />
                        <select
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                          <option value="Software Engineering">Software & SaaS</option>
                          <option value="Digital Marketing Agency">Marketing Agency</option>
                          <option value="AI & Data Labs">AI & Data Labs</option>
                          <option value="Game Studio">Game Studio</option>
                          <option value="Content & Media House">Media House</option>
                          <option value="Legal & Consulting">Consulting</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateAICompany}
                        disabled={isGeneratingCompany || (!businessPrompt.trim() && !companyName.trim())}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-bold text-black transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                      >
                        {isGeneratingCompany ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{generationStatus || 'Generating...'}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{generatedCompany ? '✨ Regenerate AI Team' : '✨ Generate Autonomous AI Team'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {generationError && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{generationError}</span>
                      </div>
                    )}
                  </div>

                  {/* AI Generated Preview Card */}
                  {generatedCompany && (
                    <div className="p-4 rounded-xl bg-gradient-to-b from-cyan-950/30 to-gray-950/80 border border-cyan-500/40 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{generatedCompany.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                              {generatedCompany.industry}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                              {generatedCompany.officeLayoutTemplate || 'tech_startup'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                            {generatedCompany.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800 text-[11px] text-emerald-300 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ready to Launch</span>
                        </div>
                      </div>

                      {/* Generated Agents Row */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          Initial Staff ({generatedCompany.agents.length} Agents):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {generatedCompany.agents.map((ag) => (
                            <div
                              key={ag.id}
                              className="p-2.5 rounded-lg bg-gray-950/90 border border-gray-800/90 flex items-center gap-2.5"
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                                style={{ backgroundColor: ag.avatarColor || '#6366f1' }}
                              >
                                {ag.name.slice(0, 1)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-xs font-semibold text-white truncate">{ag.name}</h5>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-900 text-cyan-400 font-mono">
                                    {ag.personality?.mbti || 'AI'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 truncate">{ag.roleTitle}</p>
                                <div className="flex gap-1 mt-1 overflow-hidden">
                                  {ag.skills.slice(0, 2).map((s, i) => (
                                    <span key={i} className="text-[9px] px-1 py-0.2 rounded bg-gray-900/80 text-gray-400 truncate">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Active Global LLM Confirmation Tag */}
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-[11px] text-cyan-300">
                        <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>
                          <strong>Global LLM Active:</strong> This team is automatically connected to <strong>{llmProvider.toUpperCase()}</strong> ({llmModel}) for office chat, sprints, & code execution.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: MANUAL GENESIS & MARKETPLACE (0 EMPLOYEES)         */}
              {/* ========================================================= */}
              {creationMethod === 'manual' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                      <ShoppingBag className="w-4 h-4 text-purple-400" />
                      <span>Clean Slate Genesis (Empty Lot & Marketplace)</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      The office will be initialized clean with zero dummy data (0 employees). You can build custom agents manually or hire specialist agents from the <strong>P2P Marketplace</strong> once inside your virtual office.
                    </p>
                  </div>

                  {/* Company Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-300">Company / Virtual Office Name:</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Apex Dynamics Labs"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>

                  {/* Industry Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-300">Industry Field:</label>
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
                </div>
              )}

              {/* Autorun at Startup Toggle */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-950/80 border border-gray-800 hover:border-cyan-500/40 cursor-pointer transition-colors group">
                <input
                  type="checkbox"
                  checked={autorun}
                  onChange={(e) => setAutorun(e.target.checked)}
                  className="mt-0.5 rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      Start Automatically on Computer Boot (Autorun at Startup)
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Virtual office server runs automatically in the background on port :28483 on system boot.
                  </p>
                </div>
              </label>

              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-gray-950/80 border border-gray-800 space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Initialization Mode:</span>
                  <span className="font-semibold text-white">
                    {creationMethod === 'ai' ? '✨ AI Generated Company' : '🛠️ Clean Slate Genesis (0 Dummy)'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Global LLM Provider:</span>
                  <span className="font-mono text-cyan-400 font-semibold">
                    {creationMethod === 'ai' && (llmApiKey.trim() || llmProvider === 'custom')
                      ? `${llmProvider.toUpperCase()} (${llmModel})`
                      : 'Not Configured (Manual BYOK)'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Cluster Region:</span>
                  <span className="font-mono text-cyan-400 font-semibold">{selectedRegionId}</span>
                </div>
                {userCoords && (
                  <div className="flex items-center justify-between py-1 border-b border-gray-800/60">
                    <span className="text-gray-400">Nearby Office Coordinates:</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {userCoords.city || 'GPS'} ({userCoords.latitude.toFixed(2)}, {userCoords.longitude.toFixed(2)})
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">Proof-of-Ownership:</span>
                  <span className="font-mono text-purple-300">BIP-39 Asymmetric Signature</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">Keystore Location:</span>
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
              <span>Back</span>
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
              <span>Continue to {step === 1 ? 'Select Region' : 'Office Profile'}</span>
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
                  <span>Signing Genesis Block...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>🚀 Launch Virtual Office</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
