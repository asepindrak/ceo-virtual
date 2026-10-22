/**
 * 📱 VIGENT - Isolated Multi-Company Telegram Bot Manager
 * Built with Telegraf, supporting per-company bot tokens, chat IDs,
 * agent tagging (@Kenji, @Rei, @Damian, @Yuki, @all), labeled replies,
 * and bi-directional War Room chat synchronization.
 */

import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Company, Agent, OfficeGroupChatMessage, TelegramConfig, TaskTicket, TaskType } from '@/types/office';
import { PRESET_COMPANIES, getEffectiveAgentLLMConfig } from './companyPresets';
import { callLLMProvider } from './llmService';
import { cloneGitRepository, extractGitHubUrl, createProjectDirectory, writeProjectFile, writeArtifactFile, VIGENT_HOME } from './workspaceManager';
import { getAgentCurrentTime } from './timezoneHelper';
import { playSingleTrack, queueTrack, createPlaylist, sendPlaybackCommand, getOfficeMusicState } from './musicManager';
import { synthesizeAgentVoice, transcribeTelegramVoice } from './voiceManager';

export interface BotRunnerInstance {
  companyId: string;
  bot: Telegraf;
  config: TelegramConfig;
  botInfo?: {
    id: number;
    username: string;
    firstName: string;
  };
  isRunning: boolean;
  startedAt: number;
  stop: () => Promise<void>;
}

// Global registry for runners across server restarts / hot reloads
const getGlobalRunners = (): Map<string, BotRunnerInstance> => {
  const g = globalThis as unknown as { __vigent_telegram_runners?: Map<string, BotRunnerInstance> };
  if (!g.__vigent_telegram_runners) {
    g.__vigent_telegram_runners = new Map<string, BotRunnerInstance>();
  }
  return g.__vigent_telegram_runners;
};

// Data paths
function getVigentDir(): string {
  if (!fs.existsSync(VIGENT_HOME)) {
    fs.mkdirSync(VIGENT_HOME, { recursive: true });
  }
  return VIGENT_HOME;
}

