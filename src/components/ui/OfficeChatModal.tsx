'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Agent, Company, TaskTicket, OfficeGroupChatMessage, ActivityEvent, AgentCollaborationLog, TelegramConfig } from '@/types/office';
import {
  X,
  Send,
  AtSign,
  Users,
  Sparkles,
  Bot,
  User,
  Trash2,
  CheckCheck,
  Loader2,
  Folder,
  MessageSquare,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  Radio,
  ExternalLink,
  Coffee,
  Briefcase,
  Search,
  Gamepad2,
  Footprints,
  Kanban,
  CheckCircle,
  Smartphone,
  Power,
  Settings,
  AlertCircle,
  SendHorizontal,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface OfficeChatModalProps {
  company: Company;
  agents: Agent[];
  tasks: TaskTicket[];
  events?: ActivityEvent[];
  initialTab?: 'war_room' | 'agent_collabs' | 'activity_logs';
  onClose: () => void;
  onSelectAgent?: (agentId: string) => void;
  onTriggerCollab?: (senderId: string, targetId: string) => void;
  onOpenDevServers?: () => void;
  onClearEvents?: () => void;
}

const DEFAULT_COLLAB_LOGS: AgentCollaborationLog[] = [
  {
    id: 'collab-casual-1',
    timestamp: Date.now() - 1000 * 60 * 55,
    type: 'casual_talk',
    categoryTag: '🍿 Anime & Film',
    senderId: 'rei',
    senderName: 'Rei Kasumi',
    senderRoleTitle: 'Creative Director & UI/UX',
    senderAvatarColor: '#ec4899',
    targetId: 'damian',
    targetName: 'Damian Vance',
    targetRoleTitle: 'Lead Full-Stack & Systems Engineer',
    targetAvatarColor: '#0ea5e9',
    topic: 'Inspirasi Visual Estetika Cyberpunk Edgerunners',
    dialog:
      'Damian, kamu udah nonton Cyberpunk Edgerunners belum? Efek neon glow distopianya menginspirasi banget buat palet warna & visual UI landing page kita!',
    outcome: 'Damian menyetujui estetika neon glow dan mengusulkan penggunaan font mono aksen terminal.',
  },
  {
    id: 'collab-1',
    timestamp: Date.now() - 1000 * 60 * 45,
    type: 'collaboration',
    categoryTag: '💻 Arsitektur & Brand',
    projectName: 'ShadowMove Landing Page',
    senderId: 'kenji',
    senderName: 'Kenji Sato',
    senderRoleTitle: 'Founder & System Architect',
    senderAvatarColor: '#6366f1',
    targetId: 'rei',
    targetName: 'Rei Kasumi',
    targetRoleTitle: 'Creative Director & UI/UX',
    targetAvatarColor: '#ec4899',
    topic: 'Brand Identity, Positioning, & Wireframe Landing Page',
    dialog:
      'Rei, untuk landing page ShadowMove kita perlu membedakan diri dari agensi software konvensional. Kita butuh persona Cyberpunk/Neo Dark yang berkelas, typography modern (Outfit & JetBrains Mono), dan interactive budget estimator agar calon klien langsung paham value proposition kita.',
    outcome:
      'Disepakati: Desain menggunakan dark palette #0d0f18, aksen neon cyan/purple, glassmorphism cards, dan copywriting berfokus pada "Autonomous AI Team for High-Velocity Software Delivery".',
  },
  {
    id: 'collab-casual-2',
    timestamp: Date.now() - 1000 * 60 * 35,
    type: 'casual_talk',
    categoryTag: '☕ Kopi & Kehidupan',
    senderId: 'damian',
    senderName: 'Damian Vance',
    senderRoleTitle: 'Lead Full-Stack & Systems Engineer',
    senderAvatarColor: '#0ea5e9',
    targetId: 'kenji',
    targetName: 'Kenji Sato',
    targetRoleTitle: 'Founder & System Architect',
    targetAvatarColor: '#6366f1',
    topic: 'Racikan Biji Kopi Espresso Pantry',
    dialog:
      'Kenji, biji kopi espresso di pantry ini notes-nya dark chocolate pekat. Sekali seduh langsung melek buat maraton refactor microservice.',
    outcome: 'Kenji merekomendasikan coba teknik cold brew untuk sprint rilis malam nanti.',
  },
  {
    id: 'collab-2',
    timestamp: Date.now() - 1000 * 60 * 25,
    type: 'collaboration',
    categoryTag: '💻 Integrasi Frontend',
    projectName: 'ShadowMove Landing Page',
    senderId: 'rei',
    senderName: 'Rei Kasumi',
    senderRoleTitle: 'Creative Director & UI/UX',
    senderAvatarColor: '#ec4899',
    targetId: 'damian',
    targetName: 'Damian Vance',
    targetRoleTitle: 'Lead Full-Stack & Systems Engineer',
    targetAvatarColor: '#0ea5e9',
    topic: 'Integrasi Komponen Interaktif & Responsive Grid',
    dialog:
      'Damian, mockup wireframe sudah saya rampungkan di docs/SHADOWMOVE_ARCHITECTURE.md. Bisakah kamu bantu implementasikan kalkulator estimasi biaya project yang dinamis dan terminal code preview di client-side?',
    outcome:
      'Disepakati: Menggunakan Vanilla JavaScript modular yang ultra-cepat tanpa dependensi berat, langsung disajikan di file static preview/shadowmove/index.html.',
  },
  {
    id: 'collab-casual-3',
    timestamp: Date.now() - 1000 * 60 * 18,
    type: 'casual_talk',
    categoryTag: '🐱 Kucing & Hal Lucu',
    senderId: 'yuki',
    senderName: 'Yuki Tanaka',
    senderRoleTitle: 'QA Lead & Reliability Engineer',
    senderAvatarColor: '#10b981',
    targetId: 'rei',
    targetName: 'Rei Kasumi',
    targetRoleTitle: 'Creative Director & UI/UX',
    targetAvatarColor: '#ec4899',
    topic: 'Si Kucing Oyen Kantor Tertidur di Printer',
    dialog:
      'Rei, Si Oyen kucing kantor tidur nyenyak banget di atas printer thermal lagi haha. Pas mau dipindahin malah mendengkur keenakan.',
    outcome: 'Rei mengambil foto si Oyen untuk dijadikan easter egg maskot di landing page.',
  },
  {
    id: 'collab-3',
    timestamp: Date.now() - 1000 * 60 * 10,
    type: 'collaboration',
    categoryTag: '🛡️ Quality Assurance',
    projectName: 'ShadowMove Landing Page',
    senderId: 'damian',
    senderName: 'Damian Vance',
    senderRoleTitle: 'Lead Full-Stack & Systems Engineer',
    senderAvatarColor: '#0ea5e9',
    targetId: 'yuki',
    targetName: 'Yuki Tanaka',
    targetRoleTitle: 'QA Lead & Reliability Engineer',
    targetAvatarColor: '#10b981',
    topic: 'Verifikasi Cross-Browser, Viewport Mobile, & Dev Server Port',
    dialog:
      'Yuki, landing page sekarang sudah running aktif di port 28483 (/preview/shadowmove/index.html). Tolong jalankan verifikasi responsiveness di mobile/desktop dan pastikan form submission toast berjalan lancar.',
    outcome:
      'Disepakati: Form submit simulasi bekerja 100%, responsive breakpoint handal, link navigasi mulus, dan lighthouse score target tercapai.',
  },
];

export const OfficeChatModal: React.FC<OfficeChatModalProps> = ({
  company,
  agents,
  tasks,
  events = [],
  initialTab = 'war_room',
  onClose,
  onSelectAgent,
  onTriggerCollab,
  onOpenDevServers,
  onClearEvents,
}) => {
  const CHAT_STORAGE_KEY = `vigent_office_group_chat_${company.id}`;
  const COLLAB_STORAGE_KEY = `vigent_office_collabs_${company.id}`;

  const [activeTab, setActiveTab] = useState<'war_room' | 'agent_collabs' | 'activity_logs'>(initialTab);
  const [activityFilterCategory, setActivityFilterCategory] = useState<string>('all');
  const [activityFilterAgent, setActivityFilterAgent] = useState<string>('all');
  const [activitySearchQuery, setActivitySearchQuery] = useState<string>('');

  // Tab 1: War Room Group Chat Messages
  const [messages, setMessages] = useState<OfficeGroupChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CHAT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }

    const initialKenji = agents.find((a) => a.name.includes('Kenji')) || agents[0];
    const initialRei = agents.find((a) => a.name.includes('Rei')) || agents[1];

    return [
      {
        id: 'msg-seed-1',
        senderType: 'agent',
        agentId: initialKenji?.id,
        senderName: initialKenji?.name || 'Kenji Sato',
        senderAvatarColor: initialKenji?.avatarColor || '#6366f1',
        senderRoleTitle: initialKenji?.roleTitle || 'Founder & System Architect',
        message:
          'Halo Boss! Selamat datang di War Room ShadowMove. Seluruh divisi engineering, design, dan QA stand by. Anda bisa ketik "@" kapan saja untuk mention kami spesifik atau bertanya mengenai progres project.',
        timestamp: Date.now() - 120000,
      },
      ...(initialRei
        ? [
            {
              id: 'msg-seed-2',
              senderType: 'agent' as const,
              agentId: initialRei.id,
              senderName: initialRei.name,
              senderAvatarColor: initialRei.avatarColor || '#ec4899',
              senderRoleTitle: initialRei.roleTitle,
              message:
                'Hero section dan interactive estimator landing page sudah ready di preview! Ada yang perlu kami tambahkan atau diskusikan?',
              timestamp: Date.now() - 60000,
            },
          ]
        : []),
    ];
  });

  // Tab 2: Agent Collaboration & Discussion Logs
  const [collabLogs, setCollabLogs] = useState<AgentCollaborationLog[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(COLLAB_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Deduplicate any logs that have matching pairs and identical/truncated dialog within 60s
            const deduped: AgentCollaborationLog[] = [];
            parsed.forEach((item: AgentCollaborationLog) => {
              const existingIdx = deduped.findIndex((existing) => {
                const samePair =
                  existing.senderName === item.senderName && existing.targetName === item.targetName;
                const closeTime = Math.abs(existing.timestamp - item.timestamp) < 60000;
                const d1 = existing.dialog.replace(/\.\.\.$/, '').slice(0, 25);
                const d2 = item.dialog.replace(/\.\.\.$/, '').slice(0, 25);
                return samePair && closeTime && (d1.startsWith(d2) || d2.startsWith(d1));
              });

              if (existingIdx !== -1) {
                // Keep the longer / fuller dialog (non-truncated)
                if (item.dialog.length > deduped[existingIdx].dialog.length) {
                  deduped[existingIdx] = item;
                }
              } else {
                deduped.push(item);
              }
            });
            return deduped;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_COLLAB_LOGS;
  });

  const [collabTypeFilter, setCollabTypeFilter] = useState<'all' | 'casual_talk' | 'collaboration'>('all');
  const [collabFilterAgent, setCollabFilterAgent] = useState<string>('all');

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingAgent, setTypingAgent] = useState<string | null>(null);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Telegram Integration State
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    botToken: '',
    chatId: '',
    isEnabled: false,
    autoSyncWarRoom: true,
  });
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [botInfo, setBotInfo] = useState<{ id: number; username: string; firstName: string } | null>(null);
  const [tokenTesting, setTokenTesting] = useState(false);
  const [tokenTestResult, setTokenTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [telegramToast, setTelegramToast] = useState<string | null>(null);

  // Fetch Telegram status on mount & company change
  const fetchTelegramStatus = async () => {
    try {
      const res = await fetch(`/api/telegram?companyId=${company.id}`);
      const data = await res.json();
      if (data.success) {
        setIsBotRunning(Boolean(data.isRunning));
        if (data.config) {
          setTelegramConfig(data.config);
        }
        if (data.botInfo) {
          setBotInfo(data.botInfo);
        }
      }
    } catch (e) {
      console.error('[Telegram Status Error]:', e);
    }
  };

  useEffect(() => {
    fetchTelegramStatus();
  }, [company.id]);

  // Poll incoming messages from Telegram every 3 seconds while in war_room
  useEffect(() => {
    if (activeTab !== 'war_room') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_chat_history', companyId: company.id }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.history) && data.history.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newItems = data.history.filter((m: OfficeGroupChatMessage) => !existingIds.has(m.id));
            if (newItems.length > 0) {
              return [...prev, ...newItems];
            }
            return prev;
          });
        }
      } catch {
        // silent
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTab, company.id]);

  const handleTestBotToken = async () => {
    if (!telegramConfig.botToken.trim()) {
      setTokenTestResult({ success: false, message: 'Harap masukkan Bot Token terlebih dahulu.' });
      return;
    }
    setTokenTesting(true);
    setTokenTestResult(null);
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_token', botToken: telegramConfig.botToken }),
      });
      const data = await res.json();
      if (data.success) {
        setTokenTestResult({
          success: true,
          message: `Koneksi berhasil! Bot: @${data.botInfo?.username} (${data.botInfo?.firstName || 'Bot'})`,
        });
        setBotInfo(data.botInfo);
      } else {
        setTokenTestResult({ success: false, message: data.error || 'Gagal menghubungi Telegram API' });
      }
    } catch (err: any) {
      setTokenTestResult({ success: false, message: err.message || 'Error saat pengujian token' });
    } finally {
      setTokenTesting(false);
    }
  };

  const handleSaveTelegramConfig = async () => {
    setSavingTelegram(true);
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_config',
          companyId: company.id,
          config: telegramConfig,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramToast('Konfigurasi Telegram tersimpan!');
        setTimeout(() => setTelegramToast(null), 3000);
        await fetchTelegramStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleToggleBot = async () => {
    setSavingTelegram(true);
    try {
      const action = isBotRunning ? 'stop_bot' : 'start_bot';
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          companyId: company.id,
          config: telegramConfig,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsBotRunning(Boolean(data.isRunning));
        if (data.botInfo) setBotInfo(data.botInfo);
        setTelegramToast(isBotRunning ? 'Bot Telegram dimatikan' : 'Bot Telegram aktif & siap!');
        setTimeout(() => setTelegramToast(null), 3000);
      } else {
        alert(data.message || data.error || 'Gagal mengubah status bot');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTelegram(false);
    }
  };

  // Sync new collaboration & casual talk events from simulation into collabLogs (with robust deduplication)
  useEffect(() => {
    const recentInteractions = events.filter((e) => e.type === 'collaboration' || e.type === 'casual_talk');
    if (recentInteractions.length > 0) {
      setCollabLogs((prev) => {
        let updated = [...prev];
        recentInteractions.forEach((ev) => {
          let cleanDialog = ev.description;
          const quoteStart = ev.description.indexOf(': "');
          if (quoteStart !== -1 && ev.description.endsWith('"')) {
            cleanDialog = ev.description.slice(quoteStart + 3, -1);
          }

          // Check for existing matching item by id OR by (same sender + target + similar dialog within 60s)
          const existingIdx = updated.findIndex((c) => {
            if (c.id === ev.id) return true;
            const samePair = c.senderName === ev.agentName && c.targetName === ev.targetAgentName;
            const closeTime = Math.abs(c.timestamp - ev.timestamp) < 60000;
            const d1 = c.dialog.replace(/\.\.\.$/, '').slice(0, 25);
            const d2 = cleanDialog.replace(/\.\.\.$/, '').slice(0, 25);
            return samePair && closeTime && (d1.startsWith(d2) || d2.startsWith(d1));
          });

          const sender = agents.find((a) => a.id === ev.agentId || a.name === ev.agentName);
          const target = agents.find((a) => a.name === ev.targetAgentName);
          const isCasual = ev.type === 'casual_talk';

          const newLogItem: AgentCollaborationLog = {
            id: ev.id,
            timestamp: ev.timestamp,
            type: isCasual ? 'casual_talk' : 'collaboration',
            categoryTag: ev.categoryTag || (isCasual ? '☕ Obrolan Santai' : '💻 Koordinasi Sprint'),
            projectName: isCasual ? undefined : 'ShadowMove Landing Page',
            senderId: sender?.id || 'agent',
            senderName: ev.agentName,
            senderRoleTitle: sender?.roleTitle || 'Team Member',
            senderAvatarColor: sender?.avatarColor || '#6366f1',
            targetId: target?.id || 'target',
            targetName: ev.targetAgentName || 'Colleague',
            targetRoleTitle: target?.roleTitle || 'Collaborator',
            targetAvatarColor: target?.avatarColor || '#ec4899',
            topic: isCasual
              ? `${ev.categoryTag || 'Obrolan Santai'} (Kehidupan & Hobi)`
              : 'Koordinasi Sprint & Implementasi Arsitektur',
            dialog: cleanDialog,
            outcome: isCasual
              ? 'Ngobrol santai sejenak untuk merefresh pikiran dan menjaga keakraban tim.'
              : 'Disepakati: Integrasi dilanjutkan sesuai rencana kerja sprint.',
          };

          if (existingIdx !== -1) {
            // If the incoming event has a longer / fuller dialog, replace the truncated one
            if (cleanDialog.length > updated[existingIdx].dialog.length) {
              updated[existingIdx] = newLogItem;
            }
          } else {
            updated.unshift(newLogItem);
          }
        });
        return updated;
      });
    }
  }, [events, agents]);

  // Persist storage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error(e);
    }
  }, [messages, CHAT_STORAGE_KEY]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAB_STORAGE_KEY, JSON.stringify(collabLogs));
    } catch (e) {
      console.error(e);
    }
  }, [collabLogs, COLLAB_STORAGE_KEY]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (activeTab === 'war_room') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, activeTab]);

  // Filter mention candidates
  const mentionCandidates = [
    {
      id: 'all',
      name: 'all',
      displayName: '@all (Semua Tim Kantor)',
      roleTitle: 'Broadcast ke seluruh agent',
      avatarColor: '#ea580c',
    },
    ...agents.map((ag) => ({
      id: ag.id,
      name: ag.name,
      displayName: `@${ag.name}`,
      roleTitle: ag.roleTitle,
      avatarColor: ag.avatarColor,
    })),
  ].filter((c) => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.roleTitle.toLowerCase().includes(q);
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInputText(text);

    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBeforeAt === ' ' || charBeforeAt === '\n') {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!query.includes(' ')) {
          setMentionQuery(query);
          setMentionStartIndex(lastAtIndex);
          setSelectedMentionIndex(0);
          return;
        }
      }
    }

    setMentionQuery(null);
    setMentionStartIndex(-1);
  };

  const insertMention = (candidate: { name: string }) => {
    if (mentionStartIndex === -1) return;
    const beforeAt = inputText.slice(0, mentionStartIndex);
    const afterCursor = inputText.slice(textareaRef.current?.selectionStart || inputText.length);
    const inserted = `@${candidate.name} `;
    const newText = beforeAt + inserted + afterCursor;

    setInputText(newText);
    setMentionQuery(null);
    setMentionStartIndex(-1);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursor = beforeAt.length + inserted.length;
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionCandidates[selectedMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const mentionedAgentIds: string[] = [];
    const isAllMentioned = text.toLowerCase().includes('@all');

    agents.forEach((ag) => {
      const first = ag.name.split(' ')[0].toLowerCase();
      const full = ag.name.toLowerCase();
      if (
        isAllMentioned ||
        text.toLowerCase().includes(`@${full}`) ||
        text.toLowerCase().includes(`@${first}`)
      ) {
        mentionedAgentIds.push(ag.id);
      }
    });

    const userMsg: OfficeGroupChatMessage = {
      id: `msg-user-${Date.now()}`,
      senderType: 'user',
      senderName: 'Boss (Owner)',
      message: text,
      mentionedAgentIds,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setMentionQuery(null);

    // Broadcast user message to Telegram
    fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'broadcast_to_telegram',
        companyId: company.id,
        message: userMsg,
      }),
    }).catch(console.error);

    // 🚀 Detect GitHub Link and Auto-Clone into Workspaces
    const gitMatch = text.match(/(?:https?:\/\/(?:www\.)?github\.com\/|git@github\.com:)([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
    let cloneSuccessNote = '';

    if (gitMatch) {
      const owner = gitMatch[1];
      let rawRepo = gitMatch[2].replace(/[),;!?>]+$/, '');
      let repo = rawRepo.replace(/\.git$/i, '');
      if (repo.endsWith('/')) repo = repo.slice(0, -1);
      const targetFolder = repo.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'github-repo';
      const cloneUrl = `https://github.com/${owner}/${repo}.git`;
      const cloneStatusId = `msg-clone-status-${Date.now()}`;

      const cloneInitialMsg: OfficeGroupChatMessage = {
        id: cloneStatusId,
        senderType: 'system',
        senderName: 'GitHub Clone Engine',
        message: `📦 Mendeteksi repository GitHub: ${cloneUrl}\n⏳ Sedang meng-clone ke direktori workspace (~/.vigent/workspaces/${targetFolder})...`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, cloneInitialMsg]);

      try {
        const cloneRes = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clone_repo', repoUrl: cloneUrl, folderName: targetFolder }),
        });
        const cloneData = await cloneRes.json();
        if (cloneData.success) {
          cloneSuccessNote = `\n[Info Sistem: Repository GitHub ${cloneUrl} berhasil di-clone ke folder workspace "~/.vigent/workspaces/${cloneData.projectName}" (${cloneData.filesCount} file)]`;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === cloneStatusId
                ? {
                    ...m,
                    message: `✅ Berhasil meng-clone **${cloneData.projectName}** (${cloneData.filesCount} file) ke folder workspaces!\n📁 Lokasi: ~/.vigent/workspaces/${cloneData.projectName}\nFolder proyek kini aktif dan siap dieksplorasi.`,
                  }
                : m
            )
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === cloneStatusId
                ? {
                    ...m,
                    message: `❌ Gagal meng-clone repository: ${cloneData.error || cloneData.message}`,
                  }
                : m
            )
          );
        }
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === cloneStatusId
              ? {
                  ...m,
                  message: `❌ Terjadi kesalahan saat clone: ${err.message}`,
                }
              : m
          )
        );
      }
    }

    const responders: Agent[] =
      mentionedAgentIds.length > 0
        ? agents.filter((a) => mentionedAgentIds.includes(a.id))
        : [agents[0]];

    setIsTyping(true);
    for (const responder of responders) {
      setTypingAgent(responder.name);
      try {
        const currentTask = tasks.find((t) => t.id === responder.currentTaskId);
        const promptForAgent = cloneSuccessNote ? `${text}${cloneSuccessNote}` : text;
        const res = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: responder,
            userMessage: promptForAgent,
            currentTask: currentTask || null,
            allTasks: tasks || [],
            companyName: company.name,
            companyId: company.id,
            activeProject: currentTask?.projectName || 'ShadowMove Landing Page',
            history: messages.slice(-6).map((m) => ({
              role: m.senderType === 'user' ? 'user' : 'assistant',
              content: `${m.senderName}: ${m.message}`,
            })),
          }),
        });

        const data = await res.json();
        const replyText =
          data.reply || `Baik Boss, saya ${responder.name} siap mengeksekusi rencana tersebut.`;

        const agentMsg: OfficeGroupChatMessage = {
          id: `msg-agent-${Date.now()}-${responder.id}`,
          senderType: 'agent',
          agentId: responder.id,
          senderName: responder.name,
          senderAvatarColor: responder.avatarColor,
          senderRoleTitle: responder.roleTitle,
          message: replyText,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, agentMsg]);

        // Broadcast agent reply to Telegram
        fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'broadcast_to_telegram',
            companyId: company.id,
            message: agentMsg,
          }),
        }).catch(console.error);
      } catch (err) {
        console.error(err);
      }
    }
    setIsTyping(false);
    setTypingAgent(null);
  };

  const handleClearHistory = () => {
    if (activeTab === 'war_room') {
      if (confirm('Yakin ingin mengosongkan riwayat chat War Room ini?')) {
        setMessages([]);
        localStorage.removeItem(CHAT_STORAGE_KEY);
      }
    } else if (activeTab === 'agent_collabs') {
      if (confirm('Yakin ingin mengosongkan riwayat rekaman diskusi antar agent ini?')) {
        setCollabLogs([]);
        localStorage.removeItem(COLLAB_STORAGE_KEY);
      }
    } else if (activeTab === 'activity_logs') {
      if (confirm('Yakin ingin mengosongkan riwayat log kegiatan karyawan ini?')) {
        onClearEvents?.();
      }
    }
  };

  const handleTriggerManualCollab = () => {
    if (agents.length < 2) return;
    const a1 = agents[Math.floor(Math.random() * agents.length)];
    const otherAgents = agents.filter((a) => a.id !== a1.id);
    const a2 = otherAgents[Math.floor(Math.random() * otherAgents.length)];
    if (onTriggerCollab) {
      onTriggerCollab(a1.id, a2.id);
    }
  };

  const casualCount = collabLogs.filter((c) => c.type === 'casual_talk').length;
  const workCount = collabLogs.filter((c) => c.type === 'collaboration' || !c.type).length;

  const filteredCollabLogs = collabLogs.filter((log) => {
    // 1. Filter by conversation type (casual vs work)
    if (collabTypeFilter === 'casual_talk') {
      if (log.type !== 'casual_talk') return false;
    } else if (collabTypeFilter === 'collaboration') {
      if (log.type === 'casual_talk') return false;
    }

    // 2. Filter by agent name
    if (collabFilterAgent !== 'all') {
      const matchSender = log.senderName.toLowerCase().includes(collabFilterAgent.toLowerCase());
      const matchTarget = log.targetName.toLowerCase().includes(collabFilterAgent.toLowerCase());
      if (!matchSender && !matchTarget) return false;
    }

    return true;
  });

  // Tab 3: Activity Events filtering & counters
  const coffeeCount = events.filter(
    (e) => e.type === 'break' && (e.categoryTag?.includes('Kopi') || e.description.toLowerCase().includes('kopi'))
  ).length;
  const gameCount = events.filter(
    (e) =>
      e.categoryTag?.includes('Game') ||
      e.categoryTag?.includes('Gaming') ||
      e.description.toLowerCase().includes('arcade') ||
      e.description.toLowerCase().includes('game')
  ).length;
  const lobbyCount = events.filter(
    (e) =>
      e.categoryTag?.includes('Lobby') ||
      e.description.toLowerCase().includes('lobby') ||
      e.description.toLowerCase().includes('santai')
  ).length;
  const sprintCount = events.filter(
    (e) =>
      e.categoryTag?.includes('Sprint') ||
      e.description.toLowerCase().includes('sprint') ||
      e.description.toLowerCase().includes('roadmap')
  ).length;
  const taskCount = events.filter(
    (e) => e.type === 'task_complete' || e.type === 'task_start'
  ).length;

  const filteredEvents = events
    .slice()
    .reverse()
    .filter((ev) => {
      // 1. Filter by category
      if (activityFilterCategory === 'coffee') {
        if (!ev.categoryTag?.includes('Kopi') && !ev.description.toLowerCase().includes('kopi')) return false;
      } else if (activityFilterCategory === 'game') {
        if (
          !ev.categoryTag?.includes('Game') &&
          !ev.categoryTag?.includes('Gaming') &&
          !ev.description.toLowerCase().includes('arcade') &&
          !ev.description.toLowerCase().includes('game')
        )
          return false;
      } else if (activityFilterCategory === 'lobby') {
        if (
          !ev.categoryTag?.includes('Lobby') &&
          !ev.description.toLowerCase().includes('lobby') &&
          !ev.description.toLowerCase().includes('santai')
        )
          return false;
      } else if (activityFilterCategory === 'sprint') {
        if (
          !ev.categoryTag?.includes('Sprint') &&
          !ev.description.toLowerCase().includes('sprint') &&
          !ev.description.toLowerCase().includes('roadmap')
        )
          return false;
      } else if (activityFilterCategory === 'task') {
        if (ev.type !== 'task_complete' && ev.type !== 'task_start') return false;
      }

      // 2. Filter by agent
      if (activityFilterAgent !== 'all') {
        const matchesAgent =
          ev.agentName?.toLowerCase().includes(activityFilterAgent.toLowerCase()) ||
          ev.targetAgentName?.toLowerCase().includes(activityFilterAgent.toLowerCase());
        if (!matchesAgent) return false;
      }

      // 3. Search query
      if (activitySearchQuery.trim()) {
        const q = activitySearchQuery.toLowerCase();
        const matchesDesc = ev.description.toLowerCase().includes(q);
        const matchesTag = ev.categoryTag?.toLowerCase().includes(q);
        const matchesName = ev.agentName?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesTag && !matchesName) return false;
      }

      return true;
    });

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9_]+(?:\s[a-zA-Z0-9_]+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={i}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-[#eef2ff] text-[#4338ca] border border-[#c7d2fe] font-mono text-xs font-bold"
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 bg-[#2c231c]/55 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 text-[#2c231c] animate-in fade-in duration-200">
      <div className="bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-2xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#4338ca] to-[#6366f1] text-white shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#2c231c]">
                  War Room & History Chat Tim
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#4338ca] border border-[#c7d2fe] font-bold font-mono">
                  {company.name}
                </span>
                <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] font-bold">
                  ● {agents.length} Agent Online
                </span>
              </div>
              <p className="text-xs text-[#786653]">
                Pusat komunikasi interaktif tim: Chat bersama seluruh agent (@tag) dan lihat rekaman diskusi live antar agent.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Telegram Bot Integration Button */}
            <button
              onClick={() => setIsTelegramModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-xs ${
                isBotRunning
                  ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white border-[#0284c7] shadow-sky-600/20'
                  : 'bg-[#fffdf9] hover:bg-[#f4ebe1] text-[#0284c7] border-[#0284c7]/30'
              }`}
              title="Pengaturan Bot Telegram & Tagging Karyawan (Isolated Per Company)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isBotRunning && botInfo?.username ? `@${botInfo.username}` : 'Telegram Bot'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isBotRunning ? 'bg-emerald-300 animate-pulse' : 'bg-stone-300'
                }`}
              />
            </button>

            {onOpenDevServers && (
              <button
                onClick={onOpenDevServers}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1f6860] hover:bg-[#164e48] text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
                title="Buka Docker Desktop-style Dev Server & Open Ports"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Dev Servers (:28483)</span>
              </button>
            )}

            <button
              onClick={handleClearHistory}
              className="p-1.5 text-[#786653] hover:text-[#dc2626] hover:bg-[#ede2d1] rounded-lg transition-colors"
              title={activeTab === 'war_room' ? 'Bersihkan riwayat percakapan War Room' : 'Bersihkan rekaman diskusi antar agent'}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation: War Room vs Antar Agent Collab History vs Log Kegiatan Karyawan */}
        <div className="flex items-center justify-between border-b border-[#d6c5ad] bg-[#fffdf9] px-4 py-2 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('war_room')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'war_room'
                  ? 'bg-[#4338ca] text-white shadow-sm'
                  : 'bg-[#f4ebe1] hover:bg-[#ede2d1] text-[#5c4939]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>War Room Chat (@tag)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {messages.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('agent_collabs')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'agent_collabs'
                  ? 'bg-[#1f6860] text-white shadow-sm'
                  : 'bg-[#f4ebe1] hover:bg-[#ede2d1] text-[#5c4939]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Riwayat Diskusi & Obrolan Agent</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {collabLogs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('activity_logs')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'activity_logs'
                  ? 'bg-[#c85a2b] text-white shadow-sm'
                  : 'bg-[#f4ebe1] hover:bg-[#ede2d1] text-[#5c4939]'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Log Kegiatan Karyawan</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {events.length}
              </span>
            </button>
          </div>

          {activeTab === 'agent_collabs' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleTriggerManualCollab}
                className="px-2.5 py-1 bg-[#ede2d1] hover:bg-[#dccab3] text-[#2c231c] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Minta dua agent untuk berdiskusi & sinkronisasi langsung di kantor"
              >
                <Sparkles className="w-3 h-3 text-[#c85a2b]" />
                <span className="hidden sm:inline">Simulasikan Diskusi Baru</span>
              </button>

              <div className="flex items-center gap-1 text-xs">
                <Filter className="w-3 h-3 text-[#786653]" />
                <select
                  value={collabFilterAgent}
                  onChange={(e) => setCollabFilterAgent(e.target.value)}
                  className="px-2 py-1 bg-[#f4ebe1] border border-[#d6c5ad] rounded-lg text-xs focus:outline-none"
                >
                  <option value="all">Semua Agent</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.name}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* TAB 1: War Room Group Chat */}
        {activeTab === 'war_room' && (
          <>
            {/* Team Quick Tag Bar */}
            <div className="px-4 py-1.5 bg-[#fffdf9] border-b border-[#d6c5ad] flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
              <span className="text-[10px] font-bold text-[#786653] uppercase tracking-wider shrink-0 flex items-center gap-1">
                <AtSign className="w-3 h-3 text-[#4338ca]" />
                Tag Cepat:
              </span>
              <button
                onClick={() => insertMention({ name: 'all' })}
                className="px-2 py-0.5 bg-[#fdeed9] hover:bg-[#fbdcb7] text-[#c85a2b] border border-[#e8ba8c] rounded-md font-mono text-[11px] font-bold transition-colors shrink-0"
              >
                @all
              </button>
              {agents.map((ag) => (
                <button
                  key={ag.id}
                  onClick={() => insertMention({ name: ag.name })}
                  className="px-2 py-0.5 bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#4338ca] border border-[#c7d2fe] rounded-md text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: ag.avatarColor || '#6366f1' }}
                  />
                  <span>@{ag.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#fbf7ee]">
              {messages.map((msg) => {
                const isUser = msg.senderType === 'user';
                const isSystem = msg.senderType === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2 animate-in fade-in">
                      <div className="bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] rounded-2xl px-4 py-2.5 text-xs shadow-xs max-w-[90%] sm:max-w-[80%] flex items-start gap-2.5">
                        <span className="text-base shrink-0 leading-none">📦</span>
                        <div className="flex-1 whitespace-pre-wrap font-sans leading-relaxed">
                          {msg.message}
                        </div>
                        <span className="text-[10px] text-[#15803d]/70 font-mono shrink-0">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      onClick={() => msg.agentId && onSelectAgent?.(msg.agentId)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm transition-transform cursor-pointer hover:scale-105`}
                      style={{
                        backgroundColor: isUser ? '#2c231c' : msg.senderAvatarColor || '#6366f1',
                      }}
                      title={msg.senderName}
                    >
                      {isUser ? <User className="w-4 h-4" /> : msg.senderName.charAt(0)}
                    </div>

                    {/* Bubble Content */}
                    <div
                      className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed ${
                        isUser
                          ? 'bg-[#2c231c] text-[#faf5eb] rounded-tr-none'
                          : 'bg-[#fffdf9] text-[#2c231c] border border-[#d6c5ad] rounded-tl-none'
                      }`}
                    >
                      {/* Name & Role Header */}
                      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-black/10">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            onClick={() => msg.agentId && onSelectAgent?.(msg.agentId)}
                            className={`font-bold hover:underline cursor-pointer ${
                              isUser ? 'text-[#e8ba8c]' : 'text-[#4338ca]'
                            }`}
                          >
                            {msg.senderName}
                          </span>
                          {msg.senderRoleTitle && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                isUser
                                  ? 'bg-white/10 text-stone-300'
                                  : 'bg-[#f4ebe1] text-[#786653]'
                              }`}
                            >
                              {msg.senderRoleTitle}
                            </span>
                          )}
                          {msg.source === 'telegram' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold font-mono bg-[#0284c7]/10 text-[#0284c7] border border-[#0284c7]/25 flex items-center gap-0.5">
                              <span>📱</span> Telegram
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-mono shrink-0 ${
                            isUser ? 'text-stone-400' : 'text-[#9c8976]'
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Text */}
                      <div className="whitespace-pre-wrap font-sans text-xs">
                        {renderMessageContent(msg.message)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Live Typing Indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-[#786653] italic pl-2 py-1">
                  <div className="w-6 h-6 rounded-lg bg-[#4338ca]/20 text-[#4338ca] flex items-center justify-center animate-spin">
                    <Loader2 className="w-3.5 h-3.5" />
                  </div>
                  <span>
                    <strong>{typingAgent || 'Agent'}</strong> sedang merespons...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar with Floating Mention Dropdown */}
            <div className="p-3 bg-[#f4ebe1] border-t border-[#d6c5ad] relative">
              {/* Mention Autocomplete Floating Dropdown */}
              {mentionQuery !== null && mentionCandidates.length > 0 && (
                <div className="absolute bottom-full left-4 mb-2 w-80 max-h-64 overflow-y-auto bg-[#faf5eb] border-2 border-[#4338ca] rounded-2xl shadow-2xl z-50 p-1.5 animate-in slide-in-from-bottom-2">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-[#786653] uppercase tracking-wider flex items-center justify-between border-b border-[#d6c5ad] mb-1">
                    <span>PILIH AGENT DENGAN ENTER / KLIK:</span>
                    <span className="font-mono text-[#4338ca]">@{mentionQuery}</span>
                  </div>
                  {mentionCandidates.map((candidate, idx) => (
                    <button
                      key={candidate.id}
                      onClick={() => insertMention(candidate)}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                        idx === selectedMentionIndex
                          ? 'bg-[#4338ca] text-white font-bold'
                          : 'hover:bg-[#ede2d1] text-[#2c231c]'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                        style={{ backgroundColor: candidate.avatarColor }}
                      >
                        {candidate.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{candidate.name}</span>
                          <span
                            className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                              idx === selectedMentionIndex
                                ? 'bg-white/20 text-indigo-100'
                                : 'bg-[#f0e3ce] text-[#784620]'
                            }`}
                          >
                            @{candidate.name.split(' ')[0]}
                          </span>
                        </div>
                        <div
                          className={`text-[10px] truncate ${
                            idx === selectedMentionIndex ? 'text-indigo-100' : 'text-[#786653]'
                          }`}
                        >
                          {candidate.roleTitle}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2 bg-[#fffdf9] border border-[#d6c5ad] rounded-xl p-2 focus-within:border-[#4338ca] focus-within:ring-2 focus-within:ring-[#4338ca]/20 transition-all">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ketik pesan atau '@' untuk tag agent (contoh: @Kenji bagaimana status wireframe?)"
                  rows={2}
                  className="flex-1 bg-transparent border-0 resize-none text-xs text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:ring-0 leading-relaxed"
                />

                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isTyping}
                  className="p-2.5 bg-[#4338ca] hover:bg-[#3730a3] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shrink-0 shadow-sm"
                  title="Kirim pesan (Enter)"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: Agent Collaboration & Discussion Live Logs */}
        {activeTab === 'agent_collabs' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fbf7ee]">
            {/* Filter Bar with Segmented Buttons (Semua / Obrolan Santai / Pekerjaan) */}
            <div className="bg-[#fffdf9] p-2.5 rounded-2xl border border-[#d6c5ad] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Segmented Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setCollabTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    collabTypeFilter === 'all'
                      ? 'bg-[#2c231c] text-white shadow-xs'
                      : 'bg-[#f4ebe1] hover:bg-[#ede2d1] text-[#786653]'
                  }`}
                >
                  <span>Semua Obrolan</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                    {collabLogs.length}
                  </span>
                </button>

                <button
                  onClick={() => setCollabTypeFilter('casual_talk')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    collabTypeFilter === 'casual_talk'
                      ? 'bg-[#be185d] text-white shadow-xs'
                      : 'bg-[#fdf2f8] hover:bg-[#fce7f3] text-[#be185d] border border-[#fbcfe8]'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>☕ Obrolan Santai</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                    {casualCount}
                  </span>
                </button>

                <button
                  onClick={() => setCollabTypeFilter('collaboration')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    collabTypeFilter === 'collaboration'
                      ? 'bg-[#1f6860] text-white shadow-xs'
                      : 'bg-[#eef8f6] hover:bg-[#e0f2ef] text-[#1f6860] border border-[#9fd3cc]'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>💼 Pekerjaan & Sprint</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                    {workCount}
                  </span>
                </button>
              </div>

              {/* Right Controls: Agent Filter & Simulate Collab */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-xs">
                  <Filter className="w-3 h-3 text-[#786653]" />
                  <select
                    value={collabFilterAgent}
                    onChange={(e) => setCollabFilterAgent(e.target.value)}
                    className="px-2.5 py-1.5 bg-[#f4ebe1] border border-[#d6c5ad] rounded-xl text-xs focus:outline-none text-[#2c231c] font-medium"
                  >
                    <option value="all">Semua Agent</option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.name}>
                        {ag.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleTriggerManualCollab}
                  className="px-2.5 py-1.5 bg-[#ede2d1] hover:bg-[#dccab3] text-[#2c231c] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border border-[#d6c5ad]"
                  title="Minta dua agent untuk berinteraksi spontan di kantor"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#c85a2b]" />
                  <span className="hidden sm:inline">Obrolan Baru</span>
                </button>
              </div>
            </div>

            {/* List of cards */}
            {filteredCollabLogs.map((log) => {
              const isCasual = log.type === 'casual_talk' || (!log.type && log.categoryTag && !log.categoryTag.includes('Sprint'));
              return (
                <div
                  key={log.id}
                  className={`p-4 bg-[#fffdf9] border rounded-2xl shadow-sm hover:shadow-md transition-shadow space-y-3 ${
                    isCasual ? 'border-[#fbcfe8] hover:border-[#f472b6]' : 'border-[#d6c5ad] hover:border-[#9fd3cc]'
                  }`}
                >
                  {/* Header: Initiator -> Target & Badge */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#ede2d1]">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {/* Badge: Casual Talk vs Work */}
                      {isCasual ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fdf2f8] text-[#be185d] border border-[#fbcfe8] flex items-center gap-1 shadow-2xs">
                          <Coffee className="w-3 h-3 text-[#ec4899]" />
                          <span>Obrolan Santai</span>
                          {log.categoryTag && <span className="opacity-90">• {log.categoryTag}</span>}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center gap-1 shadow-2xs">
                          <Briefcase className="w-3 h-3 text-[#3b82f6]" />
                          <span>Pekerjaan & Sprint</span>
                          {log.categoryTag && <span className="opacity-90">• {log.categoryTag}</span>}
                        </span>
                      )}

                      {/* Initiator */}
                      <div className="flex items-center gap-1.5 ml-1">
                        <div
                          className="w-6 h-6 rounded-lg text-white font-bold flex items-center justify-center text-[10px]"
                          style={{ backgroundColor: log.senderAvatarColor || '#6366f1' }}
                        >
                          {log.senderName.charAt(0)}
                        </div>
                        <span className="font-bold text-[#2c231c]">{log.senderName}</span>
                        <span className="text-[10px] text-[#786653] font-mono">
                          ({log.senderRoleTitle.split(' ')[0]})
                        </span>
                      </div>

                      <ArrowRight className="w-3.5 h-3.5 text-[#c85a2b]" />

                      {/* Target */}
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-6 h-6 rounded-lg text-white font-bold flex items-center justify-center text-[10px]"
                          style={{ backgroundColor: log.targetAvatarColor || '#ec4899' }}
                        >
                          {log.targetName.charAt(0)}
                        </div>
                        <span className="font-bold text-[#2c231c]">{log.targetName}</span>
                        <span className="text-[10px] text-[#786653] font-mono">
                          ({log.targetRoleTitle.split(' ')[0]})
                        </span>
                      </div>
                    </div>

                    {/* Timestamp & Project */}
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#786653]">
                      {!isCasual && log.projectName && (
                        <span className="px-2 py-0.5 bg-[#f4ebe1] rounded-md border border-[#d6c5ad] font-bold text-[#2c231c]">
                          📁 {log.projectName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#9c8976]" />
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Topic */}
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    {isCasual ? (
                      <span className="text-[#be185d] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#ec4899]" />
                        <span>Topik Santai: {log.topic}</span>
                      </span>
                    ) : (
                      <span className="text-[#1f6860] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1f6860]" />
                        <span>Topik Pekerjaan: {log.topic}</span>
                      </span>
                    )}
                  </div>

                  {/* Dialog Body */}
                  <div
                    className={`p-3 rounded-xl border text-xs text-[#2c231c] leading-relaxed font-sans ${
                      isCasual ? 'bg-[#fffafd] border-[#fce7f3]' : 'bg-[#fbf7ee] border-[#ede2d1]'
                    }`}
                  >
                    "{log.dialog}"
                  </div>

                  {/* Outcome / Plan Result */}
                  {log.outcome && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                        isCasual ? 'bg-[#fff1f2] border-[#fecdd3] text-[#9f1239]' : 'bg-[#eef8f6] border-[#9fd3cc] text-[#134e48]'
                      }`}
                    >
                      {isCasual ? (
                        <Sparkles className="w-4 h-4 text-[#ec4899] shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <div className="leading-snug">
                        <strong className="block font-bold mb-0.5">
                          {isCasual ? 'Catatan Obrolan Santai:' : 'Rencana / Kesepakatan yang Dicapai:'}
                        </strong>
                        <span>{log.outcome}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredCollabLogs.length === 0 && (
              <div className="text-center py-12 text-[#786653] text-xs bg-[#fffdf9] rounded-2xl border border-[#d6c5ad]">
                <Coffee className="w-8 h-8 text-[#d6c5ad] mx-auto mb-2" />
                <p className="font-semibold text-[#2c231c]">Belum ada rekaman obrolan untuk filter ini.</p>
                <p className="mt-1">
                  Klik tombol <strong className="text-[#c85a2b]">"Obrolan Baru"</strong> di atas untuk memicu interaksi spontan antar agent.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Log Kegiatan & Aktivitas Karyawan */}
        {activeTab === 'activity_logs' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fbf7ee]">
            {/* Filter Bar with Category Pills */}
            <div className="bg-[#fffdf9] p-3 rounded-2xl border border-[#d6c5ad] shadow-sm flex flex-col gap-2.5">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setActivityFilterCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activityFilterCategory === 'all'
                      ? 'bg-[#2c231c] text-white shadow-xs'
                      : 'bg-[#f4ebe1] hover:bg-[#ede2d1] text-[#786653]'
                  }`}
                >
                  <span>Semua Kegiatan</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                    {events.length}
                  </span>
                </button>

                <button
                  onClick={() => setActivityFilterCategory('coffee')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activityFilterCategory === 'coffee'
                      ? 'bg-[#c85a2b] text-white shadow-xs'
                      : 'bg-[#fdeed9] hover:bg-[#fbdcb7] text-[#c85a2b] border border-[#f0c8a5]'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>☕ Kopi & Pantry</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                    {coffeeCount}
                  </span>
                </button>

                <button
                  onClick={() => setActivityFilterCategory('game')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activityFilterCategory === 'game'
                      ? 'bg-[#9333ea] text-white shadow-xs'
                      : 'bg-[#faf5ff] hover:bg-[#f3e8ff] text-[#9333ea] border border-[#e9d5ff]'
                  }`}
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>🎮 Game Corner</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                    {gameCount}
                  </span>
                </button>

                <button
                  onClick={() => setActivityFilterCategory('lobby')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activityFilterCategory === 'lobby'
                      ? 'bg-[#2563eb] text-white shadow-xs'
                      : 'bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] border border-[#bfdbfe]'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>🚶 Santai di Lobby</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                    {lobbyCount}
                  </span>
                </button>

                <button
                  onClick={() => setActivityFilterCategory('sprint')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activityFilterCategory === 'sprint'
                      ? 'bg-[#0d9488] text-white shadow-xs'
                      : 'bg-[#f0fdfa] hover:bg-[#ccfbf1] text-[#0d9488] border border-[#99f6e4]'
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span>📋 Sprint Station</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                    {sprintCount}
                  </span>
                </button>

                <button
                  onClick={() => setActivityFilterCategory('task')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activityFilterCategory === 'task'
                      ? 'bg-[#16a34a] text-white shadow-xs'
                      : 'bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0]'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>⚡ Tugas & Coding</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                    {taskCount}
                  </span>
                </button>
              </div>

              {/* Sub controls: Search box & Agent select */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[#ede2d1]">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-[#9c8976] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    placeholder="Cari log kegiatan (misal: mesin kopi, arcade, sprint, tiket)..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#f4ebe1] border border-[#d6c5ad] rounded-xl text-xs text-[#2c231c] placeholder-[#9c8976] focus:outline-none focus:border-[#c85a2b]"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <Filter className="w-3 h-3 text-[#786653]" />
                  <select
                    value={activityFilterAgent}
                    onChange={(e) => setActivityFilterAgent(e.target.value)}
                    className="px-2.5 py-1.5 bg-[#f4ebe1] border border-[#d6c5ad] rounded-xl text-xs focus:outline-none text-[#2c231c] font-medium"
                  >
                    <option value="all">Semua Karyawan</option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.name}>
                        {ag.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* List of activity cards */}
            <div className="space-y-2">
              {filteredEvents.map((ev) => {
                const agent = agents.find((a) => a.id === ev.agentId || a.name === ev.agentName);
                const isCoffee = ev.categoryTag?.includes('Kopi') || ev.description.toLowerCase().includes('kopi');
                const isGame = ev.categoryTag?.includes('Game') || ev.categoryTag?.includes('Gaming') || ev.description.toLowerCase().includes('arcade');
                const isSprint = ev.categoryTag?.includes('Sprint') || ev.description.toLowerCase().includes('sprint');
                const isTaskDone = ev.type === 'task_complete';

                return (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-2xl border transition-all hover:shadow-md ${
                      isCoffee
                        ? 'bg-[#fffaf5] border-[#fed7aa]'
                        : isGame
                        ? 'bg-[#faf5ff] border-[#e9d5ff]'
                        : isSprint
                        ? 'bg-[#f0fdfa] border-[#99f6e4]'
                        : isTaskDone
                        ? 'bg-[#f0fdf4] border-[#bbf7d0]'
                        : 'bg-[#fffdf9] border-[#d6c5ad]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Agent Avatar */}
                      <div
                        onClick={() => ev.agentId && onSelectAgent?.(ev.agentId)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                        style={{ backgroundColor: agent?.avatarColor || '#6366f1' }}
                        title={`Klik untuk lihat profil & aksi ${ev.agentName}`}
                      >
                        {ev.agentName?.charAt(0) || 'A'}
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              onClick={() => ev.agentId && onSelectAgent?.(ev.agentId)}
                              className="font-bold text-xs text-[#2c231c] hover:underline cursor-pointer"
                            >
                              {ev.agentName}
                            </span>
                            {agent?.roleTitle && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#f4ebe1] text-[#786653] font-medium">
                                {agent.roleTitle}
                              </span>
                            )}
                            {ev.categoryTag && (
                              <span
                                className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${
                                  isCoffee
                                    ? 'bg-[#fdeed9] text-[#c85a2b] border-[#f0c8a5]'
                                    : isGame
                                    ? 'bg-[#f3e8ff] text-[#7e22ce] border-[#d8b4fe]'
                                    : isSprint
                                    ? 'bg-[#ccfbf1] text-[#0f766e] border-[#5eead4]'
                                    : isTaskDone
                                    ? 'bg-[#dcfce7] text-[#15803d] border-[#86efac]'
                                    : 'bg-[#fdf2f8] text-[#be185d] border-[#fbcfe8]'
                                }`}
                              >
                                {ev.categoryTag}
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-[#9c8976] font-mono shrink-0" suppressHydrationWarning>
                            {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        {/* Event Description */}
                        <div className="text-xs text-[#2c231c] font-medium leading-relaxed mt-0.5">
                          {ev.description}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredEvents.length === 0 && (
                <div className="text-center py-12 text-[#786653] text-xs bg-[#fffdf9] rounded-2xl border border-[#d6c5ad]">
                  <Coffee className="w-8 h-8 text-[#d6c5ad] mx-auto mb-2" />
                  <p className="font-semibold text-[#2c231c]">Tidak ada kegiatan yang sesuai dengan filter.</p>
                  <p className="mt-1">
                    Kegiatan karyawan seperti menyeduh kopi di pantry, bermain game arcade, santai di lobby, dan menyelesaikan tugas akan tersimpan dan tampil otomatis di sini.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {/* 📱 Telegram Configuration & Tagging Guide Modal */}
        {isTelegramModalOpen && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
            <div className="bg-[#faf5eb] border-2 border-[#d6c5ad] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#2c231c]">
              {/* Header */}
              <div className="p-4 border-b border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#0ea5e9] text-white shadow-md">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#2c231c]">
                        Integrasi Bot Telegram & Tag Karyawan
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] font-bold font-mono">
                        {company.name} (Isolated)
                      </span>
                    </div>
                    <p className="text-xs text-[#786653]">
                      Hubungkan grup Telegram kantor Anda dengan bot Telegraf dan tag karyawan secara langsung.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTelegramModalOpen(false)}
                  className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Toast Feedback */}
              {telegramToast && (
                <div className="bg-[#ecfdf5] border-b border-[#a7f3d0] text-[#065f46] px-4 py-2 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{telegramToast}</span>
                </div>
              )}

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
                {/* 1. Status Card */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isBotRunning
                      ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]'
                      : 'bg-[#fffdf9] border-[#d6c5ad] text-[#5c4939]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3.5 h-3.5 rounded-full ${
                        isBotRunning ? 'bg-emerald-500 animate-ping' : 'bg-stone-300'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-xs flex items-center gap-2">
                        <span>Status Bot:</span>
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                            isBotRunning
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {isBotRunning ? 'AKTIF (LONG-POLLING ONLINE)' : 'NONAKTIF / OFFLINE'}
                        </span>
                        {botInfo?.username && (
                          <span className="font-mono text-[#0284c7] font-bold">
                            @{botInfo.username}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#786653] mt-0.5">
                        {isBotRunning
                          ? `Bot mandiri untuk kantor ${company.name} siap menerima pesan dan tag di Telegram.`
                          : 'Masukkan token bot dan klik "Nyalakan Bot" untuk mengaktifkan obrolan Telegram.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleBot}
                    disabled={savingTelegram || (!telegramConfig.botToken && !isBotRunning)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs ${
                      isBotRunning
                        ? 'bg-[#dc2626] hover:bg-[#b91c1c] text-white'
                        : 'bg-[#0284c7] hover:bg-[#0369a1] text-white disabled:opacity-50'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{isBotRunning ? 'Matikan Bot' : 'Nyalakan Bot'}</span>
                  </button>
                </div>

                {/* 2. Token Input & Connection Test */}
                <div className="bg-[#fffdf9] p-4 rounded-xl border border-[#d6c5ad] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#2c231c] flex items-center gap-1.5">
                      <span>Bot Token Telegram (Dari @BotFather)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0284c7] hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>Buka @BotFather</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={telegramConfig.botToken}
                      onChange={(e) =>
                        setTelegramConfig((prev) => ({ ...prev, botToken: e.target.value.trim() }))
                      }
                      placeholder="Contoh: 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567"
                      className="flex-1 px-3 py-2 bg-white border border-[#d6c5ad] rounded-xl text-xs font-mono text-[#2c231c] focus:outline-none focus:border-[#0284c7] shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={handleTestBotToken}
                      disabled={tokenTesting || !telegramConfig.botToken.trim()}
                      className="px-3 py-2 bg-[#f4ebe1] hover:bg-[#ede2d1] text-[#0284c7] font-bold rounded-xl border border-[#0284c7]/30 transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      {tokenTesting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Tes Token</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-[#786653]">
                    Buka Telegram, cari <strong>@BotFather</strong>, ketik <code>/newbot</code>, beri nama bot kantor Anda, lalu salin token API HTTP ke kolom ini.
                  </p>

                  {/* Test Result Feedback */}
                  {tokenTestResult && (
                    <div
                      className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs font-medium ${
                        tokenTestResult.success
                          ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]'
                          : 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]'
                      }`}
                    >
                      {tokenTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{tokenTestResult.message}</span>
                    </div>
                  )}
                </div>

                {/* 3. Chat ID Input */}
                <div className="bg-[#fffdf9] p-4 rounded-xl border border-[#d6c5ad] space-y-2.5">
                  <label className="font-bold text-[#2c231c] block">
                    Telegram Chat ID / User ID
                  </label>
                  <input
                    type="text"
                    value={telegramConfig.chatId}
                    onChange={(e) =>
                      setTelegramConfig((prev) => ({ ...prev, chatId: e.target.value.trim() }))
                    }
                    placeholder="Contoh: 123456789 atau ID grup -100123456789"
                    className="w-full px-3 py-2 bg-white border border-[#d6c5ad] rounded-xl text-xs font-mono text-[#2c231c] focus:outline-none focus:border-[#0284c7] shadow-inner"
                  />
                  <p className="text-[11px] text-[#786653]">
                    💡 <em>Otomatis Terdeteksi:</em> Kirim pesan <code>/start</code> atau <code>/chatid</code> ke bot Anda di Telegram, maka Chat ID akan otomatis terisi. Atau ketik manual ID grup/personal Anda di sini.
                  </p>
                </div>

                {/* 4. War Room Auto Sync Toggle */}
                <div className="bg-[#fffdf9] p-4 rounded-xl border border-[#d6c5ad] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#2c231c]">
                      Sinkronisasi Percakapan Dua Arah
                    </div>
                    <p className="text-[11px] text-[#786653] mt-0.5">
                      Pesan dari War Room web otomatis diteruskan ke obrolan Telegram, dan sebaliknya.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={telegramConfig.autoSyncWarRoom ?? true}
                    onChange={(e) =>
                      setTelegramConfig((prev) => ({ ...prev, autoSyncWarRoom: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#0284c7] cursor-pointer"
                  />
                </div>

                {/* 5. Panduan Tag Karyawan di Telegram (Fitur Utama yang diminta pengguna) */}
                <div className="bg-[#eef2ff] p-4 rounded-xl border border-[#c7d2fe] space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#4338ca] text-white">
                      <AtSign className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#312e81] text-xs">
                        Panduan Tag Karyawan di Chat Telegram
                      </h4>
                      <p className="text-[11px] text-[#4338ca]">
                        Ketik pesan di Telegram seperti grup chat biasa, lalu tag nama karyawan:
                      </p>
                    </div>
                  </div>

                  {/* Agent Tag Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {agents.map((ag) => {
                      const first = ag.name.split(' ')[0];
                      return (
                        <div
                          key={ag.id}
                          className="p-2 bg-white/90 rounded-lg border border-[#c7d2fe] flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: ag.avatarColor || '#6366f1' }}
                            />
                            <div>
                              <div className="font-bold text-[#1e1b4b] text-[11px]">
                                {ag.name}
                              </div>
                              <div className="text-[10px] text-[#6b7280]">
                                {ag.roleTitle}
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-[#eef2ff] text-[#4338ca] font-mono font-bold text-[10px]">
                            @{first}
                          </span>
                        </div>
                      );
                    })}

                    <div className="p-2 bg-gradient-to-r from-[#fff7ed] to-[#ffedd5] rounded-lg border border-[#fed7aa] flex items-center justify-between sm:col-span-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c] shrink-0" />
                        <div>
                          <div className="font-bold text-[#7c2d12] text-[11px]">
                            Seluruh Tim Kantor
                          </div>
                          <div className="text-[10px] text-[#9a3412]">
                            Panggil semua lead divisi rapat sekaligus
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#ea580c] text-white font-mono font-bold text-[10px]">
                        @all
                      </span>
                    </div>
                  </div>

                  {/* Labeled Reply Callout Box */}
                  <div className="p-3 bg-white/80 rounded-xl border border-[#c7d2fe] text-[11px] text-[#312e81] space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-[#1e1b4b]">
                      <span>🏷️ Balasan Berlabel Otomatis:</span>
                    </div>
                    <p className="leading-relaxed">
                      Walaupun hanya menggunakan <strong>1 bot Telegram</strong> untuk perusahaan Anda, setiap balasan di chat Telegram akan otomatis diberi <strong>label identitas & peran karyawan yang menjawab</strong> (contoh: <code>🧑‍💻 [Kenji Sato - Founder & System Architect]: ...</code> atau <code>🎨 [Rei Kasumi - Creative Director & UI/UX]: ...</code>).
                    </p>
                    <p className="text-[#4338ca] italic">
                      Dengan cara ini, seluruh anggota di grup Telegram selalu tahu persis karyawan mana yang membalas pesan!
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#d6c5ad] bg-[#f4ebe1] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsTelegramModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5c4939] hover:bg-[#ede2d1] transition-colors"
                >
                  Tutup
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveTelegramConfig}
                    disabled={savingTelegram}
                    className="px-4 py-2 bg-[#fffdf9] hover:bg-[#ede2d1] text-[#2c231c] border border-[#d6c5ad] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    {savingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Simpan Pengaturan</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSaveTelegramConfig();
                      await handleToggleBot();
                    }}
                    disabled={savingTelegram || !telegramConfig.botToken.trim()}
                    className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center gap-1.5 ${
                      isBotRunning
                        ? 'bg-[#dc2626] hover:bg-[#b91c1c]'
                        : 'bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{isBotRunning ? 'Matikan Bot' : 'Simpan & Nyalakan Bot'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
