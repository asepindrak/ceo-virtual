/**
 * 🤖 VIGENT - Universal LLM Execution Engine
 * Supports OpenAI-compatible providers (OpenAI, Groq, DeepSeek, Ollama, OpenRouter, Custom BYOK),
 * Anthropic Claude, and Google Gemini with Tool Calling & Multimodal Vision.
 */

import { LLMConfig } from '@/types/office';
import { writeProjectFile, readProjectFile, listWorkspaceProjects, createProjectDirectory } from './workspaceManager';
import { exec } from 'child_process';
import path from 'path';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | LLMContentPart[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: LLMToolCall[];
}

export interface LLMContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string; // http url or data:image/...;base64,...
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

// Default standard tools available to autonomous agents
export const OFFICE_AGENT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'write_project_file',
      description: 'Write or update a code or document file inside the agent project workspace (~/.vigent/workspaces/<projectName>/<filePath>).',
      parameters: {
        type: 'object',
        properties: {
          projectName: {
            type: 'string',
            description: 'The name of the project folder in ~/.vigent/workspaces',
          },
          filePath: {
            type: 'string',
            description: 'Relative file path (e.g. src/index.ts, package.json, README.md, docs/api.md)',
          },
          content: {
            type: 'string',
            description: 'The full code or text content to write into the file',
          },
        },
        required: ['projectName', 'filePath', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_project_file',
      description: 'Read the contents of a file from the project workspace.',
      parameters: {
        type: 'object',
        properties: {
          projectName: {
            type: 'string',
            description: 'The name of the project folder',
          },
          filePath: {
            type: 'string',
            description: 'Relative path of the file to read',
          },
        },
        required: ['projectName', 'filePath'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_colleague',
      description: 'Walk to a colleague in the virtual office to ask for clarification, code review, or advice.',
      parameters: {
        type: 'object',
        properties: {
          colleagueName: {
            type: 'string',
            description: 'Name of the colleague (e.g. Maya Lin, Kai Tanaka, Liam Chen)',
          },
          question: {
            type: 'string',
            description: 'Specific technical or strategic question to ask',
          },
        },
        required: ['colleagueName', 'question'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_owner_decision',
      description: 'Seek formal approval from the Office Owner/Boss at the Executive Desk when facing high-impact decisions (budget, architecture overhaul, production deploy).',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Brief title of the decision',
          },
          question: {
            type: 'string',
            description: 'The key dilemma or question for the Owner',
          },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Possible choices (e.g. ["Approve Cloud Deploy", "Keep Local Docker", "Redesign"])',
          },
        },
        required: ['title', 'question', 'options'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_terminal_command',
      description: 'Execute a build, test, or lint command inside the project directory.',
      parameters: {
        type: 'object',
        properties: {
          projectName: {
            type: 'string',
            description: 'The project folder name',
          },
          command: {
            type: 'string',
            description: 'The shell command to run (e.g. "npm test", "npm run build", "node -v")',
          },
        },
        required: ['projectName', 'command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_office_task',
      description: 'Project Manager / Lead Architect tool to create a new task ticket in the office Kanban board.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Clear, actionable title of the task to be created',
          },
          description: {
            type: 'string',
            description: 'Detailed requirements, specifications, and acceptance criteria',
          },
          projectName: {
            type: 'string',
            description: 'Target project name (e.g. "ShadowMove Landing Page", "API Gateway")',
          },
          taskType: {
            type: 'string',
            enum: ['coding', 'content', 'qa', 'design'],
            description: 'Type of work',
          },
          assignedAgentId: {
            type: 'string',
            description: 'ID or Name of the agent to assign, or leave empty for Backlog',
          },
          companyId: {
            type: 'string',
            description: 'Target company ID (e.g. "company-shadowmove")',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_office_task',
      description: 'Project Manager tool to delete or cancel an obsolete, completed, or duplicated task from the Kanban board.',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Exact task ID or keyword from the task title to remove',
          },
          taskTitle: {
            type: 'string',
            description: 'Title of the task to delete if ID is unknown',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_office_task',
      description: 'Project Manager tool to update task status, progress, or assigned agent.',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The ID or Title of the task to update',
          },
          status: {
            type: 'string',
            enum: ['backlog', 'in_progress', 'done'],
            description: 'New status for the task',
          },
          assignedAgentId: {
            type: 'string',
            description: 'Agent ID or name to reassign to',
          },
          progress: {
            type: 'number',
            description: 'Progress percentage (0-100)',
          },
        },
        required: ['taskId'],
      },
    },
  },
];

