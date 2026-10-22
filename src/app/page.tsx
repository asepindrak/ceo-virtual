'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Company, Agent, TaskTicket, ActivityEvent, HumanDecisionRequest, MarketplaceAgent, LLMConfig, UserAccount, CompanyGlobalLLMConfig, LLMCategory, TravelMission } from '@/types/office';
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
import { OfficeChatModal } from '@/components/ui/OfficeChatModal';
import { DevServersModal } from '@/components/ui/DevServersModal';
import { WorldMapModal } from '@/components/ui/WorldMapModal';
import { IsometricOffice } from '@/components/office2d/IsometricOffice';
import { WinampMusicPlayer } from '@/components/ui/WinampMusicPlayer';
import { OnboardingSetupModal } from '@/components/ui/OnboardingSetupModal';
import { MessagesSquare } from 'lucide-react';


const CLEAN_GENESIS_COMPANY: Company = {
  id: 'genesis-company',
  ownerUserId: 'owner-genesis',
  name: 'Perusahaan Saya',
  industry: 'Software & Technology',
  description: 'Node Perusahaan P2P Virtual',
  officeLayoutTemplate: 'tech_startup',
  departments: [],
  agents: [],
  tasks: [],
};

export default function RealAgent3DPage() {
  const [userAccount, setUserAccount] = useState<UserAccount>(CURRENT_USER);
  const [marketplaceAgents, setMarketplaceAgents] = useState<MarketplaceAgent[]>(INITIAL_MARKETPLACE_AGENTS);

  // Clean Real Data State: Zero dummy employees on fresh install
  const [currentCompany, setCurrentCompany] = useState<Company>(CLEAN_GENESIS_COMPANY);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<TaskTicket[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([
    {
      id: 'init-genesis',
      timestamp: Date.now(),
      type: 'system',
      agentId: 'node',
      agentName: 'Genesis Protocol',
      description: 'Node P2P aktif. Menunggu inisialisasi perusahaan atau deteksi peer regional...',
    },
  ]);
  const [peerNodes, setPeerNodes] = useState<any[]>([]);

  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyModalInitialTab, setCompanyModalInitialTab] = useState<'presets' | 'custom' | 'layout' | 'global_llm' | 'memory'>('presets');
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [isOfficeChatOpen, setIsOfficeChatOpen] = useState(false);
  const [officeChatInitialTab, setOfficeChatInitialTab] = useState<'war_room' | 'agent_collabs' | 'activity_logs'>('war_room');
  const [isDevServersModalOpen, setIsDevServersModalOpen] = useState(false);
  const [isWorldMapOpen, setIsWorldMapOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Human-in-the-Loop Decision State
  const [pendingDecisions, setPendingDecisions] = useState<HumanDecisionRequest[]>([]);
  const [activeDecisionModal, setActiveDecisionModal] = useState<HumanDecisionRequest | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Simulation Engine Instance (Ref persisted across renders)
  const simulationRef = useRef<OfficeSimulation>(new OfficeSimulation(1.0, currentCompany));

  // Auto-check P2P Node identity setup status on mount
  useEffect(() => {
    const checkNodeStatus = async () => {
      try {
        const res = await fetch('/api/node/status');
        const data = await res.json();
        if (!data.isInitialized) {
          setIsOnboardingOpen(true);
        } else if (data.identity) {
          const realCompanyId = data.identity.companyId || `comp-${data.identity.ownerAddress?.slice(2, 10).toLowerCase()}`;
          const realName = data.identity.companyName || 'Perusahaan Saya';
          const realIndustry = data.identity.industry || 'Software Engineering';

          setCurrentCompany((prev) => ({
            ...prev,
            id: realCompanyId,
            name: realName,
            industry: realIndustry,
          }));

          // Broadcast real presence immediately to P2P network
          fetch('/api/p2p', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_presence',
              companyName: realName,
              regionalSector: data.identity.regionId,
            }),
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('[NodeStatus] Could not check node identity:', err);
      }
    };
    checkNodeStatus();
  }, []);

  // Auto-initialize P2P Node and Telegram bot auto-connect on system ready
  useEffect(() => {
    fetch('/api/p2p').catch(() => {});
    // Auto-connect Telegram bot on system ready and send notification
    fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'auto_start', companyId: currentCompany.id }),
    }).catch(() => {});
  }, [currentCompany.id]);

  // Periodic P2P mesh network poll & live agent behavior sync
  useEffect(() => {
    let isMounted = true;
    const syncP2P = async () => {
      try {
        // 1. Fetch active peer nodes
        const res = await fetch('/api/p2p');
        const data = await res.json();
        if (data.success && Array.isArray(data.peers) && isMounted) {
          setPeerNodes(data.peers);
        }

        // 2. Broadcast local real agents presence & behaviors to P2P swarm
        if (currentCompany.id) {
          await fetch('/api/p2p', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'sync_presence',
              companyId: currentCompany.id,
              companyName: currentCompany.name,
              industry: currentCompany.industry,
              officeLayoutTemplate: currentCompany.officeLayoutTemplate,
              agents: agents.map((a) => ({
                id: a.id,
                name: a.name,
                role: a.roleTitle || a.role,
                avatarColor: a.shirtColor || '#3b82f6',
                hairColor: a.hairColor || '#0f172a',
                wx: a.currentPosition.x,
                wz: a.currentPosition.z,
                state: a.state,
                publicStatus: a.activeDialog?.message || a.stateMessage || 'Bekerja aktif di node kantor',
                activeDialog: a.activeDialog,
              })),
            }),
          });
        }
      } catch (err) {
        // Background sync
      }
    };

    syncP2P();
    const interval = setInterval(syncP2P, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentCompany.id, currentCompany.name, currentCompany.industry, currentCompany.officeLayoutTemplate, agents]);

  // Keep simulation aware of active company for LLM configurations & banter
  useEffect(() => {
    simulationRef.current.setCompany(currentCompany);
  }, [currentCompany]);

  // Data loading guard ref to prevent saving empty/default state over stored memory on mount
  const isDataLoadedRef = useRef(false);

  // Storage helper supporting both ceo_virtual_* and legacy vigent_* keys
  const getStorageItem = (prefix: string, id: string) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`ceo_virtual_${prefix}_${id}`) || localStorage.getItem(`vigent_${prefix}_${id}`);
  };
  const setStorageItem = (prefix: string, id: string, val: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`ceo_virtual_${prefix}_${id}`, val);
    localStorage.setItem(`vigent_${prefix}_${id}`, val);
  };

  // 1. Load persisted company, agents, tasks & events on initial mount or office switch
  useEffect(() => {
    let isMounted = true;
    isDataLoadedRef.current = false;

    const loadAllPersistedData = async () => {
      try {
        const companyId = currentCompany.id;

        // A. Load Company Profile & Progression
        const savedCompanyJson = getStorageItem('company', companyId);
        const savedLLM = getStorageItem('company_llm', companyId);
        let loadedCompany: Company = currentCompany;

        if (savedCompanyJson) {
          try {
            const parsedComp = JSON.parse(savedCompanyJson);
            if (parsedComp && parsedComp.id === companyId && isMounted) {
              if (savedLLM) {
                try {
                  parsedComp.globalLLMConfig = JSON.parse(savedLLM);
                } catch {}
              }
              loadedCompany = parsedComp;
              setCurrentCompany(parsedComp);
            }
          } catch {}
        } else {
          try {
            const compRes = await fetch('/api/workspace', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get_company', companyId }),
            }).then((r) => r.json());
            if (compRes?.success && compRes.company && isMounted) {
              if (savedLLM) {
                try {
                  compRes.company.globalLLMConfig = JSON.parse(savedLLM);
                } catch {}
              }
              loadedCompany = compRes.company;
              setCurrentCompany(compRes.company);
            }
          } catch {}
        }

        // Helper to ensure all agents without manual custom API key use Company Global LLM
        const applyGlobalLLMToUnconfiguredAgents = (rawAgents: Agent[]): Agent[] => {
          const compLLM = loadedCompany.globalLLMConfig;
          if (!compLLM) return rawAgents;
          return rawAgents.map((ag) => {
            const hasManualKey = ag.inheritedLLMCategory === 'manual' && Boolean(ag.llmConfig?.apiKey);
            if (!hasManualKey) {
              const cat = (ag.inheritedLLMCategory && ag.inheritedLLMCategory !== 'manual')
                ? ag.inheritedLLMCategory
                : 'text';
              const catSetting = compLLM[cat] || compLLM.text;
              return {
                ...ag,
                inheritedLLMCategory: cat,
                llmConfig: {
                  provider: catSetting?.provider || 'openai',
                  baseUrl: catSetting?.baseUrl,
                  apiKey: catSetting?.apiKey,
                  model: catSetting?.model || 'gpt-4o',
                  isLocked: false,
                },
              };
            }
            return ag;
          });
        };

        // B. Load Agents (XP, Level, Assigned Roles, Positions)
        const savedAgentsJson = getStorageItem('agents', companyId);
        let agentsLoaded = false;
        if (savedAgentsJson) {
          try {
            const parsedAgents = JSON.parse(savedAgentsJson);
            if (Array.isArray(parsedAgents) && isMounted) {
              const synchronizedAgents = applyGlobalLLMToUnconfiguredAgents(parsedAgents);
              setAgents(synchronizedAgents);
              agentsLoaded = true;
            }
          } catch {}
        }
        if (!agentsLoaded) {
          try {
            const agentsRes = await fetch('/api/workspace', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get_agents', companyId }),
            }).then((r) => r.json());
            if (agentsRes?.success && Array.isArray(agentsRes.agents) && isMounted) {
              const synchronizedAgents = applyGlobalLLMToUnconfiguredAgents(agentsRes.agents);
              setAgents(synchronizedAgents);
              agentsLoaded = true;
            }
          } catch {}
        }
        if (!agentsLoaded && isMounted) {
          setAgents([]);
        }

        // C. Load Tasks
        const savedTasksJson = getStorageItem('tasks', companyId);
        let initialLocalTasks: TaskTicket[] = [];
        if (savedTasksJson) {
          try {
            const parsedTasks = JSON.parse(savedTasksJson);
            if (Array.isArray(parsedTasks)) {
              initialLocalTasks = parsedTasks;
            }
          } catch {}
        }

        try {
          const tasksRes = await fetch('/api/workspace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_tasks', companyId }),
          }).then((r) => r.json());
          if (tasksRes?.success && Array.isArray(tasksRes.tasks) && isMounted) {
            const taskMap = new Map<string, TaskTicket>();
            initialLocalTasks.forEach((t) => taskMap.set(t.id, t));
            tasksRes.tasks.forEach((t: TaskTicket) => taskMap.set(t.id, t));
            const merged = Array.from(taskMap.values());
            setTasks(merged);
          } else if (isMounted) {
            setTasks(initialLocalTasks);
          }
        } catch {
          if (isMounted) {
            setTasks(initialLocalTasks);
          }
        }

        // D. Load Activity Events
        const savedEventsJson = getStorageItem('events', companyId);
        if (savedEventsJson) {
          try {
            const parsedEvents = JSON.parse(savedEventsJson);
            if (Array.isArray(parsedEvents) && parsedEvents.length > 0 && isMounted) {
              setEvents(parsedEvents);
            }
          } catch {}
        } else {
          try {
            const eventsRes = await fetch('/api/workspace', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get_events', companyId }),
            }).then((r) => r.json());
            if (eventsRes?.success && Array.isArray(eventsRes.events) && eventsRes.events.length > 0 && isMounted) {
              setEvents(eventsRes.events);
            }
          } catch {}
        }

        // E. Sync current presence with P2P Swarm & Relay
        fetch('/api/p2p', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_presence',
            companyName: currentCompany.name,
            regionalSector: 'region-jakarta',
          }),
        }).catch(() => {});
      } catch (e) {
        console.error('Error loading data from storage:', e);
      } finally {
        if (isMounted) {
          isDataLoadedRef.current = true;
        }
      }
    };

    loadAllPersistedData();
    return () => {
      isMounted = false;
    };
  }, [currentCompany.id]);

  // 2. Persist tasks to localStorage & server disk whenever tasks update
  useEffect(() => {
    if (!isDataLoadedRef.current || !tasks || tasks.length === 0) return;
    try {
      setStorageItem('tasks', currentCompany.id, JSON.stringify(tasks));

      const timer = setTimeout(() => {
        fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_tasks', companyId: currentCompany.id, tasks }),
        }).catch(console.error);
      }, 1200);
      return () => clearTimeout(timer);
    } catch (e) {
      console.error('Error saving tasks to storage:', e);
    }
  }, [tasks, currentCompany.id]);

  // 3. Persist activity events to localStorage & server disk whenever events update
  useEffect(() => {
    if (!isDataLoadedRef.current || !events || events.length === 0) return;
    try {
      const recentToSave = events.slice(-300);
      setStorageItem('events', currentCompany.id, JSON.stringify(recentToSave));

      const timer = setTimeout(() => {
        fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_events', companyId: currentCompany.id, events: recentToSave }),
        }).catch(console.error);
      }, 1500);
      return () => clearTimeout(timer);
    } catch (e) {
      console.error('Error saving events to storage:', e);
    }
  }, [events, currentCompany.id]);

  // 4. Persist agents (XP, Level, Skills) whenever agents update
  useEffect(() => {
    if (!isDataLoadedRef.current || !agents || agents.length === 0) return;
    try {
      setStorageItem('agents', currentCompany.id, JSON.stringify(agents));

      const timer = setTimeout(() => {
        fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_agents', companyId: currentCompany.id, agents }),
        }).catch(console.error);
      }, 1500);
      return () => clearTimeout(timer);
    } catch (e) {
      console.error('Error saving agents to storage:', e);
    }
  }, [agents, currentCompany.id]);

  // 5. Persist company state (Coins, Level, Reputation) whenever company updates
  useEffect(() => {
    if (!isDataLoadedRef.current || !currentCompany) return;
    try {
      setStorageItem('company', currentCompany.id, JSON.stringify(currentCompany));

      const timer = setTimeout(() => {
        fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_company', companyId: currentCompany.id, company: currentCompany }),
        }).catch(console.error);
      }, 2000);
      return () => clearTimeout(timer);
    } catch (e) {
      console.error('Error saving company to storage:', e);
    }
  }, [currentCompany]);

  // 6. Periodic background check for tasks created externally (e.g. via Telegram War Room)
  useEffect(() => {
    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_tasks', companyId: currentCompany.id }),
        });
        if (!isSubscribed) return;
        const data = await res.json();
        if (data?.success && Array.isArray(data.tasks) && isSubscribed) {
          setTasks((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const newTasks = data.tasks.filter((t: TaskTicket) => !existingIds.has(t.id));
            if (newTasks.length > 0) {
              return [...newTasks, ...prev];
            }
            return prev;
          });
        }
      } catch {
        // silent
      }
    }, 4000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [currentCompany.id]);

  // Simulation tick sync callback from 3D Canvas
  const handleSimulationUpdate = useCallback(
    (updatedAgents: Agent[], updatedTasks: TaskTicket[], newEvents: ActivityEvent[]) => {
      setAgents(updatedAgents);
      setTasks(updatedTasks);
      if (newEvents.length > 0) {
        setEvents((prev) => [...prev, ...newEvents].slice(-300));

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
                  projectName: task.projectName || task.title,
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
          if (matchingReq) {
            setActiveDecisionModal((currentModal) => {
              if (!currentModal || currentModal.id !== matchingReq.id) {
                return matchingReq;
              }
              return currentModal;
            });
          }
          return prevDecisions;
        });
      }
    },
    []
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

    const { updatedSender, event } = simulationRef.current.triggerCollaboration(sender, target, undefined, tasks);
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

  const handleSendSprint = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    const { updatedAgent, event } = simulationRef.current.triggerSprintViewing(agent);
    setAgents((prev) => prev.map((a) => (a.id === agentId ? updatedAgent : a)));
    setEvents((prev) => [...prev, event]);
  };

  const handleReturnDesk = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    const updated = simulationRef.current.returnToDesk(agent);
    setAgents((prev) => prev.map((a) => (a.id === agentId ? updated : a)));
  };

  // Out-of-town Travel Missions: Employee walks to Train Station or Car, then returns on completion
  const handleMissionDispatched = useCallback(
    (mission: TravelMission) => {
      const agent = agents.find((a) => a.id === mission.agentId);
      if (!agent) return;

      const { updatedAgent, event } = simulationRef.current.dispatchAgentOnTravelMission(agent, mission);
      setAgents((prev) => prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)));
      setEvents((prev) => [event, ...prev.slice(0, 299)]);
    },
    [agents]
  );

  const handleMissionCompleted = useCallback(
    (mission: TravelMission) => {
      const agent = agents.find((a) => a.id === mission.agentId);
      if (!agent) return;

      const { updatedAgent, event } = simulationRef.current.returnAgentFromTravelMission(agent, mission);
      setAgents((prev) => prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)));
      setEvents((prev) => [event, ...prev.slice(0, 299)]);

      if (mission.outcome) {
        setUserAccount((prev) => ({
          ...prev,
          pointsBalance: prev.pointsBalance + (mission.outcome?.earnedCoins || 250),
        }));
      }
    },
    [agents]
  );

  // Supermarket purchase handler in Neo-Jakarta district
  const handleBuySupermarketItem = useCallback(
    (item: { name: string; price: number; effect: string }) => {
      setUserAccount((prev) => {
        if (prev.pointsBalance < item.price) return prev;
        return {
          ...prev,
          pointsBalance: Math.max(0, prev.pointsBalance - item.price),
        };
      });

      const buyEvent: ActivityEvent = {
        id: `event-buy-${Date.now()}`,
        timestamp: Date.now(),
        type: 'break',
        agentId: agents[0]?.id || 'user',
        agentName: 'Office Manager',
        description: `🛒 Membeli [${item.name}] seharga ${item.price} pts di CEO Virtual SuperMart 24/7. Efek: ${item.effect}`,
      };
      setEvents((prev) => [buyEvent, ...prev.slice(0, 299)]);
    },
    [agents]
  );

  // Background monitor: Check active missions and auto-return employee when trip completes
  useEffect(() => {
    const missionInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/world');
        const data = await res.json();
        if (data.success && Array.isArray(data.missions)) {
          const completedMissions: TravelMission[] = data.missions.filter(
            (m: TravelMission) => m.status === 'completed'
          );
          completedMissions.forEach((cm) => {
            const awayAgent = agents.find(
              (a) => a.id === cm.agentId && (a.state === 'at_train_station' || a.state === 'business_trip')
            );
            if (awayAgent) {
              handleMissionCompleted(cm);
            }
          });
        }
      } catch {}
    }, 5000);
    return () => clearInterval(missionInterval);
  }, [agents, handleMissionCompleted]);

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

  // Set Leader of Company
  const handleSetLeader = (agentId: string) => {
    setCurrentCompany((prev) => {
      const updated = { ...prev, leaderAgentId: agentId };
      try {
        setStorageItem('company', prev.id, JSON.stringify(updated));
        fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_company', companyId: prev.id, company: updated }),
        }).catch(console.error);
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    setAgents((prevAgents) => {
      const updatedAgents = prevAgents.map((ag) => ({
        ...ag,
        isLeader: ag.id === agentId,
      }));
      try {
        setStorageItem('agents', currentCompany.id, JSON.stringify(updatedAgents));
        fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_agents', companyId: currentCompany.id, agents: updatedAgents }),
        }).catch(console.error);
      } catch (e) {
        console.error(e);
      }
      return updatedAgents;
    });

    const target = agents.find((a) => a.id === agentId);
    if (target) {
      setEvents((prev) => [
        ...prev,
        {
          id: `evt-leader-${Date.now()}`,
          timestamp: Date.now(),
          type: 'system',
          agentId: target.id,
          agentName: target.name,
          description: `👑 ${target.name} sekarang resmi menjadi Leader Tim ${currentCompany.name}!`,
        },
      ]);
    }
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
  const handleUpdateLLMConfig = (
    agentId: string,
    updatedConfig: LLMConfig,
    inheritedCategory?: LLMCategory | 'manual',
    applyToAllInCompany?: boolean
  ) => {
    setAgents((prev) => {
      const updatedAgents = prev.map((a) => {
        if (applyToAllInCompany) {
          return {
            ...a,
            llmConfig: updatedConfig,
            inheritedLLMCategory: inheritedCategory,
          };
        }
        if (a.id === agentId) {
          return {
            ...a,
            llmConfig: updatedConfig,
            inheritedLLMCategory: inheritedCategory,
          };
        }
        return a;
      });

      // Synchronously persist updated agents to localStorage and disk
      try {
        setStorageItem('agents', currentCompany.id, JSON.stringify(updatedAgents));
        fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_agents', companyId: currentCompany.id, agents: updatedAgents }),
        }).catch(console.error);
      } catch (e) {
        console.error('Error saving agents on LLM config update:', e);
      }

      return updatedAgents;
    });
  };

  // Update Company's Global LLM Settings
  const handleUpdateCompanyLLMConfig = (updatedGlobalLLM: CompanyGlobalLLMConfig) => {
    setCurrentCompany((prev) => {
      const updated = { ...prev, globalLLMConfig: updatedGlobalLLM };
      try {
        setStorageItem('company_llm', prev.id, JSON.stringify(updatedGlobalLLM));
        setStorageItem('company', prev.id, JSON.stringify(updated));
        fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_company', companyId: prev.id, company: updated }),
        }).catch(console.error);
        fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_company_llm', companyId: prev.id, globalLLMConfig: updatedGlobalLLM }),
        }).catch(console.error);
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // Update all agents who haven't set a manual custom key so they immediately inherit this Global LLM
    setAgents((prevAgents) => {
      const updatedAgents = prevAgents.map((ag) => {
        const hasManualKey = ag.inheritedLLMCategory === 'manual' && Boolean(ag.llmConfig?.apiKey);
        if (!hasManualKey) {
          const category = (ag.inheritedLLMCategory && ag.inheritedLLMCategory !== 'manual')
            ? ag.inheritedLLMCategory
            : 'text';
          const categorySetting = updatedGlobalLLM[category] || updatedGlobalLLM.text;
          return {
            ...ag,
            inheritedLLMCategory: category,
            llmConfig: {
              provider: categorySetting?.provider || 'openai',
              baseUrl: categorySetting?.baseUrl,
              apiKey: categorySetting?.apiKey,
              model: categorySetting?.model || 'gpt-4o',
              isLocked: false,
            },
          };
        }
        return ag;
      });

      try {
        const storageKey = `vigent_agents_${currentCompany.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedAgents));
        fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_agents', companyId: currentCompany.id, agents: updatedAgents }),
        }).catch(console.error);
      } catch (e) {
        console.error('Error saving agents on global LLM update:', e);
      }

      return updatedAgents;
    });
  };

  const handleOpenCompanyModal = (tab: 'presets' | 'custom' | 'layout' | 'global_llm' | 'memory' = 'presets') => {
    setCompanyModalInitialTab(tab);
    setIsCompanyModalOpen(true);
  };

  // Add Task to Board
  const handleAddTask = (
    newTaskData: Omit<TaskTicket, 'id' | 'createdAt' | 'progress' | 'artifacts' | 'logs'>
  ) => {
    const assignedAgent = agents.find((a) => a.id === newTaskData.assignedAgentId);
    const newTicket: TaskTicket = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      progress: 0,
      status: newTaskData.assignedAgentId ? 'in_progress' : 'backlog',
      artifacts: [],
      logs: [
        `Task created into sprint system. ${
          assignedAgent ? `Assigned to ${assignedAgent.name} (Executing)` : 'Placed in Backlog'
        }`,
      ],
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTicket, ...prev]);

    // Auto-create dedicated project folder and files on disk in ~/.vigent/workspaces
    fetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate_task_code',
        projectName: newTicket.title,
        taskTitle: newTicket.title,
        taskType: newTicket.type,
        agentName: assignedAgent?.name || 'Autonomous Dev',
      }),
    }).catch(console.error);

    if (newTicket.assignedAgentId && assignedAgent) {
      // Actively send agent to desk to execute task
      const workingAgent = simulationRef.current.returnToDesk({
        ...assignedAgent,
        state: 'working',
        currentTaskId: newTicket.id,
        stateMessage: `⚡ Working on: "${newTicket.title}"`,
      });

      setAgents((prev) =>
        prev.map((a) => (a.id === newTicket.assignedAgentId ? workingAgent : a))
      );

      // Add immediate activity event
      setEvents((prev) => [
        ...prev,
        {
          id: `task-start-${Date.now()}`,
          timestamp: Date.now(),
          type: 'task_start',
          agentId: assignedAgent.id,
          agentName: assignedAgent.name,
          description: `⚡ ${assignedAgent.name} reported to desk and actively started executing task: "${newTicket.title}"`,
        },
      ]);
    }
  };

  // Assign Task
  const handleAssignTask = (taskId: string, agentId: string) => {
    const assignedAgent = agents.find((a) => a.id === agentId);
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!assignedAgent || !targetTask) return;

    // Send agent straight to desk to work
    const workingAgent = simulationRef.current.returnToDesk({
      ...assignedAgent,
      state: 'working',
      currentTaskId: taskId,
      stateMessage: `⚡ Working on: "${targetTask.title}"`,
    });

    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? workingAgent : a))
    );

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            assignedAgentId: agentId,
            status: 'in_progress' as const,
            logs: [...t.logs, `Assigned to ${assignedAgent.name} (Sprint execution started)`],
          };
        }
        return t;
      })
    );

    setEvents((prev) => [
      ...prev,
      {
        id: `task-assign-${Date.now()}`,
        timestamp: Date.now(),
        type: 'task_start',
        agentId: agentId,
        agentName: assignedAgent.name,
        description: `⚡ ${assignedAgent.name} assigned to task "${targetTask.title}" and started execution at desk.`,
      },
    ]);
  };

  // Delete Task from Board
  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setAgents((prev) =>
      prev.map((a) =>
        a.currentTaskId === taskId
          ? { ...a, state: 'idle', currentTaskId: undefined, stateMessage: 'Task dibatalkan / dihapus' }
          : a
      )
    );
    fetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_task', companyId: currentCompany.id, taskId }),
    }).catch(console.error);
    setEvents((prev) => [
      ...prev,
      {
        id: `task-delete-${Date.now()}`,
        timestamp: Date.now(),
        type: 'task_start',
        agentId: 'user',
        agentName: 'Project Manager',
        description: `🗑️ Task berhasil dihapus dari Sprint Board.`,
      },
    ]);
  };

  // Edit Task from Board
  const handleEditTask = (updatedTask: TaskTicket) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    fetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit_task', companyId: currentCompany.id, updatedTask }),
    }).catch(console.error);

    if (updatedTask.status === 'in_progress' && updatedTask.assignedAgentId) {
      const assignedAgent = agents.find((a) => a.id === updatedTask.assignedAgentId);
      if (assignedAgent) {
        const workingAgent = simulationRef.current.returnToDesk({
          ...assignedAgent,
          state: 'working',
          currentTaskId: updatedTask.id,
          stateMessage: `⚡ Working on: "${updatedTask.title}"`,
        });
        setAgents((prev) =>
          prev.map((a) => (a.id === updatedTask.assignedAgentId ? workingAgent : a))
        );
      }
    } else if (updatedTask.status === 'done') {
      setAgents((prev) =>
        prev.map((a) =>
          a.currentTaskId === updatedTask.id
            ? { ...a, state: 'idle', currentTaskId: undefined, stateMessage: 'Task selesai' }
            : a
        )
      );
    }

    setEvents((prev) => [
      ...prev,
      {
        id: `task-edit-${Date.now()}`,
        timestamp: Date.now(),
        type: 'task_start',
        agentId: updatedTask.assignedAgentId || 'user',
        agentName: 'Project Manager',
        description: `📝 Task "${updatedTask.title}" berhasil diperbarui [Status: ${updatedTask.status}].`,
      },
    ]);
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
  const selectedAgentTask =
    tasks.find((t) => t.id === selectedAgent?.currentTaskId) ||
    tasks.find((t) => t.assignedAgentId === selectedAgent?.id && t.status === 'in_progress') ||
    tasks.filter((t) => t.assignedAgentId === selectedAgent?.id && t.status === 'done').slice(-1)[0];

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
        onTogglePause={handleTogglePause}
        onChangeSpeed={handleChangeSpeed}
        onOpenCompanyModal={handleOpenCompanyModal}
        onOpenTasksModal={() => setIsTasksModalOpen(true)}
        onOpenRosterModal={() => setIsRosterModalOpen(true)}
        onOpenOfficeChat={() => {
          setOfficeChatInitialTab('war_room');
          setIsOfficeChatOpen(true);
        }}
        onOpenMarketplace={() => setIsMarketplaceOpen(true)}
        onOpenWallet={() => setIsWalletOpen(true)}
        onOpenDecisions={() => {
          if (pendingDecisions.length > 0) {
            setActiveDecisionModal(pendingDecisions[0]);
          }
        }}
        onOpenWorkspace={() => setIsWorkspaceModalOpen(true)}
        onOpenExtensions={() => setIsExtensionsOpen(true)}
        onOpenDevServers={() => setIsDevServersModalOpen(true)}
        onOpenWorldMap={() => setIsWorldMapOpen(true)}
        onOpenNodeSetup={() => setIsOnboardingOpen(true)}
        onOpenCollabLogs={() => {
          setOfficeChatInitialTab('agent_collabs');
          setIsOfficeChatOpen(true);
        }}
        onOpenActivityLogs={() => {
          setOfficeChatInitialTab('activity_logs');
          setIsOfficeChatOpen(true);
        }}
      />

      {/* Office Simulation Viewport: 2.5D Isometric (Ultra-Fast & Ringan) */}
      <IsometricOffice
        currentCompany={currentCompany}
        agents={agents}
        tasks={tasks}
        simulation={simulationRef.current}
        selectedAgentId={selectedAgentId}
        peerNodes={peerNodes}
        onSelectAgent={(agentId) => setSelectedAgentId(agentId)}
        onSimulationUpdate={handleSimulationUpdate}
        onOpenChat={() => {
          setOfficeChatInitialTab('war_room');
          setIsOfficeChatOpen(true);
        }}
        onOpenTasks={() => setIsTasksModalOpen(true)}
        onOpenSettings={() => setIsWorkspaceModalOpen(true)}
        onOpenWorldMap={() => setIsWorldMapOpen(true)}
        onOpenCompanyModal={handleOpenCompanyModal}
      />

      {/* Office Live Activity Feed Ticker (Bottom-Left) */}
      <ActivityFeed
        events={events}
        onOpenActivityLogs={() => {
          setOfficeChatInitialTab('activity_logs');
          setIsOfficeChatOpen(true);
        }}
        onOpenCollabLogs={() => {
          setOfficeChatInitialTab('agent_collabs');
          setIsOfficeChatOpen(true);
        }}
      />

      {/* Agent Inspector Modal (Right Sidebar) */}
      {selectedAgent && (
        <AgentInspector
          agent={selectedAgent}
          allAgents={agents}
          currentTask={selectedAgentTask}
          allTasks={tasks}
          companyName={currentCompany.name}
          company={currentCompany}
          onClose={() => setSelectedAgentId(undefined)}
          onSendCollab={handleSendCollab}
          onSendCoffee={handleSendCoffee}
          onSendSprint={handleSendSprint}
          onReturnDesk={handleReturnDesk}
          onTriggerHumanDecision={handleTriggerHumanDecision}
          onFireAgent={handleFireAgent}
          onSetLeader={handleSetLeader}
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
          onDeleteTask={handleDeleteTask}
          onEditTask={handleEditTask}
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
          initialTab={companyModalInitialTab}
          onClose={() => setIsCompanyModalOpen(false)}
          onSelectCompany={handleSelectCompany}
          onUpdateCompanyLLMConfig={handleUpdateCompanyLLMConfig}
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

      {/* Office Group Chat / War Room & Collaboration History Modal */}
      {isOfficeChatOpen && (
        <OfficeChatModal
          company={currentCompany}
          agents={agents}
          tasks={tasks}
          events={events}
          initialTab={officeChatInitialTab}
          onClose={() => setIsOfficeChatOpen(false)}
          onSelectAgent={(id) => {
            setSelectedAgentId(id);
            setIsOfficeChatOpen(false);
          }}
          onTriggerCollab={handleSendCollab}
          onOpenDevServers={() => setIsDevServersModalOpen(true)}
          onClearEvents={() => {
            setEvents([]);
            try {
              localStorage.removeItem(`vigent_events_${currentCompany.id}`);
            } catch (e) {
              console.error(e);
            }
            fetch('/api/workspace', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'save_events', companyId: currentCompany.id, events: [] }),
            }).catch(console.error);
          }}
        />
      )}

      {/* Docker Desktop-style Open Ports & Dev Servers Modal */}
      {isDevServersModalOpen && (
        <DevServersModal onClose={() => setIsDevServersModalOpen(false)} />
      )}

      {/* 🗺️ Open World Map & Decentralized Regional Transit Modal */}
      {isWorldMapOpen && (
        <WorldMapModal
          currentCompany={currentCompany}
          agents={agents}
          userPoints={userAccount.pointsBalance}
          onClose={() => setIsWorldMapOpen(false)}
          onDispatchMission={handleMissionDispatched}
          onMissionCompleted={handleMissionCompleted}
          onBuyItem={handleBuySupermarketItem}
        />
      )}

      {/* 🎵 Floating Winamp YouTube Music Player & Remote SoundSystem */}
      <WinampMusicPlayer
        companyId={currentCompany.id}
        companyName={currentCompany.name}
      />

      {/* 👑 Interactive P2P Node Onboarding & Genesis Setup Modal */}
      <OnboardingSetupModal
        isOpen={isOnboardingOpen}
        onComplete={(data) => {
          setIsOnboardingOpen(false);
          const newCompanyId = `comp-${(data.address || 'addr').slice(2, 10).toLowerCase()}`;

          // Formatted Agents with desk slots & global LLM inheritance
          const finalAgents: Agent[] = (data.agents || []).map((ag, idx) => ({
            ...ag,
            companyId: newCompanyId,
            deskPosition: DESK_SLOTS[idx] || { x: 0, z: 0 },
            currentPosition: DESK_SLOTS[idx] || { x: 0, z: 0 },
            inheritedLLMCategory: 'text',
          }));

          const finalTasks: TaskTicket[] = (data.tasks || []).map((t) => ({
            ...t,
            projectName: data.companyName,
          }));

          const newComp: Company = {
            id: newCompanyId,
            ownerUserId: data.address || 'owner-node',
            name: data.companyName,
            industry: data.industry,
            description: data.description || `Perusahaan ${data.companyName} di shard regional ${data.regionId}`,
            officeLayoutTemplate: data.officeLayoutTemplate || 'tech_startup',
            departments: data.departments || [],
            agents: finalAgents,
            tasks: finalTasks,
            globalLLMConfig: data.globalLLMConfig,
          };

          setCurrentCompany(newComp);
          setAgents(finalAgents);
          setTasks(finalTasks);

          const llmDesc = data.globalLLMConfig?.text
            ? ` (Global LLM: ${data.globalLLMConfig.text.provider.toUpperCase()} - ${data.globalLLMConfig.text.model})`
            : '';

          setEvents([
            {
              id: 'genesis-block-0',
              timestamp: Date.now(),
              type: 'system',
              agentId: 'genesis',
              agentName: 'Genesis Protocol',
              description: `Genesis Block terverifikasi. Perusahaan ${data.companyName} resmi didirikan di jaringan P2P${llmDesc}!`,
            },
          ]);

          // Save fresh company, LLM, agents, and tasks to localStorage
          setStorageItem('company', newCompanyId, JSON.stringify(newComp));
          setStorageItem('agents', newCompanyId, JSON.stringify(finalAgents));
          setStorageItem('tasks', newCompanyId, JSON.stringify(finalTasks));
          if (data.globalLLMConfig) {
            setStorageItem('company_llm', newCompanyId, JSON.stringify(data.globalLLMConfig));
            try {
              localStorage.setItem('ceo_virtual_global_llm', JSON.stringify(data.globalLLMConfig));
            } catch {}
          }

          // Persist to backend workspace files
          fetch('/api/workspace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save_company',
              companyId: newCompanyId,
              company: newComp,
            }),
          }).catch(() => {});

          if (data.globalLLMConfig) {
            fetch('/api/workspace', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'save_company_llm',
                companyId: newCompanyId,
                globalLLMConfig: data.globalLLMConfig,
              }),
            }).catch(() => {});
          }

          if (finalAgents.length > 0) {
            fetch('/api/workspace', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'save_agents',
                companyId: newCompanyId,
                agents: finalAgents,
              }),
            }).catch(() => {});
          }

          if (finalTasks.length > 0) {
            fetch('/api/workspace', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'save_tasks',
                companyId: newCompanyId,
                tasks: finalTasks,
              }),
            }).catch(() => {});
          }

          // Announce to P2P network
          fetch('/api/p2p', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_presence',
              companyName: data.companyName,
              regionalSector: data.regionId,
            }),
          }).catch(() => {});
        }}
      />

    </main>
  );
}
