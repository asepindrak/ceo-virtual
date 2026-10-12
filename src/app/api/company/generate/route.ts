import { NextResponse } from 'next/server';
import { Company, Department, Agent, TaskTicket, LLMConfig } from '@/types/office';
import { callLLMProvider, LLMMessage } from '@/lib/llmService';
import { DESK_SLOTS, DEFAULT_SHADOWMOVE_GLOBAL_LLM } from '@/lib/companyPresets';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      industry,
      agentCount = 4,
      config,
      layoutTemplate = 'tech_startup',
    }: {
      name: string;
      industry: string;
      agentCount?: number;
      config?: LLMConfig;
      layoutTemplate?: any;
    } = body;

    const cleanName = (name || '').trim();
    const cleanIndustry = (industry || '').trim();

    if (!cleanName || !cleanIndustry) {
      return NextResponse.json(
        { success: false, error: 'Nama perusahaan dan industri harus diisi.' },
        { status: 400 }
      );
    }

    const companyId = `company-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`;
    const count = Math.min(6, Math.max(3, Number(agentCount) || 4));

    // Check if real LLM is configured (either custom baseUrl or valid provider apiKey)
    const hasValidLLM = Boolean(
      config &&
      ((config.provider === 'custom' && config.baseUrl) ||
       (config.apiKey && config.apiKey.length > 5))
    );

    if (hasValidLLM && config) {
      try {
        const systemPrompt = `Anda adalah Executive Organizational Architect AI.
Tugas Anda adalah merancang struktur organisasi lengkap untuk perusahaan baru di industri spesifik dalam format JSON murni.
Pastikan nama-nama karyawan sangat natural, peran dan skill relevan 100% dengan industri "${cleanIndustry}", dan kepribadian MBTI bervariasi.`;

        const userPrompt = `Rancang perusahaan baru:
- Nama Perusahaan: "${cleanName}"
- Bidang Industri & Spesialisasi: "${cleanIndustry}"
- Jumlah Karyawan / Agen: ${count} orang

Format JSON yang HARUS dikembalikan (HANYA JSON VALID TANPA MARKDOWN):
{
  "description": "Deskripsi profil dan visi perusahaan dalam 1-2 kalimat",
  "departments": [
    {
      "idSuffix": "dept-core",
      "name": "Nama Departemen 1 (misal Manajemen/Strategi)",
      "color": "#6366f1",
      "iconName": "Compass",
      "description": "Fokus departemen"
    },
    {
      "idSuffix": "dept-ops",
      "name": "Nama Departemen 2 (misal Operasional/Spesialis)",
      "color": "#06b6d4",
      "iconName": "Cpu",
      "description": "Fokus departemen"
    },
    {
      "idSuffix": "dept-growth",
      "name": "Nama Departemen 3 (misal Kreatif/Pertumbuhan/Hubungan)",
      "color": "#f59e0b",
      "iconName": "FileText",
      "description": "Fokus departemen"
    }
  ],
  "agents": [
    {
      "name": "Nama Karyawan",
      "gender": "male",
      "role": "project_manager",
      "roleTitle": "Jabatan Spesifik",
      "deptIndex": 0,
      "skills": ["Skill 1", "Skill 2", "Skill 3"],
      "bio": "Profil ringkas 1 kalimat",
      "personality": {
        "mbti": "ENTJ",
        "enneagram": "8w7",
        "archetype": "The Strategic Leader",
        "traits": ["Visioner", "Tegas", "Solutif"],
        "speakingStyle": "Percaya diri dan memotivasi",
        "interests": ["Inovasi", "Kopi", "Strategi"]
      },
      "hairStyle": "slick_back",
      "hairColor": "#1e293b",
      "eyeColor": "#0284c7",
      "skinColor": "#fde047",
      "avatarColor": "#6366f1",
      "shirtColor": "#3730a3",
      "accessory": "none"
    }
  ],
  "tasks": [
    {
      "title": "Nama Tugas Sprint 1",
      "description": "Deskripsi tugas sprint perdana",
      "type": "coding",
      "agentIndex": 1,
      "deptIndex": 1,
      "progress": 35
    },
    {
      "title": "Nama Tugas Sprint 2",
      "description": "Deskripsi tugas sprint kedua",
      "type": "content",
      "agentIndex": 2,
      "deptIndex": 2,
      "progress": 20
    }
  ]
}

Catatan penting:
- "gender": "male" atau "female"
- "hairStyle": "undercut", "short_messy", "slick_back", "twintails", "bob_cut", "long_flowing", atau "ponytail"
- "accessory": "glasses", "headphone", "ribbon", "hairclip", "cyber_earpiece", atau "none"
- "role": salah satu dari: "project_manager", "fullstack_dev", "backend_dev", "content_writer", "qa_engineer", "designer"
- "type" di tasks: "coding", "content", "architecture", "qa", atau "design"`;

        const messages: LLMMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];

        // 12-second timeout race for LLM response
        const timeoutPromise = new Promise<{ content: string }>((_, reject) =>
          setTimeout(() => reject(new Error('LLM Generation Timeout')), 12000)
        );

        const llmRes = await Promise.race([
          callLLMProvider(config, messages),
          timeoutPromise,
        ]);

        let raw = llmRes.content.trim();
        if (raw.startsWith('```json')) {
          raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        } else if (raw.startsWith('```')) {
          raw = raw.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
        }

        const parsed = JSON.parse(raw);
        if (parsed.departments && parsed.agents && parsed.agents.length >= 2) {
          const depts: Department[] = parsed.departments.map((d: any, idx: number) => ({
            id: `${companyId}-${d.idSuffix || `dept-${idx}`}`,
            name: d.name || `Divisi ${idx + 1}`,
            color: d.color || (idx === 0 ? '#6366f1' : idx === 1 ? '#06b6d4' : '#f59e0b'),
            iconName: d.iconName || (idx === 0 ? 'Compass' : idx === 1 ? 'Cpu' : 'FileText'),
            description: d.description || '',
          }));

          const agents: Agent[] = parsed.agents.slice(0, count).map((a: any, idx: number) => {
            const deptId = depts[a.deptIndex] ? depts[a.deptIndex].id : depts[0].id;
            return {
              id: `agent-${companyId}-${idx + 1}`,
              name: a.name || `Agent ${idx + 1}`,
              gender: a.gender === 'female' ? 'female' : 'male',
              hairStyle: a.hairStyle || (idx % 2 === 0 ? 'slick_back' : 'bob_cut'),
              hairColor: a.hairColor || '#1e293b',
              eyeColor: a.eyeColor || '#0284c7',
              skinColor: a.skinColor || '#fde047',
              accessory: a.accessory || 'none',
              avatarColor: a.avatarColor || (idx === 0 ? '#6366f1' : idx === 1 ? '#06b6d4' : idx === 2 ? '#f59e0b' : '#10b981'),
              role: a.role === 'designer' ? 'ui_designer' : (a.role || (idx === 0 ? 'project_manager' : idx === 1 ? 'fullstack_dev' : 'content_writer')),
              roleTitle: a.roleTitle || `${cleanIndustry} Specialist`,
              departmentId: deptId,
              deskPosition: DESK_SLOTS[idx] || { x: 0, z: 0 },
              currentPosition: DESK_SLOTS[idx] || { x: 0, z: 0 },
              rotationY: idx % 2 === 0 ? 0 : Math.PI,
              state: 'working',
              stateMessage: `Fokus pada eksekusi operasional "${cleanName}"`,
              skills: Array.isArray(a.skills) ? a.skills : ['Keahlian Utama', 'Kolaborasi Tim'],
              bio: a.bio || `Profesional di bidang ${cleanIndustry}.`,
              personality: {
                mbti: a.personality?.mbti || (idx === 0 ? 'ENTJ' : idx === 1 ? 'INTJ' : 'ENFP'),
                enneagram: a.personality?.enneagram || (idx === 0 ? '8w7' : '5w6'),
                archetype: a.personality?.archetype || 'The Domain Specialist',
                traits: Array.isArray(a.personality?.traits) ? a.personality.traits : ['Dedikatif', 'Fokus'],
                speakingStyle: a.personality?.speakingStyle || 'Profesional dan ramah',
                interests: Array.isArray(a.personality?.interests) ? a.personality.interests : ['Teknologi', 'Kopi'],
              },
              liveCodeOutput: [
                `// [${a.name}] ${cleanName} - ${a.roleTitle}`,
                `export function init${cleanName.replace(/[^a-zA-Z0-9]/g, '')}Workflow() {`,
                `  return { status: "ACTIVE", domain: "${cleanIndustry}" };`,
                `}`,
              ],
              stats: { tasksCompleted: 0, linesOfCode: 120, wordsWritten: 450, collabCount: 0 },
            };
          });

          const tasks: TaskTicket[] = (parsed.tasks || []).map((t: any, idx: number) => {
            const assignedAgent = agents[t.agentIndex] || agents[Math.min(idx, agents.length - 1)];
            const deptId = depts[t.deptIndex] ? depts[t.deptIndex].id : depts[0].id;
            return {
              id: `task-${companyId}-${idx + 1}`,
              title: t.title || `Inisiasi ${cleanIndustry} Sprint`,
              projectName: cleanName,
              description: t.description || `Eksekusi prioritas awal untuk ${cleanName}.`,
              type: t.type || (idx === 0 ? 'coding' : 'content'),
              departmentId: deptId,
              assignedAgentId: assignedAgent?.id,
              status: 'in_progress',
              progress: t.progress || 30,
              artifacts: [
                {
                  id: `art-${companyId}-${idx + 1}`,
                  fileName: `SprintDeliverable_${idx + 1}.md`,
                  type: 'markdown',
                  content: `# ${t.title || 'Sprint Deliverable'}\nDokumen inisiasi oleh tim ${cleanName}.`,
                },
              ],
              logs: ['Tiket dibuat otomatis oleh LLM.', 'Pengerjaan dimulai di meja kerja.'],
              createdAt: Date.now(),
            };
          });

          const generatedCompany: Company = {
            id: companyId,
            ownerUserId: 'usr-sang-01',
            name: cleanName,
            industry: cleanIndustry,
            description: parsed.description || `Perusahaan berdaya otonom yang bergerak di industri ${cleanIndustry}.`,
            departments: depts,
            agents,
            tasks,
            officeLayoutTemplate: layoutTemplate,
            globalLLMConfig: {
              ...DEFAULT_SHADOWMOVE_GLOBAL_LLM,
              text: {
                provider: config.provider,
                baseUrl: config.baseUrl,
                apiKey: config.apiKey,
                model: config.model,
                description: `Model AI kustom untuk ${cleanName}`,
                isEnabled: true,
              },
            },
          };

          return NextResponse.json({
            success: true,
            company: generatedCompany,
            source: 'llm',
          });
        }
      } catch (llmError: any) {
        console.warn('[/api/company/generate] LLM generation failed/timed out, using adaptive template:', llmError?.message);
      }
    }

    // Adaptive High-Quality Fallback (Zero error, instantaneous)
    const departments: Department[] = [
      {
        id: `${companyId}-dept-core`,
        name: 'Strategy & Leadership',
        color: '#6366f1',
        iconName: 'Compass',
        description: `Arahan visi dan manajemen terpadu untuk ${cleanName}`,
      },
      {
        id: `${companyId}-dept-exec`,
        name: 'Technical & Operations',
        color: '#06b6d4',
        iconName: 'Cpu',
        description: `Eksekusi operasional dan pengembangan solusi ${cleanIndustry}`,
      },
      {
        id: `${companyId}-dept-growth`,
        name: 'Client & Creative Outreach',
        color: '#f59e0b',
        iconName: 'FileText',
        description: `Pertumbuhan pasar, dokumentasi, dan hubungan klien`,
      },
    ];

    const fallbackTemplates = [
      {
        name: 'Marcus Vance',
        gender: 'male' as const,
        hairStyle: 'slick_back' as const,
        hair: '#1e293b',
        eyeColor: '#0284c7',
        accessory: 'none' as const,
        role: 'project_manager' as const,
        roleTitle: `${cleanIndustry} Director`,
        dept: departments[0].id,
        color: '#6366f1',
        shirt: '#3730a3',
        skin: '#fde047',
        mbti: 'ENTJ',
        enneagram: '8w7',
        archetype: 'The Strategic Leader',
        traits: ['Visioner', 'Tegas', 'Fokus Solusi'],
        skills: ['Roadmap Architecture', 'System Strategy', 'Team Orchestration'],
        bio: `Memimpin arah strategis dan orkestrasi operasional ${cleanName}.`,
      },
      {
        name: 'Aria Thorne',
        gender: 'female' as const,
        hairStyle: 'bob_cut' as const,
        hair: '#0f172a',
        eyeColor: '#8b5cf6',
        accessory: 'cyber_earpiece' as const,
        role: 'fullstack_dev' as const,
        roleTitle: `Lead ${cleanIndustry} Architect`,
        dept: departments[1].id,
        color: '#06b6d4',
        shirt: '#155e75',
        skin: '#fbcfe8',
        mbti: 'INTJ',
        enneagram: '5w6',
        archetype: 'The Mastermind Architect',
        traits: ['Analitis', 'Problem Solver', 'Presisi'],
        skills: ['Software Architecture', 'Core Systems', 'Performance Tuning'],
        bio: `Membangun arsitektur dan sistem inti untuk ${cleanName}.`,
      },
      {
        name: 'Sofia Valdes',
        gender: 'female' as const,
        hairStyle: 'twintails' as const,
        hair: '#ec4899',
        eyeColor: '#d97706',
        accessory: 'hairclip' as const,
        role: 'content_writer' as const,
        roleTitle: 'Content & Strategy Specialist',
        dept: departments[2].id,
        color: '#f59e0b',
        shirt: '#854d0e',
        skin: '#fed7aa',
        mbti: 'ENFP',
        enneagram: '7w8',
        archetype: 'The Creative Catalyst',
        traits: ['Ekspresif', 'Kreatif', 'Komunikatif'],
        skills: ['Copywriting', 'SEO Research', 'Brand Narrative'],
        bio: `Menyusun narasi dan dokumentasi publik untuk ${cleanIndustry}.`,
      },
      {
        name: 'Ren Takahashi',
        gender: 'male' as const,
        hairStyle: 'short_messy' as const,
        hair: '#18181b',
        eyeColor: '#10b981',
        accessory: 'glasses' as const,
        role: 'qa_engineer' as const,
        roleTitle: 'Quality Assurance Lead',
        dept: departments[1].id,
        color: '#10b981',
        shirt: '#065f46',
        skin: '#fef08a',
        mbti: 'ISTJ',
        enneagram: '1w9',
        archetype: 'The Resilient Sentinel',
        traits: ['Teliti', 'Disiplin', 'Zero Defect'],
        skills: ['Testing Automation', 'Quality Audits', 'Security Verification'],
        bio: `Memastikan seluruh luaran kerja ${cleanName} berkualitas tinggi dan bebas cacat.`,
      },
      {
        name: 'Elena Rostova',
        gender: 'female' as const,
        hairStyle: 'long_flowing' as const,
        hair: '#475569',
        eyeColor: '#38bdf8',
        accessory: 'none' as const,
        role: 'ui_designer' as const,
        roleTitle: 'UI/UX & Product Designer',
        dept: departments[2].id,
        color: '#ec4899',
        shirt: '#831843',
        skin: '#fed7aa',
        mbti: 'ISFP',
        enneagram: '4w3',
        archetype: 'The Aesthetic Artisan',
        traits: ['Detail Oriented', 'Estetis', 'Empati Tinggi'],
        skills: ['Design Systems', 'Micro-interactions', 'User Journey'],
        bio: `Menciptakan antarmuka yang memukau dan pengalaman pengguna yang mulus.`,
      },
      {
        name: 'Kai Nakamura',
        gender: 'male' as const,
        hairStyle: 'undercut' as const,
        hair: '#09090b',
        eyeColor: '#e11d48',
        accessory: 'headphone' as const,
        role: 'backend_dev' as const,
        roleTitle: 'Cloud & Infrastructure Engineer',
        dept: departments[1].id,
        color: '#0ea5e9',
        shirt: '#0369a1',
        skin: '#fde047',
        mbti: 'ISTP',
        enneagram: '9w8',
        archetype: 'The Pragmatic Craftsman',
        traits: ['Tenang', 'Efisien', 'Solutif'],
        skills: ['Cloud Infra', 'Database Optimization', 'High Availability'],
        bio: `Menjaga infrastruktur komputasi ${cleanName} tetap cepat dan andal.`,
      },
    ];

    const agents: Agent[] = fallbackTemplates.slice(0, count).map((t, idx) => ({
      id: `agent-${companyId}-${idx + 1}`,
      name: t.name,
      gender: t.gender,
      hairStyle: t.hairStyle,
      hairColor: t.hair,
      eyeColor: t.eyeColor,
      skinColor: t.skin,
      accessory: t.accessory,
      avatarColor: t.color,
      shirtColor: t.shirt,
      role: t.role,
      roleTitle: t.roleTitle,
      departmentId: t.dept,
      deskPosition: DESK_SLOTS[idx] || { x: 0, z: 0 },
      currentPosition: DESK_SLOTS[idx] || { x: 0, z: 0 },
      rotationY: idx % 2 === 0 ? 0 : Math.PI,
      state: 'working',
      stateMessage: `Fokus pada eksekusi operasional "${cleanName}"`,
      skills: t.skills,
      bio: t.bio,
      personality: {
        mbti: t.mbti,
        enneagram: t.enneagram,
        archetype: t.archetype,
        traits: t.traits,
        speakingStyle: 'Profesional, santai dan solutif',
        interests: ['Inovasi', 'Kopi', 'Teknologi'],
      },
      liveCodeOutput: [
        `// [${t.name}] ${cleanName} - ${t.roleTitle}`,
        `export function runExecution() {`,
        `  console.log("Menjalankan tugas ${cleanIndustry}...");`,
        `}`,
      ],
      stats: { tasksCompleted: 0, linesOfCode: 150, wordsWritten: 500, collabCount: 0 },
    }));

    const tasks: TaskTicket[] = [
      {
        id: `task-${companyId}-1`,
        title: `Rancang Fondasi Solusi ${cleanName}`,
        projectName: cleanName,
        description: `Implementasi sistem arsitektur inti untuk industri ${cleanIndustry}.`,
        type: 'coding',
        departmentId: departments[1].id,
        assignedAgentId: agents[1]?.id,
        status: 'in_progress',
        progress: 35,
        artifacts: [
          {
            id: `art-${companyId}-1`,
            fileName: 'CoreArchitecture.md',
            type: 'markdown',
            content: `# ${cleanName} Foundation\nArsitektur awal untuk ${cleanIndustry}.`,
          },
        ],
        logs: ['Inisiasi sistem fondasi selesai.', 'Mulai eksekusi di meja kerja.'],
        createdAt: Date.now(),
      },
      {
        id: `task-${companyId}-2`,
        title: `Dokumentasi & Strategi Pasar ${cleanName}`,
        projectName: cleanName,
        description: `Menyusun panduan produk dan strategi audiens untuk ${cleanIndustry}.`,
        type: 'content',
        departmentId: departments[2].id,
        assignedAgentId: agents[2]?.id,
        status: 'in_progress',
        progress: 20,
        artifacts: [
          {
            id: `art-${companyId}-2`,
            fileName: 'MarketStrategy.md',
            type: 'markdown',
            content: `# Strategi Pasar ${cleanName}\nAnalisis tren pasar ${cleanIndustry}.`,
          },
        ],
        logs: ['Riset pasar dikompilasi.', 'Drafting dokumen awal.'],
        createdAt: Date.now(),
      },
    ];

    const generatedCompany: Company = {
      id: companyId,
      ownerUserId: 'usr-sang-01',
      name: cleanName,
      industry: cleanIndustry,
      description: `Perusahaan otonom yang berfokus pada industri ${cleanIndustry}.`,
      departments,
      agents,
      tasks,
      officeLayoutTemplate: layoutTemplate,
      globalLLMConfig: config ? {
        ...DEFAULT_SHADOWMOVE_GLOBAL_LLM,
        text: {
          provider: config.provider,
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
          description: `Model AI untuk ${cleanName}`,
          isEnabled: true,
        },
      } : DEFAULT_SHADOWMOVE_GLOBAL_LLM,
    };

    return NextResponse.json({
      success: true,
      company: generatedCompany,
      source: 'adaptive_template',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal menghasilkan perusahaan baru' },
      { status: 500 }
    );
  }
}