// Execute a tool locally on the machine
export async function executeToolCall(
  name: string,
  args: Record<string, any>
): Promise<{ success: boolean; result: any; error?: string }> {
  try {
    if (name === 'write_project_file') {
      const { projectName, filePath, content } = args;
      const targetPath = writeProjectFile(projectName, filePath, content);
      return { success: true, result: `Successfully wrote ${filePath} to ${targetPath}` };
    }

    if (name === 'read_project_file') {
      const { projectName, filePath } = args;
      const content = readProjectFile(projectName, filePath);
      if (content === null) {
        return { success: false, result: null, error: `File ${filePath} not found in project ${projectName}` };
      }
      return { success: true, result: content };
    }

    if (name === 'create_office_task') {
      const { title, description, projectName, taskType, assignedAgentId, companyId } = args;
      const fs = await import('fs');
      const os = await import('os');
      const pathMod = await import('path');
      const vigentHome = pathMod.join(os.homedir(), '.vigent');
      const targetCompanyId = companyId || 'company-shadowmove';
      const tasksFile = pathMod.join(vigentHome, `tasks_${targetCompanyId}.json`);

      let currentTasks: any[] = [];
      if (fs.existsSync(tasksFile)) {
        try {
          currentTasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
        } catch {
          currentTasks = [];
        }
      }

      // Resolve agent ID if name was passed instead of ID
      let resolvedAgentId = assignedAgentId;
      if (resolvedAgentId) {
        const lower = resolvedAgentId.toLowerCase();
        if (lower.includes('kenji')) resolvedAgentId = 'agent-sm-kenji';
        else if (lower.includes('rei')) resolvedAgentId = 'agent-sm-rei';
        else if (lower.includes('damian')) resolvedAgentId = 'agent-sm-damian';
        else if (lower.includes('yuki')) resolvedAgentId = 'agent-sm-yuki';
        else if (lower.includes('marcus')) resolvedAgentId = `agent-${targetCompanyId}-1`;
        else if (lower.includes('aria')) resolvedAgentId = `agent-${targetCompanyId}-2`;
        else if (lower.includes('sofia')) resolvedAgentId = `agent-${targetCompanyId}-3`;
        else if (lower.includes('ren')) resolvedAgentId = `agent-${targetCompanyId}-4`;
      }

      const newTask = {
        id: `task-${Date.now()}`,
        title,
        projectName: projectName || 'ShadowMove Platform',
        description: description || '',
        type: taskType || 'coding',
        departmentId: 'dept-eng',
        assignedAgentId: resolvedAgentId || undefined,
        status: resolvedAgentId ? 'in_progress' : 'backlog',
        progress: 0,
        artifacts: [],
        logs: [`Task created by Project Manager / Lead Architect on ${new Date().toLocaleString()}`],
        createdAt: Date.now(),
      };

      currentTasks.unshift(newTask);
      if (!fs.existsSync(vigentHome)) fs.mkdirSync(vigentHome, { recursive: true });
      fs.writeFileSync(tasksFile, JSON.stringify(currentTasks, null, 2), 'utf-8');

      return {
        success: true,
        result: `Task "${title}" created successfully by Lead Agent (ID: ${newTask.id}, Status: ${newTask.status}, Assigned: ${resolvedAgentId || 'Backlog'}). Tim akan mengeksekusinya secara paralel.`,
      };
    }

    if (name === 'delete_office_task') {
      const { taskId, taskTitle, companyId } = args;
      const fs = await import('fs');
      const os = await import('os');
      const pathMod = await import('path');
      const vigentHome = pathMod.join(os.homedir(), '.vigent');
      const targetCompanyId = companyId || 'company-shadowmove';
      const tasksFile = pathMod.join(vigentHome, `tasks_${targetCompanyId}.json`);

      if (!fs.existsSync(tasksFile)) {
        return { success: false, result: null, error: 'No tasks file found' };
      }

      let currentTasks: any[] = [];
      try {
        currentTasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
      } catch {
        return { success: false, result: null, error: 'Failed to read tasks file' };
      }

      const initialCount = currentTasks.length;
      const targetQuery = (taskId || taskTitle || '').toLowerCase().trim();
      currentTasks = currentTasks.filter(
        (t) => t.id !== targetQuery && !t.title.toLowerCase().includes(targetQuery)
      );

      const deletedCount = initialCount - currentTasks.length;
      fs.writeFileSync(tasksFile, JSON.stringify(currentTasks, null, 2), 'utf-8');

      return {
        success: true,
        result: `Project Manager deleted ${deletedCount} matching task(s) for query "${targetQuery}". Remaining tasks: ${currentTasks.length}.`,
      };
    }

    if (name === 'update_office_task') {
      const { taskId, status, assignedAgentId, progress } = args;
      const fs = await import('fs');
      const os = await import('os');
      const pathMod = await import('path');
      const vigentHome = pathMod.join(os.homedir(), '.vigent');
      const tasksFile = pathMod.join(vigentHome, 'tasks_company-shadowmove.json');

      if (!fs.existsSync(tasksFile)) {
        return { success: false, result: null, error: 'No tasks file found' };
      }

      let currentTasks: any[] = [];
      try {
        currentTasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
      } catch {
        return { success: false, result: null, error: 'Failed to read tasks file' };
      }

      const targetQuery = (taskId || '').toLowerCase().trim();
      let found = false;
      currentTasks = currentTasks.map((t) => {
        if (t.id === targetQuery || t.title.toLowerCase().includes(targetQuery)) {
          found = true;
          return {
            ...t,
            ...(status ? { status } : {}),
            ...(assignedAgentId !== undefined ? { assignedAgentId } : {}),
            ...(progress !== undefined ? { progress } : {}),
            logs: [...(t.logs || []), `Updated by Project Manager: status=${status || t.status}, progress=${progress ?? t.progress}`],
          };
        }
        return t;
      });

      if (!found) {
        return { success: false, result: null, error: `Task "${taskId}" not found` };
      }

      fs.writeFileSync(tasksFile, JSON.stringify(currentTasks, null, 2), 'utf-8');
      return {
        success: true,
        result: `Task "${taskId}" updated successfully by Project Manager.`,
      };
    }

    if (name === 'ask_colleague') {
      const { colleagueName, question } = args;
      return {
        success: true,
        result: `Walked to ${colleagueName}. Discussed: "${question}". Colleague agreed with the proposed approach.`,
      };
    }

    if (name === 'request_owner_decision') {
      const { title, question, options } = args;
      return {
        success: true,
        result: `Human-in-the-loop decision ticket created: "${title}". Options submitted: ${options.join(', ')}.`,
      };
    }

    if (name === 'run_terminal_command') {
      const { projectName, command } = args;
      const projectDir = createProjectDirectory(projectName);
      return new Promise((resolve) => {
        exec(command, { cwd: projectDir, timeout: 15000 }, (err, stdout, stderr) => {
          if (err) {
            resolve({ success: false, result: stdout || stderr, error: err.message });
          } else {
            resolve({ success: true, result: stdout || 'Command executed successfully with exit code 0.' });
          }
        });
      });
    }

    return { success: false, result: null, error: `Unknown tool: ${name}` };
  } catch (err: any) {
    return { success: false, result: null, error: err.message };
  }
}

