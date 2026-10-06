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

export interface MarketplaceAgent {
  id: string;
  creatorUserId: string;
  creatorName: string;
  name: string;
  role: AgentRole;
  roleTitle: string;
  bio: string;
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
  avatarColor: string;
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  
  // Work data
  currentTaskId?: string;
  activeDialog?: AgentDialog;
  skills: string[];
  bio: string;
  
  // LLM Config per agent
  llmConfig?: LLMConfig;
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

export interface Company {
  id: string;
  ownerUserId: string;
  name: string;
  industry: string;
  description: string;
  departments: Department[];
  agents: Agent[];
  tasks: TaskTicket[];
}

export interface ActivityEvent {
  id: string;
  timestamp: number;
  type: 'movement' | 'collaboration' | 'task_start' | 'task_complete' | 'meeting' | 'break' | 'human_loop' | 'hire' | 'fire';
  agentId: string;
  agentName: string;
  targetAgentName?: string;
  description: string;
}
