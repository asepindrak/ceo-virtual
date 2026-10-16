import { NextResponse } from 'next/server';
import {
  callLLMProvider,
  executeToolCall,
  OFFICE_AGENT_TOOLS,
  LLMMessage,
  ToolDefinition,
} from '@/lib/llmService';
import { LLMConfig, AgentRole } from '@/types/office';
import { getSkillsForRole } from '@/lib/skillManager';
import { getMcpToolsForRole, executeMcpToolCall } from '@/lib/mcpClient';
import { searchCompanyMemories, formatMemoriesForPrompt } from '@/lib/memoryManager';
import { getAgentCurrentTime } from '@/lib/timezoneHelper';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      config,
      messages,
      agentName,
      agentRole = 'fullstack_dev',
      agentTimezone = 'Asia/Jakarta',
      enableTools = true,
      autoExecuteTools = true,
      isTestConnection = false,
      currentTask,
      allTasks,
      companyName,
      companyId,
      activeProject,
      agentPersonality,
    }: {
      config: LLMConfig;
      messages: LLMMessage[];
      agentName?: string;
      agentRole?: AgentRole;
      agentTimezone?: string;
      enableTools?: boolean;
      autoExecuteTools?: boolean;
      isTestConnection?: boolean;
      currentTask?: any;
      allTasks?: any[];
      companyName?: string;
      companyId?: string;
      activeProject?: string;
      agentPersonality?: any;
    } = body;

    if (!config) {
      return NextResponse.json({ success: false, error: 'LLM configuration is missing' }, { status: 400 });
    }

    // Quick connection test mode
    if (isTestConnection) {
      const testMsg: LLMMessage[] = [
        {
          role: 'user',
          content: 'Ping test! Please reply with exactly: "CONNECTION_SUCCESSFUL".',
        },
      ];
      try {
        const testRes = await callLLMProvider(config, testMsg);
        return NextResponse.json({
          success: true,
          message: 'Connection successful',
          response: testRes.content,
          provider: testRes.provider,
          model: testRes.model,
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            error: err.message || 'Failed to connect to LLM provider',
          },
          { status: 502 }
        );
      }
    }

    // 1. Fetch matching Skills (SOPs) for this agent role
    const assignedSkills = getSkillsForRole(agentRole);
    let skillsPromptText = '';
    if (assignedSkills.length > 0) {
      skillsPromptText = `\n\n### ACTIVE ROLE SKILLS & SOPS:\n` + assignedSkills.map((s) => `[Skill: ${s.title}]\n${s.instructions}`).join('\n\n');
    }

    // 2. Fetch matching MCP Tools for this agent role
    const mcpTools = getMcpToolsForRole(agentRole);
    const combinedTools: ToolDefinition[] = enableTools
      ? [...OFFICE_AGENT_TOOLS, ...mcpTools]
      : [];

    // 3. Build Task & Project Context
    let taskContextText = '';
    if (currentTask) {
      taskContextText += `\n\n### YOUR CURRENT ASSIGNED TASK:
- Task Title: "${currentTask.title}"
- Project: "${currentTask.projectName || activeProject || 'General Project'}"
- Status: ${currentTask.status.toUpperCase()} (${Math.round(currentTask.progress || 0)}% completed)
- Description: ${currentTask.description || 'Tidak ada deskripsi'}
- Deliverables / Artifacts: ${currentTask.artifacts?.map((a: any) => a.fileName).join(', ') || 'Sedang dikerjakan'}
- Recent Logs: ${currentTask.logs?.slice(-3).join(' | ') || 'Sprint started'}`;
    } else {
      taskContextText += `\n\n### YOUR CURRENT ASSIGNED TASK:
- You currently have no active in-progress task assigned directly to you (Status: Idle / Ready for new orders).`;
    }

    if (allTasks && allTasks.length > 0) {
      taskContextText += `\n\n### ALL TASKS IN THIS OFFICE (${companyName || 'ShadowMove'}):
${allTasks
  .map(
    (t: any) =>
      `- [Project: ${t.projectName || 'General'}] "${t.title}" | Status: ${t.status} (${Math.round(t.progress || 0)}%) | Assigned to: ${t.assignedAgentId || 'Belum di-assign'}`
  )
  .join('\n')}`;
    }

    let personalityPromptText = '';
    if (agentPersonality) {
      personalityPromptText = `\n\n### YOUR PERSONALITY & HUMAN IDENTITY (MBTI & ENNEAGRAM):
- MBTI: ${agentPersonality.mbti} | Enneagram: ${agentPersonality.enneagram} (${agentPersonality.archetype || 'Specialist'})
- Karakter & Vibe: ${agentPersonality.traits?.join(', ') || 'Profesional'}
- Gaya Bicara: ${agentPersonality.speakingStyle || 'Natural dan berorientasi solusi'}
- Topik / Minat: ${agentPersonality.interests?.join(', ') || 'Teknologi'}
Catatan Penting: Kamu adalah entitas hidup dengan kepribadian unik di atas. Selalu jawab dengan gaya bicara dan nada emosional yang konsisten dengan tipe MBTI dan Enneagram-mu!`;
    }

    let memoryPromptText = '';
    if (companyId) {
      try {
        const rawContent = (messages || []).filter((m) => m.role === 'user').slice(-1)[0]?.content;
        const lastUserMsg = typeof rawContent === 'string' ? rawContent : Array.isArray(rawContent) ? rawContent.map((p: any) => p.text || '').join(' ') : '';
        const relevantMemories = await searchCompanyMemories(companyId, lastUserMsg || 'aturan perusahaan lore budaya sprint', 3);
        if (relevantMemories.length > 0) {
          memoryPromptText = `\n\n` + formatMemoriesForPrompt(relevantMemories);
        }
      } catch (err) {
        console.warn('Memory search warning:', err);
      }
    }

    // 4. Calculate live time & timezone details for this agent
    const timeDetail = getAgentCurrentTime(agentTimezone);
    const timezonePromptText = `\n\n### YOUR CURRENT REAL-TIME CLOCK & ASSIGNED TIMEZONE:
- Timezone: ${timeDetail.timezone}
- Waktu Lokal Sekarang: ${timeDetail.timeString} (${timeDetail.dayPeriod})
- Hari & Tanggal: ${timeDetail.dateString}
- Format Lengkap: ${timeDetail.fullFormatted}
CRITICAL TIME AWARENESS:
Kamu memiliki kesadaran penuh terhadap waktu nyata (real-time clock) saat ini di zona waktumu (${timeDetail.timezone}). Saat Boss atau rekan bertanya sekarang jam berapa ("jam berapa sekarang?", "lagi jam berapa di situ?", "selamat pagi/siang/malam", deadline/jadwal), kamu WAJIB menjawab secara presisi sesuai waktu lokalmu saat ini (${timeDetail.timeString}, ${timeDetail.dateString})!`;

    // Build persona system prompt with injected skills, task context, personality, timezone, and company memory
    const systemPrompt: LLMMessage = {
      role: 'system',
      content: `You are ${agentName || 'an autonomous agent'}, working as ${agentRole} at ${companyName || 'ShadowMove'} in a virtual office simulation.
You are interacting directly with your Owner / Tech Lead / Colleague.
Be conversational, professional, helpful, and concise.

CRITICAL INSTRUCTIONS FOR ACCURACY:
1. When asked about task progress or whether a task is done ("sudah beres apa belum?", "gimana tasknya?"):
   - ALWAYS check YOUR CURRENT ASSIGNED TASK above!
   - State the exact title: "${currentTask?.title || 'Tidak ada task aktif'}"
   - State the project: "${currentTask?.projectName || activeProject || 'Umum'}"
   - State the accurate progress: ${currentTask ? Math.round(currentTask.progress || 0) : 0}% and status: ${currentTask?.status || 'idle'}.
   - If progress is 100% or status is done, celebrate and mention the completed files!
   - If in progress, explain what step you are currently finishing.
   - NEVER confuse with other unrelated tasks or make up imaginary task names!
2. Answer in the same language as the user (Bahasa Indonesia or English).
3. If asked to write code, provide real, high-quality, production-ready code.
4. If code needs to be saved to disk, use the 'write_project_file' tool.${timezonePromptText}${personalityPromptText}${taskContextText}${skillsPromptText}${memoryPromptText}`,
    };

    const finalMessages: LLMMessage[] = [systemPrompt, ...(messages || [])];
    const tools = enableTools && combinedTools.length > 0 ? combinedTools : undefined;

    // First LLM Call
    const initialResponse = await callLLMProvider(config, finalMessages, tools);

    // If no tool calls or autoExecuteTools is disabled, return directly
    if (!initialResponse.toolCalls || !autoExecuteTools || initialResponse.toolCalls.length === 0) {
      return NextResponse.json({
        success: true,
        content: initialResponse.content,
        toolCalls: initialResponse.toolCalls || [],
        toolResults: [],
        provider: initialResponse.provider,
        model: initialResponse.model,
        activeSkills: assignedSkills.map((s) => s.title),
        activeMcpToolsCount: mcpTools.length,
      });
    }

    // Execute Tool Calls (Built-in + MCP Tools)
    const toolResults: Array<{ toolName: string; args: any; result: any; success: boolean }> = [];
    const conversationWithToolCalls: LLMMessage[] = [
      ...finalMessages,
      {
        role: 'assistant',
        content: initialResponse.content || '',
        tool_calls: initialResponse.toolCalls,
      },
    ];

    for (const toolCall of initialResponse.toolCalls) {
      let parsedArgs: any = {};
      try {
        parsedArgs = JSON.parse(toolCall.function.arguments);
      } catch {
        parsedArgs = { raw: toolCall.function.arguments };
      }

      let execution: { success: boolean; result: any; error?: string };

      if (toolCall.function.name.startsWith('mcp_')) {
        // Execute through MCP dispatcher
        execution = await executeMcpToolCall(toolCall.function.name, parsedArgs);
      } else {
        // Execute through standard office tools
        execution = await executeToolCall(toolCall.function.name, parsedArgs);
      }

      toolResults.push({
        toolName: toolCall.function.name,
        args: parsedArgs,
        result: execution.result,
        success: execution.success,
      });

      // Append tool response for LLM follow-up
      conversationWithToolCalls.push({
        role: 'tool',
        name: toolCall.function.name,
        tool_call_id: toolCall.id,
        content: typeof execution.result === 'string' ? execution.result : JSON.stringify(execution.result),
      });
    }

    // Second LLM Call to summarize tool results
    let finalSummaryContent = initialResponse.content;
    try {
      const followUp = await callLLMProvider(config, conversationWithToolCalls);
      finalSummaryContent = followUp.content;
    } catch {
      // If follow-up fails, keep initial content
    }

    return NextResponse.json({
      success: true,
      content: finalSummaryContent,
      toolCalls: initialResponse.toolCalls,
      toolResults,
      provider: initialResponse.provider,
      model: initialResponse.model,
      activeSkills: assignedSkills.map((s) => s.title),
      activeMcpToolsCount: mcpTools.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred during agent LLM execution',
      },
      { status: 500 }
    );
  }
}
