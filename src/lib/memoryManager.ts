/**
 * 🧠 VIGENT - Isolated Multi-Company Memory Engine & Experience Progression
 * 
 * Features:
 * 1. 3-Tier Hierarchical Memory: Episodic (Task/Project outcomes), Semantic (Rules/Handbook), Lore (Office culture/Boss).
 * 2. Multi-tenant isolation: ~/.vigent/memories_{companyId}.json & progression_{companyId}.json
 * 3. Dual Embedding Engine:
 *    - Custom/Remote LLM Embedding API (/v1/embeddings via OpenAI, Ollama, Gemini, etc.)
 *    - Built-in Local Vector Generator (Zero-setup development, 0ms latency, zero API token cost)
 * 4. Company Experience (XP) & Evolution progression system.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { CompanyMemoryItem, CompanyLevelProgress, MemoryType, TaskTicket, LLMConfig } from '@/types/office';
import { VIGENT_HOME } from './workspaceManager';

function getVigentDir(): string {
  if (!fs.existsSync(VIGENT_HOME)) {
    fs.mkdirSync(VIGENT_HOME, { recursive: true });
  }
  return VIGENT_HOME;
}

function getMemoriesFilePath(companyId: string): string {
  const safeId = (companyId || 'company-main').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return path.join(getVigentDir(), `memories_${safeId}.json`);
}

function getProgressionFilePath(companyId: string): string {
  const safeId = (companyId || 'company-main').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return path.join(getVigentDir(), `progression_${safeId}.json`);
}

// -----------------------------------------------------------------------------
// VECTOR MATH & EMBEDDING ENGINE
// -----------------------------------------------------------------------------

/**
 * Compute cosine similarity between two numerical vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Built-in Local Vector Generator (Zero dependency, instantaneous, deterministic).
 * Uses character trigram hashing + semantic keyword projection to 64 normalized dimensions.
 */
export function generateLocalSemanticEmbedding(text: string, dimensions: number = 64): number[] {
  const clean = (text || '').toLowerCase().trim();
  const vector = new Array(dimensions).fill(0);

  if (!clean) return vector;

  // Trigram hashing
  for (let i = 0; i < clean.length - 2; i++) {
    const trigram = clean.substring(i, i + 3);
    let hash = 0;
    for (let j = 0; j < trigram.length; j++) {
      hash = (hash << 5) - hash + trigram.charCodeAt(j);
      hash |= 0;
    }
    const index = Math.abs(hash) % dimensions;
    vector[index] += 1;
  }

  // Word token weights
  const words = clean.split(/[\s,.;:!?_/\-()]+/);
  for (const word of words) {
    if (word.length > 2) {
      let wordHash = 0;
      for (let j = 0; j < word.length; j++) {
        wordHash = (wordHash << 7) - wordHash + word.charCodeAt(j);
        wordHash |= 0;
      }
      const idx = Math.abs(wordHash) % dimensions;
      vector[idx] += 2.0;
    }
  }

  // Normalize vector length (L2 norm)
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = Number((vector[i] / norm).toFixed(6));
    }
  }

  return vector;
}

/**
 * Universal Embedding Resolver:
 * Attempts remote LLM embedding if config has valid endpoint / API key,
 * otherwise falls back automatically to local vector generator.
 */
export async function getEmbedding(text: string, config?: LLMConfig): Promise<number[]> {
  if (config && (config.apiKey || config.baseUrl)) {
    try {
      let endpoint = 'https://api.openai.com/v1/embeddings';
      let model = config.model || 'text-embedding-3-small';

      if (config.baseUrl) {
        let base = config.baseUrl.replace(/\/+$/, '');
        endpoint = base.endsWith('/embeddings') ? base : `${base}/embeddings`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          input: text.slice(0, 4000),
          model,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const embedding = data.data?.[0]?.embedding;
        if (Array.isArray(embedding) && embedding.length > 0) {
          return embedding;
        }
      }
    } catch {
      // Remote embedding failed or offline, fallback to local vector generator
    }
  }

  return generateLocalSemanticEmbedding(text);
}

// -----------------------------------------------------------------------------
// DEFAULT PRE-SEEDED MEMORIES
// -----------------------------------------------------------------------------