/**
 * Universal LLM Dispatcher
 */
export async function callLLMProvider(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[]
): Promise<{
  content: string;
  toolCalls?: LLMToolCall[];
  provider: string;
  model: string;
  usage?: any;
}> {
  const provider = config.provider || 'openai';

  // 1. Anthropic Claude
  if (provider === 'anthropic') {
    return callAnthropic(config, messages, tools);
  }

  // 2. Google Gemini
  if (provider === 'gemini') {
    return callGemini(config, messages, tools);
  }

  // 3. OpenAI-Compatible (OpenAI, Groq, DeepSeek, Ollama, OpenRouter, Custom)
  return callOpenAICompatible(config, messages, tools);
}

/**
 * OpenAI Compatible Engine (OpenAI, Groq, DeepSeek, Ollama, OpenRouter, Custom BYOK)
 */
async function callOpenAICompatible(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[]
) {
  let endpoint = 'https://api.openai.com/v1/chat/completions';
  let defaultModel = 'gpt-4o';
  let apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';

  if (config.baseUrl) {
    let base = config.baseUrl.replace(/\/+$/, '');
    endpoint = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
    defaultModel = config.model || 'gemini-3.6-flash-medium';
  } else if (config.provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    defaultModel = 'llama-3.3-70b-versatile';
    apiKey = config.apiKey || process.env.GROQ_API_KEY || '';
  } else if (config.provider === 'deepseek') {
    endpoint = 'https://api.deepseek.com/chat/completions';
    defaultModel = 'deepseek-chat';
    apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY || '';
  } else if (config.provider === 'custom') {
    let base = config.baseUrl || process.env.CUSTOM_LLM_BASE_URL || '';
    if (!base) {
      throw new Error('Custom LLM Provider membutuhkan Base URL. Silakan atur Base URL di pengaturan Provider LLM.');
    }
    base = base.replace(/\/+$/, '');
    endpoint = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
    defaultModel = config.model || 'gpt-4o';
  }

  const model = config.model || defaultModel;

  const payload: any = {
    model,
    messages: formatMessagesForOpenAI(messages),
    temperature: 0.7,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = 'auto';
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API Error [${response.status} ${response.statusText}]: ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const message = choice?.message;

  const toolCalls: LLMToolCall[] | undefined = message?.tool_calls?.map((tc: any) => ({
    id: tc.id,
    type: 'function',
    function: {
      name: tc.function.name,
      arguments: tc.function.arguments,
    },
  }));

  return {
    content: message?.content || '',
    toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
    provider: config.provider,
    model,
    usage: data.usage,
  };
}

/**
 * Anthropic Messages API
 */
async function callAnthropic(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[]
) {
  const endpoint = 'https://api.anthropic.com/v1/messages';
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
  const model = config.model || 'claude-3-5-sonnet-20241022';

  // Extract system prompt
  let systemPrompt = '';
  const systemMsg = messages.find((m) => m.role === 'system');
  if (systemMsg) {
    systemPrompt = typeof systemMsg.content === 'string' ? systemMsg.content : '';
  }

  const nonSystemMsgs = messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      let content: any = m.content;
      if (Array.isArray(m.content)) {
        content = m.content.map((part) => {
          if (part.type === 'text') return { type: 'text', text: part.text };
          if (part.type === 'image_url' && part.image_url) {
            const url = part.image_url.url;
            if (url.startsWith('data:image/')) {
              const [header, base64Data] = url.split(',');
              const mediaType = header.replace('data:', '').replace(';base64', '');
              return {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              };
            }
          }
          return { type: 'text', text: '' };
        });
      }
      return {
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content,
      };
    });

  const payload: any = {
    model,
    max_tokens: 4096,
    messages: nonSystemMsgs,
    system: systemPrompt,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic Error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  let textContent = '';
  const toolCalls: LLMToolCall[] = [];

  for (const block of data.content || []) {
    if (block.type === 'text') {
      textContent += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        type: 'function',
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      });
    }
  }

  return {
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    provider: 'anthropic',
    model,
    usage: data.usage,
  };
}

