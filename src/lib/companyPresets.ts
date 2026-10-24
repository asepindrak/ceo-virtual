import { Company, Department, Agent, TaskTicket, LLMConfig, CompanyGlobalLLMConfig, LLMCategory, OfficeLayoutTemplateId } from '@/types/office';

// Predefined dedicated desk locations in the office (spacious layout: Highest-ranking agent gets private suite, others get open workspace)
export const DESK_SLOTS = [
  { x: 11.5, z: -7.0 }, // Meja 1: Agent Tertinggi (Founder / Lead Architect) di Ruangan Terpisah Eksekutif
  { x: 3.6, z: -8.0 },  // Meja 2: Senior Creative Frontend Lead (Open Workspace Pod Kanan - Row 1)
  { x: -3.6, z: -8.0 }, // Meja 3: Lead Backend & Cloud Architect (Open Workspace Pod Kiri - Row 1)
  { x: 3.6, z: -3.5 },  // Meja 4: QA & AI Automation Engineer (Open Workspace Pod Kanan - Row 2)
  { x: -3.6, z: -3.5 }, // Meja 5: Cloud & DevOps Platform (Open Workspace Pod Kiri - Row 2)
  { x: 3.6, z: 1.2 },   // Meja 6: UI/UX & Design Systems (Open Workspace Pod Kanan - Row 3)
  { x: -3.6, z: 1.2 },  // Meja 7: AI & Data Science (Open Workspace Pod Kiri - Row 3)
  { x: 3.6, z: 5.6 },   // Meja 8: Mobile & Fullstack (Open Workspace Pod Kanan - Row 4)
  { x: -3.6, z: 5.6 },  // Meja 9: Security & Reliability (Open Workspace Pod Kiri - Row 4)
];

export const MEETING_ROOM_CENTER = { x: 11.0, z: 5.5 };
export const CONFERENCE_SEATS = [
  { x: 13.5, z: 6.0 }, // Kursi 0 (Kanan)
  { x: 13.0, z: 7.5 }, // Kursi 1 (Kanan-Bawah)
  { x: 11.5, z: 8.2 }, // Kursi 2 (Bawah)
  { x: 10.0, z: 7.5 }, // Kursi 3 (Kiri-Bawah)
  { x: 9.5, z: 6.0 },  // Kursi 4 (Kiri)
  { x: 10.0, z: 4.5 }, // Kursi 5 (Kiri-Atas)
  { x: 11.5, z: 3.8 }, // Kursi 6 (Atas)
  { x: 13.0, z: 4.5 }, // Kursi 7 (Kanan-Atas)
];
export const PANTRY_CENTER = { x: -10.5, z: 5.5 };
export const COFFEE_MACHINE_SPOT = { x: -10.5, z: 5.5 };
export const PANTRY_TABLE_SPOT = { x: -9.0, z: 7.0 };
export const GAME_ROOM_SPOT = { x: -7.5, z: -2.5 };
export const SOFA_LOUNGE_SPOT = { x: -10.5, z: -7.5 };
export const LOBBY_SPOT = { x: 0.0, z: 7.5 };
export const SPRINT_STATION_SPOT = { x: 11.5, z: 3.5 };
export const WATER_COOLER_SPOT = { x: -11.5, z: -6.5 };
export const OWNER_DESK_POSITION = { x: 11.5, z: -7.0 };
export const OWNER_INTERACTION_SPOT = { x: 9.5, z: -5.5 };
export const EXIT_DOOR_SPOT = { x: 0.0, z: 9.5 };
export const TRAIN_STATION_SPOT = { x: 9.5, z: 14.5 };
export const CAR_PARKING_SPOT = { x: -9.0, z: 15.0 };

export interface OfficeLayoutTemplateInfo {
  id: OfficeLayoutTemplateId;
  name: string;
  tagline: string;
  icon: string;
  badge: string;
  color: string;
  description: string;
  highlights: string[];
}