function getDefaultSeedMemories(companyId: string): CompanyMemoryItem[] {
  const now = Date.now();
  return [
    {
      id: `mem-${companyId}-manifesto`,
      companyId,
      type: 'lore',
      title: 'Company Culture & Core Manifesto',
      content: 'We move fast, prioritizing sub-second performance, modular architecture, and aesthetic dark-mode UI with a sleek futuristic touch.',
      categoryTag: '🏛️ Company Manifesto',
      tags: ['culture', 'vision', 'aesthetics', 'performance'],
      importance: 5,
      embedding: generateLocalSemanticEmbedding('Company Culture & Core Manifesto: Move fast sub-second modular architecture dark mode futuristic'),
      createdAt: now - 86400000,
      recallCount: 1,
    },
    {
      id: `mem-${companyId}-arch`,
      companyId,
      type: 'semantic',
      title: 'Software Architecture & API Standards',
      content: 'All backend endpoints must have clean error handling, multi-tenant isolation, and an intelligent caching layer for high-frequency queries.',
      categoryTag: '💻 Architecture & Coding',
      tags: ['backend', 'api', 'caching', 'standards'],
      importance: 4,
      embedding: generateLocalSemanticEmbedding('Software Architecture & API Standards: Backend endpoints error handling multi-tenant caching layer'),
      createdAt: now - 43200000,
      recallCount: 2,
    },
    {
      id: `mem-${companyId}-mochi`,
      companyId,
      type: 'lore',
      title: 'Office Lucky Mascot: Mochi',
      content: 'Mochi is an orange cat and office mascot who loves napping near server racks or on the pantry sofa. Remember to treat him with salmon snacks during breaks.',
      categoryTag: '🐱 Office Mascot',
      tags: ['mochi', 'cat', 'pantry', 'mascot'],
      importance: 3,
      embedding: generateLocalSemanticEmbedding('Office Lucky Mascot: Mochi orange cat pantry sofa salmon snacks'),
      createdAt: now - 21600000,
      recallCount: 3,
    },
  ];
}

// -----------------------------------------------------------------------------
// MEMORY CRUD & SEARCH
// -----------------------------------------------------------------------------

