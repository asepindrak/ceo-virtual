import fs from 'fs';
import path from 'path';
import { Company, Agent, StandupMeetingState, StandupAgentSpeech, TaskTicket, OfficeGroupChatMessage } from '@/types/office';
import { VIGENT_HOME } from './workspaceManager';
import { CONFERENCE_SEATS, getEffectiveAgentLLMConfig } from './companyPresets';
import { getCompanyData, getCompanyTasks, getCompanyTelegramConfig, appendCompanyChatMessage } from './telegramManager';
import { callLLMProvider } from './llmService';
import { Telegraf } from 'telegraf';

// In-memory cache for fast state sync
const standupStateRegistry = new Map<string, StandupMeetingState>();

function getStandupFilePath(companyId: string): string {
  if (!fs.existsSync(VIGENT_HOME)) {
    fs.mkdirSync(VIGENT_HOME, { recursive: true });
  }
  return path.join(VIGENT_HOME, `standup_${companyId}.json`);
}

export function getStandupState(companyId: string = 'company-shadowmove'): StandupMeetingState {
  if (standupStateRegistry.has(companyId)) {
    return standupStateRegistry.get(companyId)!;
  }

  // Load from disk
  try {
    const filePath = getStandupFilePath(companyId);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      standupStateRegistry.set(companyId, data);
      return data;
    }
  } catch (err) {
    console.warn(`[StandupManager] Failed to read standup state for ${companyId}:`, err);
  }

  const defaultState: StandupMeetingState = {
    companyId,
    status: 'idle',
    startedAt: 0,
    currentSpeakerIndex: -1,
    speeches: [],
    sentToTelegram: false,
    triggeredBy: 'system',
    lastUpdated: Date.now(),
  };

  saveStandupState(companyId, defaultState);
  return defaultState;
}

