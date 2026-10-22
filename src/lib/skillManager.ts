import fs from 'fs';
import path from 'path';
import { VIGENT_HOME } from './workspaceManager';
import { AgentRole } from '@/types/office';

export const VIGENT_SKILLS_DIR = path.join(VIGENT_HOME, 'skills');
export const CEO_SKILLS_DIR = VIGENT_SKILLS_DIR;

export interface VigentSkill {
  id: string;
  name: string;
  title: string;
  description: string;
  version: string;
  assignedRoles: AgentRole[] | 'all';
  tags: string[];
  instructions: string;
  filePath: string;
  createdAt: number;
}
export type CeoVirtualSkill = VigentSkill;

// Ensure ~/.vigent/skills directory and populate starter skills
export function initSkillsDirectory(): VigentSkill[] {
  if (!fs.existsSync(VIGENT_SKILLS_DIR)) {
    fs.mkdirSync(VIGENT_SKILLS_DIR, { recursive: true });
  }

  // Pre-seed starter skills if empty
  ensureStarterSkills();

  return listInstalledSkills();
}

// List all installed skills
export function listInstalledSkills(): VigentSkill[] {
  if (!fs.existsSync(VIGENT_SKILLS_DIR)) {
    fs.mkdirSync(VIGENT_SKILLS_DIR, { recursive: true });
  }

  const entries = fs.readdirSync(VIGENT_SKILLS_DIR, { withFileTypes: true });
  const skills: VigentSkill[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillFile = path.join(VIGENT_SKILLS_DIR, entry.name, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        try {
          const content = fs.readFileSync(skillFile, 'utf-8');
          const skill = parseSkillFile(entry.name, skillFile, content);
          if (skill) skills.push(skill);
        } catch {
          // ignore corrupted skill file
        }
      }
    }
  }

  return skills;
}

// Get skills matching an agent role
export function getSkillsForRole(role: AgentRole): VigentSkill[] {
  const allSkills = listInstalledSkills();
  return allSkills.filter(
    (s) => s.assignedRoles === 'all' || (Array.isArray(s.assignedRoles) && s.assignedRoles.includes(role))
  );
}

// Create or update a skill
export function saveSkill(skillId: string, title: string, description: string, assignedRoles: AgentRole[] | 'all', instructions: string, tags: string[] = []): string {
  const safeId = skillId.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const skillFolder = path.join(VIGENT_SKILLS_DIR, safeId);
  if (!fs.existsSync(skillFolder)) {
    fs.mkdirSync(skillFolder, { recursive: true });
  }

  const rolesStr = assignedRoles === 'all' ? '"all"' : JSON.stringify(assignedRoles);
  const tagsStr = JSON.stringify(tags);

  const fileContent = `---
name: ${safeId}
title: ${title}
description: ${description}
version: 1.0.0
assignedRoles: ${rolesStr}
tags: ${tagsStr}
---

${instructions.trim()}
`;

  const targetFile = path.join(skillFolder, 'SKILL.md');
  fs.writeFileSync(targetFile, fileContent, 'utf-8');
  return targetFile;
}

// Parse SKILL.md with frontmatter
function parseSkillFile(folderName: string, filePath: string, content: string): VigentSkill | null {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    return {
      id: folderName,
      name: folderName,
      title: folderName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: 'Standard agent operational instruction',
      version: '1.0.0',
      assignedRoles: 'all',
      tags: [],
      instructions: content.trim(),
      filePath,
      createdAt: Date.now(),
    };
  }

  const rawMeta = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  let title = folderName;
  let description = '';
  let version = '1.0.0';
  let assignedRoles: AgentRole[] | 'all' = 'all';
  let tags: string[] = [];

  rawMeta.split('\n').forEach((line) => {
    const [key, ...rest] = line.split(':');
    if (!key || rest.length === 0) return;
    const val = rest.join(':').trim();

    if (key.trim() === 'title') title = val;
    if (key.trim() === 'description') description = val;
    if (key.trim() === 'version') version = val;
    if (key.trim() === 'assignedRoles') {
      try {
        assignedRoles = JSON.parse(val);
      } catch {
        assignedRoles = val === '"all"' || val === 'all' ? 'all' : [];
      }
    }
    if (key.trim() === 'tags') {
      try {
        tags = JSON.parse(val);
      } catch {
        tags = [];
      }
    }
  });

  return {
    id: folderName,
    name: folderName,
    title,
    description,
    version,
    assignedRoles,
    tags,
    instructions: body.trim(),
    filePath,
    createdAt: Date.now(),
  };
}

