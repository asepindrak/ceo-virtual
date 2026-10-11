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
import { Company, Agent, OfficeGroupChatMessage, TelegramConfig, TaskTicket } from '@/types/office';
import { PRESET_COMPANIES, getEffectiveAgentLLMConfig } from './companyPresets';
import { callLLMProvider } from './llmService';
import { cloneGitRepository, extractGitHubUrl } from './workspaceManager';

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
  const dir = path.join(os.homedir(), '.vigent');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
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

export function getCompanyAgents(companyId: string): Agent[] {
  const preset = PRESET_COMPANIES.find((c) => c.id === companyId);
  return preset?.agents || PRESET_COMPANIES[0].agents;
}

export function getCompanyData(companyId: string): Company {
  const preset = PRESET_COMPANIES.find((c) => c.id === companyId);
  if (preset) return preset;
  return PRESET_COMPANIES[0];
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
  const currentTask = tasks.find((t) => t.id === agent.currentTaskId) || tasks[0];
  const activeProject = currentTask?.projectName || 'ShadowMove Platform';

  // Try calling real LLM using effective config (inherited company global or manual BYOK)
  const effectiveConfig = getEffectiveAgentLLMConfig(agent, company);
  if (effectiveConfig?.apiKey) {
    try {
      let memorySnippet = '';
      try {
        const { searchCompanyMemories } = await import('./memoryManager');
        const relevantMemories = await searchCompanyMemories(company.id, userMessage, 2);
        if (relevantMemories.length > 0) {
          memorySnippet = `\nMemori Pengalaman Kantor Relevan:\n` + relevantMemories.map(m => `- [${m.memory.type}] ${m.memory.title}: ${m.memory.content}`).join('\n');
        }
      } catch {}

      const prompt = `Anda adalah ${agent.name}, memegang posisi "${agent.roleTitle}" di perusahaan ${company.name}.
Karakteristik MBTI: ${agent.personality?.mbti || 'INTJ'}, gaya bicara: ${agent.personality?.speakingStyle || 'Profesional dan tanggap'}.
Project aktif: ${activeProject}.
Tugas Anda saat ini: "${currentTask?.title || 'Pengembangan fitur utama'}" (Status: ${currentTask?.status || 'in_progress'}).${memorySnippet}
Pesan dari Boss di Telegram: "${userMessage}".

Jawablah secara singkat, padat, profesional, ramah (1-3 kalimat). Langsung ke poin solusi atau progres Anda. Gunakan Bahasa Indonesia yang natural.`;

      const response = await callLLMProvider(effectiveConfig, [
        { role: 'user', content: prompt }
      ]);
      if (response && response.content) {
        return response.content.trim();
      }
    } catch (err) {
      console.warn(`[Telegram LLM] Fallback for ${agent.name}:`, err);
    }
  }

  // Persona-rich Indonesian response generator
  const lowerMsg = userMessage.toLowerCase();
  const firstName = agent.name.split(' ')[0];
  const roleTitle = agent.roleTitle.toLowerCase();

  if (roleTitle.includes('founder') || roleTitle.includes('architect')) {
    if (lowerMsg.includes('status') || lowerMsg.includes('progres') || lowerMsg.includes('progress') || lowerMsg.includes('update')) {
      return `Halo Boss! Seluruh arsitektur sprint terkontrol dengan baik. Tiket utama "${currentTask?.title || 'Sistem Inti'}" saat ini berjalan stabil di 100%. Tim siap menerima arahan untuk fase berikutnya.`;
    }
    if (lowerMsg.includes('deploy') || lowerMsg.includes('server') || lowerMsg.includes('port')) {
      return `Dev server lokal aktif di port 28483 (/preview/shadowmove/index.html). Container isolasi dan microservice aman untuk staging.`;
    }
    return `Baik Boss, saya ${firstName} telah mencatat instruksi ini ke dalam prioritas arsitektur sistem ${company.name}. Tim akan segera mengeksekusinya.`;
  }

  if (roleTitle.includes('design') || roleTitle.includes('creative') || roleTitle.includes('ui')) {
    if (lowerMsg.includes('warna') || lowerMsg.includes('tampilan') || lowerMsg.includes('layout') || lowerMsg.includes('desain')) {
      return `Siap Boss! Visual UI sudah mengadopsi palet modern cyber-dark dengan aksen neon glow yang presisi. Tipografi Outfit & JetBrains Mono memberikan readability optimal di mobile & desktop.`;
    }
    return `Halo! Dari divisi UI/UX saya pastikan pengalaman interaksi pengguna tetap mulus dan visualnya stand-out, Boss!`;
  }

  if (roleTitle.includes('engineering') || roleTitle.includes('full-stack') || roleTitle.includes('backend')) {
    if (lowerMsg.includes('api') || lowerMsg.includes('database') || lowerMsg.includes('bug') || lowerMsg.includes('endpoint')) {
      return `Sip Boss! Endpoint API terisolasi per perusahaan dan struktur skema data sudah sinkron. Performa respon sub-second terjamin!`;
    }
    return `Siap dieksekusi! Pipeline kode dan logic full-stack langsung saya sinkronkan sekarang juga.`;
  }

  if (roleTitle.includes('qa') || roleTitle.includes('reliability') || roleTitle.includes('test')) {
    return `Audit kualitas berjalan otomatis Boss! Tidak ditemukan critical error, responsivitas breakpoint mobile & desktop telah lolos uji 100%.`;
  }

  return `Halo Boss, pesan diterima dengan baik oleh ${agent.name}. Pekerjaan pada "${currentTask?.title || 'Sprint Aktif'}" siap diselesaikan sesuai target.`;
}

