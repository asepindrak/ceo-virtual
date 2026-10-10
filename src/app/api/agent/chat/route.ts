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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      config,
      messages,
      agentName,
      agentRole = 'fullstack_dev',
      enableTools = true,
      autoExecuteTools = true,
      isTestConnection = false,
    }: {
      config: LLMConfig;
      messages: LLMMessage[];
      agentName?: string;
      agentRole?: AgentRole;
      enableTools?: boolean;
      autoExecuteTools?: boolean;
      isTestConnection?: boolean;
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

    // Build persona system prompt with injected skills
    const systemPrompt: LLMMessage = {
      role: 'system',
      content: `You are ${agentName || 'an autonomous agent'}, working as a ${agentRole} in a modern virtual company office called Vigent.
You have real capabilities to create files, write code, run commands, and execute connected MCP tools.
When given a task:
1. Break down the requirements clearly.
2. If code or documentation needs to be created, use the 'write_project_file' tool to write real files to disk.
3. If database or external service tools are available via MCP (e.g. PostgreSQL, GitHub, Brave Search), utilize them proactively.
4. If you need confirmation on critical decisions, use 'request_owner_decision'.
5. If you need clarification from another department, use 'ask_colleague'.
6. Follow the role skills and guidelines below:${skillsPromptText}`,
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