export const OFFICE_LAYOUT_TEMPLATES: OfficeLayoutTemplateInfo[] = [
  {
    id: 'tech_startup',
    name: 'Modern Tech Startup',
    tagline: 'Agile pods, glass sprint room & arcade lounge',
    icon: '⚡',
    badge: 'Startup',
    color: '#6366f1',
    description: 'Dynamic modern layout featuring dual workstation pods, glass sprint meeting room, full espresso bar pantry, and relaxing arcade lounge.',
    highlights: ['Workstation Pods Ultrawide', 'Glass Sprint Review Room', 'Pantry & Espresso Bar', 'Retro Arcade & Lounge Sofa'],
  },
  {
    id: 'cloud_datacenter',
    name: 'Cloud Infrastructure & NOC',
    tagline: 'Server colocation aisles & 24/7 mission control',
    icon: '☁️',
    badge: 'Cloud & Mesh',
    color: '#0284c7',
    description: 'Cloud computing infrastructure layout featuring colocation server racks with blue/cyan LED arrays, 24/7 NOC display wall, and raised antistatic floor.',
    highlights: ['Cold-Aisle Server Racks', 'NOC Mission Control Wall', 'Raised Antistatic Floor', 'Cable Duct Fiber Trays'],
  },
  {
    id: 'cafe_agency',
    name: 'Warm Cafe & Boutique Agency',
    tagline: 'Hardwood parquet, espresso roaster & cozy benches',
    icon: '☕',
    badge: 'Cafe & Dev',
    color: '#b45309',
    description: 'Warm boutique cafe ambiance with teak parquet hardwood flooring, manual coffee roasting bar, long communal tables, and warm ambient pendant lighting.',
    highlights: ['Teak Wood Parquet Floor', 'Espresso Roaster Counter', 'Communal Coworking Bench', 'Hanging Pendant Greenery'],
  },
  {
    id: 'fintech_trading',
    name: 'High-Frequency Trading & FinTech',
    tagline: 'Bloomberg terminals & live financial ticker wall',
    icon: '📈',
    badge: 'Trading & Asset',
    color: '#059669',
    description: 'Luxurious gold-accented marble flooring with 4-monitor Bloomberg terminal trading desks, live candlestick ticker wall, and soundproof high-security boardroom.',
    highlights: ['Polished Marble Floors', 'Multi-Screen Trading Pods', 'Live Candlestick Ticker Wall', 'Biometric Glass Boardroom'],
  },
  {
    id: 'creative_genai',
    name: 'GenAI & Creative Design Studio',
    tagline: 'Artistic rugs, Cintiq drawing pads & generative showcase',
    icon: '🎨',
    badge: 'GenAI & Design',
    color: '#d97706',
    description: 'Digital art & GenAI studio with colorful geometric rugs, Cintiq stylus drawing tablets, dynamic AI canvas display gallery, and creative Pantone swatch moodboards.',
    highlights: ['Artistic Geometric Rugs', 'Digital Drafting Tablets', 'Dynamic GenAI Art Gallery', 'Pantone Swatch Moodboards'],
  },
  {
    id: 'robotics_hardware',
    name: 'Robotics & Hardware Lab',
    tagline: 'ESD flooring, robotic arms & drone test helipad',
    icon: '🤖',
    badge: 'Hardware & Drone',
    color: '#0891b2',
    description: 'High-precision engineering laboratory with gray ESD antistatic hazard-striped flooring, robotic assembly benches with mechanical arms, component racks, and indoor drone test flight helipad.',
    highlights: ['Antistatic ESD Gray Floor', 'Robotic Assembly Benches', 'Parts Bins & Tool Racks', 'Indoor Drone Flight Helipad'],
  },
];

export const SHADOWMOVE_LLM_CONFIG: LLMConfig = {
  provider: (process.env.NEXT_PUBLIC_DEFAULT_LLM_PROVIDER as any) || 'openai',
  baseUrl: process.env.NEXT_PUBLIC_DEFAULT_LLM_BASE_URL || undefined,
  apiKey: process.env.NEXT_PUBLIC_DEFAULT_LLM_API_KEY || undefined,
  model: process.env.NEXT_PUBLIC_DEFAULT_LLM_MODEL || 'gpt-4o',
  isLocked: false,
};

