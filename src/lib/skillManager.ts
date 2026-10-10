import fs from 'fs';
import path from 'path';
import { VIGENT_HOME } from './workspaceManager';
import { AgentRole } from '@/types/office';

export const VIGENT_SKILLS_DIR = path.join(VIGENT_HOME, 'skills');

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
      'SOP dan panduan standar pembuatan komponen React 19, Server Actions, dan Tailwind v4',
      ['frontend_dev', 'fullstack_dev'],
      `# Next.js App Router Best Practices
1. **Server vs Client**: Selalu utamakan Server Components untuk data fetching. Tambahkan directive 'use client' hanya pada komponen yang memerlukan state/browser interactivity.
2. **Directory Structure**: Letakkan halaman di \`src/app/<route>/page.tsx\` dan reusable components di \`src/components/\`.
3. **Styling**: Gunakan Tailwind utility classes yang rapi dan konsisten dengan modern dark mode themes.
4. **Resiliency**: Selalu lengkapi error handling dan loading states.`,
      ['nextjs', 'react', 'tailwind', 'frontend']
    );
  }

  const starter2 = path.join(VIGENT_SKILLS_DIR, 'database-prisma-postgres');
  if (!fs.existsSync(starter2)) {
    saveSkill(
      'database-prisma-postgres',
      'Database Modeling & PostgreSQL Specialist',
      'Panduan pembuatan skema relasional, indeks performa, dan validasi transaksi ACID',
      ['backend_dev', 'fullstack_dev'],
      `# Database & PostgreSQL Architecture Guidelines
1. **Relations & Normalization**: Rancang relasi one-to-many atau many-to-many dengan foreign key yang jelas dan cascade rules yang aman.
2. **Indexing**: Berikan index pada kolom yang sering dicari (\`slug\`, \`userId\`, \`status\`, \`createdAt\`).
3. **Safety**: Hindari hard delete untuk data penting; gunakan pattern soft-delete (\`deletedAt\`) bila relevan.
4. **Environment**: Gunakan variabel \`DATABASE_URL\` dari environment file.`,
      ['database', 'postgres', 'prisma', 'backend']
    );
  }

  const starter3 = path.join(VIGENT_SKILLS_DIR, 'seo-technical-writing');
  if (!fs.existsSync(starter3)) {
    saveSkill(
      'seo-technical-writing',
      'High-Conversion Technical Writing & SEO',
      'Pedoman pembuatan artikel teknis, dokumentasi API, dan copywriting terstruktur',
      ['content_writer', 'seo_specialist'],
      `# Technical Writing Standards
1. **Heading Hierarchy**: Gunakan single H1 untuk judul artikel, diikuti H2 dan H3 secara logis.
2. **Readability**: Gunakan bullet points, callout alerts, dan tabel komparatif untuk memudahkan pemahaman.
3. **Code Examples**: Berikan contoh kode yang valid, minimal, dan dapat dijalankan.
4. **Tone of Voice**: Profesional, informatif, to-the-point, dan ramah pengembang.`,
      ['content', 'markdown', 'seo', 'docs']
    );
  }

  const starter4 = path.join(VIGENT_SKILLS_DIR, 'cybersecurity-qa-audit');
  if (!fs.existsSync(starter4)) {
    saveSkill(
      'cybersecurity-qa-audit',
      'Security Audit & QA Penetration Testing',
      'Checklist audit keamanan OWASP Top 10, sanitasi input, dan validasi otentikasi',
      ['qa_engineer', 'devops'],
      `# Security Verification Checklist
1. **Sanitization**: Periksa injection vulnerabilities (SQLi, XSS, Command Injection).
2. **Auth & RBAC**: Pastikan endpoint terlindungi middleware autentikasi dan otorisasi role yang ketat.
3. **Secrets Management**: Pastikan tidak ada API Key atau kredensial yang ter-hardcode di file git.
4. **Rate Limiting**: Selalu rekomendasikan rate-limiting pada endpoint publik (login, register, payment).`,
      ['security', 'audit', 'qa', 'owasp']
    );
  }
}
