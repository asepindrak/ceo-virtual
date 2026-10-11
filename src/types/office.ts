export type AgentRole = 
  | 'ceo' 
  | 'project_manager' 
  | 'frontend_dev' 
  | 'backend_dev' 
  | 'fullstack_dev' 
  | 'devops' 
  | 'qa_engineer' 
  | 'ui_designer' 
  | 'content_writer' 
  | 'seo_specialist' 
  | 'data_analyst';

export type AgentState = 
  | 'idle' 
  | 'walking' 
  | 'working' 
  | 'talking' 
  | 'meeting' 
  | 'coffee_break'
  | 'playing_game'
  | 'seeking_approval'
  | 'leaving_office';

export interface Position3D {
  x: number;
  z: number;
}

export interface AgentDialog {
  id: string;
  speakerId: string;
  speakerName: string;
  targetId: string;
  targetName: string;
  message: string;
  categoryTag?: string; // e.g. "🍿 Anime & Film", "🎮 Gaming & Hobi", "☕ Cerita Kehidupan", "🤖 Masa Lalu & Tech"
  tagColor?: string;
  timestamp: number;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'groq' | 'deepseek' | 'custom';
  baseUrl?: string;
  apiKey?: string;
  model: string;
  isLocked: boolean; // if true, locked by creator with monthly token subscription
  monthlySubscriptionPoints?: number;
}

export type LLMCategory = 'text' | 'image' | 'fast' | 'vision' | 'audio';

export interface CategoryLLMSetting {
  provider: 'openai' | 'anthropic' | 'gemini' | 'groq' | 'deepseek' | 'custom';
  baseUrl?: string;
  apiKey?: string;
  model: string;
  description?: string;
  isEnabled?: boolean;
}

export interface CompanyGlobalLLMConfig {
  text?: CategoryLLMSetting;
  image?: CategoryLLMSetting;
  fast?: CategoryLLMSetting;
  vision?: CategoryLLMSetting;
  audio?: CategoryLLMSetting;
}

export interface HumanDecisionRequest {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  taskTitle: string;
  question: string;
  context: string;
  options: string[];
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
  chosenOption?: string;
  ownerFeedback?: string;
}

export interface PersonalityProfile {
  mbti: string; // e.g. "INTJ", "ENFP", "ISTP", "INFJ", "ENTP", etc.
  enneagram: string; // e.g. "5w6", "7w8", "1w9", "3w2", "4w5", etc.
  archetype: string; // e.g. "The Mastermind Architect", "The Creative Catalyst", etc.
  traits: string[]; // e.g. ["Analitis", "Visioner", "Sarkasme Halus"]
  speakingStyle: string; // e.g. "To-the-point, logis, sesekali nyeletuk analogi sci-fi"
  interests: string[]; // e.g. ["Cyberpunk", "Rust & Linux", "Custom Keyboard"]
}

export interface MarketplaceAgent {
  id: string;
  creatorUserId: string;
  creatorName: string;
  name: string;
  role: AgentRole;
  roleTitle: string;
  bio: string;
  personality?: PersonalityProfile;
  gender?: 'male' | 'female';
  hairStyle?: 'undercut' | 'short_messy' | 'slick_back' | 'twintails' | 'bob_cut' | 'long_flowing' | 'ponytail';
  eyeColor?: string;
  accessory?: 'glasses' | 'headphone' | 'ribbon' | 'hairclip' | 'cyber_earpiece' | 'none';
  skills: string[];
  pricePoints: number;
  avatarColor: string;
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  llmConfig: LLMConfig;
  rating: number;
  hiresCount: number;
  sampleOutput: string[];
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  pointsBalance: number;
  ownedOfficeIds: string[];
  createdAgentIds: string[];
}

export interface PaymentPackage {
  id: string;
  name: string;
  points: number;
  priceIdr: number;
  isPopular?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  roleTitle: string;
  departmentId: string;
  deskPosition: Position3D;
  currentPosition: Position3D;
  targetPosition?: Position3D;
  rotationY: number; // in radians
  state: AgentState;
  stateMessage: string;
  
  // Visual appearance
  gender?: 'male' | 'female';
  avatarColor: string;
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  hairStyle?: 'undercut' | 'short_messy' | 'slick_back' | 'twintails' | 'bob_cut' | 'long_flowing' | 'ponytail';
  eyeColor?: string;
  accessory?: 'glasses' | 'headphone' | 'ribbon' | 'hairclip' | 'cyber_earpiece' | 'none';
  
  // Work data
  currentTaskId?: string;
  activeDialog?: AgentDialog;
  collabPartnerId?: string;
  facingDirection?: 'left' | 'right' | 'front';
  skills: string[];
  bio: string;
  personality?: PersonalityProfile;
  
  // LLM Config per agent
  llmConfig?: LLMConfig;
  inheritedLLMCategory?: LLMCategory | 'manual';
  creatorId?: string;
  
  // Real output simulation
  liveCodeOutput: string[];
  stats: {
    tasksCompleted: number;
    linesOfCode: number;
    wordsWritten: number;
    collabCount: number;
  };
}

export interface Department {
  id: string;
  name: string;
  color: string;
  iconName: string;
  description: string;
}

export interface TaskArtifact {
  id: string;
  fileName: string;
  type: 'code' | 'markdown' | 'test' | 'review';
  content: string;
}