export const DEFAULT_SHADOWMOVE_GLOBAL_LLM: CompanyGlobalLLMConfig = {
  text: {
    provider: 'openai',
    model: 'gpt-4o',
    description: 'Primary model for reasoning, software architecture, fullstack code, and sprint logic.',
    isEnabled: true,
  },
  image: {
    provider: 'openai',
    model: 'dall-e-3',
    description: 'Visual creation, aesthetic moodboards, UI wireframes, and digital illustrations.',
    isEnabled: true,
  },
  fast: {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    description: 'Sub-second model for rapid ticket triage, bug auditing, and automated evaluations.',
    isEnabled: true,
  },
  vision: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    description: 'Multimodal model for visual auditing of mobile/desktop layouts and UI screenshot inspections.',
    isEnabled: true,
  },
  audio: {
    provider: 'openai',
    model: 'whisper-1',
    description: 'Audio meeting transcriptions, voice notes, and war room recordings.',
    isEnabled: false,
  },
};

/**
 * Resolve effective LLM configuration for an agent:
 * If the agent inherits from a company global category (text/image/fast/vision/audio),
 * it dynamically pulls from company.globalLLMConfig. Otherwise, uses agent's manual BYOK config.
 */
export function getEffectiveAgentLLMConfig(agent: Agent, company?: Company): LLMConfig {
  const category = agent.inheritedLLMCategory;
  if (category && category !== 'manual' && company?.globalLLMConfig) {
    const categorySetting = company.globalLLMConfig[category as LLMCategory];
    if (categorySetting && categorySetting.isEnabled) {
      return {
        provider: categorySetting.provider,
        baseUrl: categorySetting.baseUrl,
        apiKey: categorySetting.apiKey,
        model: categorySetting.model,
        isLocked: false,
      };
    }
  }

  // If the agent has explicitly set manual BYOK with an active API Key, use manual config
  if (agent.inheritedLLMCategory === 'manual' && agent.llmConfig?.apiKey) {
    return agent.llmConfig;
  }

  // Default to Company's Global LLM (text category)
  if (company?.globalLLMConfig?.text && company.globalLLMConfig.text.isEnabled) {
    return {
      provider: company.globalLLMConfig.text.provider,
      baseUrl: company.globalLLMConfig.text.baseUrl,
      apiKey: company.globalLLMConfig.text.apiKey,
      model: company.globalLLMConfig.text.model,
      isLocked: false,
    };
  }

  if (agent.llmConfig && agent.llmConfig.apiKey) {
    return agent.llmConfig;
  }

  return agent.llmConfig || SHADOWMOVE_LLM_CONFIG;
}