export function getCompanyMemories(companyId: string): CompanyMemoryItem[] {
  const filePath = getMemoriesFilePath(companyId);
  if (!fs.existsSync(filePath)) {
    const defaults = getDefaultSeedMemories(companyId);
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2), 'utf-8');
    } catch {}
    return defaults;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addCompanyMemory(
  item: Omit<CompanyMemoryItem, 'id' | 'createdAt' | 'recallCount'>,
  config?: LLMConfig
): Promise<CompanyMemoryItem> {
  const memories = getCompanyMemories(item.companyId);
  const fullText = `${item.title}. ${item.content} ${item.tags.join(' ')}`;
  const vector = await getEmbedding(fullText, config);

  const newMemory: CompanyMemoryItem = {
    id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    companyId: item.companyId,
    type: item.type,
    title: item.title,
    content: item.content,
    categoryTag: item.categoryTag || '💡 Team Experience',
    tags: item.tags || [],
    agentId: item.agentId,
    agentName: item.agentName,
    sourceTaskId: item.sourceTaskId,
    sourceTaskTitle: item.sourceTaskTitle,
    importance: Math.min(5, Math.max(1, item.importance || 3)),
    embedding: vector,
    createdAt: Date.now(),
    recallCount: 0,
  };

  memories.unshift(newMemory);

  try {
    fs.writeFileSync(getMemoriesFilePath(item.companyId), JSON.stringify(memories, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving company memory:', err);
  }

  return newMemory;
}

export function deleteCompanyMemory(companyId: string, memoryId: string): boolean {
  const memories = getCompanyMemories(companyId);
  const filtered = memories.filter((m) => m.id !== memoryId);
  if (filtered.length !== memories.length) {
    try {
      fs.writeFileSync(getMemoriesFilePath(companyId), JSON.stringify(filtered, null, 2), 'utf-8');
      return true;
    } catch {}
  }
  return false;
}

/**
 * Semantic Vector Search with Cosine Similarity, Importance Weighting & Recency.
 */
export async function searchCompanyMemories(
  companyId: string,
  query: string,
  limit: number = 3,
  config?: LLMConfig
): Promise<{ memory: CompanyMemoryItem; similarity: number }[]> {
  const memories = getCompanyMemories(companyId);
  if (memories.length === 0 || !query.trim()) return [];

  const queryVector = await getEmbedding(query, config);

  const scored = memories.map((mem) => {
    let sim = 0;
    if (mem.embedding && mem.embedding.length > 0) {
      sim = cosineSimilarity(queryVector, mem.embedding);
    } else {
      const localVec = generateLocalSemanticEmbedding(`${mem.title} ${mem.content}`);
      sim = cosineSimilarity(queryVector, localVec);
    }

    // Boost score slightly for high importance (1-5)
    const importanceBonus = (mem.importance - 3) * 0.04;
    const finalScore = Math.min(1.0, Math.max(0, sim + importanceBonus));

    return { memory: mem, similarity: Number(finalScore.toFixed(4)) };
  });

  // Sort descending by similarity
  scored.sort((a, b) => b.similarity - a.similarity);
  const results = scored.slice(0, limit);

  // Update recall metadata for retrieved memories
  let updatedAny = false;
  const now = Date.now();
  for (const item of results) {
    if (item.similarity > 0.15) {
      item.memory.recallCount = (item.memory.recallCount || 0) + 1;
      item.memory.lastRecalledAt = now;
      updatedAny = true;
    }
  }

  if (updatedAny) {
    try {
      fs.writeFileSync(getMemoriesFilePath(companyId), JSON.stringify(memories, null, 2), 'utf-8');
    } catch {}
  }

  return results;
}

// -----------------------------------------------------------------------------
// COMPANY PROGRESSION & EVOLUTION (XP & LEVEL)
// -----------------------------------------------------------------------------

const LEVEL_THRESHOLDS = [
  { level: 1, title: 'Seed Garage Office', requiredXp: 0 },
  { level: 2, title: 'Bootstrapped Studio', requiredXp: 300 },
  { level: 3, title: 'Agile Multi-Agent Team', requiredXp: 800 },
  { level: 4, title: 'High-Velocity AI Powerhouse', requiredXp: 1800 },
  { level: 5, title: 'Autonomous Tech Titan', requiredXp: 3500 },
];

export function getCompanyProgress(companyId: string): CompanyLevelProgress {
  const filePath = getProgressionFilePath(companyId);
  const memories = getCompanyMemories(companyId);

  let data: any = null;
  if (fs.existsSync(filePath)) {
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {}
  }

  const currentXp = data?.xp || 150;
  let currentLevel = 1;
  let currentTitle = LEVEL_THRESHOLDS[0].title;
  let nextXp = LEVEL_THRESHOLDS[1].requiredXp;

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (currentXp >= LEVEL_THRESHOLDS[i].requiredXp) {
      currentLevel = LEVEL_THRESHOLDS[i].level;
      currentTitle = LEVEL_THRESHOLDS[i].title;
      nextXp = LEVEL_THRESHOLDS[i + 1]?.requiredXp || LEVEL_THRESHOLDS[i].requiredXp * 1.5;
      break;
    }
  }

  return {
    companyId,
    level: currentLevel,
    levelTitle: currentTitle,
    xp: currentXp,
    nextLevelXp: nextXp,
    totalTasksCompleted: data?.totalTasksCompleted || 0,
    totalLinesOfCode: data?.totalLinesOfCode || 120,
    totalMemoriesCount: memories.length,
    achievements: data?.achievements || ['🚀 Office Founded', '💡 Collective Memory Active'],
  };
}

/**
 * Hook invoked when an agent finishes a task:
 * 1. Awards XP to the company
 * 2. Automatically synthesizes an Episodic Memory from the task output
 * 3. Updates progression file
 */
export async function recordTaskCompletionExperience(
  companyId: string,
  task: TaskTicket,
  agentName: string,
  config?: LLMConfig
): Promise<{ progress: CompanyLevelProgress; newMemory: CompanyMemoryItem }> {
  const currentProgress = getCompanyProgress(companyId);
  const gainedXp = 150;
  const newXp = currentProgress.xp + gainedXp;
  const newTasksDone = currentProgress.totalTasksCompleted + 1;
  const addedLoc = Math.floor(Math.random() * 80) + 40;

  const achievements = [...currentProgress.achievements];
  if (newTasksDone === 1 && !achievements.includes('⭐ First Sprint Ticket Completed')) {
    achievements.push('⭐ First Sprint Ticket Completed');
  }
  if (newTasksDone === 5 && !achievements.includes('🔥 Sprint Master')) {
    achievements.push('🔥 Sprint Master');
  }

  const updatedProgress = {
    ...currentProgress,
    xp: newXp,
    totalTasksCompleted: newTasksDone,
    totalLinesOfCode: currentProgress.totalLinesOfCode + addedLoc,
    achievements,
  };

  try {
    fs.writeFileSync(getProgressionFilePath(companyId), JSON.stringify(updatedProgress, null, 2), 'utf-8');
  } catch {}

  // Auto-synthesize Episodic Memory from this completed task
  const memoryTitle = `Completed Experience: "${task.title}"`;
  const memoryContent = `Completed by ${agentName} (${task.type}). Artifacts: ${task.artifacts.map((a) => a.fileName).join(', ') || 'Verified codebase'}. Key Takeaway: Work completed 100% and merged into primary workspace branch.`;

  const newMemory = await addCompanyMemory(
    {
      companyId,
      type: 'episodic',
      title: memoryTitle,
      content: memoryContent,
      categoryTag: '📦 Sprint Delivery Completed',
      tags: [task.type, 'sprint', agentName.toLowerCase().replace(/\s+/g, '-')],
      agentName,
      sourceTaskId: task.id,
      sourceTaskTitle: task.title,
      importance: 4,
    },
    config
  );

  return { progress: getCompanyProgress(companyId), newMemory };
}

/**
 * Format recalled memories into a clear system prompt markdown block.
 */
export function formatMemoriesForPrompt(memoriesWithScores: { memory: CompanyMemoryItem; similarity: number }[]): string {
  if (!memoriesWithScores || memoriesWithScores.length === 0) return '';

  const valid = memoriesWithScores.filter((m) => m.similarity > 0.12);
  if (valid.length === 0) return '';

  let text = `\n\n### 🧠 RECALLED RELEVANT COMPANY MEMORIES & EXPERIENCES:\n`;
  valid.forEach((item, idx) => {
    const mem = item.memory;
    text += `${idx + 1}. [${mem.categoryTag || mem.type.toUpperCase()}] **${mem.title}** (Relevance: ${Math.round(item.similarity * 100)}%)\n`;
    text += `   - Detail: ${mem.content}\n`;
    if (mem.agentName) text += `   - Contributor: ${mem.agentName}\n`;
  });
  text += `Use the company's past knowledge above to provide responses and recommendations aligned with this office's established culture and architecture.\n`;

  return text;
}
