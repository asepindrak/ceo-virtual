'use client';

import React, { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Company, Agent, TaskTicket, ActivityEvent, HumanDecisionRequest, MarketplaceAgent, LLMConfig, UserAccount } from '@/types/office';
import { PRESET_COMPANIES, DESK_SLOTS } from '@/lib/companyPresets';
import { CURRENT_USER, INITIAL_MARKETPLACE_AGENTS } from '@/lib/marketplaceData';
import { OfficeSimulation } from '@/lib/simulationEngine';
import { TopNav } from '@/components/ui/TopNav';
import { AgentInspector } from '@/components/ui/AgentInspector';
import { TaskBoard } from '@/components/ui/TaskBoard';
import { TeamRoster } from '@/components/ui/TeamRoster';
import { ActivityFeed } from '@/components/ui/ActivityFeed';
import { CompanyModal } from '@/components/ui/CompanyModal';
import { MarketplaceModal } from '@/components/ui/MarketplaceModal';
import { WalletModal } from '@/components/ui/WalletModal';
import { DecisionModal } from '@/components/ui/DecisionModal';
import { WorkspaceModal } from '@/components/ui/WorkspaceModal';
import { ExtensionHubModal } from '@/components/ui/ExtensionHubModal';
import { IsometricOffice } from '@/components/office2d/IsometricOffice';

// Dynamically import Three.js Canvas to prevent SSR issues
const OfficeCanvas = dynamic(
  () => import('@/components/office3d/OfficeCanvas').then((mod) => mod.OfficeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#fbf7ee] text-[#2c231c]">
        <div className="w-12 h-12 border-4 border-[#c85a2b] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-mono text-sm tracking-widest text-[#c85a2b] font-bold">MEMUAT LINGKUNGAN 3D KANTOR...</p>
      </div>
    ),
  }
);

