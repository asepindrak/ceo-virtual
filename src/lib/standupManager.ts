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

export function getStandupState(companyId: string = 'company-main'): StandupMeetingState {
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
  const taskName = assignedTask ? assignedTask.title : 'system features';

  let yesterday = '';
  let today = '';
  let blockers = 'None';

  if (roleLower.includes('founder') || roleLower.includes('ceo') || roleLower.includes('lead') || roleLower.includes('manager')) {
    yesterday = 'Reviewed sprint architecture & allocated team task tickets.';
    today = `Supervising implementation of ${taskName} & syncing deliverables.`;
    blockers = 'None, roadmap is tracking on schedule.';
  } else if (roleLower.includes('design') || roleLower.includes('ui') || roleLower.includes('creative')) {
    yesterday = 'Drafted wireframes, color design tokens, and responsive layouts.';
    today = `Polishing visual components for ${taskName} & micro-animations.`;
    blockers = 'None, graphic assets ready for export.';
  } else if (roleLower.includes('backend') || roleLower.includes('engineer') || roleLower.includes('cloud') || roleLower.includes('architect')) {
    yesterday = 'Completed data schemas, API endpoints, and database query optimizations.';
    today = `Integrating service hooks for ${taskName} & testing throughput.`;
    blockers = 'None, API pipeline and database stable.';
  } else if (roleLower.includes('qa') || roleLower.includes('test') || roleLower.includes('automation')) {
    yesterday = 'Authored automated test scenarios and regression suites.';
    today = `Validating end-to-end flows for ${taskName} across multiple viewport resolutions.`;
    blockers = 'None, test suite is green and staging build is stable.';
  } else if (roleLower.includes('devops') || roleLower.includes('infra') || roleLower.includes('reliability')) {
    yesterday = 'Audited memory resources, container configs, and log monitors.';
    today = 'Optimizing deployment latency and setting up real-time monitoring alerts.';
    blockers = 'None, server metrics within normal green thresholds.';
  } else {
    yesterday = 'Completed foundational modules and workflow documentation.';
    today = `Continuing development on ${taskName} and cross-division coordination.`;
    blockers = 'None, all dependencies met.';
  }

  const fullSpeech = `🎯 Yesterday: ${yesterday} | ⚡ Today: ${today} | 🚧 Blockers: ${blockers}`;
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
  companyId: string = 'company-main',
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
    message: `📢 **DAILY STANDUP MEETING STARTED!**\nThe entire team is gathering at the Conference Table to align on daily progress and roadmap targets.`,
    timestamp: Date.now(),
    source: 'web',
  });

  return state;
}

/**
 * Advance to next speaker during meeting
 */
export async function advanceStandupSpeaker(
  companyId: string = 'company-main'
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
    message: `📢 **[DAILY STANDUP UPDATE]**\n• 🎯 **Yesterday:** ${currentSpeech.yesterday}\n• ⚡ **Today:** ${currentSpeech.today}\n• 🚧 **Blockers:** ${currentSpeech.blockers}`,
    timestamp: Date.now(),
    source: 'web',
  });

  saveStandupState(companyId, state);
  return { state, currentSpeech, isCompleted: false };
}

/**
 * Finish Standup: Generate executive summary & dispatch directly to Telegram
 */
export async function finishStandupMeeting(companyId: string = 'company-main'): Promise<StandupMeetingState> {
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
    timeZone: 'UTC',
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  };
  const formattedDate = now.toLocaleDateString('en-US', dateOptions);
  const formattedTime = now.toLocaleTimeString('en-US', timeOptions);

  const speechLines = state.speeches
    .map((s) => {
      return `• 👤 *${s.agentName}* (_${s.roleTitle}_):\n   ↳ 🎯 *Yesterday:* ${s.yesterday}\n   ↳ ⚡ *Today:* ${s.today}\n   ↳ 🚧 *Blockers:* ${s.blockers}`;
    })
    .join('\n\n');

  const summary = `📋 *DAILY STANDUP REPORT - ${company.name.toUpperCase()}*
📅 *Date/Time:* ${formattedDate} (\`${formattedTime} UTC\`)
👥 *Team Attendance:* ${state.speeches.length} Members Present

🎯 *INDIVIDUAL MEMBER UPDATES:*
${speechLines}

📊 *OFFICE SPRINT TICKET STATUS:*
• ✅ \`${doneCount}\` Tasks Completed
• ⚡ \`${inProgressCount}\` Tasks In Progress
• 🛡️ \`0\` Critical Blockers

🚀 *Team Note for CEO:*
_"Standup meeting adjourned! All divisions are aligned and returning to their workstations to execute today's targets. Have a productive day, Boss!"_`;

  state.summary = summary;
  state.status = 'completed';

  // 1. Post to War Room chat
  appendCompanyChatMessage(companyId, {
    id: `standup-summary-${Date.now()}`,
    senderType: 'system',
    senderName: 'Executive Standup Briefing 📋',
    message: `✅ **DAILY STANDUP FINISHED & MINUTES PUBLISHED!**\nAll team members have shared their daily updates and returned to their workstations. Executive minutes have been dispatched to the CEO Telegram channel.`,
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
export function resetStandupState(companyId: string = 'company-main'): StandupMeetingState {
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