export const PRESET_COMPANIES: Company[] = [
  {
    id: 'company-shadowmove',
    ownerUserId: 'usr-sang-01',
    name: 'ShadowMove',
    industry: 'Stealth Software House & AI Product Studio',
    description: 'Elite software engineering house delivering sub-second web applications, autonomous AI agents, and cybernetic digital experiences.',
    globalLLMConfig: DEFAULT_SHADOWMOVE_GLOBAL_LLM,
    officeLayoutTemplate: 'tech_startup',
    departments: [
      { id: 'dept-sm-eng', name: 'Engineering & Cloud', color: '#3b82f6', iconName: 'Code', description: 'Architecture, frontend, backend & cloud infra' },
      { id: 'dept-sm-design', name: 'UI/UX & Product Design', color: '#8b5cf6', iconName: 'Sparkles', description: 'Cybernetic interface systems & design prototypes' },
      { id: 'dept-sm-qa', name: 'Quality, AI & Ops', color: '#10b981', iconName: 'ShieldCheck', description: 'Zero-defect QA, performance testing & AI pipeline' },
    ],
    agents: [
      {
        id: 'agent-sm-kenji',
        name: 'Kenji Sato',
        role: 'project_manager',
        roleTitle: 'Founder & System Architect',
        departmentId: 'dept-sm-eng',
        deskPosition: DESK_SLOTS[0],
        currentPosition: DESK_SLOTS[0],
        rotationY: 0,
        state: 'idle',
        stateMessage: 'Standby: Tiket "Arsitektur & Wireframe Landing Page ShadowMove" selesai 100%. Siap menerima sprint baru.',
        gender: 'male',
        hairStyle: 'undercut',
        hairColor: '#0f172a',
        eyeColor: '#475569',
        accessory: 'cyber_earpiece',
        avatarColor: '#6366f1',
        shirtColor: '#1e1b4b',
        skinColor: '#fcd34d',
        personality: {
          mbti: 'INTJ',
          enneagram: '5w6',
          archetype: 'The Mastermind Architect',
          traits: ['Analitis', 'Visioner', 'Stoik', 'Humor Kering'],
          speakingStyle: 'To-the-point, logis, menyisipkan analogi arsitektur & sci-fi klasik',
          interests: ['Sub-second Latency', 'Cyberpunk Tech', 'Custom Mechanical Keyboard', 'Filosofi AI'],
        },
        skills: ['System Architecture', 'Sprint Orchestration', 'Tech Stack Selection', 'AI Integrations'],
        bio: 'Founder of ShadowMove (Male, INTJ 5w6), orchestrating next-gen software systems with extreme performance standards.',
        timezone: 'Asia/Tokyo',
        llmConfig: SHADOWMOVE_LLM_CONFIG,
        liveCodeOutput: [
          '// ShadowMove Architecture Spec 1.0',
          'export const shadowmoveStack = {',
          '  framework: "Next.js 15 App Router",',
          '  styling: "Tailwind CSS v4 + Cybernetic Design System",',
          '  aiEngine: "Gemini 3.6 Flash via OpenAI Compatibility",',
          '  targetPerformance: "100/100 Lighthouse & sub-100ms TTFB"',
          '};',
        ],
        stats: { tasksCompleted: 19, linesOfCode: 1420, wordsWritten: 12500, collabCount: 31 },
      },
      {
        id: 'agent-sm-rei',
        name: 'Rei Kasumi',
        role: 'frontend_dev',
        roleTitle: 'Senior Creative Frontend Engineer',
        departmentId: 'dept-sm-design',
        deskPosition: DESK_SLOTS[1],
        currentPosition: DESK_SLOTS[1],
        rotationY: 0,
        state: 'working',
        currentTaskId: 'task-sm-02',
        stateMessage: '⚡ Working on: "Kembangkan Hero Section & Cybernetic UI Landing Page"',
        gender: 'female',
        hairStyle: 'twintails',
        hairColor: '#f43f5e',
        eyeColor: '#9333ea',
        accessory: 'hairclip',
        avatarColor: '#ec4899',
        shirtColor: '#831843',
        skinColor: '#fde047',
        personality: {
          mbti: 'ENFP',
          enneagram: '7w8',
          archetype: 'The Creative Catalyst',
          traits: ['Energik', 'Ekspresif', 'Spontan', 'Penuh Ide Visual'],
          speakingStyle: 'Hangat, antusias, sering pakai perumpamaan anime & estetika visual',
          interests: ['Cybernetic UI', 'Anime & Manga', 'Vaporwave Aesthetics', 'Indie Pixel RPG'],
        },
        skills: ['Next.js 15', 'Tailwind CSS', 'Framer Motion', 'Cybernetic UI/UX', 'Three.js'],
        bio: 'Creative frontend artisan (Female, ENFP 7w8) crafting sub-second load times and immersive landing pages.',
        timezone: 'Asia/Jakarta',
        llmConfig: SHADOWMOVE_LLM_CONFIG,
        liveCodeOutput: [
          '// HeroSection.tsx - ShadowMove Interactive Visuals',
          'export function HeroSection() {',
          '  return (',
          '    <section className="relative min-h-screen bg-slate-950 text-white flex items-center justify-center">',
          '      <GlowingGrid />',
          '      <HeroTypography title="Move Fast. Scale Silently." />',
          '    </section>',
          '  );',
          '}',
        ],
        stats: { tasksCompleted: 27, linesOfCode: 4890, wordsWritten: 3400, collabCount: 42 },
      },
      {
        id: 'agent-sm-damian',
        name: 'Damian Vance',
        role: 'backend_dev',
        roleTitle: 'Lead Backend & Cloud Architect',
        departmentId: 'dept-sm-eng',
        deskPosition: DESK_SLOTS[2],
        currentPosition: DESK_SLOTS[2],
        rotationY: 0,
        state: 'working',
        currentTaskId: 'task-sm-03',
        stateMessage: '⚡ Working on: "Integrasi Service Showcase & Client Inquiry API"',
        gender: 'male',
        hairStyle: 'short_messy',
        hairColor: '#3f3f46',
        eyeColor: '#78350f',
        accessory: 'none',
        avatarColor: '#059669',
        shirtColor: '#064e3b',
        skinColor: '#fcd34d',
        personality: {
          mbti: 'ISTP',
          enneagram: '9w8',
          archetype: 'The Pragmatic Craftsman',
          traits: ['Tenang', 'Observan', 'Anti Basa-basi', 'Problem Solver'],
          speakingStyle: 'Santai, lugas, hemat kata tapi selalu solutif dan tepat sasaran',
          interests: ['Distributed Systems', 'Kopi Espresso Manual', 'Homelab Server', 'Motor Vintage'],
        },
        skills: ['FastAPI', 'Node.js', 'PostgreSQL', 'Docker', 'OpenAI API Protocol'],
        bio: 'Senior backend architect (Male, ISTP 9w8) handling high-throughput APIs and LLM inference pipelines.',
        timezone: 'America/New_York',
        llmConfig: SHADOWMOVE_LLM_CONFIG,
        liveCodeOutput: [
          '// api/inquiry.ts - High-Throughput Lead Capture',
          'export async function handleInquiry(req: Request) {',
          '  const { clientName, projectScope, budgetRange } = await req.json();',
          '  await db.inquiries.insert({ clientName, projectScope, status: "DISPATCHED" });',
          '  return Response.json({ success: true, message: "Inquiry received by ShadowMove" });',
          '}',
        ],
        stats: { tasksCompleted: 34, linesOfCode: 8710, wordsWritten: 2100, collabCount: 56 },
      },
      {
        id: 'agent-sm-yuki',
        name: 'Yuki Tanaka',
        role: 'qa_engineer',
        roleTitle: 'QA & AI Workflow Automation Engineer',
        departmentId: 'dept-sm-qa',
        deskPosition: DESK_SLOTS[3],
        currentPosition: DESK_SLOTS[3],
        rotationY: 0,
        state: 'idle',
        stateMessage: 'Standby: Menunggu implementasi landing page selesai untuk testing.',
        gender: 'female',
        hairStyle: 'bob_cut',
        hairColor: '#18181b',
        eyeColor: '#d97706',
        accessory: 'glasses',
        avatarColor: '#e11d48',
        shirtColor: '#881337',
        skinColor: '#fef08a',
        personality: {
          mbti: 'ISTJ',
          enneagram: '1w9',
          archetype: 'The Resilient Perfectionist',
          traits: ['Teliti', 'Disiplin', 'Penyayang Kucing', 'Standar Kualitas Tinggi'],
          speakingStyle: 'Sopan, terstruktur, senang berbagi tips ketelitian dan cerita lucu kucing kantor',
          interests: ['Zero-Defect Testing', 'Kucing Kantor (Si Oyen)', 'Matcha Latte', 'Cybersecurity'],
        },
        skills: ['Playwright E2E', 'Lighthouse 100/100', 'Security Auditing', 'Load Testing'],
        bio: 'Ensuring ShadowMove projects (Female, ISTJ 1w9) pass zero-defect benchmarks with perfect responsiveness.',
        timezone: 'Asia/Tokyo',
        llmConfig: SHADOWMOVE_LLM_CONFIG,
        liveCodeOutput: [
          '// e2e/landing-page.spec.ts',
          'test("Landing page mobile responsiveness & CTA check", async ({ page }) => {',
          '  await page.goto("http://localhost:28483/preview/shadowmove");',
          '  await expect(page.locator("h1")).toContainText("ShadowMove");',
          '  await expect(page.locator("#inquiry-form")).toBeVisible();',
          '});',
        ],
        stats: { tasksCompleted: 22, linesOfCode: 3120, wordsWritten: 5800, collabCount: 29 },
      },
    ],
    tasks: [
      {
        id: 'task-sm-01',
        title: 'Arsitektur & Wireframe Landing Page ShadowMove',
        projectName: 'ShadowMove Landing Page',
        description: 'Menyusun wireframe, struktur komponen, copywriting value proposition, dan panduan brand untuk landing page software house ShadowMove.',
        type: 'architecture',
        departmentId: 'dept-sm-eng',
        assignedAgentId: 'agent-sm-kenji',
        status: 'done',
        progress: 100,
        artifacts: [
          {
            id: 'art-sm-1',
            fileName: 'docs/SHADOWMOVE_ARCHITECTURE.md',
            type: 'markdown',
            content: '# ShadowMove Architecture Specification\n\n- Vision: High-performance software house\n- Stack: Next.js + Tailwind + Autonomous AI\n',
          },
        ],
        logs: [
          'Spesifikasi wireframe disetujui oleh Kenji Sato.',
          'Copywriting headline dan service catalog difinalisasi.',
          'Status: Selesai 100%.',
        ],
        createdAt: Date.now() - 3600000,
        completedAt: Date.now() - 1800000,
      },
      {
        id: 'task-sm-02',
        title: 'Kembangkan Hero Section & Cybernetic UI Landing Page',
        projectName: 'ShadowMove Landing Page',
        description: 'Implementasi antarmuka landing page dengan Tailwind CSS, efek glow neon, kartu service interaktif, dan navigasi responsif.',
        type: 'coding',
        departmentId: 'dept-sm-design',
        assignedAgentId: 'agent-sm-rei',
        status: 'in_progress',
        progress: 85,
        artifacts: [
          {
            id: 'art-sm-2',
            fileName: 'public/preview/shadowmove/index.html',
            type: 'code',
            content: '<!-- ShadowMove Official Landing Page -->',
          },
        ],
        logs: [
          'Rei Kasumi memulai pengkodean landing page ShadowMove.',
          'Mengintegrasikan Tailwind CSS CDN & Lucide Icons.',
          'Menambahkan efek micro-animation pada kartu layanan.',
        ],
        createdAt: Date.now() - 2400000,
      },
      {
        id: 'task-sm-03',
        title: 'Integrasi Service Showcase & Client Inquiry API',
        projectName: 'ShadowMove Landing Page',
        description: 'Membangun form pemesanan proyek interaktif dengan validasi data dan integrasi API pengiriman inquiry.',
        type: 'coding',
        departmentId: 'dept-sm-eng',
        assignedAgentId: 'agent-sm-damian',
        status: 'in_progress',
        progress: 60,
        artifacts: [
          {
            id: 'art-sm-3',
            fileName: 'src/api/inquiry.ts',
            type: 'code',
            content: 'export async function handleInquiry() { ... }',
          },
        ],
        logs: [
          'Damian Vance mengonfigurasi skema endpoint inquiry.',
          'Menghubungkan form input interaktif.',
        ],
        createdAt: Date.now() - 1800000,
      },
      {
        id: 'task-sm-04',
        title: 'Audit Lighthouse 100/100 & Responsiveness Testing',
        projectName: 'ShadowMove Landing Page',
        description: 'Menguji performa rendering di berbagai ukuran layar (mobile, tablet, desktop) dan verifikasi aksesibilitas.',
        type: 'qa',
        departmentId: 'dept-sm-qa',
        assignedAgentId: 'agent-sm-yuki',
        status: 'backlog',
        progress: 10,
        artifacts: [],
        logs: ['Menunggu implementasi landing page selesai.'],
        createdAt: Date.now() - 1200000,
      },
    ],
  },
];