export default function RealAgent3DPage() {
  const [userAccount, setUserAccount] = useState<UserAccount>(CURRENT_USER);
  const [marketplaceAgents, setMarketplaceAgents] = useState<MarketplaceAgent[]>(INITIAL_MARKETPLACE_AGENTS);

  const [currentCompany, setCurrentCompany] = useState<Company>(PRESET_COMPANIES[0]);
  const [agents, setAgents] = useState<Agent[]>(PRESET_COMPANIES[0].agents);
  const [tasks, setTasks] = useState<TaskTicket[]>(PRESET_COMPANIES[0].tasks);
  const [events, setEvents] = useState<ActivityEvent[]>([
    {
      id: 'init-1',
      timestamp: Date.now() - 120000,
      type: 'movement',
      agentId: PRESET_COMPANIES[0].agents[0].id,
      agentName: PRESET_COMPANIES[0].agents[0].name,
      description: `${PRESET_COMPANIES[0].agents[0].name} reported to desk and initialized sprint backlog.`,
    },
    {
      id: 'init-2',
      timestamp: Date.now() - 60000,
      type: 'task_start',
      agentId: PRESET_COMPANIES[0].agents[1].id,
      agentName: PRESET_COMPANIES[0].agents[1].name,
      description: `${PRESET_COMPANIES[0].agents[1].name} started coding on 3D canvas viewport.`,
    },
  ]);

  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d'); // Default to 2.5D for instant 60fps & reliability

  // Human-in-the-Loop Decision State
  const [pendingDecisions, setPendingDecisions] = useState<HumanDecisionRequest[]>([]);
  const [activeDecisionModal, setActiveDecisionModal] = useState<HumanDecisionRequest | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Simulation Engine Instance (Ref persisted across renders)
  const simulationRef = useRef<OfficeSimulation>(new OfficeSimulation(1.0));

  // Simulation tick sync callback from 3D Canvas
  const handleSimulationUpdate = useCallback(
    (updatedAgents: Agent[], updatedTasks: TaskTicket[], newEvents: ActivityEvent[]) => {
      setAgents(updatedAgents);
      setTasks(updatedTasks);
      if (newEvents.length > 0) {
        setEvents((prev) => [...prev, ...newEvents]);

        // Auto-generate disk artifacts when tasks finish
        const finishedEvents = newEvents.filter((e) => e.type === 'task_complete');
        if (finishedEvents.length > 0) {
          finishedEvents.forEach((ev) => {
            const task = updatedTasks.find((t) => ev.description.includes(t.title));
            if (task) {
              fetch('/api/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'generate_task_code',
                  projectName: task.title,
                  taskTitle: task.title,
                  taskType: task.type,
                  agentName: ev.agentName,
                }),
              }).catch(console.error);
            }
          });
        }
      }

      // Check if any agent just arrived at Owner desk seeking approval
      const seekingAgent = updatedAgents.find((a) => a.state === 'seeking_approval');
      if (seekingAgent) {
        setPendingDecisions((prevDecisions) => {
          const matchingReq = prevDecisions.find((d) => d.agentId === seekingAgent.id && d.status === 'pending');
          if (matchingReq && (!activeDecisionModal || activeDecisionModal.id !== matchingReq.id)) {
            setActiveDecisionModal(matchingReq);
          }
          return prevDecisions;
        });
      }
    },
    [activeDecisionModal]
  );

  // Speed and Pause controls
  const handleTogglePause = () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    simulationRef.current.setPaused(nextState);
  };

  const handleChangeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    simulationRef.current.setSpeed(newSpeed);
  };

  // Agent Actions: Collaboration
  const handleSendCollab = (senderId: string, targetId: string) => {
    const sender = agents.find((a) => a.id === senderId);
    const target = agents.find((a) => a.id === targetId);
    if (!sender || !target) return;

    const { updatedSender, event } = simulationRef.current.triggerCollaboration(sender, target);
    setAgents((prev) => prev.map((a) => (a.id === senderId ? updatedSender : a)));
    setEvents((prev) => [...prev, event]);
  };

  const handleSendCoffee = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    const { updatedAgent, event } = simulationRef.current.triggerCoffeeBreak(agent);
    setAgents((prev) => prev.map((a) => (a.id === agentId ? updatedAgent : a)));
    setEvents((prev) => [...prev, event]);
  };

  const handleReturnDesk = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    const updated = simulationRef.current.returnToDesk(agent);
    setAgents((prev) => prev.map((a) => (a.id === agentId ? updated : a)));
  };

  // Human-in-the-Loop Trigger
  const handleTriggerHumanDecision = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    const decisionTopics = [
      {
        title: 'Arsitektur Database: Relasional vs NoSQL Distributed',
        question: 'Boss, butuh persetujuan apakah kita deploy PostgreSQL atau Cassandra untuk skala 10 juta data?',
        context: 'Tim backend telah membuat benchmark: PostgreSQL lebih cepat untuk query analitik, namun Cassandra lebih scalable untuk multi-region.',
        options: [
          'Gunakan PostgreSQL dengan pgvector (Direkomendasikan)',
          'Gunakan Distributed Cassandra Cluster',
          'Terapkan Hybrid (Postgres OLTP + ClickHouse OLAP)',
        ],
      },
      {
        title: 'Keamanan: Izin Eksekusi Shell Sandbox & Tool Shell',
        question: 'Boss, ada script deploy otomatis yang butuh izin root/administrator di server produksi.',
        context: 'Agen QA mendeteksi beberapa endpoint perlu di-restart melalui terminal command berisiko tinggi.',
        options: [
          'Izinkan eksekusi terbatas di Docker container terisolasi',
          'Tolak izin root, gunakan manual approval tiap command',
          'Deploy via Cloudflare Workers tanpa server access',
        ],
      },
      {
        title: 'Strategi Konten & Anggaran Kampanye Q4',
        question: 'Boss, kami merancang konten viral agresif dengan alokasi budget 5,000 poin token.',
        context: 'Strategi ini berfokus pada perbandingan langsung dengan kompetitor konvensional untuk memaksimalkan retensi.',
        options: [
          'Setujui kampanye agresif dan rilis hari ini',
          'Ubah tone menjadi edukatif tanpa menyebut nama brand lain',
          'Tunda dan uji coba di micro-audience terlebih dahulu',
        ],
      },
    ];

    const topic = decisionTopics[Math.floor(Math.random() * decisionTopics.length)];

    const request: HumanDecisionRequest = {
      id: `req-${Date.now()}`,
      agentId: agent.id,
      agentName: agent.name,
      title: topic.title,
      taskTitle: topic.title,
      question: topic.question,
      context: topic.context,
      options: topic.options,
      status: 'pending',
      timestamp: Date.now(),
    };

    const { updatedAgent, event } = simulationRef.current.triggerHumanApproval(agent, request);
    setPendingDecisions((prev) => [...prev, request]);
    setAgents((prev) => prev.map((a) => (a.id === agentId ? updatedAgent : a)));
    setEvents((prev) => [...prev, event]);
  };

  // Human Decision Approvals
  const handleApproveDecision = (requestId: string, chosenOption: string, feedback: string) => {
    const request = pendingDecisions.find((d) => d.id === requestId);
    if (!request) return;

    const agent = agents.find((a) => a.id === request.agentId);
    if (agent) {
      const { updatedAgent, event } = simulationRef.current.resolveHumanApproval(agent, true, feedback || chosenOption);
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? updatedAgent : a)));
      setEvents((prev) => [...prev, event]);
    }

    setPendingDecisions((prev) => prev.filter((d) => d.id !== requestId));
    setActiveDecisionModal(null);
  };

  const handleRejectDecision = (requestId: string, feedback: string) => {
    const request = pendingDecisions.find((d) => d.id === requestId);
    if (!request) return;

    const agent = agents.find((a) => a.id === request.agentId);
    if (agent) {
      const { updatedAgent, event } = simulationRef.current.resolveHumanApproval(agent, false, feedback);
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? updatedAgent : a)));
      setEvents((prev) => [...prev, event]);
    }

    setPendingDecisions((prev) => prev.filter((d) => d.id !== requestId));
    setActiveDecisionModal(null);
  };

  // Fire an Agent
  const handleFireAgent = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    const { updatedAgent, event } = simulationRef.current.fireAgent(agent);
    setAgents((prev) => prev.map((a) => (a.id === agentId ? updatedAgent : a)));
    setEvents((prev) => [...prev, event]);
    setSelectedAgentId(undefined);
  };

  // Hire an Agent from Marketplace
  const handleHireAgent = (mktAgent: MarketplaceAgent): boolean => {
    // Find available desk slot
    const occupiedDesks = new Set(
      agents.map((a) => `${a.deskPosition.x.toFixed(1)},${a.deskPosition.z.toFixed(1)}`)
    );
    const availableSlot = DESK_SLOTS.find(
      (slot) => !occupiedDesks.has(`${slot.x.toFixed(1)},${slot.z.toFixed(1)}`)
    );

    if (!availableSlot) {
      return false; // All 8 desks occupied
    }

    // Deduct points
    setUserAccount((prev) => ({
      ...prev,
      pointsBalance: Math.max(0, prev.pointsBalance - mktAgent.pricePoints),
    }));

    // Spawn agent walking in
    const deptId = currentCompany.departments[0]?.id || 'dept-eng';
    const { newAgent, event } = simulationRef.current.hireAgent(mktAgent, availableSlot, deptId);

    setAgents((prev) => [...prev, newAgent]);
    setEvents((prev) => [...prev, event]);
    return true;
  };

  // Create & Publish new Agent to Marketplace
  const handleCreateMarketplaceAgent = (newAgent: MarketplaceAgent) => {
    setMarketplaceAgents((prev) => [newAgent, ...prev]);
    setUserAccount((prev) => ({
      ...prev,
      createdAgentIds: [...prev.createdAgentIds, newAgent.id],
    }));
  };

  // Top Up Points
  const handleTopUpSuccess = (addedPoints: number) => {
    setUserAccount((prev) => ({
      ...prev,
      pointsBalance: prev.pointsBalance + addedPoints,
    }));
  };

  // Update Agent's Custom LLM Config
  const handleUpdateLLMConfig = (agentId: string, updatedConfig: LLMConfig) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, llmConfig: updatedConfig } : a))
    );
  };

  // Add Task to Board
  const handleAddTask = (
    newTaskData: Omit<TaskTicket, 'id' | 'createdAt' | 'progress' | 'artifacts' | 'logs'>
  ) => {
    const newTicket: TaskTicket = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      progress: 0,
      artifacts: [],
      logs: ['Task created and dispatched into sprint system.'],
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTicket, ...prev]);

    // Auto-create dedicated project folder and files on disk in ~/.realagent/workspaces
    const assignedAgent = agents.find((a) => a.id === newTicket.assignedAgentId);
    fetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate_task_code',
        projectName: newTicket.title,
        taskTitle: newTicket.title,
        taskType: newTicket.type,
        agentName: assignedAgent?.name || 'Autonomous Agent',
      }),
    }).catch(console.error);

    if (newTicket.assignedAgentId) {
      setAgents((prev) =>
        prev.map((a) => {
          if (a.id === newTicket.assignedAgentId) {
            return {
              ...a,
              state: 'working',
              currentTaskId: newTicket.id,
              stateMessage: `Working on: "${newTicket.title}"`,
            };
          }
          return a;
        })
      );
    }
  };

  // Assign Task
  const handleAssignTask = (taskId: string, agentId: string) => {
    const assignedAgent = agents.find((a) => a.id === agentId);
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            assignedAgentId: agentId,
            status: 'in_progress' as const,
            logs: [...t.logs, `Assigned to ${assignedAgent?.name || 'agent'}`],
          };
        }
        return t;
      })
    );

    setAgents((prev) =>
      prev.map((a) => {
        if (a.id === agentId) {
          return {
            ...a,
            state: 'working',
            currentTaskId: taskId,
            stateMessage: `Assigned new task: "${tasks.find((t) => t.id === taskId)?.title || 'task'}"`,
          };
        }
        return a;
      })
    );
  };

  // Switch Company / Multi-Office
  const handleSelectCompany = (newCompany: Company) => {
    setCurrentCompany(newCompany);
    setAgents(newCompany.agents);
    setTasks(newCompany.tasks);
    setSelectedAgentId(undefined);
    setPendingDecisions([]);
    setActiveDecisionModal(null);
    setEvents([
      {
        id: `spawn-${Date.now()}`,
        timestamp: Date.now(),
        type: 'movement',
        agentId: newCompany.agents[0]?.id || 'root',
        agentName: newCompany.name,
        description: `Office switched to ${newCompany.name} (${newCompany.industry}) with ${newCompany.agents.length} agents.`,
      },
    ]);
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const selectedAgentTask = tasks.find((t) => t.id === selectedAgent?.currentTaskId);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#f4ebe1] text-[#2c231c] font-sans">
      {/* Top Navigation Bar */}
      <TopNav
        company={currentCompany}
        tasks={tasks}
        isPaused={isPaused}
        speed={speed}
        userPoints={userAccount.pointsBalance}
        pendingDecisionsCount={pendingDecisions.length}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((v) => (v === '2d' ? '3d' : '2d'))}
        onTogglePause={handleTogglePause}
        onChangeSpeed={handleChangeSpeed}
        onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
        onOpenTasksModal={() => setIsTasksModalOpen(true)}
        onOpenRosterModal={() => setIsRosterModalOpen(true)}
        onOpenMarketplace={() => setIsMarketplaceOpen(true)}
        onOpenWallet={() => setIsWalletOpen(true)}
        onOpenDecisions={() => {
          if (pendingDecisions.length > 0) {
            setActiveDecisionModal(pendingDecisions[0]);
          }
        }}
        onOpenWorkspace={() => setIsWorkspaceModalOpen(true)}
        onOpenExtensions={() => setIsExtensionsOpen(true)}
      />

      {/* Office Simulation Viewport: 2.5D Isometric (Ultra-Fast) vs 3D WebGL */}
      {viewMode === '2d' ? (
        <IsometricOffice
          agents={agents}
          tasks={tasks}
          simulation={simulationRef.current}
          selectedAgentId={selectedAgentId}
          onSelectAgent={(agentId) => setSelectedAgentId(agentId)}
          onSimulationUpdate={handleSimulationUpdate}
        />
      ) : (
        <OfficeCanvas
          agents={agents}
          tasks={tasks}
          simulation={simulationRef.current}
          selectedAgentId={selectedAgentId}
          onSelectAgent={(agentId) => setSelectedAgentId(agentId)}
          onSimulationUpdate={handleSimulationUpdate}
        />
      )}

      {/* Office Live Activity Feed Ticker (Bottom-Left) */}
      <ActivityFeed events={events} />

      {/* Agent Inspector Modal (Right Sidebar) */}
      {selectedAgent && (
        <AgentInspector
          agent={selectedAgent}
          allAgents={agents}
          currentTask={selectedAgentTask}
          onClose={() => setSelectedAgentId(undefined)}
          onSendCollab={handleSendCollab}
          onSendCoffee={handleSendCoffee}
          onReturnDesk={handleReturnDesk}
          onTriggerHumanDecision={handleTriggerHumanDecision}
          onFireAgent={handleFireAgent}
          onUpdateLLMConfig={handleUpdateLLMConfig}
        />
      )}

      {/* Kanban Task Board Drawer */}
      {isTasksModalOpen && (
        <TaskBoard
          tasks={tasks}
          agents={agents}
          onClose={() => setIsTasksModalOpen(false)}
          onAddTask={handleAddTask}
          onAssignTask={handleAssignTask}
        />
      )}

      {/* Team Roster Drawer */}
      {isRosterModalOpen && (
        <TeamRoster
          agents={agents}
          departments={currentCompany.departments}
          selectedAgentId={selectedAgentId}
          onSelectAgent={(id) => {
            setSelectedAgentId(id);
            setIsRosterModalOpen(false);
          }}
          onClose={() => setIsRosterModalOpen(false)}
        />
      )}

      {/* Company Switcher / Multi-Office Modal */}
      {isCompanyModalOpen && (
        <CompanyModal
          currentCompany={currentCompany}
          onClose={() => setIsCompanyModalOpen(false)}
          onSelectCompany={handleSelectCompany}
        />
      )}

      {/* Marketplace Worker Modal */}
      {isMarketplaceOpen && (
        <MarketplaceModal
          marketplaceAgents={marketplaceAgents}
          userAccount={userAccount}
          onClose={() => setIsMarketplaceOpen(false)}
          onHireAgent={handleHireAgent}
          onCreateMarketplaceAgent={handleCreateMarketplaceAgent}
          onOpenWallet={() => {
            setIsMarketplaceOpen(false);
            setIsWalletOpen(true);
          }}
        />
      )}

      {/* Wallet & Top Up Modal */}
      {isWalletOpen && (
        <WalletModal
          userAccount={userAccount}
          onClose={() => setIsWalletOpen(false)}
          onTopUpSuccess={handleTopUpSuccess}
        />
      )}

      {/* Human-in-the-Loop Decision Approval Modal */}
      {activeDecisionModal && (
        <DecisionModal
          request={activeDecisionModal}
          agent={agents.find((a) => a.id === activeDecisionModal.agentId) || agents[0]}
          onApprove={handleApproveDecision}
          onReject={handleRejectDecision}
          onClose={() => setActiveDecisionModal(null)}
        />
      )}

      {/* Dedicated Workspace & CLI Modal */}
      {isWorkspaceModalOpen && (
        <WorkspaceModal onClose={() => setIsWorkspaceModalOpen(false)} />
      )}

      {/* Skills & MCP Extension Hub Modal */}
      {isExtensionsOpen && (
        <ExtensionHubModal onClose={() => setIsExtensionsOpen(false)} />
      )}
    </main>
  );
}