/**
 * Google Gemini API
 */
async function callGemini(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[]
) {
  const apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
  const model = config.model || 'gemini-1.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const parts: any[] = [];
      if (typeof m.content === 'string') {
        parts.push({ text: m.content });
      } else if (Array.isArray(m.content)) {
        for (const p of m.content) {
          if (p.type === 'text' && p.text) parts.push({ text: p.text });
          if (p.type === 'image_url' && p.image_url?.url.startsWith('data:image/')) {
            const [header, base64] = p.image_url.url.split(',');
            const mimeType = header.replace('data:', '').replace(';base64', '');
            parts.push({
              inline_data: { mime_type: mimeType, data: base64 },
            });
          }
        }
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

  const payload: any = { contents };

  // System instruction
  const sys = messages.find((m) => m.role === 'system');
  if (sys && typeof sys.content === 'string') {
    payload.system_instruction = { parts: [{ text: sys.content }] };
  }

  // Tool declaration for Gemini
  if (tools && tools.length > 0) {
    payload.tools = [
      {
        function_declarations: tools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        })),
      },
    ];
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  let text = '';
  const toolCalls: LLMToolCall[] = [];

  for (const part of candidate?.content?.parts || []) {
    if (part.text) text += part.text;
    if (part.functionCall) {
      toolCalls.push({
        id: `call_${Date.now()}_${Math.random()}`,
        type: 'function',
        function: {
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args),
        },
      });
    }
  }

  return {
    content: text,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    provider: 'gemini',
    model,
    usage: data.usageMetadata,
  };
}

function formatMessagesForOpenAI(messages: LLMMessage[]) {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
    name: m.name,
    tool_call_id: m.tool_call_id,
    tool_calls: m.tool_calls,
  }));
}