export function saveStandupState(companyId: string, state: StandupMeetingState): void {
  state.lastUpdated = Date.now();
  standupStateRegistry.set(companyId, state);

  try {
    const filePath = getStandupFilePath(companyId);
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[StandupManager] Failed to persist standup state for ${companyId}:`, err);
  }
}

/**
 * Generate procedural standup speech for an agent based on their actual role & tasks
 */
function generateProceduralSpeech(
  agent: Agent,
  tasks: TaskTicket[],
  seatIndex: number
): StandupAgentSpeech {
  const roleLower = (agent.roleTitle || agent.role || '').toLowerCase();
  const assignedTask = tasks.find((t) => t.assignedAgentId === agent.id && t.status === 'in_progress');
  const taskName = assignedTask ? assignedTask.title : 'fitur sistem';

  let yesterday = '';
  let today = '';
  let blockers = 'Tidak ada kendala (None)';

  if (roleLower.includes('founder') || roleLower.includes('ceo') || roleLower.includes('lead') || roleLower.includes('manager')) {
    yesterday = 'Review arsitektur sprint & alokasi tiket task tim.';
    today = `Supervisi implementasi ${taskName} & sinkronisasi target deliverables.`;
    blockers = 'None, roadmap berjalan sesuai jadwal.';
  } else if (roleLower.includes('design') || roleLower.includes('ui') || roleLower.includes('creative')) {
    yesterday = 'Menyusun wireframe, design token warna, dan tata letak responsif.';
    today = `Fokus visual polishing komponen ${taskName} & micro-animations.`;
    blockers = 'None, aset grafis sudah siap diekspor.';
  } else if (roleLower.includes('backend') || roleLower.includes('engineer') || roleLower.includes('cloud') || roleLower.includes('architect')) {
    yesterday = 'Menyelesaikan skema data, endpoint API, dan optimasi query database.';
    today = `Menghubungkan integrasi service ${taskName} & testing throughput.`;
    blockers = 'None, pipeline API dan database stabil.';
  } else if (roleLower.includes('qa') || roleLower.includes('test') || roleLower.includes('automation')) {
    yesterday = 'Menulis skenario automated test dan regression testing.';
    today = `Validasi end-to-end flows untuk ${taskName} di berbagai resolusi layar.`;
    blockers = 'None, test suite hijau dan build staging stabil.';
  } else if (roleLower.includes('devops') || roleLower.includes('infra') || roleLower.includes('reliability')) {
    yesterday = 'Audit resource memory, konfigurasi container, dan monitoring log.';
    today = 'Optimasi latency deployment dan setup alert monitoring real-time.';
    blockers = 'None, server metrics dalam batas hijau.';
  } else {
    yesterday = 'Menyelesaikan modul fundamental dan dokumentasi alur kerja.';
    today = `Melanjutkan pengerjaan ${taskName} dan koordinasi antar divisi.`;
    blockers = 'None, semua dependensi terpenuhi.';
  }

  const fullSpeech = `🎯 Kemarin: ${yesterday} | ⚡ Hari ini: ${today} | 🚧 Blocker: ${blockers}`;
  const seatPos = CONFERENCE_SEATS[seatIndex % CONFERENCE_SEATS.length];

  return {
    agentId: agent.id,
    agentName: agent.name,
    roleTitle: agent.roleTitle || agent.role,
    avatarColor: agent.avatarColor || '#38bdf8',
    seatPosition: seatPos,
    yesterday,
    today,
    blockers,
    fullSpeech,
    timestamp: Date.now(),
  };
}

/**
 * Generate full speeches for all agents in the company
 */
export async function prepareStandupMeeting(
  companyId: string = 'company-shadowmove',
  triggeredBy: string = 'web'
): Promise<StandupMeetingState> {
  const company = getCompanyData(companyId);
  const tasks = getCompanyTasks(companyId);
  const agents = company.agents && company.agents.length > 0 ? company.agents : [];

  const speeches: StandupAgentSpeech[] = [];

  // Generate for each agent
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const speech = generateProceduralSpeech(agent, tasks, i);
    speeches.push(speech);
  }

  const state: StandupMeetingState = {
    companyId,
    status: 'gathering',
    startedAt: Date.now(),
    currentSpeakerIndex: -1, // Gathering first
    speeches,
    sentToTelegram: false,
    triggeredBy,
    lastUpdated: Date.now(),
  };

  saveStandupState(companyId, state);

  // Broadcast gathering announcement in War Room chat
  appendCompanyChatMessage(companyId, {
    id: `standup-start-${Date.now()}`,
    senderType: 'system',
    senderName: 'Meeting Room Orchestrator 📅',
    message: `📢 **DAILY STANDUP MEETING DIMULAI!**\nSeluruh tim karyawan sedang berkumpul di Ruang Rapat (Conference Table) untuk menyelaraskan progres harian.`,
    timestamp: Date.now(),
    source: 'web',
  });

  return state;
}

/**
 * Advance to next speaker during meeting
 */
export async function advanceStandupSpeaker(
  companyId: string = 'company-shadowmove'
): Promise<{ state: StandupMeetingState; currentSpeech: StandupAgentSpeech | null; isCompleted: boolean }> {
  const state = getStandupState(companyId);

  if (state.status === 'idle' || state.status === 'completed') {
    return { state, currentSpeech: null, isCompleted: true };
  }

  state.status = 'in_progress';
  state.currentSpeakerIndex++;

  if (state.currentSpeakerIndex >= state.speeches.length) {
    // All speakers finished! Complete standup!
    const completedState = await finishStandupMeeting(companyId);
    return { state: completedState, currentSpeech: null, isCompleted: true };
  }

  const currentSpeech = state.speeches[state.currentSpeakerIndex];

  // Log speaker's update to War Room chat
  appendCompanyChatMessage(companyId, {
    id: `standup-speak-${Date.now()}-${currentSpeech.agentId}`,
    senderType: 'agent',
    agentId: currentSpeech.agentId,
    senderName: currentSpeech.agentName,
    senderRoleTitle: currentSpeech.roleTitle,
    senderAvatarColor: currentSpeech.avatarColor,
    message: `📢 **[DAILY STANDUP UPDATE]**\n• 🎯 **Kemarin:** ${currentSpeech.yesterday}\n• ⚡ **Hari ini:** ${currentSpeech.today}\n• 🚧 **Blocker:** ${currentSpeech.blockers}`,
    timestamp: Date.now(),
    source: 'web',
  });

  saveStandupState(companyId, state);
  return { state, currentSpeech, isCompleted: false };
}

/**
 * Finish Standup: Generate executive summary & dispatch directly to Telegram
 */
export async function finishStandupMeeting(companyId: string = 'company-shadowmove'): Promise<StandupMeetingState> {
  const state = getStandupState(companyId);
  const company = getCompanyData(companyId);
  const tasks = getCompanyTasks(companyId);

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;

  const now = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
    hour12: false,
  };
  const formattedDate = now.toLocaleDateString('id-ID', dateOptions);
  const formattedTime = now.toLocaleTimeString('id-ID', timeOptions);

  const speechLines = state.speeches
    .map((s) => {
      return `• 👤 *${s.agentName}* (_${s.roleTitle}_):\n   ↳ 🎯 *Kemarin:* ${s.yesterday}\n   ↳ ⚡ *Hari ini:* ${s.today}\n   ↳ 🚧 *Blocker:* ${s.blockers}`;
    })
    .join('\n\n');

  const summary = `📋 *LAPORAN DAILY STANDUP TIM ${company.name.toUpperCase()}*
📅 *Hari/Tanggal:* ${formattedDate} (Pukul \`${formattedTime} WIB\`)
👥 *Total Karyawan Hadir:* ${state.speeches.length} Anggota Tim

🎯 *RANGKUMAN UPDATE TIAP ANGGOTA:*
${speechLines}

📊 *STATUS TIKET SPRINT KANTOR:*
• ✅ \`${doneCount}\` Task Selesai
• ⚡ \`${inProgressCount}\` Task Sedang Dikerjakan
• 🛡️ \`0\` Blocker Kritis

🚀 *Pesan Tim untuk CEO:*
_"Rapat standup telah selesai! Seluruh divisi telah selaras dan langsung kembali ke meja kerja untuk mengeksekusi target hari ini. Selamat beraktivitas, Bos!"_`;

  state.summary = summary;
  state.status = 'completed';

  // 1. Post to War Room chat
  appendCompanyChatMessage(companyId, {
    id: `standup-summary-${Date.now()}`,
    senderType: 'system',
    senderName: 'Executive Standup Briefing 📋',
    message: `✅ **DAILY STANDUP SELESAI & NOTULENSI DITERBITKAN!**\nSeluruh tim telah menyampaikan progres harian dan kembali ke meja masing-masing. Notulensi eksekutif telah dikirimkan ke Telegram CEO.`,
    timestamp: Date.now(),
    source: 'web',
  });

  // 2. Dispatch to Telegram
  const tgConfig = getCompanyTelegramConfig(companyId);
  if (tgConfig && tgConfig.botToken && tgConfig.chatId && tgConfig.isEnabled !== false) {
    try {
      const bot = new Telegraf(tgConfig.botToken);
      await bot.telegram.sendMessage(tgConfig.chatId, summary, { parse_mode: 'Markdown' });
      state.sentToTelegram = true;
    } catch (err) {
      console.error(`[StandupManager] Failed to send standup summary to Telegram for ${companyId}:`, err);
    }
  }

  saveStandupState(companyId, state);
  return state;
}

/**
 * Reset standup back to idle
 */
export function resetStandupState(companyId: string = 'company-shadowmove'): StandupMeetingState {
  const state: StandupMeetingState = {
    companyId,
    status: 'idle',
    startedAt: 0,
    currentSpeakerIndex: -1,
    speeches: [],
    sentToTelegram: false,
    triggeredBy: 'system',
    lastUpdated: Date.now(),
  };
  saveStandupState(companyId, state);
  return state;
}