export type TaskStatus = 'backlog' | 'in_progress' | 'in_review' | 'done';
export type TaskType = 'coding' | 'content' | 'architecture' | 'qa' | 'design';

export interface TaskTicket {
  id: string;
  title: string;
  projectName?: string; // Associated project / workspace name
  description: string;
  type: TaskType;
  departmentId: string;
  assignedAgentId?: string;
  status: TaskStatus;
  progress: number; // 0 to 100
  artifacts: TaskArtifact[];
  logs: string[];
  createdAt: number;
  completedAt?: number;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  isEnabled: boolean;
  botUsername?: string;
  botFirstName?: string;
  autoSyncWarRoom?: boolean;
  lastActiveTime?: number;
}

export interface OfficeGroupChatMessage {
  id: string;
  senderType: 'user' | 'agent' | 'system';
  agentId?: string;
  senderName: string;
  senderAvatarColor?: string;
  senderRoleTitle?: string;
  message: string;
  mentionedAgentIds?: string[];
  timestamp: number;
  source?: 'web' | 'telegram';
}

export interface Company {
  id: string;
  ownerUserId: string;
  name: string;
  industry: string;
  description: string;
  departments: Department[];
  agents: Agent[];
  tasks: TaskTicket[];
  telegramConfig?: TelegramConfig;
  globalLLMConfig?: CompanyGlobalLLMConfig;
}

export interface ActivityEvent {
  id: string;
  timestamp: number;
  type: 'movement' | 'collaboration' | 'task_start' | 'task_complete' | 'meeting' | 'break' | 'human_loop' | 'hire' | 'fire' | 'casual_talk' | 'system';
  agentId: string;
  agentName: string;
  targetAgentName?: string;
  categoryTag?: string;
  description: string;
}

export interface DevServer {
  id: string;
  projectName: string;
  port: number;
  url: string;
  status: 'running' | 'stopped' | 'starting';
  framework: string;
  description: string;
  isExternal?: boolean;
}

export interface AgentCollaborationLog {
  id: string;
  timestamp: number;
  type?: 'casual_talk' | 'collaboration';
  categoryTag?: string;
  projectName?: string;
  senderId: string;
  senderName: string;
  senderRoleTitle: string;
  senderAvatarColor?: string;
  targetId: string;
  targetName: string;
  targetRoleTitle: string;
  targetAvatarColor?: string;
  topic: string;
  dialog: string;
  outcome?: string;
}

export type MemoryType = 'episodic' | 'semantic' | 'procedural' | 'lore' | 'rule' | 'milestone' | 'knowledge' | 'task_experience';

export interface CompanyMemoryItem {
  id: string;
  companyId: string;
  type: MemoryType;
  title: string;
  content: string;
  categoryTag?: string;
  tags: string[];
  agentId?: string;
  agentName?: string;
  authorAgent?: string;
  sourceTaskId?: string;
  sourceTaskTitle?: string;
  importance: number; // 1 (minor note) to 5 (critical core experience)
  embedding?: number[];
  createdAt: number;
  lastRecalledAt?: number;
  recallCount: number;
}

export interface CompanyLevelProgress {
  companyId: string;
  level: number;
  levelTitle: string;
  title?: string;
  xp: number;
  nextLevelXp: number;
  totalTasksCompleted: number;
  tasksCompletedCount?: number;
  totalLinesOfCode: number;
  totalMemoriesCount: number;
  achievements: string[];
}

// -----------------------------------------------------------------------------
// OPEN WORLD MAP & REGIONAL DECENTRALIZED TRANSIT TYPES
// -----------------------------------------------------------------------------

export type CommuteMode = 'bullet_train' | 'company_car';
export type TravelMissionType = 'b2b_pitch' | 'buy_trade' | 'market_research' | 'friendly_visit';

export interface RegionalCompanyInfo {
  id: string;
  name: string;
  industry: string;
  level: number;
  ownerName: string;
  buildingType: string;
  specialization: string;
  reputation: number;
  status: 'active' | 'in_meeting' | 'open_for_trade';
  openBounties: {
    id: string;
    title: string;
    rewardXp: number;
    budgetCoins: number;
    type: 'coding' | 'design' | 'content' | 'audit';
  }[];
  marketOffers: {
    id: string;
    title: string;
    priceCoins: number;
    category: 'skill_template' | 'api_license' | 'dataset' | 'service';
    description: string;
  }[];
}

export interface RegionalDistrict {
  id: string;
  name: string;
  codename: string;
  theme: string;
  description: string;
  color: string;
  badge: string;
  coordinates: { x: number; y: number }; // Percentage position on macro world map
  transitHubName: string;
  highwayDistanceKm: number;
  trainTravelSeconds: number;
  carTravelSeconds: number;
  companies: RegionalCompanyInfo[];
}

export interface TravelMission {
  id: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  originRegionId: string;
  originCompanyName: string;
  targetRegionId: string;
  targetCompanyId: string;
  targetCompanyName: string;
  commuteMode: CommuteMode;
  missionType: TravelMissionType;
  status: 'departing' | 'in_transit' | 'arrived_at_lobby' | 'negotiating' | 'returning' | 'completed';
  departedAt: number;
  durationSeconds: number;
  progressPercent: number;
  currentStepMessage: string;
  dialogLogs: { time: string; speaker: string; text: string }[];
  outcome?: {
    success: boolean;
    summary: string;
    earnedXp: number;
    earnedCoins: number;
    tradeContract?: string;
  };
}