export function getCompanyTelegramConfig(companyId: string): TelegramConfig | null {
  try {
    const filePath = path.join(getVigentDir(), `telegram_${companyId}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`[Telegram] Error loading config for ${companyId}:`, err);
  }
  return null;
}

export function saveCompanyTelegramConfig(companyId: string, config: TelegramConfig): void {
  try {
    const filePath = path.join(getVigentDir(), `telegram_${companyId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[Telegram] Error saving config for ${companyId}:`, err);
  }
}

export function getCompanyChatHistory(companyId: string): OfficeGroupChatMessage[] {
  try {
    const filePath = path.join(getVigentDir(), `chat_${companyId}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`[Telegram] Error loading chat history for ${companyId}:`, err);
  }
  return [];
}

export function appendCompanyChatMessage(companyId: string, msg: OfficeGroupChatMessage): void {
  try {
    const filePath = path.join(getVigentDir(), `chat_${companyId}.json`);
    const history = getCompanyChatHistory(companyId);
    history.push(msg);
    // Keep last 100 messages
    const trimmed = history.slice(-100);
    fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[Telegram] Error saving chat message for ${companyId}:`, err);
  }
}

export function getCompanyTasks(companyId: string): TaskTicket[] {
  try {
    const filePath = path.join(getVigentDir(), `tasks_${companyId}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // fallback
  }
  const preset = PRESET_COMPANIES.find((c) => c.id === companyId);
  return preset?.tasks || [];
}

export function saveCompanyTasks(companyId: string, tasks: TaskTicket[]): void {
  try {
    const filePath = path.join(getVigentDir(), `tasks_${companyId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[Telegram] Error saving tasks for ${companyId}:`, err);
  }
}

export function addCompanyTask(companyId: string, task: TaskTicket): void {
  const current = getCompanyTasks(companyId);
  current.unshift(task);
  saveCompanyTasks(companyId, current);
}

export function getCompanyData(companyId: string): Company {
  const dir = getVigentDir();
  let comp: Company | null = null;
  try {
    const compFile = path.join(dir, `company_${companyId}.json`);
    if (fs.existsSync(compFile)) {
      comp = JSON.parse(fs.readFileSync(compFile, 'utf-8'));
    }
  } catch {}

  if (!comp) {
    const preset = PRESET_COMPANIES.find((c) => c.id === companyId);
    comp = preset ? { ...preset } : { ...PRESET_COMPANIES[0] };
  }

  // Merge any saved globalLLMConfig from disk
  try {
    const llmFile = path.join(dir, `company_${companyId}_llm.json`);
    if (fs.existsSync(llmFile)) {
      const savedLLM = JSON.parse(fs.readFileSync(llmFile, 'utf-8'));
      comp.globalLLMConfig = { ...comp.globalLLMConfig, ...savedLLM };
    }
  } catch {}

  return comp;
}

export function getCompanyAgents(companyId: string): Agent[] {
  const comp = getCompanyData(companyId);
  return comp.agents && comp.agents.length > 0 ? comp.agents : PRESET_COMPANIES[0].agents;
}

export function getCompanyLeader(company: Company): Agent {
  const agents = company.agents && company.agents.length > 0 ? company.agents : getCompanyAgents(company.id);

  // 1. Prioritize explicit manual assignment if set by user
  if (company.leaderAgentId) {
    const manualLeader = agents.find((a) => a.id === company.leaderAgentId);
    if (manualLeader) return manualLeader;
  }
  const explicitAgent = agents.find((a) => a.isLeader);
  if (explicitAgent) return explicitAgent;

  // 2. Intelligent Auto-detection based on role & title hierarchy
  const leader = agents.find((a) => {
    const role = (a.role || '').toLowerCase();
    const title = (a.roleTitle || '').toLowerCase();
    return (
      role === 'ceo' ||
      title.includes('founder') ||
      title.includes('lead') ||
      title.includes('architect') ||
      title.includes('director') ||
      title.includes('head') ||
      role === 'project_manager' ||
      title.includes('manager')
    );
  });
  return leader || agents[0];
}

export function isTaskOrProjectInstruction(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (
    /^(halo|hai|pagi|siang|malam|apa kabar|lagi apa|status|ping)\b/i.test(lower) &&
    !lower.includes('bikin') &&
    !lower.includes('buat') &&
    !lower.includes('implement') &&
    !lower.includes('proyek') &&
    !lower.includes('fitur')
  ) {
    return false;
  }
  const taskKeywords = [
    'bikin', 'buat', 'create', 'build', 'implement', 'implementasi',
    'proyek', 'project', 'fitur', 'feature', 'web', 'aplikasi', 'app',
    'landing', 'sistem', 'redesign', 'desain', 'tambahkan', 'kerjakan',
    'diskusi', 'diskusikan', 'diskusiin', 'link tree', 'linktree', 'clone',
    'kembangkan', 'integrasikan', 'kalian coba', 'tolong buatkan', 'coba kalian'
  ];
  return taskKeywords.some((kw) => lower.includes(kw));
}

export interface AutonomousWorkflowResult {
  leaderReply: string;
  createdTask: TaskTicket;
  createdTasks?: TaskTicket[];
  discussions: { agent: Agent; message: string }[];
  telegramMessage: string;
}

export async function executeAutonomousCompanyWorkflow(
  company: Company,
  userInstruction: string,
  primaryResponder?: Agent
): Promise<AutonomousWorkflowResult> {
  const leader = primaryResponder || getCompanyLeader(company);
  const team = company.agents && company.agents.length > 0 ? company.agents : getCompanyAgents(company.id);

  // Dynamic role matching across ANY company:
  const designer =
    team.find((a) => {
      const t = (a.roleTitle + ' ' + a.role).toLowerCase();
      return (
        a.id !== leader.id &&
        (t.includes('design') || t.includes('ui') || t.includes('creative') || t.includes('frontend'))
      );
    }) ||
    team.find((a) => a.id !== leader.id) ||
    leader;

  const engineer =
    team.find((a) => {
      const t = (a.roleTitle + ' ' + a.role).toLowerCase();
      return (
        a.id !== leader.id &&
        a.id !== designer.id &&
        (t.includes('dev') ||
          t.includes('engineer') ||
          t.includes('backend') ||
          t.includes('fullstack') ||
          t.includes('mobile'))
      );
    }) ||
    team.find((a) => a.id !== leader.id) ||
    designer;

  const effectiveConfig = getEffectiveAgentLLMConfig(leader, company);

  let leaderReply = '';
  let rawTasks: {
    title: string;
    description: string;
    type: TaskType;
    assignedAgentName: string;
  }[] = [];
  let parsedDiscussions: { agentName: string; message: string }[] = [];

  // 1. Try real LLM first if apiKey is available
  if (effectiveConfig?.apiKey) {
    try {
      const rosterList = team
        .map((a) => `- ${a.name} (${a.roleTitle}, skill: ${a.skills?.join(', ') || a.role})`)
        .join('\n');
      const prompt = `You are the AI Orchestrator for the CEO Virtual autonomous company.
Company: "${company.name}" (Industry: ${company.industry || 'Digital & Software'}).
Team Leader: ${leader.name} (${leader.roleTitle}).
Team Roster:
${rosterList}

Directive from Boss on Telegram:
"${userInstruction}"

YOUR GOAL:
1. Team Leader (${leader.name}) responds directly to the Boss (1-3 sentences: professional, confident, detailing sprint task distribution to the team).
2. Determine sprint ticket assignments (tasks) for EACH relevant team member (minimum 2 separate tasks: 1 for frontend/design/UI division, 1 for backend/architecture/data layer). Every member assigned in the discussion MUST receive a specific sprint ticket matching their expertise.
   - Example task for ${designer.name} (${designer.roleTitle}): UI/UX layout, styling, animations/micro-interactions, visual components.
   - Example task for ${engineer.name} (${engineer.roleTitle}): Code architecture foundation, data fetching, modular structure, API/service integration.
3. Generate 3 inter-agent collaboration dialogs in the office War Room:
   - Message 1: ${leader.name} briefs the team in the War Room and assigns tasks (@${designer.name.split(' ')[0]} and @${engineer.name.split(' ')[0]}).
   - Message 2: Response from ${designer.name} accepting the task and explaining visual implementation details.
   - Message 3: Response from ${engineer.name} accepting the task and detailing technical architecture.

Output MUST BE valid JSON only without markdown code fences:
{
  "leaderReply": "...",
  "discussions": [
    { "agentName": "${leader.name}", "message": "..." },
    { "agentName": "${designer.name}", "message": "..." },
    { "agentName": "${engineer.name}", "message": "..." }
  ],
  "tasks": [
    {
      "title": "[Frontend] ...",
      "description": "...",
      "type": "design",
      "assignedAgentName": "${designer.name}"
    },
    {
      "title": "[Backend/Arch] ...",
      "description": "...",
      "type": "coding",
      "assignedAgentName": "${engineer.name}"
    }
  ]
}`;

      const response = await callLLMProvider(effectiveConfig, [{ role: 'user', content: prompt }]);

      if (response && response.content) {
        let cleanJson = response.content.trim();
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanJson = jsonMatch[0];
        }
        const parsed = JSON.parse(cleanJson);
        if (parsed.leaderReply) {
          leaderReply = parsed.leaderReply.trim();
          if (Array.isArray(parsed.discussions) && parsed.discussions.length >= 2) {
            parsedDiscussions = parsed.discussions;
          }
          if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
            rawTasks = parsed.tasks.map((t: any) => ({
              title: t.title?.trim() || `[Task] ${company.name} Sprint`,
              description: t.description?.trim() || userInstruction,
              type: (['coding', 'design', 'architecture', 'qa'].includes(t.type) ? t.type : 'coding') as TaskType,
              assignedAgentName: t.assignedAgentName || designer.name,
            }));
          } else if (parsed.taskTitle) {
            rawTasks = [
              {
                title: parsed.taskTitle.trim(),
                description: parsed.taskDescription?.trim() || userInstruction,
                type: (['coding', 'design', 'architecture', 'qa'].includes(parsed.taskType) ? parsed.taskType : 'coding') as TaskType,
                assignedAgentName: parsed.assignedAgentName || designer.name,
              },
            ];
          }
        }
      }
    } catch (err) {
      console.warn(`[Autonomous Workflow LLM Fallback for ${company.name}]:`, err);
    }
  }

  // 2. Intelligent Dynamic Fallback (guarantees multi-task distribution for ANY company & ANY project instruction)
  if (!leaderReply || rawTasks.length === 0) {
    const lower = userInstruction.toLowerCase();
    let topic = 'Modern Web Application';
    if (lower.includes('link tree') || lower.includes('linktree')) {
      topic = 'Modern LinkTree Bio-Link';
    } else if (lower.includes('landing')) {
      topic = 'Modern Landing Page Showcase';
    } else if (lower.includes('mobile') || lower.includes('app')) {
      topic = 'Cross-Platform Mobile Feature';
    } else if (lower.includes('dashboard') || lower.includes('admin')) {
      topic = 'Executive Analytics Dashboard';
    } else {
      const match = userInstruction.match(/(?:create|build|implement|design|make|bikin|buat)\s+([^?.!]+)/i);
      if (match && match[1]) {
        topic = match[1].trim().slice(0, 35);
      }
    }

    const leaderFirst = leader.name.split(' ')[0];
    leaderReply = `Understood Boss! Received your directive to build "${topic}" with modern technologies. Sprint tickets have been created and assigned on Kanban, and the team is gathered in the War Room for immediate distributed execution!`;

    parsedDiscussions = [
      {
        agentName: leader.name,
        message: `Hey team @${designer.name.split(' ')[0]} @${engineer.name.split(' ')[0]}, Boss directed us to build ${topic}. @${designer.name.split(' ')[0]} please take the lead on frontend & UI/UX, and @${engineer.name.split(' ')[0]} set up the modular data architecture and service integration!`,
      },
      {
        agentName: designer.name,
        message: `On it @${leaderFirst}! For ${topic}, I will design a sleek cybernetic visual layout with clean typography, dark theme, and fluid micro-interactions across mobile & desktop.`,
      },
      {
        agentName: engineer.name,
        message: `Agreed! On the architectural side, we will structure modular React/Next.js components with clean data-driven configs, sub-second builds, and production-ready code ready for deployment!`,
      },
    ];

    rawTasks = [
      {
        title: `[Frontend] ${topic} - UI, Layout & Micro-interactions`,
        description: `Design modern visuals, mobile-first responsive layout, dark mode, and smooth micro-interactions for ${topic}.`,
        type: 'design',
        assignedAgentName: designer.name,
      },
      {
        title: `[Backend/Arch] ${topic} - Modular Architecture & Data Layer`,
        description: `Implement modular component architecture, data-driven configs, and service integrations for ${topic}.`,
        type: 'coding',
        assignedAgentName: engineer.name,
      },
    ];
  }

  // 3. Construct real TaskTicket for EACH distributed task
  const createdTickets: TaskTicket[] = [];

  for (let idx = 0; idx < rawTasks.length; idx++) {
    const taskDef = rawTasks[idx];
    const assignedAgent =
      team.find((a) => a.name.toLowerCase().includes(taskDef.assignedAgentName.toLowerCase())) ||
      (idx === 0 ? designer : engineer);

    const newTicket: TaskTicket = {
      id: `task-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      title: taskDef.title,
      projectName: taskDef.title.replace(/^\[[^\]]+\]\s*/, ''),
      description: taskDef.description,
      type: taskDef.type,
      departmentId: assignedAgent.departmentId || 'dept-eng',
      assignedAgentId: assignedAgent.id,
      status: 'in_progress',
      progress: 15,
      artifacts: [
        {
          id: `art-${Date.now()}-${idx}-1`,
          fileName: 'SPEC.md',
          type: 'markdown',
          content: `# ${taskDef.title}\n\n**Company:** ${company.name}\n**Leader:** ${leader.name} (${leader.roleTitle})\n**Assignee:** ${assignedAgent.name} (${assignedAgent.roleTitle})\n**Status:** In Progress (15%)\n\n## Task Description\n${taskDef.description}\n\n## War Room Team Alignment\n- Tech Stack: Modern Fullstack (React 18 / Vite / Next.js / Tailwind CSS)\n- Discussion Participants: ${leader.name}, ${designer.name}, ${engineer.name}\n- Workspace Status: Active`,
        },
      ],
      logs: [
        `Instruction received from Boss via Telegram at ${new Date().toLocaleTimeString('en-US')}.`,
        `Sprint ticket automatically generated by ${leader.name} and assigned to ${assignedAgent.name}.`,
        `Team collaboration session held in the ${company.name} War Room.`,
      ],
      createdAt: Date.now() + idx * 50,
    };

    // 4. Save to company's tasks
    addCompanyTask(company.id, newTicket);
    createdTickets.push(newTicket);

    // Auto-scaffold real code and artifact deliverables in ~/.ceo-virtual/projects & ~/.ceo-virtual/artifacts
    try {
      const safeProject = (newTicket.projectName || newTicket.title || 'task-generated-project')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .slice(0, 32);

      createProjectDirectory(safeProject);
      const summaryMd = `# ${newTicket.title}\n\n> 🤖 Autonomously implemented by Agent: **${assignedAgent.name} (${assignedAgent.roleTitle})**\n> 🏢 Company: **${company.name}**\n> 📁 Project: \`${safeProject}\`\n> ⏰ Execution Time: ${new Date().toLocaleString()}\n\n## Task Description\n${newTicket.description}\n\n## War Room Team Recommendations\n${parsedDiscussions.map((d) => `- **${d.agentName}:** ${d.message}`).join('\n')}\n`;
      writeArtifactFile(company.id, safeProject, 'TASK_SUMMARY.md', summaryMd);

      if (newTicket.type === 'coding' || newTicket.type === 'design') {
        const packageJson = {
          name: safeProject,
          version: '1.0.0',
          private: true,
          description: `Project for ${newTicket.title} by ${assignedAgent.name}`,
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0',
            'framer-motion': '^11.0.0',
            'lucide-react': '^0.350.0',
          },
          devDependencies: {
            '@types/react': '^18.2.0',
            '@types/react-dom': '^18.2.0',
            '@vitejs/plugin-react': '^4.2.0',
            vite: '^5.0.0',
          },
        };
        writeProjectFile(safeProject, 'package.json', JSON.stringify(packageJson, null, 2));

        const appJsx = `// 🚀 CEO Virtual Autonomous Sprint Implementation
// Task: ${newTicket.title}
// Agent: ${assignedAgent.name} (${assignedAgent.roleTitle})
// Company: ${company.name}

import React, { useState } from 'react';

export default function App() {
  const [links] = useState([
    { id: 1, title: '🌐 Official Company Portal', url: '#' },
    { id: 2, title: '💼 Projects & Product Suite', url: '#' },
    { id: 3, title: '💬 Office War Room Sync', url: '#' },
    { id: 4, title: '🐙 GitHub Workspace', url: '#' },
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-3xl font-black mb-4 shadow-lg shadow-cyan-500/20">
          ${company.name.slice(0, 2).toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">${company.name}</h1>
        <p className="text-sm text-cyan-400 font-medium mb-6">Autonomous Multi-Agent Workspace</p>

        <div className="w-full flex flex-col gap-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-cyan-500/20 border border-slate-700/60 hover:border-cyan-500/50 text-center font-medium transition-all duration-200 hover:scale-[1.02]"
            >
              {link.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
`;
        writeProjectFile(safeProject, 'src/App.jsx', appJsx);
      }
    } catch (err) {
      console.error('[Telegram Task Scaffold Error]:', err);
    }
  }

  // 5. Append all discussions to War Room chat history
  const discussionsForReturn: { agent: Agent; message: string }[] = [];
  parsedDiscussions.forEach((disc, idx) => {
    const speakerAgent =
      team.find((a) => a.name.toLowerCase().includes(disc.agentName.toLowerCase())) ||
      (idx === 0 ? leader : idx === 1 ? designer : engineer);

    const chatMsg: OfficeGroupChatMessage = {
      id: `tg-disc-${Date.now()}-${idx}-${speakerAgent.id}`,
      senderType: 'agent',
      agentId: speakerAgent.id,
      senderName: speakerAgent.name,
      senderRoleTitle: speakerAgent.roleTitle,
      senderAvatarColor: speakerAgent.avatarColor,
      message: disc.message,
      timestamp: Date.now() + idx * 400,
      source: 'telegram',
    };
    appendCompanyChatMessage(company.id, chatMsg);
    discussionsForReturn.push({ agent: speakerAgent, message: disc.message });
  });

  // 6. Format rich Telegram response
  const leaderEmoji = getAgentRoleEmoji(leader);

  const ticketSnippets = createdTickets
    .map((t) => {
      const assignee = team.find((a) => a.id === t.assignedAgentId) || designer;
      const emoji = getAgentRoleEmoji(assignee);
      return `• ${emoji} *${assignee.name}* (_${assignee.roleTitle}_)\n  ↳ \`${t.title}\` (🚀 \`In Progress 15%\`)`;
    })
    .join('\n');

  const discussionSnippets = discussionsForReturn
    .map((d) => `• ${getAgentRoleEmoji(d.agent)} *${d.agent.name.split(' ')[0]}:* "${d.message}"`)
    .join('\n');

  const telegramMessage = `${leaderEmoji} *[${leader.name} - ${leader.roleTitle}]*
${leaderReply}

📋 *[KANBAN SPRINT TICKETS DISTRIBUTED (${createdTickets.length} TASKS)]*
${ticketSnippets}
• *Company:* *${company.name}*

💬 *[WAR ROOM COLLABORATION - ${company.name.toUpperCase()}]*
${discussionSnippets}

_💡 The ${company.name} team has logged all tickets to Kanban and started execution in their workspace!_`;

  return {
    leaderReply,
    createdTask: createdTickets[0],
    createdTasks: createdTickets,
    discussions: discussionsForReturn,
    telegramMessage,
  };
}