// Pre-seed default skills for Frontend, Backend, Content Writer, QA
function ensureStarterSkills() {
  const starter1 = path.join(VIGENT_SKILLS_DIR, 'nextjs-app-router');
  if (!fs.existsSync(starter1)) {
    saveSkill(
      'nextjs-app-router',
      'Next.js App Router Architecture Expert',
      'SOP and standard guidelines for building React 19 components, Server Actions, and Tailwind v4',
      ['frontend_dev', 'fullstack_dev'],
      `# Next.js App Router Best Practices
1. **Server vs Client**: Always prioritize Server Components for data fetching. Add 'use client' directive only to components requiring state/browser interactivity.
2. **Directory Structure**: Place pages in \`src/app/<route>/page.tsx\` and reusable components in \`src/components/\`.
3. **Styling**: Use clean Tailwind utility classes consistent with modern dark mode themes.
4. **Resiliency**: Always provide robust error handling and loading states.`,
      ['nextjs', 'react', 'tailwind', 'frontend']
    );
  }

  const starter2 = path.join(VIGENT_SKILLS_DIR, 'database-prisma-postgres');
  if (!fs.existsSync(starter2)) {
    saveSkill(
      'database-prisma-postgres',
      'Database Modeling & PostgreSQL Specialist',
      'Relational schema design guidelines, performance indexing, and ACID transaction safety',
      ['backend_dev', 'fullstack_dev'],
      `# Database & PostgreSQL Architecture Guidelines
1. **Relations & Normalization**: Design one-to-many or many-to-many relations with explicit foreign keys and safe cascade rules.
2. **Indexing**: Index frequently queried columns (\`slug\`, \`userId\`, \`status\`, \`createdAt\`).
3. **Safety**: Avoid hard deletion on critical records; apply soft-delete patterns (\`deletedAt\`) where relevant.
4. **Environment**: Use \`DATABASE_URL\` securely from environment configuration.`,
      ['database', 'postgres', 'prisma', 'backend']
    );
  }

  const starter3 = path.join(VIGENT_SKILLS_DIR, 'seo-technical-writing');
  if (!fs.existsSync(starter3)) {
    saveSkill(
      'seo-technical-writing',
      'High-Conversion Technical Writing & SEO',
      'Guidelines for crafting technical articles, API references, and structured copywriting',
      ['content_writer', 'seo_specialist'],
      `# Technical Writing Standards
1. **Heading Hierarchy**: Use a single H1 for the article title, followed logically by H2 and H3 subheadings.
2. **Readability**: Employ bullet points, callout alerts, and comparative tables for fast comprehension.
3. **Code Examples**: Provide valid, concise, and executable code snippets.
4. **Tone of Voice**: Professional, informative, to-the-point, and developer-friendly.`,
      ['content', 'markdown', 'seo', 'docs']
    );
  }

  const starter4 = path.join(VIGENT_SKILLS_DIR, 'cybersecurity-qa-audit');
  if (!fs.existsSync(starter4)) {
    saveSkill(
      'cybersecurity-qa-audit',
      'Security Audit & QA Penetration Testing',
      'OWASP Top 10 security audit checklist, input sanitization, and authentication validation',
      ['qa_engineer', 'devops'],
      `# Security Verification Checklist
1. **Sanitization**: Audit for injection vulnerabilities (SQLi, XSS, Command Injection).
2. **Auth & RBAC**: Ensure sensitive endpoints are guarded with authentication middleware and strict role-based access control.
3. **Secrets Management**: Verify no API keys, private tokens, or credentials are hardcoded into Git.
4. **Rate Limiting**: Always recommend rate-limiting on public endpoints (login, register, payment).`,
      ['security', 'audit', 'qa', 'owasp']
    );
  }
}
