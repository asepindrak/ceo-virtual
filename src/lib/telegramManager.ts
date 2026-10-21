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
      const prompt = `Anda adalah AI Orchestrator untuk kantor otonom CEO Virtual.
Perusahaan: "${company.name}" (Industri: ${company.industry || 'Digital & Software'}).
Leader Tim: ${leader.name} (${leader.roleTitle}).
Roster Tim:
${rosterList}

Pesan Arahan dari Boss di Telegram:
"${userInstruction}"

TUGAS ANDA:
1. Leader (${leader.name}) merespons langsung Boss (1-3 kalimat ramah, profesional, memaparkan pembagian tugas sprint kepada anggota tim).
2. Tentukan pembagian tiket sprint (tasks) untuk MASING-MASING anggota tim yang relevan (minimal 2 task terpisah: 1 untuk divisi frontend/desain/UI, 1 untuk divisi backend/arsitektur/data layer). Setiap anggota tim yang ditugaskan dalam diskusi HARUS mendapatkan tiket sprint spesifik sesuai keahliannya.
   - Contoh task untuk ${designer.name} (${designer.roleTitle}): Tata letak UI/UX, styling, animasi/micro-interactions, komponen visual.
   - Contoh task untuk ${engineer.name} (${engineer.roleTitle}): Fondasi arsitektur kode, data fetching, struktur modular, konfigurasi service/API.
3. Buat 3 dialog diskusi inter-agent di War Room kantor:
   - Pesan 1: ${leader.name} memberikan briefing arahan ke tim di War Room kantor dan membagikan tugas (@${designer.name.split(' ')[0]} dan @${engineer.name.split(' ')[0]}).
   - Pesan 2: Respon dari ${designer.name} menerima tugasnya dan menjelaskan detail implementasi visual.
   - Pesan 3: Respon dari ${engineer.name} menerima tugasnya dan menjelaskan detail arsitektur teknis.

Output HARUS HANYA format JSON valid tanpa tanda markdown:
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
      const match = userInstruction.match(/(?:bikin|buat|create|implementasi|tambahkan)\s+([^?.!]+)/i);
      if (match && match[1]) {
        topic = match[1].trim().slice(0, 35);
      }
    }

    const leaderFirst = leader.name.split(' ')[0];
    leaderReply = `Baik Boss, arahan untuk membuat "${topic}" dengan teknologi modern telah saya terima. Tiket sprint resmi telah saya bagi dan terbitkan di Kanban, tim langsung saya kumpulkan di War Room untuk eksekusi terdistribusi!`;

    parsedDiscussions = [
      {
        agentName: leader.name,
        message: `Halo tim @${designer.name.split(' ')[0]} @${engineer.name.split(' ')[0]}, Boss mengarahkan kita membangun ${topic}. @${designer.name.split(' ')[0]} kamu pimpin eksekusi frontend & UI/UX, dan @${engineer.name.split(' ')[0]} siapkan fondasi arsitektur data & komponen modular!`,
      },
      {
        agentName: designer.name,
        message: `Siap @${leaderFirst}! Untuk ${topic}, saya rancang visual sleek cybernetic dengan clean typography, dark obsidian theme, dan micro-interactions halus di mobile & desktop.`,
      },
      {
        agentName: engineer.name,
        message: `Sepakat! Dari sisi arsitektur kita siapkan struktur komponen modular berbasis React/Next.js dengan data-driven config JSON untuk daftar tautan, sub-second build, dan clean code siap deploy!`,
      },
    ];

    rawTasks = [
      {
        title: `[Frontend] ${topic} - UI, Layout & Micro-interactions`,
        description: `Rancang visual modern, responsif mobile-first, dark mode, dan micro-interactions halus untuk ${topic}.`,
        type: 'design',
        assignedAgentName: designer.name,
      },
      {
        title: `[Backend/Arch] ${topic} - Fondasi Arsitektur & Modular Data`,
        description: `Siapkan arsitektur komponen modular, data-driven config JSON, dan integrasi service untuk ${topic}.`,
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
          content: `# ${taskDef.title}\n\n**Perusahaan:** ${company.name}\n**Leader:** ${leader.name} (${leader.roleTitle})\n**Pelaksana:** ${assignedAgent.name} (${assignedAgent.roleTitle})\n**Status:** In Progress (15%)\n\n## Deskripsi Tugas\n${taskDef.description}\n\n## Kesepakatan Tim War Room\n- Stack: Modern Fullstack (React 18 / Vite / Next.js / Tailwind CSS)\n- Tim Diskusi: ${leader.name}, ${designer.name}, ${engineer.name}\n- Status Workspace: Aktif`,
        },
      ],
      logs: [
        `Instruksi diterima dari Boss via Telegram pada ${new Date().toLocaleTimeString('id-ID')}.`,
        `Tiket sprint otomatis diterbitkan oleh ${leader.name} dan ditugaskan ke ${assignedAgent.name}.`,
        `Diskusi kolaborasi tim berlangsung di War Room kantor ${company.name}.`,
      ],
      createdAt: Date.now() + idx * 50,
    };

    // 4. Save to company's tasks
    addCompanyTask(company.id, newTicket);
    createdTickets.push(newTicket);

    // Auto-scaffold real code and artifact deliverables in ~/.vigent/projects & ~/.vigent/artifacts
    try {
      const safeProject = (newTicket.projectName || newTicket.title || 'task-generated-project')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .slice(0, 32);

      createProjectDirectory(safeProject);
      const summaryMd = `# ${newTicket.title}\n\n> 🤖 Dikerjakan secara otomatis oleh Agent: **${assignedAgent.name} (${assignedAgent.roleTitle})**\n> 🏢 Perusahaan: **${company.name}**\n> 📁 Proyek: \`${safeProject}\`\n> ⏰ Waktu Eksekusi: ${new Date().toLocaleString()}\n\n## Deskripsi Task\n${newTicket.description}\n\n## Rekomendasi Tim War Room\n${parsedDiscussions.map((d) => `- **${d.agentName}:** ${d.message}`).join('\n')}\n`;
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
    { id: 1, title: '🌐 Official Studio Website', url: 'https://shadowmove.agency' },
    { id: 2, title: '💼 Portfolio & Client Case Studies', url: 'https://shadowmove.agency/work' },
    { id: 3, title: '💬 Schedule a War Room Call', url: 'https://t.me/ShadowMoveBot' },
    { id: 4, title: '🐙 GitHub Open Source Repositories', url: 'https://github.com/vigent-team' },
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-3xl font-black mb-4 shadow-lg shadow-cyan-500/20">
          SM
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">${company.name}</h1>
        <p className="text-sm text-cyan-400 font-medium mb-6">Autonomous Cybernetic Studio</p>

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

📋 *[TIKET SPRINT KANBAN DIBAGIKAN (${createdTickets.length} TASK)]*
${ticketSnippets}
• *Perusahaan:* *${company.name}*

💬 *[DISKUSI WAR ROOM KANTOR ${company.name.toUpperCase()}]*
${discussionSnippets}

_💡 Tim kantor ${company.name} telah mencatat seluruh tiket ini di Kanban dan masing-masing anggota tim langsung mengeksekusinya di workspace!_`;

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
      return { success: false, error: 'Format Bot Token tidak valid (contoh: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)' };
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
      error: err.message || 'Gagal menghubungi Telegram Bot API. Periksa kembali token Anda.',
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
  const activeProject = currentTask?.projectName || 'ShadowMove Platform';

  // Try calling real LLM using effective config (inherited company global or manual BYOK)
  const effectiveConfig = getEffectiveAgentLLMConfig(agent, freshCompany);
  if (effectiveConfig?.apiKey) {
    try {
      let memorySnippet = '';
      try {
        const { searchCompanyMemories } = await import('./memoryManager');
        const relevantMemories = await searchCompanyMemories(freshCompany.id, userMessage, 2);
        if (relevantMemories.length > 0) {
          memorySnippet = `\nMemori Pengalaman Kantor Relevan:\n` + relevantMemories.map(m => `- [${m.memory.type}] ${m.memory.title}: ${m.memory.content}`).join('\n');
        }
      } catch {}

      const timeDetail = getAgentCurrentTime(agent.timezone || 'Asia/Jakarta');

      const prompt = `Anda adalah ${agent.name}, memegang posisi "${agent.roleTitle}" di perusahaan ${freshCompany.name}.
Karakteristik MBTI: ${agent.personality?.mbti || 'INTJ'}, gaya bicara: ${agent.personality?.speakingStyle || 'Profesional, ramah, to the point'}.
Zona Waktu Anda: ${timeDetail.timezone} (Waktu Lokal Saat Ini: ${timeDetail.timeString} WIB/Lokal, ${timeDetail.dateString}, ${timeDetail.dayPeriod}).
Project aktif: ${activeProject}.
Tugas Anda saat ini: "${currentTask?.title || 'Pengembangan fitur utama'}" (Status: ${currentTask?.status || 'in_progress'}).${memorySnippet}
Pesan dari Boss di Telegram: "${userMessage}".

Instruksi:
- Jawablah secara natural, ramah, dan profesional sesuai peran Anda.
- Kesadaran Waktu: Anda sadar penuh jam berapa sekarang di zona waktu Anda (${timeDetail.timeString} - ${timeDetail.dayPeriod}). Jika Boss bertanya jam berapa sekarang atau menyapa waktu, sebutkan waktu lokal Anda secara presisi.
- Jika Boss menyapa atau bertanya sedang apa (misal: "lagi pada ngapain", "halo", "apa kabar"), jawab secara santai tapi profesional mengenai apa yang sedang Anda kerjakan di kantor ${freshCompany.name}.
- Jika Boss memanggil nama Anda, jawab bahwa Anda hadir dan siap menerima arahan.
- Gunakan Bahasa Indonesia yang luwes (1-3 kalimat).`;

      const response = await callLLMProvider(effectiveConfig, [
        { role: 'user', content: prompt }
      ]);
      if (response && response.content) {
        return response.content.trim();
      }
    } catch (err: any) {
      console.error(`[Telegram LLM Error for ${agent.name}]:`, err);
      const errMsg = err?.message || 'Gagal memanggil model AI';
      return `Halo Boss! Saya ${agent.name} (${agent.roleTitle}).\n\nPesan Anda: "${userMessage}"\n\n⚠️ *Gagal menghubungi LLM [${effectiveConfig.provider} - ${effectiveConfig.model}]:*\n\`${errMsg}\`\n\nMohon periksa status koneksi / endpoint LLM di menu Global LLM dashboard CEO Virtual.`;
    }
  }

  // If no API Key configured for this company/agent:
  return `Halo Boss! Saya ${agent.name} (${agent.roleTitle}).\n\nPesan Anda: "${userMessage}" telah saya terima. Namun API Key LLM untuk kantor "${freshCompany.name}" belum terkonfigurasi pada backend.\n\nSilakan buka menu **Global LLM** di dashboard CEO Virtual, masukkan API Key / Base URL, lalu klik **Simpan Semua Pengaturan LLM Global** agar saya dapat merespons pesan Boss secara cerdas menggunakan AI.`;
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
Selamat datang di bot kantor otonom CEO Virtual!