// Helper to auto-generate a custom company dynamically from user prompts
export function generateCustomCompany(
  name: string,
  industry: string,
  layoutTemplate: OfficeLayoutTemplateId = 'tech_startup'
): Company {
  const companyId = `comp-${Date.now()}`;
  const cleanName = name.trim() || 'Horizon Innovations';
  const cleanIndustry = industry.trim() || 'Modern Technology';

  const departments: Department[] = [
    {
      id: `${companyId}-dept-core`,
      name: 'Strategy & Management',
      color: '#6366f1',
      iconName: 'Compass',
      description: 'Vision, roadmap execution and inter-department orchestration',
    },
    {
      id: `${companyId}-dept-exec`,
      name: 'Operations & Engineering',
      color: '#06b6d4',
      iconName: 'Cpu',
      description: 'Core product build, algorithms, and technical execution',
    },
    {
      id: `${companyId}-dept-content`,
      name: 'Creative & Growth',
      color: '#f59e0b',
      iconName: 'FileText',
      description: 'Content generation, communications and documentation',
    },
  ];

  const agentTemplates = [
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
      skills: ['Roadmap Architecture', 'Resource Scheduling', 'System Strategy'],
      bio: `Overseeing strategic direction and task delegation for ${cleanName} (Male, ENTJ 8w7).`,
      sampleCode: `// ${cleanName} Executive Roadmap\nexport const MilestoneQ4 = {\n  goal: "Autonomous Operations",\n  status: "ACTIVE"\n};`,
    },
    {
      name: 'Aria Thorne',
      gender: 'female' as const,
      hairStyle: 'bob_cut' as const,
      hair: '#0f172a',
      eyeColor: '#8b5cf6',
      accessory: 'cyber_earpiece' as const,
      role: 'fullstack_dev' as const,
      roleTitle: 'Lead Software Architect',
      dept: departments[1].id,
      color: '#06b6d4',
      shirt: '#155e75',
      skin: '#fbcfe8',
      skills: ['TypeScript', 'Fullstack Architecture', 'Data Pipelines', 'API Design'],
      bio: `Building robust autonomous software engines powering ${cleanName} (Female, INTJ 5w6).`,
      sampleCode: `// core/engine.ts\nexport async function executeAutonomousPipeline(context: TaskContext) {\n  return await engine.dispatch(context);\n}`,
    },
    {
      name: 'Sofia Valdes',
      gender: 'female' as const,
      hairStyle: 'twintails' as const,
      hair: '#ec4899',
      eyeColor: '#d97706',
      accessory: 'hairclip' as const,
      role: 'content_writer' as const,
      roleTitle: 'Content & Narrative Strategist',
      dept: departments[2].id,
      color: '#f59e0b',
      shirt: '#854d0e',
      skin: '#fed7aa',
      skills: ['Long-form Content', 'Copywriting', 'SEO Research', 'Brand Tone'],
      bio: `Crafting authoritative articles and compelling literature for ${cleanIndustry} (Female, ENFP 7w8).`,
      sampleCode: `# ${cleanName} Press Release\n\nAnnouncing the next breakthrough in ${cleanIndustry}.\nOur dedicated autonomous agents are collaborating around the clock.`,
    },
    {
      name: 'Ren Takahashi',
      gender: 'male' as const,
      hairStyle: 'short_messy' as const,
      hair: '#18181b',
      eyeColor: '#10b981',
      accessory: 'glasses' as const,
      role: 'qa_engineer' as const,
      roleTitle: 'Quality Assurance & Reviewer',
      dept: departments[1].id,
      color: '#10b981',
      shirt: '#065f46',
      skin: '#fef08a',
      skills: ['Code Audits', 'Unit & End-to-End Testing', 'Security Validation'],
      bio: `Ensuring bug-free and ultra-resilient outputs across all tasks (Male, ISTJ 1w9).`,
      sampleCode: `describe("${cleanName} Quality Verification", () => {\n  test("verifies 100% test coverage", () => expect(true).toBe(true));\n});`,
    },
  ];

  const agents: Agent[] = agentTemplates.map((t, idx) => ({
    id: `agent-${companyId}-${idx + 1}`,
    name: t.name,
    gender: t.gender,
    hairStyle: t.hairStyle,
    hairColor: t.hair,
    eyeColor: t.eyeColor,
    accessory: t.accessory,
    role: t.role,
    roleTitle: t.roleTitle,
    departmentId: t.dept,
    deskPosition: DESK_SLOTS[idx],
    currentPosition: DESK_SLOTS[idx],
    rotationY: idx % 2 === 0 ? 0 : Math.PI,
    state: 'working',
    stateMessage: `Executing initial ${t.roleTitle} assignments`,
    avatarColor: t.color,
    shirtColor: t.shirt,
    skinColor: t.skin,
    personality: {
      mbti: idx === 0 ? 'ENTJ' : idx === 1 ? 'INTJ' : idx === 2 ? 'ENFP' : 'ISTJ',
      enneagram: idx === 0 ? '8w7' : idx === 1 ? '5w6' : idx === 2 ? '7w8' : '1w9',
      archetype: idx === 0 ? 'The Strategic Commander' : idx === 1 ? 'The Mastermind Architect' : idx === 2 ? 'The Creative Catalyst' : 'The Resilient Sentinel',
      traits: idx === 0 ? ['Strategic', 'Decisive', 'Visionary'] : idx === 1 ? ['Analytical', 'Problem Solver', 'Precise'] : idx === 2 ? ['Expressive', 'Creative', 'Enthusiastic'] : ['Detail-Oriented', 'Disciplined', 'Zero Defect'],
      speakingStyle: idx === 0 ? 'Visionary, decisive and goal-oriented' : idx === 1 ? 'Logical, to-the-point and analytical' : idx === 2 ? 'Warm, expressive and full of ideas' : 'Courteous, structured and meticulous',
      interests: ['Emerging Tech', 'Coffee', 'Gaming', 'Future of AI', 'Automation'],
    },
    skills: t.skills,
    bio: t.bio,
    liveCodeOutput: t.sampleCode.split('\n'),
    stats: { tasksCompleted: 0, linesOfCode: 150, wordsWritten: 500, collabCount: 0 },
  }));

  const tasks: TaskTicket[] = [
    {
      id: `task-${companyId}-1`,
      title: `Develop Core ${cleanName} Engine`,
      description: `Implement foundational system for ${cleanIndustry} execution.`,
      type: 'coding',
      departmentId: departments[1].id,
      assignedAgentId: agents[1].id,
      status: 'in_progress',
      progress: 45,
      artifacts: [
        {
          id: `art-${companyId}-1`,
          fileName: 'CoreEngine.ts',
          type: 'code',
          content: agents[1].liveCodeOutput.join('\n'),
        },
      ],
      logs: ['Initial scaffolding created.', 'Engine compilation running.'],
      createdAt: Date.now(),
    },
    {
      id: `task-${companyId}-2`,
      title: `Formulate ${cleanName} Brand Literature & Market Overview`,
      description: `Write in-depth strategic analysis and public publication for ${cleanIndustry}.`,
      type: 'content',
      departmentId: departments[2].id,
      assignedAgentId: agents[2].id,
      status: 'in_progress',
      progress: 30,
      artifacts: [
        {
          id: `art-${companyId}-2`,
          fileName: 'MarketStrategy.md',
          type: 'markdown',
          content: agents[2].liveCodeOutput.join('\n'),
        },
      ],
      logs: ['Research notes compiled.', 'Drafting introduction and industry analysis.'],
      createdAt: Date.now(),
    },
  ];

  return {
    id: companyId,
    ownerUserId: 'usr-sang-01',
    name: cleanName,
    industry: cleanIndustry,
    description: `Custom autonomous office configured for ${cleanName} specializing in ${cleanIndustry}.`,
    departments,
    agents,
    tasks,
    globalLLMConfig: DEFAULT_SHADOWMOVE_GLOBAL_LLM,
    officeLayoutTemplate: layoutTemplate,
  };
}