// Map agent role to emoji icon for Telegram label
export function getAgentRoleEmoji(agent: Agent): string {
  const role = (agent.role || '').toLowerCase();
  const title = (agent.roleTitle || '').toLowerCase();
  if (title.includes('founder') || role === 'ceo') return '👑';
  if (title.includes('architect') || title.includes('system')) return '🧑‍💻';
  if (title.includes('ui') || title.includes('design') || title.includes('creative')) return '🎨';
  if (title.includes('qa') || title.includes('test') || title.includes('reliability')) return '🛡️';
  if (title.includes('backend') || title.includes('cloud') || title.includes('devops')) return '⚙️';
  if (title.includes('marketing') || title.includes('content') || title.includes('seo')) return '📢';
  return '💼';
}

/**
 * Format labeled reply for Telegram
 * E.g.:
 * 🧑‍💻 *[Kenji Sato - Founder & System Architect]*
 * Pesan jawaban disini...
 */
export function formatAgentTelegramReply(agent: Agent, text: string): string {
  const emoji = getAgentRoleEmoji(agent);
  return `${emoji} *[${agent.name} - ${agent.roleTitle}]*\n${text.trim()}`;
}

/**
 * Test Bot Token connection with Telegram API
 */
export async function testTelegramBotToken(botToken: string): Promise<{
  success: boolean;
  botInfo?: { id: number; username: string; firstName: string };
  error?: string;
}> {
  try {
    if (!botToken || !botToken.includes(':')) {
      return { success: false, error: 'Invalid Bot Token format (example: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)' };
    }
    const bot = new Telegraf(botToken);
    const me = await bot.telegram.getMe();
    return {
      success: true,
      botInfo: {
        id: me.id,
        username: me.username || '',
        firstName: me.first_name || '',
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to connect to Telegram Bot API. Please verify your bot token.',
    };
  }
}

/**
 * Generate agent response tailored to agent persona, tasks, and context
 */
async function generateAgentAnswer(
  agent: Agent,
  userMessage: string,
  company: Company,
  tasks: TaskTicket[]
): Promise<string> {
  // Always use fresh company data to ensure recently saved global LLM configs are loaded
  const freshCompany = getCompanyData(company.id);
  const currentTask = tasks.find((t) => t.id === agent.currentTaskId) || tasks[0];
  const activeProject = currentTask?.projectName || 'Main Workspace';

  // Try calling real LLM using effective config (inherited company global or manual BYOK)
  const effectiveConfig = getEffectiveAgentLLMConfig(agent, freshCompany);
  if (effectiveConfig?.apiKey) {
    try {
      let memorySnippet = '';
      try {
        const { searchCompanyMemories } = await import('./memoryManager');
        const relevantMemories = await searchCompanyMemories(freshCompany.id, userMessage, 2);
        if (relevantMemories.length > 0) {
          memorySnippet = `\nRelevant Office Memories:\n` + relevantMemories.map(m => `- [${m.memory.type}] ${m.memory.title}: ${m.memory.content}`).join('\n');
        }
      } catch {}

      const timeDetail = getAgentCurrentTime(agent.timezone || 'Asia/Jakarta');

      const prompt = `You are ${agent.name}, holding the position "${agent.roleTitle}" at ${freshCompany.name}.
MBTI: ${agent.personality?.mbti || 'INTJ'}, Speaking style: ${agent.personality?.speakingStyle || 'Professional, warm, clear, to the point'}.
Your Timezone: ${timeDetail.timezone} (Current Local Time: ${timeDetail.timeString}, ${timeDetail.dateString}, ${timeDetail.dayPeriod}).
Active project: ${activeProject}.
Your current task: "${currentTask?.title || 'Core sprint development'}" (Status: ${currentTask?.status || 'in_progress'}).${memorySnippet}
Directive from Boss on Telegram: "${userMessage}".

Instructions:
- Respond naturally, warmly, and professionally in English, true to your persona and role.
- Time Awareness: You are fully aware of what time it is in your timezone (${timeDetail.timeString} - ${timeDetail.dayPeriod}). If the Boss asks about time or sends time greetings, reference your exact local time.
- If the Boss greets you or asks what the team is doing (e.g. "what's up", "hello", "status update"), reply casually yet professionally about your active tasks at ${freshCompany.name}.
- Keep your answer concise (1-3 sentences).`;

      const response = await callLLMProvider(effectiveConfig, [
        { role: 'user', content: prompt }
      ]);
      if (response && response.content) {
        return response.content.trim();
      }
    } catch (err: any) {
      console.error(`[Telegram LLM Error for ${agent.name}]:`, err);
      const errMsg = err?.message || 'Failed to call AI model';
      return `Hello Boss! I am ${agent.name} (${agent.roleTitle}).\n\nYour message: "${userMessage}"\n\n⚠️ *Failed to reach LLM [${effectiveConfig.provider} - ${effectiveConfig.model}]:*\n\`${errMsg}\`\n\nPlease check connection status / endpoint in the Global LLM settings on your CEO Virtual dashboard.`;
    }
  }

  // If no API Key configured for this company/agent:
  return `Hello Boss! I am ${agent.name} (${agent.roleTitle}).\n\nYour message: "${userMessage}" was received. However, the LLM API Key for "${freshCompany.name}" is not yet configured in the backend.\n\nPlease open **Global LLM** in the CEO Virtual dashboard, enter your API Key / Base URL, and click **Save All Global LLM Settings** to enable full autonomous AI responses.`;
}

/**
 * Start isolated Telegraf long-polling bot for a specific company
 */
export async function startCompanyTelegramBot(
  companyId: string,
  providedConfig?: TelegramConfig,
  sendReadyNotification: boolean = true
): Promise<{ success: boolean; message: string; botInfo?: any }> {
  const runners = getGlobalRunners();

  // If already running for this company, stop previous first
  if (runners.has(companyId)) {
    try {
      await runners.get(companyId)!.stop();
    } catch (e) {
      console.warn(`[Telegram] Error stopping previous runner for ${companyId}:`, e);
    }
    runners.delete(companyId);
  }

  const config = providedConfig || getCompanyTelegramConfig(companyId);
  if (!config || !config.botToken) {
    return { success: false, message: 'Bot Token belum diisi untuk perusahaan ini.' };
  }

  try {
    const bot = new Telegraf(config.botToken);
    const me = await bot.telegram.getMe();

    const company = getCompanyData(companyId);
    const agents = getCompanyAgents(companyId);
    let tasks = getCompanyTasks(companyId);

    // Update config with verified bot info
    config.botUsername = me.username;
    config.botFirstName = me.first_name;
    config.isEnabled = true;
    config.lastActiveTime = Date.now();
    saveCompanyTelegramConfig(companyId, config);

    // Command: /start
    bot.command('start', async (ctx) => {
      const chatId = String(ctx.chat.id);
      // Auto-save chat ID if not set
      if (!config.chatId) {
        config.chatId = chatId;
        saveCompanyTelegramConfig(companyId, config);
      }

      const teamList = agents
        .map((a) => {
          const emoji = getAgentRoleEmoji(a);
          const first = a.name.split(' ')[0];
          return `• ${emoji} *${a.name}* (\`@${first}\`) - _${a.roleTitle}_`;
        })
        .join('\n');

      const welcomeMsg = `🏢 *War Room Group Chat - ${company.name}*
Welcome to your CEO Virtual autonomous office bot!

🆔 *Your Chat ID:* \`${chatId}\`
_(Use this Chat ID in office settings if not already auto-linked)_

👥 *Team Members You Can Tag:*
${teamList}
• 📢 *Entire Team:* (\`@all\`)

💬 *How to Use:*
Type a message and tag any employee by name:
👉 \`@${agents[0]?.name.split(' ')[0] || 'Kenji'} how is the sprint progress today?\`
👉 \`@${agents[1]?.name.split(' ')[0] || 'Rei'} please inspect the UI button accents\`
👉 \`@all sprint retrospective begins now\`

Each tagged team member will reply with their individual persona and role badge! 🚀`;

      await ctx.reply(welcomeMsg, { parse_mode: 'Markdown' });
    });

    // Command: /chatid
    bot.command('chatid', async (ctx) => {
      const chatId = String(ctx.chat.id);
      if (!config.chatId) {
        config.chatId = chatId;
        saveCompanyTelegramConfig(companyId, config);
      }
      await ctx.reply(
        `🆔 *Your Current Chat ID:* \`${chatId}\`\nStatus: Connected to *${company.name}*.`,
        { parse_mode: 'Markdown' }
      );
    });

    // Command: /team
    bot.command('team', async (ctx) => {
      const list = agents
        .map((a) => {
          const emoji = getAgentRoleEmoji(a);
          const first = a.name.split(' ')[0];
          return `${emoji} *${a.name}* (\`@${first}\`)\n   _${a.roleTitle}_`;
        })
        .join('\n\n');

      await ctx.reply(
        `👥 *Team Roster for ${company.name}:*\n\n${list}\n\n💡 *Tip:* Tag them directly in messages, e.g. \`@${agents[0].name.split(' ')[0]} please review tasks\`.`,
        { parse_mode: 'Markdown' }
      );
    });

    // Command: /tasks
    bot.command('tasks', async (ctx) => {
      tasks = getCompanyTasks(companyId);
      if (!tasks || tasks.length === 0) {
        await ctx.reply('📋 No active tasks on the Kanban board currently.');
        return;
      }

      const taskLines = tasks.map((t) => {
        const icon = t.status === 'done' ? '✅' : t.status === 'in_progress' ? '⚡' : '📌';
        return `${icon} *${t.title}* [${Math.round(t.progress || 0)}%]\n   _Status:_ ${t.status.toUpperCase()} | _Project:_ ${t.projectName || 'General'}`;
      }).join('\n\n');

      await ctx.reply(
        `📋 *Sprint & Kanban Status for ${company.name}:*\n\n${taskLines}`,
        { parse_mode: 'Markdown' }
      );
    });

    // Command: /standup - Start Daily Standup Meeting at the Conference Table
    bot.command('standup', async (ctx) => {
      try {
        const { prepareStandupMeeting, advanceStandupSpeaker, finishStandupMeeting, getStandupState } = await import('./standupManager');
        const currentStandup = getStandupState(companyId);

        if (currentStandup.status === 'in_progress' || currentStandup.status === 'gathering') {
          await ctx.reply(
            '⏳ *Daily Standup is currently in progress!* The team is actively meeting at the Conference Table. The summary will be posted here once concluded.',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        await ctx.reply(
          `📅 *STARTING DAILY STANDUP FOR ${company.name.toUpperCase()}...*\n\n👥 All team members are gathering at the Conference Table.\nEach member will share their daily update (Yesterday, Today, Blockers) in turn.\n\nExecutive meeting minutes will be sent here automatically! 🚀`,
          { parse_mode: 'Markdown' }
        );

        // Start Standup Session
        const standupState = await prepareStandupMeeting(companyId, 'telegram');

        // Asynchronously advance speakers and dispatch final summary to Telegram
        (async () => {
          try {
            await new Promise((r) => setTimeout(r, 4000));

            for (let i = 0; i < standupState.speeches.length; i++) {
              await advanceStandupSpeaker(companyId);
              await new Promise((r) => setTimeout(r, 4500));
            }

            await finishStandupMeeting(companyId);
          } catch (sErr) {
            console.error('[Telegram Standup Execution Error]:', sErr);
          }
        })();
      } catch (err: any) {
        console.error('[Telegram /standup error]:', err);
        await ctx.reply(`❌ Failed to start standup: ${err.message || 'Unknown error'}`);
      }
    });

    // Command: /clone
    bot.command('clone', async (ctx) => {
      const parts = ctx.message.text.trim().split(/\s+/);
      const repoUrl = parts[1];
      if (!repoUrl) {
        await ctx.reply(
          '⚠️ Please provide a GitHub repository link.\nExample: `/clone https://github.com/facebook/react`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const extracted = extractGitHubUrl(repoUrl);
      if (!extracted) {
        await ctx.reply(
          '⚠️ Invalid GitHub URL. Example format: `https://github.com/owner/repository`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      await ctx.reply(
        `📦 *Preparing GitHub Clone...*\nURL: \`${extracted.url}\`\nTarget Workspace: \`~/.ceo-virtual/projects/${extracted.projectName}\``,
        { parse_mode: 'Markdown' }
      );

      try {
        await ctx.sendChatAction('typing');
      } catch {}

      const res = await cloneGitRepository(extracted.url, extracted.projectName);
      if (res.success) {
        await ctx.reply(
          `✅ *Repository Cloned Successfully!*\n\n📁 *Project:* \`${res.projectName}\`\n📂 *Path:* \`${res.folderPath}\`\n📄 *Total:* ${res.filesCount} files\n\nProject saved to CEO Virtual workspaces and ready for the agent team! 🚀`,
          { parse_mode: 'Markdown' }
        );

        appendCompanyChatMessage(companyId, {
          id: `tg-clone-${Date.now()}`,
          senderType: 'system',
          senderName: 'GitHub Sync [Telegram]',
          message: `📦 Cloned repository **${res.projectName}** from ${extracted.url} to workspaces (~/.ceo-virtual/projects/${res.projectName}) with ${res.filesCount} files.`,
          timestamp: Date.now(),
          source: 'telegram',
        });
      } else {
        await ctx.reply(`❌ *Failed to Clone Repository:*\n${res.error || res.message}`, { parse_mode: 'Markdown' });
      }
    });

    // Command: /time - Live local time for each agent based on timezone
    bot.command('time', async (ctx) => {
      const currentAgents = getCompanyAgents(companyId);
      const timeLines = currentAgents.map((a) => {
        const timeInfo = getAgentCurrentTime(a.timezone || 'Asia/Jakarta');
        const emoji = getAgentRoleEmoji(a);
        return `• ${emoji} *${a.name}* (_${a.roleTitle}_):\n   🕒 \`${timeInfo.timeString}\` • _${timeInfo.dayPeriod}_ (${timeInfo.timezone})`;
      }).join('\n\n');

      await ctx.reply(
        `🌍 *LOCAL TIME ROSTER FOR ${company.name.toUpperCase()}*\n\n${timeLines}\n\n💡 _All agents are fully aware of what time it is in their local timezones when conversing!_`,
        { parse_mode: 'Markdown' }
      );
    });

    // 🎵 Music Remote Control Commands
    bot.command('play', async (ctx) => {
      const query = ctx.message.text.replace(/^\/play(@\w+)?\s*/i, '').trim();
      if (!query) {
        const state = sendPlaybackCommand(companyId, 'play');
        if (state.currentTrack) {
          await ctx.reply(`▶️ Resuming office music: *"${state.currentTrack.title}"* - _${state.currentTrack.artist}_`, { parse_mode: 'Markdown' });
        } else {
          await ctx.reply('⚠️ Please provide a song title or artist.\nExample: `/play Lofi Chill Beats` or `/play Synthwave Sunset`', { parse_mode: 'Markdown' });
        }
        return;
      }

      await ctx.reply(`🔍 Searching and playing *"${query}"* on the office sound system via YouTube Music...`, { parse_mode: 'Markdown' });
      const senderName = ctx.from?.first_name || 'Boss (Telegram)';
      const res = await playSingleTrack(companyId, query, senderName);

      if (res.track) {
        const chatMsg: OfficeGroupChatMessage = {
          id: `music-msg-${Date.now()}`,
          senderType: 'system',
          senderName: 'Office SoundSystem 🎵',
          message: `🎶 *[Telegram Remote]* Now playing: **"${res.track.title}"** by **${res.track.artist}** (Duration: ${res.track.durationText}) requested by ${senderName}.`,
          timestamp: Date.now(),
          source: 'telegram',
        };
        appendCompanyChatMessage(companyId, chatMsg);

        await ctx.reply(
          `▶️ *NOW PLAYING IN OFFICE:*\n\n` +
          `📻 *${res.track.title}*\n` +
          `🎤 *Artist:* ${res.track.artist}\n` +
          `⏱️ *Duration:* ${res.track.durationText}\n` +
          `👤 *Requested by:* ${senderName}\n\n` +
          `_Track is streaming directly through the office floating Winamp player in your browser!_ 🚀\n` +
          `💡 _Use \`/add <title>\` to append to the playlist queue without interrupting the current track._`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(`❌ ${res.error || 'Track not found.'}`);
      }
    });

    bot.command('playlist', async (ctx) => {
      const query = ctx.message.text.replace(/^\/playlist(@\w+)?\s*/i, '').trim();
      if (!query) {
        await ctx.reply('⚠️ Please provide a genre or mood for the playlist.\nExample: `/playlist synthwave retro` or `/playlist lofi chill study`', { parse_mode: 'Markdown' });
        return;
      }

      await ctx.reply(`📻 Curating *"${query}"* playlist from YouTube Music for the office...`, { parse_mode: 'Markdown' });
      const senderName = ctx.from?.first_name || 'Boss (Telegram)';
      const res = await createPlaylist(companyId, query, senderName);

      if (res.tracks.length > 0) {
        const listText = res.tracks.map((t, idx) => `${idx + 1}. *${t.title}* - _${t.artist}_ (${t.durationText})`).join('\n');
        await ctx.reply(
          `🎶 *OFFICE PLAYLIST CREATED (${res.tracks.length} TRACKS):*\n\n${listText}\n\n▶️ _First track is now streaming in the office browser!_`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(`❌ ${res.error || 'Failed to create playlist.'}`);
      }
    });

    bot.command('pause', async (ctx) => {
      const state = sendPlaybackCommand(companyId, 'pause');
      await ctx.reply(`⏸️ Office music paused. Current track: *"${state.currentTrack?.title || 'None'}"*`, { parse_mode: 'Markdown' });
    });

    bot.command('resume', async (ctx) => {
      const state = sendPlaybackCommand(companyId, 'play');
      await ctx.reply(`▶️ Resuming office music: *"${state.currentTrack?.title || 'None'}"*`, { parse_mode: 'Markdown' });
    });

    bot.command('stop', async (ctx) => {
      sendPlaybackCommand(companyId, 'stop');
      await ctx.reply('⏹️ Office music stopped.', { parse_mode: 'Markdown' });
    });

    const handleNextTrack = async (ctx: any) => {
      const state = sendPlaybackCommand(companyId, 'next');
      if (state.currentTrack) {
        await ctx.reply(`⏭️ Skipped to next track: *"${state.currentTrack.title}"* - _${state.currentTrack.artist}_`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply('⏭️ Playlist is empty.');
      }
    };
    bot.command('next', handleNextTrack);
    bot.command('skip', handleNextTrack);

    bot.command('prev', async (ctx) => {
      const state = sendPlaybackCommand(companyId, 'prev');
      if (state.currentTrack) {
        await ctx.reply(`⏮️ Playing previous track: *"${state.currentTrack.title}"* - _${state.currentTrack.artist}_`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply('⏮️ Playlist is empty.');
      }
    });

    const handleNowPlaying = async (ctx: any) => {
      const state = getOfficeMusicState(companyId);
      if (!state.currentTrack) {
        await ctx.reply('🔇 No music currently playing in the office. Use `/play <title>` to play a track!');
        return;
      }
      const statusIcon = state.isPlaying ? '▶️' : '⏸️';
      await ctx.reply(
        `📻 *NOW PLAYING AT ${company.name.toUpperCase()}*\n\n` +
        `${statusIcon} *${state.currentTrack.title}*\n` +
        `🎤 *Artist:* ${state.currentTrack.artist}\n` +
        `⏱️ *Duration:* ${state.currentTrack.durationText}\n` +
        `👤 *Requested by:* ${state.currentTrack.addedBy || 'SoundSystem'}\n` +
        `📊 *Status:* ${state.isPlaying ? 'Playing' : 'Paused'} (Track ${state.currentIndex + 1} of ${state.playlist.length})\n\n` +
        `💡 _Use \`/next\`, \`/pause\`, \`/prev\`, or \`/queue\` for remote control._`,
        { parse_mode: 'Markdown' }
      );
    };
    bot.command('nowplaying', handleNowPlaying);
    bot.command('np', handleNowPlaying);

    const handleQueueOrAdd = async (ctx: any) => {
      const text = ctx.message?.text || '';
      const query = text.replace(/^\/(add|queue)(@\w+)?\s*/i, '').trim();
      const senderName = ctx.from?.first_name || 'Boss (Telegram)';

      if (!query) {
        const state = getOfficeMusicState(companyId);
        if (state.playlist.length === 0) {
          await ctx.reply('📭 Music queue is empty. Use `/play <title>` to play immediately, or `/add <title>` to append to the queue.');
          return;
        }
        const list = state.playlist.map((t, idx) => {
          const isCurrent = idx === state.currentIndex;
          return `${isCurrent ? '▶️' : `${idx + 1}.`} *${t.title}* - _${t.artist}_ (${t.durationText}) ${isCurrent ? '👈 *[NOW PLAYING]*' : ''}`;
        }).join('\n');

        await ctx.reply(
          `📋 *OFFICE PLAYLIST QUEUE (${state.playlist.length} TRACKS):*\n\n${list}\n\n💡 _Use \`/play <title>\` to play immediately, or \`/add <title>\` to append._`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      await ctx.reply(`🔍 Adding *"${query}"* to the office playlist queue...`, { parse_mode: 'Markdown' });
      const res = await queueTrack(companyId, query, senderName);

      if (res.track) {
        const chatMsg: OfficeGroupChatMessage = {
          id: `music-msg-${Date.now()}`,
          senderType: 'system',
          senderName: 'Office SoundSystem 🎵',
          message: `➕ *[Telegram Remote]* Added to queue: **"${res.track.title}"** by **${res.track.artist}** (Position #${res.position}) requested by ${senderName}.`,
          timestamp: Date.now(),
          source: 'telegram',
        };
        appendCompanyChatMessage(companyId, chatMsg);

        await ctx.reply(
          `➕ *ADDED TO PLAYLIST QUEUE (Position #${res.position}):*\n\n` +
          `📻 *${res.track.title}*\n` +
          `🎤 *Artist:* ${res.track.artist}\n` +
          `⏱️ *Duration:* ${res.track.durationText}\n` +
          `👤 *Requested by:* ${senderName}\n\n` +
          `_This track will play automatically once the current track finishes._ 🎶\n` +
          `_Type \`/play <title>\` if you want to play it immediately._`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(`❌ ${res.error || 'Track not found.'}`);
      }
    };

    bot.command('add', handleQueueOrAdd);
    bot.command('queue', handleQueueOrAdd);

    // Command: /voice - Request agent to reply with synthesized audio voice note (TTS)
    bot.command('voice', async (ctx) => {
      const prompt = ctx.message.text.replace(/^\/voice(@\w+)?\s*/i, '').trim();
      if (!prompt) {
        await ctx.reply(
          '🎙️ *CEO Virtual Voice Note Feature*\n\n' +
          'Send a prompt or directive with your command, for example:\n' +
          '• `/voice @Kenji how is the sprint progressing today?`\n' +
          '• `/voice @Rei draft visual ideas for our landing page`\n\n' +
          '💡 _You can also send a direct Voice Note audio from your phone/desktop directly to this bot!_',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const currentAgents = getCompanyAgents(companyId);
      const currentCompany = getCompanyData(companyId) || company;
      const currentTasks = getCompanyTasks(companyId);

      const lowerPrompt = prompt.toLowerCase();
      const isAll = lowerPrompt.includes('@all') || lowerPrompt.includes('@everyone');
      const tagged = currentAgents.filter((ag) =>
        isAll || lowerPrompt.includes(`@${ag.name.toLowerCase()}`) || lowerPrompt.includes(`@${ag.name.split(' ')[0].toLowerCase()}`)
      );
      const primaryResponder = tagged[0] || getCompanyLeader(currentCompany);

      try {
        await ctx.sendChatAction('record_voice');
      } catch {}

      const replyText = await generateAgentAnswer(
        primaryResponder,
        prompt,
        currentCompany,
        currentTasks
      );

      const formattedText = formatAgentTelegramReply(primaryResponder, replyText);
      await ctx.reply(formattedText, { parse_mode: 'Markdown' });

      // Generate TTS Voice Note Audio
      try {
        await ctx.sendChatAction('record_voice');
        const voiceAudio = await synthesizeAgentVoice(replyText, {
          lang: 'en',
          agent: primaryResponder,
        });

        await ctx.replyWithVoice(
          { source: voiceAudio, filename: 'agent_reply.mp3' },
          {
            caption: `🎙️ *Voice Note from ${primaryResponder.name}* (_${primaryResponder.roleTitle}_)`,
            parse_mode: 'Markdown',
          }
        );
      } catch (vErr) {
        console.warn('[Telegram Voice] Failed to synthesize voice:', vErr);
      }
    });

    // Command: /help
    bot.command('help', async (ctx) => {
      await ctx.reply(
        `🤖 *CEO Virtual Telegram Bot Commands:*\n
🎙️ *Voice Notes & Agent Audio:*
• Send any *Voice Note* directly from your phone/desktop to this bot!
  Your audio will be transcribed & answered with a *Synthesized Neural Voice Note*!
• \`/voice <prompt>\` - Request agent reply as audio speech (TTS)

📅 *Standup Meetings & Executive Minutes:*
• \`/standup\` - Gather team at Conference Table, hear individual updates & receive daily summary

🌍 *Timezones & Team Management:*
• \`/time\` - Check current local time across all agent timezones
• \`/team\` - Full team roster and tag handles
• \`/tasks\` - Kanban sprint ticket status
• \`/chatid\` - Display this chat ID

🎵 *SoundSystem & Music Remote:*
• \`/play <title>\` - Stream song immediately in office browser
• \`/add <title>\` (or \`/queue <title>\`) - Append song to playlist queue
• \`/playlist <mood>\` - Generate 5-track curated playlist
• \`/pause\` - Pause office music
• \`/resume\` - Resume office music
• \`/stop\` - Stop music
• \`/next\` (or \`/skip\`) - Play next track
• \`/prev\` - Play previous track
• \`/np\` - Check now playing track
• \`/queue\` - View full playlist queue

⚡ *Automated Git Workspaces:*
• \`/clone <url>\` - Clone GitHub repository directly to workspace

📌 *How to Tag Agents:*
Type their name after @, for example:
• \`@${agents[0]?.name.split(' ')[0] || 'Kenji'}\`
• \`@${agents[1]?.name.split(' ')[0] || 'Rei'}\`
• \`@all\` to broadcast to the entire office team!`,
        { parse_mode: 'Markdown' }
      );
    });

    // Handle all text messages (tag parsing & response generation)
    bot.on('text', async (ctx) => {
      const text = ctx.message.text.trim();
      if (text.startsWith('/')) return; // Ignore unhandled slash commands

      const senderFirstName = ctx.from?.first_name || 'Boss';
      const senderUsername = ctx.from?.username ? `@${ctx.from.username}` : '';
      const senderDisplayName = senderUsername ? `${senderFirstName} (${senderUsername})` : senderFirstName;

      // Check if this chat is the configured one or update if empty
      const currentChatId = String(ctx.chat.id);
      if (!config.chatId) {
        config.chatId = currentChatId;
        saveCompanyTelegramConfig(companyId, config);
      }

      // Record incoming message in company War Room group chat history
      const userChatMessage: OfficeGroupChatMessage = {
        id: `tg-msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        senderType: 'user',
        senderName: `${senderDisplayName} [Telegram]`,
        message: text,
        timestamp: Date.now(),
        source: 'telegram',
      };
      appendCompanyChatMessage(companyId, userChatMessage);

      const lower = text.toLowerCase().trim();

      // 📅 NATURAL STANDUP INTENT DETECTION
      if (
        ['start standup', 'run standup', 'standup meeting', 'daily standup', 'mulai standup', 'rapat standup'].includes(lower)
      ) {
        const { prepareStandupMeeting, advanceStandupSpeaker, finishStandupMeeting, getStandupState } = await import('./standupManager');
        const currentStandup = getStandupState(companyId);

        if (currentStandup.status === 'in_progress' || currentStandup.status === 'gathering') {
          await ctx.reply(
            '⏳ *Daily Standup is currently running in the office!* The team is actively meeting at the Conference Table. The summary will be posted here shortly.',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        await ctx.reply(
          `📅 *STARTING DAILY STANDUP FOR ${company.name.toUpperCase()}...*\n\n👥 All team members are gathering at the Conference Table.\nEach member will share their daily update in turn.\n\nExecutive meeting minutes will be sent here automatically! 🚀`,
          { parse_mode: 'Markdown' }
        );

        const standupState = await prepareStandupMeeting(companyId, 'telegram');

        (async () => {
          try {
            await new Promise((r) => setTimeout(r, 4000));
            for (let i = 0; i < standupState.speeches.length; i++) {
              await advanceStandupSpeaker(companyId);
              await new Promise((r) => setTimeout(r, 4500));
            }
            await finishStandupMeeting(companyId);
          } catch (sErr) {
            console.error('[Telegram Standup Execution Error]:', sErr);
          }
        })();
        return;
      }

      // 🎵 REMOTE MUSIC NATURAL INTENT DETECTION
      if (
        lower.startsWith('queue song ') ||
        lower.startsWith('add song ') ||
        lower.startsWith('queue track ') ||
        lower.startsWith('add track ') ||
        lower.startsWith('tambah lagu ') ||
        lower.startsWith('antrikan lagu ') ||
        lower.startsWith('queue lagu ')
      ) {
        const query = text.replace(/^(queue song|add song|queue track|add track|tambah lagu|antrikan lagu|queue lagu)\s+/i, '').trim();
        if (query) {
          try {
            await ctx.sendChatAction('typing');
          } catch {}
          const res = await queueTrack(companyId, query, senderDisplayName);
          if (res.track) {
            const chatMsg: OfficeGroupChatMessage = {
              id: `music-msg-${Date.now()}`,
              senderType: 'system',
              senderName: 'Office SoundSystem 🎵',
              message: `➕ *[Telegram Remote]* Added to queue: **"${res.track.title}"** by **${res.track.artist}** (Position #${res.position}) requested by ${senderDisplayName}.`,
              timestamp: Date.now(),
              source: 'telegram',
            };
            appendCompanyChatMessage(companyId, chatMsg);

            await ctx.reply(
              `➕ *[Office SoundSystem]*\nTrack *"${res.track.title}"* - _${res.track.artist}_ added to queue (Position #${res.position})!\n_Requested by:_ ${senderDisplayName} 🎶\n_Will stream automatically once current track finishes._`,
              { parse_mode: 'Markdown' }
            );
            return;
          }
        }
      } else if (
        lower.startsWith('play song ') ||
        lower.startsWith('play track ') ||
        lower.startsWith('play ') ||
        lower.startsWith('putar lagu ')
      ) {
        const query = text.replace(/^(play song|play track|play|putar lagu)\s+/i, '').trim();
        if (query) {
          try {
            await ctx.sendChatAction('typing');
          } catch {}
          const res = await playSingleTrack(companyId, query, senderDisplayName);
          if (res.track) {
            const chatMsg: OfficeGroupChatMessage = {
              id: `music-msg-${Date.now()}`,
              senderType: 'system',
              senderName: 'Office SoundSystem 🎵',
              message: `🎶 *[Telegram Remote]* Now streaming: **"${res.track.title}"** by **${res.track.artist}** (${res.track.durationText}) requested by ${senderDisplayName}.`,
              timestamp: Date.now(),
              source: 'telegram',
            };
            appendCompanyChatMessage(companyId, chatMsg);

            await ctx.reply(
              `🎵 *[Office SoundSystem]*\nNow streaming: *"${res.track.title}"* - _${res.track.artist}_ (${res.track.durationText}) in the office browser!\n_Requested by:_ ${senderDisplayName} 🚀`,
              { parse_mode: 'Markdown' }
            );
            return;
          }
        }
      } else if (lower.startsWith('create playlist ') || lower.startsWith('make playlist ') || lower.startsWith('buat playlist ')) {
        const query = text.replace(/^(create playlist|make playlist|buat playlist)\s+/i, '').trim();
        if (query) {
          try {
            await ctx.sendChatAction('typing');
          } catch {}
          const res = await createPlaylist(companyId, query, senderDisplayName);
          if (res.tracks.length > 0) {
            const chatMsg: OfficeGroupChatMessage = {
              id: `playlist-msg-${Date.now()}`,
              senderType: 'system',
              senderName: 'Office SoundSystem 🎵',
              message: `📻 *[Telegram Remote]* Created & playing playlist **"${query}"** (${res.tracks.length} tracks) requested by ${senderDisplayName}.`,
              timestamp: Date.now(),
              source: 'telegram',
            };
            appendCompanyChatMessage(companyId, chatMsg);

            const listText = res.tracks.map((t, idx) => `${idx + 1}. *${t.title}* - _${t.artist}_`).join('\n');
            await ctx.reply(
              `📻 *[Office SoundSystem]*\nPlaylist *"${query}"* (${res.tracks.length} tracks) created & streaming in office!\n\n${listText}`,
              { parse_mode: 'Markdown' }
            );
            return;
          }
        }
      } else if (['pause music', 'pause song', 'pause musik', 'jeda musik'].includes(lower)) {
        sendPlaybackCommand(companyId, 'pause');
        await ctx.reply('⏸️ Office music paused.');
        return;
      } else if (['resume music', 'resume song', 'lanjut musik', 'play lagi'].includes(lower)) {
        const state = sendPlaybackCommand(companyId, 'play');
        await ctx.reply(`▶️ Resuming: *"${state.currentTrack?.title || 'Music'}"*`);
        return;
      } else if (['stop music', 'stop song', 'stop musik', 'matikan musik'].includes(lower)) {
        sendPlaybackCommand(companyId, 'stop');
        await ctx.reply('⏹️ Office music stopped.');
        return;
      } else if (['next track', 'skip track', 'next song', 'skip song', 'next lagu', 'skip lagu'].includes(lower)) {
        const state = sendPlaybackCommand(companyId, 'next');
        if (state.currentTrack) {
          await ctx.reply(`⏭️ Skipped to: *"${state.currentTrack.title}"* - _${state.currentTrack.artist}_`);
        }
        return;
      } else if (['prev track', 'prev song', 'previous track', 'previous song', 'prev lagu'].includes(lower)) {
        const state = sendPlaybackCommand(companyId, 'prev');
        if (state.currentTrack) {
          await ctx.reply(`⏮️ Returned to: *"${state.currentTrack.title}"* - _${state.currentTrack.artist}_`);
        }
        return;
      }

      // 🚀 DETECT AND AUTO-CLONE GITHUB REPOSITORY IF LINK PRESENT
      const detectedGit = extractGitHubUrl(text);
      let gitCloneNote = '';
      if (detectedGit) {
        try {
          await ctx.reply(
            `📦 *Detected GitHub Link:* \`${detectedGit.url}\`\n⏳ Cloning to workspace directory: \`~/.ceo-virtual/projects/${detectedGit.projectName}\`...`,
            { parse_mode: 'Markdown' }
          );
          await ctx.sendChatAction('typing');
          const cloneRes = await cloneGitRepository(detectedGit.url, detectedGit.projectName);

          if (cloneRes.success) {
            await ctx.reply(
              `✅ *GitHub Clone Successful!*\n\n📁 *Project:* \`${cloneRes.projectName}\`\n📂 *Path:* \`${cloneRes.folderPath}\`\n📄 *Total:* ${cloneRes.filesCount} files\n\nProject saved to CEO Virtual workspaces and ready for your team! 🚀`,
              { parse_mode: 'Markdown' }
            );

            appendCompanyChatMessage(companyId, {
              id: `tg-clone-${Date.now()}`,
              senderType: 'system',
              senderName: 'GitHub Sync [Telegram]',
              message: `📦 Cloned repository **${cloneRes.projectName}** from ${detectedGit.url} to workspaces (~/.ceo-virtual/projects/${cloneRes.projectName}) with ${cloneRes.filesCount} files.`,
              timestamp: Date.now(),
              source: 'telegram',
            });

            gitCloneNote = `\n[System Note: GitHub repository ${detectedGit.url} has been successfully cloned into workspace folder "~/.ceo-virtual/projects/${cloneRes.projectName}" with ${cloneRes.filesCount} files]`;
          } else {
            await ctx.reply(
              `❌ *Failed to Clone GitHub:*\n${cloneRes.error || cloneRes.message}`,
              { parse_mode: 'Markdown' }
            );
          }
        } catch (cloneErr: any) {
          console.error('[Telegram Git Clone Error]:', cloneErr);
        }
      }

      // Refresh current company profile, LLM configs, agents, and tasks fresh on every message!
      const currentCompany = getCompanyData(companyId);
      const currentAgents = getCompanyAgents(companyId);
      const currentTasks = getCompanyTasks(companyId);

      // Parse tags
      const lowerText = text.toLowerCase();
      const isAllTagged = lowerText.includes('@all') || lowerText.includes('@everyone');
      const taggedAgents: Agent[] = [];

      currentAgents.forEach((ag) => {
        const fullName = ag.name.toLowerCase();
        const firstName = ag.name.split(' ')[0].toLowerCase();
        if (
          isAllTagged ||
          lowerText.includes(`@${fullName}`) ||
          lowerText.includes(`@${firstName}`)
        ) {
          taggedAgents.push(ag);
        }
      });

      // Find company leader dynamically (NEVER hardcoded)
      const leader = getCompanyLeader(currentCompany);
      const effectiveUserPrompt = gitCloneNote ? `${text}${gitCloneNote}` : text;

      // 🚀 AUTONOMOUS TASK & TEAM DISCUSSION WORKFLOW
      if (isTaskOrProjectInstruction(text)) {
        try {
          await ctx.sendChatAction('typing');
        } catch {}

        const workflow = await executeAutonomousCompanyWorkflow(
          currentCompany,
          effectiveUserPrompt,
          taggedAgents.length > 0 ? taggedAgents[0] : leader
        );

        await ctx.reply(workflow.telegramMessage, { parse_mode: 'Markdown' });
        return;
      }

      // If no tag is used for normal conversation, default responder is the company leader
      const responders: Agent[] = taggedAgents.length > 0 ? taggedAgents : [leader];
      const isDefaultResponder = taggedAgents.length === 0;

      // Show typing indicator in Telegram
      try {
        await ctx.sendChatAction('typing');
      } catch {}

      // Generate responses for each tagged agent
      for (const responder of responders) {
        const replyText = await generateAgentAnswer(responder, effectiveUserPrompt, currentCompany, currentTasks);

        // Format labeled response
        let finalTelegramReply = formatAgentTelegramReply(responder, replyText);

        // If no tag was used, append a subtle helpful tip to teach user how to tag!
        if (isDefaultResponder) {
          finalTelegramReply += `\n\n💡 _Tip: You can tag specific agents (@${currentAgents.map(a => a.name.split(' ')[0]).join(', @')}, or @all)_`;
        }

        // Send to Telegram
        await ctx.reply(finalTelegramReply, { parse_mode: 'Markdown' });

        // Save agent reply to War Room history
        const agentChatMessage: OfficeGroupChatMessage = {
          id: `tg-reply-${Date.now()}-${responder.id}`,
          senderType: 'agent',
          agentId: responder.id,
          senderName: responder.name,
          senderRoleTitle: responder.roleTitle,
          senderAvatarColor: responder.avatarColor,
          message: replyText,
          timestamp: Date.now(),
          source: 'telegram',
        };
        appendCompanyChatMessage(companyId, agentChatMessage);
      }
    });

    // 🎙️ VOICE NOTE & AUDIO MESSAGE HANDLER
    bot.on(['voice', 'audio'], async (ctx) => {
      const voice = (ctx.message as any).voice || (ctx.message as any).audio;
      if (!voice) return;

      const senderFirstName = ctx.from?.first_name || 'Boss';
      const senderUsername = ctx.from?.username ? `@${ctx.from.username}` : '';
      const senderDisplayName = senderUsername ? `${senderFirstName} (${senderUsername})` : senderFirstName;

      // Update chatId if missing
      const currentChatId = String(ctx.chat.id);
      if (!config.chatId) {
        config.chatId = currentChatId;
        saveCompanyTelegramConfig(companyId, config);
      }

      try {
        await ctx.sendChatAction('record_voice');
      } catch {}

      // 1. Get file link from Telegram
      let fileLinkUrl = '';
      try {
        const link = await ctx.telegram.getFileLink(voice.file_id);
        fileLinkUrl = link.href;
      } catch (fErr) {
        console.warn('[Telegram Voice] Failed to get file link:', fErr);
      }

      // 2. Transcribe voice message
      const caption = (ctx.message as any).caption || '';
      const duration = voice.duration || 0;
      const transcription = await transcribeTelegramVoice(fileLinkUrl, duration, caption, companyId);
      const transcribedText = transcription.text;

      // Send immediate transcription acknowledgment to CEO
      const isRealStt = transcription.source === 'google_free' || transcription.source === 'whisper' || transcription.source === 'gemini' || transcription.source === 'caption';
      const statusIcon = isRealStt ? '⚡' : '🎙️';
      let engineBadge = '';
      if (transcription.source === 'google_free') engineBadge = ' _(Google Speech Recognition - Free)_';
      else if (transcription.source === 'whisper') engineBadge = ' _(Whisper Neural STT)_';
      else if (transcription.source === 'gemini') engineBadge = ' _(Gemini Multimodal STT)_';
      else if (transcription.source === 'caption') engineBadge = ' _(CEO Text Caption)_';

      const noteDisclaimer = !isRealStt
        ? `\n\n⚠️ _(Note: Audio could not be transcribed automatically. Using conversational fallback interpretation.)_`
        : '';
      await ctx.reply(
        `${statusIcon} *[CEO Voice Note Received]* (Duration: \`${duration} sec\`)\n\n` +
        `📝 *Transcription:* _"${transcribedText}"_${engineBadge}${noteDisclaimer}\n\n` +
        `⏳ _The office team is preparing their response and audio speech (Neural TTS)..._`,
        { parse_mode: 'Markdown' }
      );

      // Record in War Room chat history
      appendCompanyChatMessage(companyId, {
        id: `tg-voice-${Date.now()}`,
        senderType: 'user',
        senderName: `${senderDisplayName} [Voice Note]`,
        message: `🎙️ "${transcribedText}"`,
        timestamp: Date.now(),
        source: 'telegram',
        isVoiceNote: true,
        voiceDuration: duration,
      });

      // 3. Process instruction through autonomous multi-agent workflow
      const currentAgents = getCompanyAgents(companyId);
      const currentCompany = getCompanyData(companyId) || company;
      const currentTasks = getCompanyTasks(companyId);

      // Check if this sounds like a task / feature instruction
      const isTaskInstruction = isTaskOrProjectInstruction(transcribedText);
      const leader = getCompanyLeader(currentCompany);

      const lowerTrans = transcribedText.toLowerCase();
      const isAll = lowerTrans.includes('@all') || lowerTrans.includes('@everyone');
      const tagged = currentAgents.filter((ag) =>
        isAll || lowerTrans.includes(`@${ag.name.toLowerCase()}`) || lowerTrans.includes(`@${ag.name.split(' ')[0].toLowerCase()}`)
      );

      if (isTaskInstruction) {
        const workflowResult = await executeAutonomousCompanyWorkflow(
          currentCompany,
          transcribedText,
          tagged[0] || leader
        );

        // Send rich telegram reply with tasks
        await ctx.reply(workflowResult.telegramMessage, { parse_mode: 'Markdown' });

        // Synthesize voice reply from Leader
        try {
          await ctx.sendChatAction('record_voice');
          const voiceAudio = await synthesizeAgentVoice(workflowResult.leaderReply, {
            lang: 'en',
            agent: leader,
          });

          await ctx.replyWithVoice(
            { source: voiceAudio, filename: 'leader_reply.mp3' },
            {
              caption: `🎙️ *Voice Note from ${leader.name}* (${leader.roleTitle})`,
              parse_mode: 'Markdown',
            }
          );
        } catch (vErr) {
          console.warn('[Telegram Voice] Failed to send voice reply:', vErr);
        }
      } else {
        const primaryResponder = tagged[0] || leader;

        try {
          await ctx.sendChatAction('typing');
        } catch {}

        const replyText = await generateAgentAnswer(
          primaryResponder,
          transcribedText,
          currentCompany,
          currentTasks
        );

        const formattedText = formatAgentTelegramReply(primaryResponder, replyText);
        await ctx.reply(formattedText, { parse_mode: 'Markdown' });

        // Record agent reply in War Room chat
        appendCompanyChatMessage(companyId, {
          id: `tg-reply-voice-${Date.now()}-${primaryResponder.id}`,
          senderType: 'agent',
          agentId: primaryResponder.id,
          senderName: primaryResponder.name,
          senderRoleTitle: primaryResponder.roleTitle,
          senderAvatarColor: primaryResponder.avatarColor,
          message: replyText,
          timestamp: Date.now(),
          source: 'telegram',
          isVoiceNote: true,
        });

        // Synthesize agent voice reply and send back to Telegram!
        try {
          await ctx.sendChatAction('record_voice');
          const voiceAudio = await synthesizeAgentVoice(replyText, {
            lang: 'en',
            agent: primaryResponder,
          });

          await ctx.replyWithVoice(
            { source: voiceAudio, filename: 'agent_reply.mp3' },
            {
              caption: `🎙️ *Voice Note from ${primaryResponder.name}* (_${primaryResponder.roleTitle}_)`,
              parse_mode: 'Markdown',
            }
          );
        } catch (vErr) {
          console.warn('[Telegram Voice] Failed to send voice reply:', vErr);
        }
      }
    });

    // Start bot with error trap
    bot.catch((err, ctx) => {
      console.error(`[Telegram Error for ${companyId} / update ${ctx.update.update_id}]:`, err);
    });

    // Non-blocking launch
    bot.launch({ dropPendingUpdates: true }).catch((launchErr) => {
      console.error(`[Telegram Launch Failed for ${companyId}]:`, launchErr);
    });

    const runnerInstance: BotRunnerInstance = {
      companyId,
      bot,
      config,
      botInfo: {
        id: me.id,
        username: me.username || '',
        firstName: me.first_name || '',
      },
      isRunning: true,
      startedAt: Date.now(),
      stop: async () => {
        try {
          bot.stop('Company bot stopped by user or system');
        } catch (e) {
          console.warn(`[Telegram] Bot stop warning for ${companyId}:`, e);
        }
      },
    };

    runners.set(companyId, runnerInstance);

    // 📢 Send auto-ready notification to Telegram chat if configured
    if (sendReadyNotification && config.chatId) {
      try {
        const leader = getCompanyLeader(company);
        const timeDetail = getAgentCurrentTime(leader.timezone || 'Asia/Jakarta');

        const agentRosterLines = agents.map((a) => {
          const aTime = getAgentCurrentTime(a.timezone || 'Asia/Jakarta');
          const emoji = getAgentRoleEmoji(a);
          return `• ${emoji} *${a.name}* (_${a.roleTitle}_)\n  ↳ 🕒 \`${aTime.timeString}\` (${aTime.timezone}) | ${a.state === 'working' ? '⚡ Working' : '☕ Standby'}`;
        }).join('\n');

        const readyNotification = `🚀 *[CEO VIRTUAL — OFFICE SYSTEM ACTIVE & READY]* 🏢

Hello Boss! The autonomous office system for *${company.name}* is fully initialized and operational!

🟢 *System Status:* ACTIVE & READY
⏰ *Server Time:* ${timeDetail.fullFormatted}
🆔 *Connected Chat ID:* \`${config.chatId}\`

👥 *Online Team Roster (${agents.length} Agents):*
${agentRosterLines}

🎵 *SoundSystem & Winamp:* Online (YouTube Music)
📋 *Kanban Tasks:* ${tasks.length} active sprint tickets
💬 *War Room Sync:* Connected bi-directionally to your browser dashboard

💡 *Quick Commands:*
• Tag agents for instructions: \`@${agents[0]?.name.split(' ')[0] || 'Kenji'}\` or \`@all\`
• Stream office music: \`/play <song title>\`
• Create instant playlist: \`/playlist <mood>\`
• Check team timezones: \`/time\`
• Full command documentation: \`/help\``;

        await bot.telegram.sendMessage(config.chatId, readyNotification, { parse_mode: 'Markdown' });

        appendCompanyChatMessage(companyId, {
          id: `tg-ready-${Date.now()}`,
          senderType: 'system',
          senderName: 'Vigent System Orchestrator',
          message: `🚀 **Office System Ready**: Telegram bot @${me.username} auto-connected and sent active status notification to Telegram chat (\`${config.chatId}\`).`,
          timestamp: Date.now(),
          source: 'telegram',
        });
      } catch (notifyErr: any) {
        console.warn(`[Telegram Ready Notification Error for ${companyId}]:`, notifyErr?.message || notifyErr);
      }
    }

    return {
      success: true,
      message: `Bot @${me.username} successfully connected for ${company.name}!`,
      botInfo: runnerInstance.botInfo,
    };
  } catch (err: any) {
    console.error(`[Telegram] Failed to start bot for ${companyId}:`, err);
    return {
      success: false,
      message: err.message || 'Failed to start Telegram bot. Please check your token.',
    };
  }
}

/**
 * Automatically scan and connect all configured Telegram bots on system boot / ready.
 */
export async function autoStartAllConfiguredBots(): Promise<void> {
  try {
    const vigentDir = getVigentDir();
    if (!fs.existsSync(vigentDir)) return;

    const files = fs.readdirSync(vigentDir);
    const telegramConfigFiles = files.filter(
      (f) => f.startsWith('telegram_') && f.endsWith('.json')
    );

    console.log(`🤖 [Telegram Daemon]: Scanning ${telegramConfigFiles.length} configured bots...`);

    for (const file of telegramConfigFiles) {
      try {
        const companyId = file.replace(/^telegram_/, '').replace(/\.json$/, '');
        const configPath = path.join(vigentDir, file);
        const config: TelegramConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

        if (config.botToken && config.isEnabled !== false) {
          console.log(`🤖 [Telegram Daemon]: Auto-connecting bot for company ${companyId}...`);
          const res = await startCompanyTelegramBot(companyId, config, true);
          if (res.success) {
            console.log(`✅ [Telegram Daemon]: Bot connected & ready notification sent for ${companyId}!`);
          } else {
            console.warn(`⚠️ [Telegram Daemon]: Could not start bot for ${companyId}:`, res.message);
          }
        }
      } catch (botErr) {
        console.error(`[Telegram Daemon]: Error processing ${file}:`, botErr);
      }
    }
  } catch (err) {
    console.error('[Telegram Daemon]: autoStartAllConfiguredBots error:', err);
  }
}

/**
 * Stop isolated Telegraf bot for a specific company
 */
export async function stopCompanyTelegramBot(companyId: string): Promise<{ success: boolean; message: string }> {
  const runners = getGlobalRunners();
  const runner = runners.get(companyId);

  if (!runner) {
    // Also mark config disabled
    const config = getCompanyTelegramConfig(companyId);
    if (config) {
      config.isEnabled = false;
      saveCompanyTelegramConfig(companyId, config);
    }
    return { success: true, message: 'Bot sudah dalam keadaan mati.' };
  }

  try {
    await runner.stop();
    runners.delete(companyId);

    const config = getCompanyTelegramConfig(companyId);
    if (config) {
      config.isEnabled = false;
      saveCompanyTelegramConfig(companyId, config);
    }

    return { success: true, message: 'Telegram bot has been stopped.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to stop Telegram bot.' };
  }
}

/**
 * Get status of Telegram bot for a company
 */
export function getCompanyTelegramStatus(companyId: string): {
  isRunning: boolean;
  config: TelegramConfig | null;
  botInfo?: { id: number; username: string; firstName: string };
  startedAt?: number;
} {
  const runners = getGlobalRunners();
  const runner = runners.get(companyId);
  const config = getCompanyTelegramConfig(companyId);

  return {
    isRunning: runner ? runner.isRunning : false,
    config,
    botInfo: runner ? runner.botInfo : config?.botUsername ? { id: 0, username: config.botUsername, firstName: config.botFirstName || '' } : undefined,
    startedAt: runner?.startedAt,
  };
}

/**
 * Broadcast message from Web War Room to the company's Telegram chat
 */
export async function broadcastWarRoomMessageToTelegram(
  companyId: string,
  message: OfficeGroupChatMessage
): Promise<boolean> {
  const runners = getGlobalRunners();
  const runner = runners.get(companyId);
  const config = runner?.config || getCompanyTelegramConfig(companyId);

  if (!config || !config.botToken || !config.chatId || !config.autoSyncWarRoom) {
    return false;
  }

  try {
    const bot = runner?.bot || new Telegraf(config.botToken);
    let formattedText = '';

    if (message.senderType === 'user') {
      formattedText = `💬 *[Web War Room - ${message.senderName}]*\n${message.message}`;
    } else if (message.senderType === 'agent') {
      const emoji = message.senderRoleTitle?.includes('Design') ? '🎨' : message.senderRoleTitle?.includes('QA') ? '🛡️' : '🧑‍💻';
      formattedText = `${emoji} *[${message.senderName} - ${message.senderRoleTitle || 'Agent'}]*\n${message.message}`;
    } else {
      formattedText = `🔔 *[War Room System]*\n${message.message}`;
    }

    await bot.telegram.sendMessage(config.chatId, formattedText, { parse_mode: 'Markdown' });
    return true;
  } catch (err) {
    console.warn(`[Telegram] Failed to mirror message to Telegram for ${companyId}:`, err);
    return false;
  }
}

export interface SprintProgressReportPayload {
  companyId: string;
  senderAgentId: string;
  senderName: string;
  senderRoleTitle: string;
  senderAvatarColor?: string;
  reportType: 'leader_standup' | 'member_progress' | 'task_completed';
  taskTitle: string;
  progressPercent: number;
  message: string;
}

/**
 * Dispatch autonomous sprint reports:
 * If Telegram bot is active, sends to Telegram group & logs to War Room.
 * If Telegram bot is not active, logs directly to War Room group chat.
 */
export async function sendSprintProgressReport(
  payload: SprintProgressReportPayload
): Promise<{ success: boolean; sentToTelegram: boolean; savedToWarRoom: boolean }> {
  const {
    companyId,
    senderAgentId,
    senderName,
    senderRoleTitle,
    senderAvatarColor,
    reportType,
    taskTitle,
    progressPercent,
    message,
  } = payload;

  const roleLower = (senderRoleTitle || '').toLowerCase();
  const roleEmoji =
    roleLower.includes('founder') || roleLower.includes('ceo')
      ? '👑'
      : roleLower.includes('design') || roleLower.includes('ui') || roleLower.includes('creative')
      ? '🎨'
      : roleLower.includes('qa') || roleLower.includes('test')
      ? '🛡️'
      : roleLower.includes('architect') || roleLower.includes('engineer') || roleLower.includes('dev')
      ? '🧑‍💻'
      : '💼';

  const reportBadge =
    reportType === 'leader_standup'
      ? '📢 [STANDUP SPRINT REPORT]'
      : reportType === 'task_completed'
      ? '✅ [SPRINT TICKET COMPLETED 100%]'
      : `🚀 [SPRINT PROGRESS UPDATE (${Math.round(progressPercent)}%)]`;

  // 1. Format clean text for War Room chat history
  const warRoomMessage: OfficeGroupChatMessage = {
    id: `report-${Date.now()}-${senderAgentId}-${Math.random().toString(36).slice(2, 5)}`,
    senderType: 'agent',
    agentId: senderAgentId,
    senderName,
    senderRoleTitle,
    senderAvatarColor: senderAvatarColor || '#6366f1',
    message: `${reportBadge}\n${message}\n\n📌 *Ticket:* "${taskTitle}" (${Math.round(progressPercent)}%)`,
    timestamp: Date.now(),
    source: 'report',
  };

  // Always save to War Room chat history so it shows up in dashboard
  appendCompanyChatMessage(companyId, warRoomMessage);

  // 2. Dispatch to Telegram if bot is configured & running
  let sentToTelegram = false;
  const runners = getGlobalRunners();
  const runner = runners.get(companyId);
  const config = runner?.config || getCompanyTelegramConfig(companyId);

  if (config && config.botToken && config.chatId && (runner?.isRunning || config.isEnabled)) {
    try {
      const bot = runner?.bot || new Telegraf(config.botToken);
      const company = getCompanyData(companyId);

      const tgText = `${roleEmoji} *[${senderName} - ${senderRoleTitle}]*
${reportBadge}

${message}

• *Ticket:* \`${taskTitle}\`
• *Progress:* 🚀 \`${Math.round(progressPercent)}%\`
• *Office:* *${company.name}*`;

      await bot.telegram.sendMessage(config.chatId, tgText, { parse_mode: 'Markdown' });
      sentToTelegram = true;
    } catch (err) {
      console.warn(`[Telegram Sprint Report Error for ${companyId}]:`, err);
    }
  }

  return {
    success: true,
    sentToTelegram,
    savedToWarRoom: true,
  };
}