🆔 *Chat ID Anda:* \`${chatId}\`
_(Gunakan Chat ID ini pada pengaturan kantor jika belum tersimpan)_

👥 *Daftar Karyawan yang Bisa Anda Tag:*
${teamList}
• 📢 *Seluruh Tim:* (\`@all\`)

💬 *Cara Menggunakan:*
Ketik pesan dan sertakan tag nama karyawan seperti:
👉 \`@Kenji bagaimana progres landing page hari ini?\`
👉 \`@Rei tolong cek warna aksen button hero\`
👉 \`@all evaluasi sprint segera dimulai\`

Setiap karyawan yang Anda tag akan langsung membalas dengan label identitas mereka masing-masing! 🚀`;

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
        `🆔 *Chat ID Anda saat ini:* \`${chatId}\`\nStatus: Terhubung dengan kantor *${company.name}*.`,
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
        `👥 *Daftar Tim Karyawan ${company.name}:*\n\n${list}\n\n💡 *Tip:* Tag mereka langsung di pesan, contoh: \`@${agents[0].name.split(' ')[0]} tolong cek tugas\`.`,
        { parse_mode: 'Markdown' }
      );
    });

    // Command: /tasks
    bot.command('tasks', async (ctx) => {
      tasks = getCompanyTasks(companyId);
      if (!tasks || tasks.length === 0) {
        await ctx.reply('📋 Belum ada task yang tercatat di Kanban saat ini.');
        return;
      }

      const taskLines = tasks.map((t) => {
        const icon = t.status === 'done' ? '✅' : t.status === 'in_progress' ? '⚡' : '📌';
        return `${icon} *${t.title}* [${Math.round(t.progress || 0)}%]\n   _Status:_ ${t.status.toUpperCase()} | _Project:_ ${t.projectName || 'General'}`;
      }).join('\n\n');

      await ctx.reply(
        `📋 *Status Sprint & Task ${company.name}:*\n\n${taskLines}`,
        { parse_mode: 'Markdown' }
      );
    });

    // Command: /standup - Mulai Rapat Daily Standup di Ruang Rapat
    bot.command('standup', async (ctx) => {
      try {
        const { prepareStandupMeeting, advanceStandupSpeaker, finishStandupMeeting, getStandupState } = await import('./standupManager');
        const currentStandup = getStandupState(companyId);

        if (currentStandup.status === 'in_progress' || currentStandup.status === 'gathering') {
          await ctx.reply(
            '⏳ *Daily Standup sedang berjalan di kantor!* Tim sedang berdiskusi di meja bundar, ringkasan akan segera dikirimkan ke sini.',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        await ctx.reply(
          `📅 *MEMULAI DAILY STANDUP TIM ${company.name.toUpperCase()}...*\n\n👥 Seluruh tim karyawan sedang berkumpul di Ruang Rapat meja bundar (Conference Table).\nSetiap anggota tim akan menyampaikan update progres harian mereka secara bergiliran.\n\nNotulensi eksekutif akan dikirimkan otomatis ke sini setelah rapat selesai! 🚀`,
          { parse_mode: 'Markdown' }
        );

        // Start Standup Session
        const standupState = await prepareStandupMeeting(companyId, 'telegram');

        // Asynchronously advance speakers and dispatch final summary to Telegram
        (async () => {
          try {
            // Wait 4 seconds for agents to gather at the table
            await new Promise((r) => setTimeout(r, 4000));

            for (let i = 0; i < standupState.speeches.length; i++) {
              await advanceStandupSpeaker(companyId);
              // Brief pause between speaker turns
              await new Promise((r) => setTimeout(r, 4500));
            }

            // Finish meeting and dispatch final report to Telegram
            await finishStandupMeeting(companyId);
          } catch (sErr) {
            console.error('[Telegram Standup Execution Error]:', sErr);
          }
        })();
      } catch (err: any) {
        console.error('[Telegram /standup error]:', err);
        await ctx.reply(`❌ Gagal memulai standup: ${err.message || 'Unknown error'}`);
      }
    });

    // Command: /clone
    bot.command('clone', async (ctx) => {
      const parts = ctx.message.text.trim().split(/\s+/);
      const repoUrl = parts[1];
      if (!repoUrl) {
        await ctx.reply(
          '⚠️ Harap sertakan link repository GitHub.\nContoh: `/clone https://github.com/facebook/react`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const extracted = extractGitHubUrl(repoUrl);
      if (!extracted) {
        await ctx.reply(
          '⚠️ URL GitHub tidak valid. Contoh format: `https://github.com/owner/repository`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      await ctx.reply(
        `📦 *Mempersiapkan Clone GitHub...*\nURL: \`${extracted.url}\`\nTarget Workspace: \`~/.vigent/workspaces/${extracted.projectName}\``,
        { parse_mode: 'Markdown' }
      );

      try {
        await ctx.sendChatAction('typing');
      } catch {}

      const res = await cloneGitRepository(extracted.url, extracted.projectName);
      if (res.success) {
        await ctx.reply(
          `✅ *Clone Repository Berhasil!*\n\n📁 *Proyek:* \`${res.projectName}\`\n📂 *Lokasi:* \`${res.folderPath}\`\n📄 *Total:* ${res.filesCount} file\n\nProyek langsung tersimpan di workspaces CEO Virtual dan siap dikerjakan oleh tim agen! 🚀`,
          { parse_mode: 'Markdown' }
        );

        appendCompanyChatMessage(companyId, {
          id: `tg-clone-${Date.now()}`,
          senderType: 'system',
          senderName: 'GitHub Sync [Telegram]',
          message: `📦 Berhasil clone repository **${res.projectName}** dari ${extracted.url} ke folder workspaces (~/.vigent/workspaces/${res.projectName}) dengan ${res.filesCount} file.`,
          timestamp: Date.now(),
          source: 'telegram',
        });
      } else {
        await ctx.reply(`❌ *Gagal Clone Repository:*\n${res.error || res.message}`, { parse_mode: 'Markdown' });
      }
    });

    // Command: /standup - Mulai Daily Standup di Ruang Rapat
    bot.command('standup', async (ctx) => {
      const { prepareStandupMeeting, advanceStandupSpeaker, finishStandupMeeting, getStandupState } = await import('./standupManager');
      const currentStandup = getStandupState(companyId);

      if (currentStandup.status === 'in_progress' || currentStandup.status === 'gathering') {
        await ctx.reply(
          '⏳ *Daily Standup sedang berjalan di kantor!* Tim sedang berdiskusi di meja bundar, ringkasan akan segera dikirimkan ke sini.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      await ctx.reply(
        `📅 *MEMULAI DAILY STANDUP TIM ${company.name.toUpperCase()}...*\n\n👥 Seluruh tim karyawan sedang berkumpul di Ruang Rapat (Meja Bundar).\nSetiap anggota tim akan menyampaikan update progres harian (Yesterday, Today, Blockers) secara bergiliran.\n\nNotulensi eksekutif akan dikirimkan otomatis ke sini setelah rapat selesai! 🚀`,
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
    });

    // Command: /time - Waktu live masing-masing agent sesuai timezone
    bot.command('time', async (ctx) => {
      const currentAgents = getCompanyAgents(companyId);
      const timeLines = currentAgents.map((a) => {
        const timeInfo = getAgentCurrentTime(a.timezone || 'Asia/Jakarta');
        const emoji = getAgentRoleEmoji(a);
        return `• ${emoji} *${a.name}* (_${a.roleTitle}_):\n   🕒 \`${timeInfo.timeString}\` • _${timeInfo.dayPeriod}_ (${timeInfo.timezone})`;
      }).join('\n\n');

      await ctx.reply(
        `🌍 *WAKTU LOKAL TIM KARYAWAN ${company.name.toUpperCase()}*\n\n${timeLines}\n\n💡 _Semua agent mengetahui jam berapa sekarang di zona waktunya masing-masing saat diajak berbicara!_`,
        { parse_mode: 'Markdown' }
      );
    });

    // 🎵 Music Remote Control Commands
    bot.command('play', async (ctx) => {
      const query = ctx.message.text.replace(/^\/play(@\w+)?\s*/i, '').trim();
      if (!query) {
        const state = sendPlaybackCommand(companyId, 'play');
        if (state.currentTrack) {
          await ctx.reply(`▶️ Memutar kembali musik di kantor: *"${state.currentTrack.title}"* - _${state.currentTrack.artist}_`, { parse_mode: 'Markdown' });
        } else {
          await ctx.reply('⚠️ Harap masukkan judul lagu atau nama artis.\nContoh: `/play LANY Malibu Nights` atau `/play lofi hip hop`', { parse_mode: 'Markdown' });
        }
        return;
      }

      await ctx.reply(`🔍 Mencari dan memutar *"${query}"* di sound system kantor via YouTube Music...`, { parse_mode: 'Markdown' });
      const senderName = ctx.from?.first_name || 'Boss (Telegram)';
      const res = await playSingleTrack(companyId, query, senderName);

      if (res.track) {
        const chatMsg: OfficeGroupChatMessage = {
          id: `music-msg-${Date.now()}`,
          senderType: 'system',
          senderName: 'Office SoundSystem 🎵',
          message: `🎶 *[Telegram Remote]* Memutar lagu: **"${res.track.title}"** oleh **${res.track.artist}** (Durasi: ${res.track.durationText}) atas permintaan ${senderName}.`,
          timestamp: Date.now(),
          source: 'telegram',
        };
        appendCompanyChatMessage(companyId, chatMsg);

        await ctx.reply(
          `▶️ *LANGSUNG DIPUTAR DI KANTOR:*\n\n` +
          `📻 *${res.track.title}*\n` +
          `🎤 *Artis:* ${res.track.artist}\n` +
          `⏱️ *Durasi:* ${res.track.durationText}\n` +
          `👤 *Request:* ${senderName}\n\n` +
          `_Lagu langsung diputar di browser kantor pada pemutar Winamp floating player!_ 🚀\n` +
          `💡 _Gunakan \`/add <judul>\` jika hanya ingin menambahkan ke antrean tanpa memotong lagu yang sedang berputar._`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(`❌ ${res.error || 'Lagu tidak ditemukan.'}`);
      }
    });

    bot.command('playlist', async (ctx) => {
      const query = ctx.message.text.replace(/^\/playlist(@\w+)?\s*/i, '').trim();
      if (!query) {
        await ctx.reply('⚠️ Masukkan tema atau genre playlist.\nContoh: `/playlist synthwave retro` atau `/playlist lofi chill study`', { parse_mode: 'Markdown' });
        return;
      }

      await ctx.reply(`📻 Meracik playlist *"${query}"* dari YouTube Music untuk kantor...`, { parse_mode: 'Markdown' });
      const senderName = ctx.from?.first_name || 'Boss (Telegram)';
      const res = await createPlaylist(companyId, query, senderName);

      if (res.tracks.length > 0) {
        const listText = res.tracks.map((t, idx) => `${idx + 1}. *${t.title}* - _${t.artist}_ (${t.durationText})`).join('\n');
        await ctx.reply(
          `🎶 *PLAYLIST KANTOR BERHASIL DIBUAT (${res.tracks.length} LAGU):*\n\n${listText}\n\n▶️ _Lagu pertama langsung diputar di browser kantor!_`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(`❌ ${res.error || 'Gagal membuat playlist.'}`);
      }
    });

    bot.command('pause', async (ctx) => {
      const state = sendPlaybackCommand(companyId, 'pause');
      await ctx.reply(`⏸️ Musik kantor dijeda (paused). Lagu saat ini: *"${state.currentTrack?.title || 'None'}"*`, { parse_mode: 'Markdown' });
    });

    bot.command('resume', async (ctx) => {
      const state = sendPlaybackCommand(companyId, 'play');
      await ctx.reply(`▶️ Melanjutkan pemutaran musik kantor: *"${state.currentTrack?.title || 'None'}"*`, { parse_mode: 'Markdown' });
    });

    bot.command('stop', async (ctx) => {
      sendPlaybackCommand(companyId, 'stop');
      await ctx.reply('⏹️ Musik kantor dihentikan.', { parse_mode: 'Markdown' });
    });

    const handleNextTrack = async (ctx: any) => {
      const state = sendPlaybackCommand(companyId, 'next');
      if (state.currentTrack) {
        await ctx.reply(`⏭️ Skip ke lagu berikutnya: *"${state.currentTrack.title}"* - _${state.currentTrack.artist}_`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply('⏭️ Playlist kosong.');
      }
    };
    bot.command('next', handleNextTrack);
    bot.command('skip', handleNextTrack);

    bot.command('prev', async (ctx) => {
      const state = sendPlaybackCommand(companyId, 'prev');
      if (state.currentTrack) {
        await ctx.reply(`⏮️ Memutar lagu sebelumnya: *"${state.currentTrack.title}"* - _${state.currentTrack.artist}_`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply('⏮️ Playlist kosong.');
      }
    });

    const handleNowPlaying = async (ctx: any) => {
      const state = getOfficeMusicState(companyId);
      if (!state.currentTrack) {
        await ctx.reply('🔇 Belum ada lagu yang diputar di kantor saat ini. Gunakan `/play <judul>` untuk memutar lagu!');
        return;
      }
      const statusIcon = state.isPlaying ? '▶️' : '⏸️';
      await ctx.reply(
        `📻 *NOW PLAYING DI KANTOR ${company.name.toUpperCase()}*\n\n` +
        `${statusIcon} *${state.currentTrack.title}*\n` +
        `🎤 *Artis:* ${state.currentTrack.artist}\n` +
        `⏱️ *Durasi:* ${state.currentTrack.durationText}\n` +
        `👤 *Diminta oleh:* ${state.currentTrack.addedBy || 'SoundSystem'}\n` +
        `📊 *Status:* ${state.isPlaying ? 'Sedang Berputar' : 'Dijeda (Paused)'} (Lagu ke-${state.currentIndex + 1} dari ${state.playlist.length})\n\n` +
        `💡 _Ketik \`/next\`, \`/pause\`, \`/prev\`, atau \`/queue\` untuk remote kontrol._`,
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
          await ctx.reply('📭 Daftar antrean musik kosong. Gunakan `/play <judul>` untuk memutar langsung, atau `/add <judul>` untuk memasukkan ke antrean.');
          return;
        }
        const list = state.playlist.map((t, idx) => {
          const isCurrent = idx === state.currentIndex;
          return `${isCurrent ? '▶️' : `${idx + 1}.`} *${t.title}* - _${t.artist}_ (${t.durationText}) ${isCurrent ? '👈 *[SEDANG BERPUTAR]*' : ''}`;
        }).join('\n');

        await ctx.reply(
          `📋 *DAFTAR PLAYLIST KANTOR (${state.playlist.length} LAGU):*\n\n${list}\n\n💡 _Gunakan \`/play <judul>\` untuk memutar lagu langsung, atau \`/add <judul>\` untuk menambah antrean._`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      await ctx.reply(`🔍 Menambahkan *"${query}"* ke antrean playlist kantor...`, { parse_mode: 'Markdown' });
      const res = await queueTrack(companyId, query, senderName);

      if (res.track) {
        const chatMsg: OfficeGroupChatMessage = {
          id: `music-msg-${Date.now()}`,
          senderType: 'system',
          senderName: 'Office SoundSystem 🎵',
          message: `➕ *[Telegram Remote]* Menambahkan ke antrean: **"${res.track.title}"** oleh **${res.track.artist}** (Posisi #${res.position}) atas permintaan ${senderName}.`,
          timestamp: Date.now(),
          source: 'telegram',
        };
        appendCompanyChatMessage(companyId, chatMsg);

        await ctx.reply(
          `➕ *DITAMBAHKAN KE ANTREAN PLAYLIST (Posisi #${res.position}):*\n\n` +
          `📻 *${res.track.title}*\n` +
          `🎤 *Artis:* ${res.track.artist}\n` +
          `⏱️ *Durasi:* ${res.track.durationText}\n` +
          `👤 *Request:* ${senderName}\n\n` +
          `_Lagu ini akan diputar otomatis setelah lagu yang sedang berjalan selesai._ 🎶\n` +
          `_Ketik \`/play <judul>\` jika ingin langsung memutar sekarang tanpa menunggu._`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(`❌ ${res.error || 'Lagu tidak ditemukan.'}`);
      }
    };

    bot.command('add', handleQueueOrAdd);
    bot.command('queue', handleQueueOrAdd);

    // Command: /voice - Minta agent membalas dengan pesan suara audio (TTS)
    bot.command('voice', async (ctx) => {
      const prompt = ctx.message.text.replace(/^\/voice(@\w+)?\s*/i, '').trim();
      if (!prompt) {
        await ctx.reply(
          '🎙️ *Fitur Voice Note CEO Virtual*\n\n' +
          'Ketik perintah dengan pesan yang ingin ditanyakan, misalnya:\n' +
          '• `/voice @Kenji bagaimana progres sprint hari ini?`\n' +
          '• `/voice @Rei rancang ide visual landing page modern`\n\n' +
          '💡 _Anda juga bisa langsung mengirimkan Voice Note audio dari HP/desktop ke bot ini!_',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const currentAgents = getCompanyAgents(companyId);
      const currentCompany = getCompanyData(companyId) || company;
      const currentTasks = getCompanyTasks(companyId);

      const lowerPrompt = prompt.toLowerCase();
      const isAll = lowerPrompt.includes('@all') || lowerPrompt.includes('@semua');
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
          lang: 'id',
          agent: primaryResponder,
        });

        await ctx.replyWithVoice(
          { source: voiceAudio, filename: 'agent_reply.mp3' },
          {
            caption: `🎙️ *Pesan Suara dari ${primaryResponder.name}* (_${primaryResponder.roleTitle}_)`,
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
        `🤖 *Perintah Bot Telegram CEO Virtual:*\n
🎙️ *Voice Note & Pesan Suara Agent:*
• Kirim *Voice Note* langsung dari HP/desktop Anda ke bot ini!
  Agent akan mentranskrip suara Anda & membalas dengan *Voice Note Audio*!
• \`/voice <pesan>\` - Minta agent menjawab dalam bentuk pesan suara audio (TTS)

📅 *Rapat Standup & Notulensi Eksekutif:*
/standup - Kumpulkan seluruh tim di ruang rapat, dengarkan progres tiap agen & terima ringkasan harian

🌍 *Zona Waktu & Karyawan:*
/time - Cek waktu sekarang di zona waktu masing-masing agen
/team - Daftar karyawan yang bisa di-tag
/tasks - Cek progres task di papan Kanban
/chatid - Mengetahui Chat ID ruang obrolan ini

🎵 *SoundSystem & Remote Music:*
/play <judul> - Putar lagu sekarang juga (langsung berbunyi di browser)
/add <judul> (atau /queue <judul>) - Tambahkan lagu ke antrean playlist (tanpa memotong lagu aktif)
/playlist <tema> - Bikin playlist 5 lagu & putar langsung
/pause - Jeda lagu di kantor
/resume - Lanjutkan lagu di kantor
/stop - Hentikan lagu
/next (atau /skip) - Putar lagu berikutnya
/prev - Putar lagu sebelumnya
/np - Cek lagu yang sedang diputar
/queue - Cek daftar antrean playlist kantor

⚡ *Clone Repo Otomatis:*
/clone <url> - Clone repository GitHub langsung ke workspaces

📌 *Cara Tag Karyawan:*
Ketik nama panggilan setelah tanda @, misalnya:
• \`@${agents[0]?.name.split(' ')[0] || 'Kenji'}\`
• \`@${agents[1]?.name.split(' ')[0] || 'Rei'}\`
• \`@all\` untuk memanggil seluruh tim kantor!`,
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
        ['mulai standup', 'daily standup', 'rapat standup', 'adakan standup', 'mulai rapat standup', 'mulai rapat'].includes(lower)
      ) {
        const { prepareStandupMeeting, advanceStandupSpeaker, finishStandupMeeting, getStandupState } = await import('./standupManager');
        const currentStandup = getStandupState(companyId);

        if (currentStandup.status === 'in_progress' || currentStandup.status === 'gathering') {
          await ctx.reply(
            '⏳ *Daily Standup sedang berjalan di kantor!* Tim sedang berdiskusi di meja bundar, ringkasan akan segera dikirimkan ke sini.',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        await ctx.reply(
          `📅 *MEMULAI DAILY STANDUP TIM ${company.name.toUpperCase()}...*\n\n👥 Seluruh tim karyawan sedang berkumpul di Ruang Rapat (Conference Table).\nSetiap anggota tim akan menyampaikan update progres harian mereka secara bergiliran.\n\nNotulensi eksekutif akan dikirimkan otomatis ke sini setelah rapat selesai! 🚀`,
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
        lower.startsWith('tambah lagu ') ||
        lower.startsWith('antrikan lagu ') ||
        lower.startsWith('masukin playlist ') ||
        lower.startsWith('masukkan lagu ') ||
        lower.startsWith('queue lagu ') ||
        lower.startsWith('add lagu ')
      ) {
        const query = text.replace(/^(tambah lagu|antrikan lagu|masukin playlist|masukkan lagu|queue lagu|add lagu)\s+/i, '').trim();
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
              message: `➕ *[Telegram Remote]* Menambahkan ke antrean: **"${res.track.title}"** oleh **${res.track.artist}** (Posisi #${res.position}) atas permintaan ${senderDisplayName}.`,
              timestamp: Date.now(),
              source: 'telegram',
            };
            appendCompanyChatMessage(companyId, chatMsg);

            await ctx.reply(
              `➕ *[Office SoundSystem]*\nLagu *"${res.track.title}"* - _${res.track.artist}_ ditambahkan ke antrean (Posisi #${res.position})!\n_Request:_ ${senderDisplayName} 🎶\n_Akan diputar otomatis setelah lagu yang aktif selesai._`,
              { parse_mode: 'Markdown' }
            );
            return;
          }
        }
      } else if (
        lower.startsWith('putar lagu ') ||
        lower.startsWith('play ') ||
        lower.startsWith('setel lagu ') ||
        lower.startsWith('puter lagu ')
      ) {
        const query = text.replace(/^(putar lagu|play|setel lagu|puter lagu)\s+/i, '').trim();
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
              message: `🎶 *[Telegram Remote]* Memutar lagu: **"${res.track.title}"** oleh **${res.track.artist}** (${res.track.durationText}) atas permintaan ${senderDisplayName}.`,
              timestamp: Date.now(),
              source: 'telegram',
            };
            appendCompanyChatMessage(companyId, chatMsg);

            await ctx.reply(
              `🎵 *[Office SoundSystem]*\nMemutar: *"${res.track.title}"* - _${res.track.artist}_ (${res.track.durationText}) di browser kantor!\n_Request:_ ${senderDisplayName} 🚀`,
              { parse_mode: 'Markdown' }
            );
            return;
          }
        }
      } else if (lower.startsWith('bikin playlist ') || lower.startsWith('buat playlist ') || lower.startsWith('create playlist ')) {
        const query = text.replace(/^(bikin playlist|buat playlist|create playlist)\s+/i, '').trim();
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
              message: `📻 *[Telegram Remote]* Membuat & memutar playlist **"${query}"** (${res.tracks.length} lagu) atas permintaan ${senderDisplayName}.`,
              timestamp: Date.now(),
              source: 'telegram',
            };
            appendCompanyChatMessage(companyId, chatMsg);

            const listText = res.tracks.map((t, idx) => `${idx + 1}. *${t.title}* - _${t.artist}_`).join('\n');
            await ctx.reply(
              `📻 *[Office SoundSystem]*\nPlaylist *"${query}"* (${res.tracks.length} lagu) dibuat & diputar di kantor!\n\n${listText}`,
              { parse_mode: 'Markdown' }
            );
            return;
          }
        }
      } else if (['pause musik', 'pause lagu', 'jeda musik', 'jeda lagu'].includes(lower)) {
        sendPlaybackCommand(companyId, 'pause');
        await ctx.reply('⏸️ Musik kantor dijeda.');
        return;
      } else if (['resume musik', 'lanjut musik', 'lanjutkan lagu', 'play lagi'].includes(lower)) {
        const state = sendPlaybackCommand(companyId, 'play');
        await ctx.reply(`▶️ Melanjutkan: *"${state.currentTrack?.title || 'Musik'}"*`);
        return;
      } else if (['stop musik', 'stop lagu', 'matikan musik'].includes(lower)) {
        sendPlaybackCommand(companyId, 'stop');
        await ctx.reply('⏹️ Musik kantor dihentikan.');
        return;
      } else if (['next lagu', 'skip lagu', 'lagu selanjutnya', 'ganti lagu'].includes(lower)) {
        const state = sendPlaybackCommand(companyId, 'next');
        if (state.currentTrack) {
          await ctx.reply(`⏭️ Skip ke: *"${state.currentTrack.title}"* - _${state.currentTrack.artist}_`);
        }
        return;
      } else if (['prev lagu', 'lagu sebelumnya', 'back lagu'].includes(lower)) {
        const state = sendPlaybackCommand(companyId, 'prev');
        if (state.currentTrack) {
          await ctx.reply(`⏮️ Kembali ke: *"${state.currentTrack.title}"* - _${state.currentTrack.artist}_`);
        }
        return;
      }

      // 🚀 DETECT AND AUTO-CLONE GITHUB REPOSITORY IF LINK PRESENT
      const detectedGit = extractGitHubUrl(text);
      let gitCloneNote = '';
      if (detectedGit) {
        try {
          await ctx.reply(
            `📦 *Mendeteksi Link GitHub:* \`${detectedGit.url}\`\n⏳ Sedang melakukan clone ke folder workspace: \`~/.vigent/workspaces/${detectedGit.projectName}\`...`,
            { parse_mode: 'Markdown' }
          );
          await ctx.sendChatAction('typing');
          const cloneRes = await cloneGitRepository(detectedGit.url, detectedGit.projectName);

          if (cloneRes.success) {
            await ctx.reply(
              `✅ *Clone GitHub Berhasil!*\n\n📁 *Proyek:* \`${cloneRes.projectName}\`\n📂 *Lokasi:* \`${cloneRes.folderPath}\`\n📄 *Total:* ${cloneRes.filesCount} file\n\nProyek langsung tersimpan di workspaces CEO Virtual dan siap dikerjakan tim! 🚀`,
              { parse_mode: 'Markdown' }
            );

            appendCompanyChatMessage(companyId, {
              id: `tg-clone-${Date.now()}`,
              senderType: 'system',
              senderName: 'GitHub Sync [Telegram]',
              message: `📦 Berhasil clone repository **${cloneRes.projectName}** dari ${detectedGit.url} ke folder workspaces (~/.vigent/workspaces/${cloneRes.projectName}) dengan ${cloneRes.filesCount} file.`,
              timestamp: Date.now(),
              source: 'telegram',
            });

            gitCloneNote = `\n[Catatan Sistem: Repository GitHub ${detectedGit.url} telah berhasil di-clone ke folder workspace "~/.vigent/workspaces/${cloneRes.projectName}" dengan ${cloneRes.filesCount} file]`;
          } else {
            await ctx.reply(
              `❌ *Gagal Clone GitHub:*\n${cloneRes.error || cloneRes.message}`,
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
      const isAllTagged = lowerText.includes('@all') || lowerText.includes('@everyone') || lowerText.includes('@semua');
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

      // Find company leader dynamically (NEVER hardcoded to Kenji or ShadowMove!)
      const leader = getCompanyLeader(currentCompany);
      const effectiveUserPrompt = gitCloneNote ? `${text}${gitCloneNote}` : text;

      // 🚀 AUTONOMOUS TASK & TEAM DISCUSSION WORKFLOW
      // If the Boss gives a project/feature/task instruction, trigger the entire team workflow!
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
          finalTelegramReply += `\n\n💡 _Tip: Kamu bisa tag karyawan spesifik (@${currentAgents.map(a => a.name.split(' ')[0]).join(', @')}, atau @all)_`;
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
        ? `\n\n⚠️ _(Catatan: Audio belum berhasil ditranskripsikan. Menggunakan interpretasi santai bawaan.)_`
        : '';
      await ctx.reply(
        `${statusIcon} *[Pesan Suara CEO Diterima]* (Durasi: \`${duration} detik\`)\n\n` +
        `📝 *Transkripsi:* _"${transcribedText}"_${engineBadge}${noteDisclaimer}\n\n` +
        `⏳ _Tim kantor sedang menyimak dan menyiapkan respons audio suara (Edge Neural TTS)..._`,
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
      const isAll = lowerTrans.includes('@all') || lowerTrans.includes('@semua');
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
            lang: 'id',
            agent: leader,
          });

          await ctx.replyWithVoice(
            { source: voiceAudio, filename: 'leader_reply.mp3' },
            {
              caption: `🎙️ *Balasan Suara dari ${leader.name}* (${leader.roleTitle})`,
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
            lang: 'id',
            agent: primaryResponder,
          });

          await ctx.replyWithVoice(
            { source: voiceAudio, filename: 'agent_reply.mp3' },
            {
              caption: `🎙️ *Balasan Suara dari ${primaryResponder.name}* (_${primaryResponder.roleTitle}_)`,
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
          return `• ${emoji} *${a.name}* (_${a.roleTitle}_)\n  ↳ 🕒 \`${aTime.timeString}\` (${aTime.timezone}) | ${a.state === 'working' ? '⚡ Sedang Bekerja' : '☕ Standby'}`;
        }).join('\n');

        const readyNotification = `🚀 *[VIGENT / CEO VIRTUAL — SISTEM KANTOR TELAH ONLINE & READY]* 🏢

Halo Boss! Seluruh sistem kantor otonom *${company.name}* telah berhasil diinisialisasi dan siap beroperasi penuh!

🟢 *Status Sistem:* ACTIVE & READY
⏰ *Waktu Server:* ${timeDetail.fullFormatted}
🆔 *Connected Chat ID:* \`${config.chatId}\`

👥 *Tim Karyawan Online (${agents.length} Agent):*
${agentRosterLines}

🎵 *SoundSystem & Winamp:* Online (YouTube Music)
📋 *Kanban Tasks:* ${tasks.length} task sprint tercatat
💬 *War Room Sync:* Terhubung langsung dua arah ke dashboard browser

💡 *Cara Berinteraksi:*
• Tag agen untuk instruksi: \`@${agents[0]?.name.split(' ')[0] || 'Kenji'}\` atau \`@all\`
• Putar lagu di kantor: \`/play <judul lagu>\`
• Buat playlist instan: \`/playlist <tema>\`
• Cek zona waktu seluruh agen: \`/time\`
• Bantuan lengkap perintah: \`/help\``;

        await bot.telegram.sendMessage(config.chatId, readyNotification, { parse_mode: 'Markdown' });

        appendCompanyChatMessage(companyId, {
          id: `tg-ready-${Date.now()}`,
          senderType: 'system',
          senderName: 'Vigent System Orchestrator',
          message: `🚀 **Sistem Kantor Ready**: Bot Telegram @${me.username} berhasil auto-connect dan mengirim notifikasi status aktif ke Telegram chat (\`${config.chatId}\`).`,
          timestamp: Date.now(),
          source: 'telegram',
        });
      } catch (notifyErr: any) {
        console.warn(`[Telegram Ready Notification Error for ${companyId}]:`, notifyErr?.message || notifyErr);
      }
    }

    return {
      success: true,
      message: `Bot @${me.username} berhasil diaktifkan untuk ${company.name}!`,
      botInfo: runnerInstance.botInfo,
    };
  } catch (err: any) {
    console.error(`[Telegram] Failed to start bot for ${companyId}:`, err);
    return {
      success: false,
      message: err.message || 'Gagal memulai bot Telegram. Periksa token Anda.',
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

    return { success: true, message: 'Bot Telegram berhasil dimatikan.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal mematikan bot Telegram.' };
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
      formattedText = `🔔 *[Sistem War Room]*\n${message.message}`;
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
      ? '✅ [TIKET SPRINT SELESAI 100%]'
      : `🚀 [UPDATE PROGRES SPRINT (${Math.round(progressPercent)}%)]`;

  // 1. Format clean text for War Room chat history
  const warRoomMessage: OfficeGroupChatMessage = {
    id: `report-${Date.now()}-${senderAgentId}-${Math.random().toString(36).slice(2, 5)}`,
    senderType: 'agent',
    agentId: senderAgentId,
    senderName,
    senderRoleTitle,
    senderAvatarColor: senderAvatarColor || '#6366f1',
    message: `${reportBadge}\n${message}\n\n📌 *Tiket:* "${taskTitle}" (${Math.round(progressPercent)}%)`,
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

• *Tiket:* \`${taskTitle}\`
• *Progres:* 🚀 \`${Math.round(progressPercent)}%\`
• *Kantor:* *${company.name}*`;

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