/**
 * Start isolated Telegraf long-polling bot for a specific company
 */
export async function startCompanyTelegramBot(
  companyId: string,
  providedConfig?: TelegramConfig
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
Selamat datang di bot kantor otonom Vigent!

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
          `✅ *Clone Repository Berhasil!*\n\n📁 *Proyek:* \`${res.projectName}\`\n📂 *Lokasi:* \`${res.folderPath}\`\n📄 *Total:* ${res.filesCount} file\n\nProyek langsung tersimpan di workspaces Vigent dan siap dikerjakan oleh tim agen! 🚀`,
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

    // Command: /help
    bot.command('help', async (ctx) => {
      await ctx.reply(
        `🤖 *Perintah Bot Telegram Vigent:*\n
/start - Menampilkan panduan dan Chat ID Anda
/clone <url> - Clone repository GitHub langsung ke workspaces
/team - Daftar karyawan yang bisa di-tag
/tasks - Cek progres task di papan Kanban
/chatid - Mengetahui Chat ID ruang obrolan ini

⚡ *Clone Repo Otomatis:*
Cukup kirimkan link GitHub (misal: \`https://github.com/user/repo\`) di chat ini, bot akan otomatis meng-clone proyek langsung ke \`~/.vigent/workspaces\`!

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
              `✅ *Clone GitHub Berhasil!*\n\n📁 *Proyek:* \`${cloneRes.projectName}\`\n📂 *Lokasi:* \`${cloneRes.folderPath}\`\n📄 *Total:* ${cloneRes.filesCount} file\n\nProyek langsung tersimpan di workspaces Vigent dan siap dikerjakan tim! 🚀`,
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

      // Parse tags
      const lowerText = text.toLowerCase();
      const isAllTagged = lowerText.includes('@all') || lowerText.includes('@everyone') || lowerText.includes('@semua');
      const taggedAgents: Agent[] = [];

      agents.forEach((ag) => {
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

      // If no tag is used, default responder is the primary lead / Founder
      const responders: Agent[] = taggedAgents.length > 0 ? taggedAgents : [agents[0]];
      const isDefaultResponder = taggedAgents.length === 0;

      // Show typing indicator in Telegram
      try {
        await ctx.sendChatAction('typing');
      } catch {}

      // Refresh tasks
      tasks = getCompanyTasks(companyId);

      // Generate responses for each tagged agent
      const effectiveUserPrompt = gitCloneNote ? `${text}${gitCloneNote}` : text;
      for (const responder of responders) {
        const replyText = await generateAgentAnswer(responder, effectiveUserPrompt, company, tasks);

        // Format labeled response
        let finalTelegramReply = formatAgentTelegramReply(responder, replyText);

        // If no tag was used, append a subtle helpful tip to teach user how to tag!
        if (isDefaultResponder) {
          finalTelegramReply += `\n\n💡 _Tip: Kamu bisa tag karyawan spesifik (@${agents.map(a => a.name.split(' ')[0]).join(', @')}, atau @all)_`;
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
