import { Agent, AgentState, TaskTicket, Position3D, ActivityEvent, AgentDialog, HumanDecisionRequest, MarketplaceAgent, Company, TravelMission } from '@/types/office';
import { findPath } from '@/lib/pathfinding';
import {
  PANTRY_CENTER,
  MEETING_ROOM_CENTER,
  WATER_COOLER_SPOT,
  OWNER_INTERACTION_SPOT,
  EXIT_DOOR_SPOT,
  COFFEE_MACHINE_SPOT,
  PANTRY_TABLE_SPOT,
  GAME_ROOM_SPOT,
  SOFA_LOUNGE_SPOT,
  LOBBY_SPOT,
  SPRINT_STATION_SPOT,
  TRAIN_STATION_SPOT,
  CAR_PARKING_SPOT,
  getEffectiveAgentLLMConfig,
} from '@/lib/companyPresets';
import { generateProceduralCollabBanter } from '@/lib/collabDialogGenerator';

export type AgentArrivalState = Exclude<AgentState, 'walking'>;

export interface AgentPathState {
  agentId: string;
  waypoints: Position3D[];
  currentWaypointIndex: number;
  finalTarget: Position3D;
  onArrivalState: AgentArrivalState;
  targetAgentId?: string;
  dialogContext?: string;
  dialogCategory?: string;
  dialogColor?: string;
  decisionRequest?: HumanDecisionRequest;
}

export interface MultiTurnDialogState {
  senderId: string;
  targetId: string;
  turn: number;
  turn1Msg?: string;
  turn2Msg?: string;
  categoryTag?: string;
  tagColor?: string;
  suggestedAction?: 'play_game' | 'coffee' | 'none';
  turnTimer: number;
  turn1Timestamp?: number;
  turn2Timestamp?: number;
}

export class OfficeSimulation {
  private pathStates: Map<string, AgentPathState> = new Map();
  private speedMultiplier: number = 1.0;
  private isPaused: boolean = false;
  private lastCollabTime: number = Date.now();
  private lastLlmCollabTime: number = 0;
  private isLlmCollabPending: boolean = false;
  private lastIdleActivityTime: number = Date.now();
  private activeMultiTurnDialog?: MultiTurnDialogState;
  private idleTimers: Map<string, { startTime: number; duration: number; nextSpot?: Position3D; nextState?: AgentArrivalState; nextMessage?: string }> = new Map();
  public currentCompany?: Company;

  constructor(speed: number = 1.0, company?: Company) {
    this.speedMultiplier = speed;
    this.currentCompany = company;
  }

  public setCompany(company: Company) {
    this.currentCompany = company;
  }

  public setSpeed(speed: number) {
    this.speedMultiplier = speed;
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
  }

  public getAgentPathState(agentId: string): AgentPathState | undefined {
    return this.pathStates.get(agentId);
  }

  public getAllPathStates(): Map<string, AgentPathState> {
    return this.pathStates;
  }

  // Instruct an agent to walk to a destination
  public sendAgentTo(
    agent: Agent,
    destination: Position3D,
    onArrivalState: AgentArrivalState,
    targetAgentId?: string,
    dialogContext?: string,
    dialogCategory?: string,
    dialogColor?: string
  ): Agent {
    const waypoints = findPath(agent.currentPosition, destination);
    if (waypoints.length <= 1) {
      return {
        ...agent,
        state: onArrivalState,
        currentPosition: destination,
      };
    }

    this.pathStates.set(agent.id, {
      agentId: agent.id,
      waypoints,
      currentWaypointIndex: 1, // Start moving towards first waypoint
      finalTarget: destination,
      onArrivalState,
      targetAgentId,
      dialogContext,
      dialogCategory,
      dialogColor,
    });

    return {
      ...agent,
      state: 'walking',
      stateMessage: targetAgentId
        ? `Walking to colleague's desk for collaboration`
        : onArrivalState === 'coffee_break'
        ? `Walking to pantry for a quick coffee`
        : onArrivalState === 'meeting'
        ? `Walking to conference room for team sync`
        : `Returning to desk`,
      targetPosition: destination,
    };
  }

  // Trigger a physical collaboration where agent A walks to agent B with REAL LLM / Personality DIALOGUE
  public triggerCollaboration(
    sender: Agent,
    target: Agent,
    context?: string,
    tasks: TaskTicket[] = []
  ): { updatedSender: Agent; event: ActivityEvent } {
    // 1. Instantly generate personality-tailored opening banter (0ms latency, authentic MBTI)
    const initialBanter = generateProceduralCollabBanter(
      sender,
      target,
      1,
      undefined,
      tasks,
      this.currentCompany?.name
    );
    const chosenContext = context || initialBanter.message;
    const categoryTag = initialBanter.categoryTag;
    const tagColor = initialBanter.tagColor;
    
    // Pre-seed Turn 2 counter-response so two-way banter is guaranteed even if offline
    const initialTurn2 = generateProceduralCollabBanter(
      target,
      sender,
      2,
      chosenContext,
      tasks,
      this.currentCompany?.name
    );

    // Target position next to colleague's desk with clear, non-overlapping spacing
    const colDesk = target.deskPosition;
    const offsetX = colDesk.x < 0 ? 1.4 : -1.4;
    const offsetZ = 0.2;
    const dest = { x: Number((colDesk.x + offsetX).toFixed(2)), z: Number((colDesk.z + offsetZ).toFixed(2)) };

    const updatedSender = this.sendAgentTo(
      sender,
      dest,
      'talking',
      target.id,
      chosenContext,
      categoryTag,
      tagColor
    );
    updatedSender.stateMessage = `Menghampiri meja ${target.name} untuk mengobrol (${categoryTag})...`;

    // Record multi-turn state immediately with rich personality seed
    this.activeMultiTurnDialog = {
      senderId: sender.id,
      targetId: target.id,
      turn: 1,
      turn1Msg: chosenContext,
      turn2Msg: initialTurn2.message,
      categoryTag,
      tagColor,
      suggestedAction: initialBanter.suggestedAction || 'none',
      turnTimer: 0,
    };

    // Asynchronously call LLM for dynamic live conversation
    const now = Date.now();
    this.lastLlmCollabTime = now;
    this.isLlmCollabPending = true;

    if (typeof window !== 'undefined') {
      const inProgressTask = tasks.find((t) => t.status === 'in_progress');
      const effectiveConfig = getEffectiveAgentLLMConfig(sender, this.currentCompany);

      fetch('/api/agent/collab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speaker: {
            name: sender.name,
            roleTitle: sender.roleTitle,
            personality: sender.personality,
          },
          listener: {
            name: target.name,
            roleTitle: target.roleTitle,
            personality: target.personality,
          },
          config: effectiveConfig,
          companyName: this.currentCompany?.name || 'ShadowMove',
          inProgressTaskTitle: inProgressTask?.title,
          turn: 1,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          this.isLlmCollabPending = false;
          if (data.success && data.message) {
            const currentPath = this.pathStates.get(sender.id);
            if (currentPath && (currentPath.targetAgentId === target.id || currentPath.onArrivalState === 'talking')) {
              currentPath.dialogContext = data.message;
              currentPath.dialogCategory = data.categoryTag || categoryTag;
              currentPath.dialogColor = data.tagColor || tagColor;
            }

            // Update multi-turn state with LLM's dynamic response
            if (this.activeMultiTurnDialog && this.activeMultiTurnDialog.senderId === sender.id) {
              this.activeMultiTurnDialog.turn1Msg = data.message;
              this.activeMultiTurnDialog.categoryTag = data.categoryTag || categoryTag;
              this.activeMultiTurnDialog.tagColor = data.tagColor || tagColor;
              if (data.suggestedAction && data.suggestedAction !== 'none') {
                this.activeMultiTurnDialog.suggestedAction = data.suggestedAction;
              }
            }

            // Pre-fetch Turn 2 (Target's live response to Sender's LLM message)
            const targetConfig = getEffectiveAgentLLMConfig(target, this.currentCompany);
            fetch('/api/agent/collab', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                speaker: {
                  name: target.name,
                  roleTitle: target.roleTitle,
                  personality: target.personality,
                },
                listener: {
                  name: sender.name,
                  roleTitle: sender.roleTitle,
                  personality: sender.personality,
                },
                config: targetConfig,
                companyName: this.currentCompany?.name || 'ShadowMove',
                inProgressTaskTitle: inProgressTask?.title,
                previousMessage: data.message,
                turn: 2,
              }),
            })
              .then((r) => r.json())
              .then((t2Data) => {
                if (t2Data.success && t2Data.message && this.activeMultiTurnDialog) {
                  this.activeMultiTurnDialog.turn2Msg = t2Data.message;
                  if (t2Data.suggestedAction && t2Data.suggestedAction !== 'none') {
                    this.activeMultiTurnDialog.suggestedAction = t2Data.suggestedAction;
                  }
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {
          this.isLlmCollabPending = false;
        });
    }

    const event: ActivityEvent = {
      id: `ev-walk-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: 'movement',
      categoryTag,
      agentId: sender.id,
      agentName: sender.name,
      targetAgentName: target.name,
      description: `${categoryTag}: ${sender.name} menghampiri meja ${target.name} untuk berdiskusi santai.`,
    };

    return { updatedSender, event };
  }

  // Send an agent to brew coffee at espresso machine in pantry
  public triggerCoffeeBreak(agent: Agent): { updatedAgent: Agent; event: ActivityEvent } {
    const updatedAgent = this.sendAgentTo(agent, COFFEE_MACHINE_SPOT, 'coffee_break');
    updatedAgent.stateMessage = '☕ Menuju mesin kopi pantry untuk menyeduh espresso segar';

    // After brewing at machine, move to table to enjoy coffee
    this.idleTimers.set(agent.id, {
      startTime: Date.now() + 4500,
      duration: 5500,
      nextSpot: PANTRY_TABLE_SPOT,
      nextState: 'coffee_break',
      nextMessage: '☕ Menikmati kopi hangat hasil seduhan sendiri di meja pantry.',
    });

    const event: ActivityEvent = {
      id: `ev-coffee-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: 'break',
      categoryTag: '☕ Kopi & Pantry',
      agentId: agent.id,
      agentName: agent.name,
      description: `☕ ${agent.name} menuju mesin kopi pantry untuk menyeduh espresso segar.`,
    };

    return { updatedAgent, event };
  }

  // Send an agent to play retro games in Game Corner
  public triggerPlayGame(agent: Agent): { updatedAgent: Agent; event: ActivityEvent } {
    const updatedAgent = this.sendAgentTo(agent, GAME_ROOM_SPOT, 'playing_game');
    updatedAgent.stateMessage = '🎮 Menuju Game Corner untuk bermain retro arcade';
    this.idleTimers.set(agent.id, { startTime: Date.now() + 4000, duration: 9000 });

    const event: ActivityEvent = {
      id: `ev-game-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: 'break',
      categoryTag: '🎮 Gaming & Hobi',
      agentId: agent.id,
      agentName: agent.name,
      description: `🎮 ${agent.name} menuju Game Corner untuk bermain game retro arcade.`,
    };

    return { updatedAgent, event };
  }

  // Send an agent to stroll in the lobby
  public triggerLobbyStroll(agent: Agent): { updatedAgent: Agent; event: ActivityEvent } {
    const updatedAgent = this.sendAgentTo(agent, LOBBY_SPOT, 'idle');
    updatedAgent.stateMessage = '🚶 Berjalan santai ke lobby melihat resepsionis AI';
    this.idleTimers.set(agent.id, { startTime: Date.now() + 4000, duration: 6000 });

    const event: ActivityEvent = {
      id: `ev-lobby-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: 'movement',
      categoryTag: '🚶 Santai di Lobby',
      agentId: agent.id,
      agentName: agent.name,
      description: `🚶 ${agent.name} berjalan santai ke lobby menyapa resepsionis AI.`,
    };

    return { updatedAgent, event };
  }

  // Send an agent to view sprint station
  public triggerSprintViewing(agent: Agent): { updatedAgent: Agent; event: ActivityEvent } {
    const updatedAgent = this.sendAgentTo(agent, SPRINT_STATION_SPOT, 'meeting');
    updatedAgent.stateMessage = '🚶 Menuju Sprint Station untuk meninjau papan kanban & roadmap';
    // Walking takes ~8.5s; dwell at kanban whiteboard for 14s to review deliverables
    this.idleTimers.set(agent.id, { startTime: Date.now() + 8500, duration: 14000 });

    const event: ActivityEvent = {
      id: `ev-sprint-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: 'movement',
      categoryTag: '📊 Sprint Station',
      agentId: agent.id,
      agentName: agent.name,
      description: `📊 ${agent.name} menuju Sprint Station untuk meninjau backlog tiket & progres sprint.`,
    };

    return { updatedAgent, event };
  }

  // Trigger human approval: agent walks to lead executive suite
  public triggerHumanApproval(
    agent: Agent,
    request: HumanDecisionRequest
  ): { updatedAgent: Agent; event: ActivityEvent } {
    const waypoints = findPath(agent.currentPosition, OWNER_INTERACTION_SPOT);
    this.pathStates.set(agent.id, {
      agentId: agent.id,
      waypoints,
      currentWaypointIndex: 1,
      finalTarget: OWNER_INTERACTION_SPOT,
      onArrivalState: 'seeking_approval',
      decisionRequest: request,
    });

    const updatedAgent: Agent = {
      ...agent,
      state: 'walking',
      stateMessage: `Berjalan ke Lead Suite untuk persetujuan keputusan: "${request.title}"`,
      targetPosition: OWNER_INTERACTION_SPOT,
    };

    const event: ActivityEvent = {
      id: `ev-human-${Date.now()}`,
      timestamp: Date.now(),
      type: 'human_loop',
      agentId: agent.id,
      agentName: agent.name,
      description: `⚠️ ${agent.name} berjalan ke Lead Suite meminta persetujuan: "${request.title}"`,
    };

    return { updatedAgent, event };
  }

  // Resolve human approval: agent acknowledges and returns to work
  public resolveHumanApproval(
    agent: Agent,
    approved: boolean,
    feedback?: string
  ): { updatedAgent: Agent; event: ActivityEvent } {
    const ackMessage = approved
      ? `Siap! Keputusan disetujui, langsung kami eksekusi.`
      : `Baik! Kami revisi pendekatannya sesuai arahan sprint.`;

    const dialog: AgentDialog = {
      id: `dlg-${Date.now()}`,
      speakerId: agent.id,
      speakerName: agent.name,
      targetId: 'lead_architect',
      targetName: 'Lead Architect',
      message: ackMessage,
      timestamp: Date.now(),
    };

    const returningAgent = this.sendAgentTo(
      {
        ...agent,
        activeDialog: dialog,
      },
      agent.deskPosition,
      'working'
    );

    const event: ActivityEvent = {
      id: `ev-resolve-${Date.now()}`,
      timestamp: Date.now(),
      type: 'human_loop',
      agentId: agent.id,
      agentName: agent.name,
      description: `Lead Architect ${approved ? 'MENYETUJUI' : 'MENOLAK'} permintaan ${agent.name}: "${feedback || ackMessage}"`,
    };

    return { updatedAgent: returningAgent, event };
  }

  // Fire an agent: agent packs up, walks to exit door, and leaves the office
  public fireAgent(agent: Agent): { updatedAgent: Agent; event: ActivityEvent } {
    const waypoints = findPath(agent.currentPosition, EXIT_DOOR_SPOT);
    this.pathStates.set(agent.id, {
      agentId: agent.id,
      waypoints,
      currentWaypointIndex: 1,
      finalTarget: EXIT_DOOR_SPOT,
      onArrivalState: 'leaving_office',
    });

    const updatedAgent: Agent = {
      ...agent,
      state: 'walking',
      stateMessage: `Kontrak diakhiri oleh Lead. Bersiap meninggalkan kantor.`,
      targetPosition: EXIT_DOOR_SPOT,
    };

    const event: ActivityEvent = {
      id: `ev-fire-${Date.now()}`,
      timestamp: Date.now(),
      type: 'fire',
      agentId: agent.id,
      agentName: agent.name,
      description: `🛑 ${agent.name} (${agent.roleTitle}) telah mengakhiri sprint dan meninggalkan kantor.`,
    };

    return { updatedAgent, event };
  }

  // Hire an agent: agent enters from exit door, walks to assigned desk
  public hireAgent(
    mktAgent: MarketplaceAgent,
    deskSlot: Position3D,
    companyDepartmentId: string
  ): { newAgent: Agent; event: ActivityEvent } {
    const agentId = `agent-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newAgent: Agent = {
      id: agentId,
      name: mktAgent.name,
      role: mktAgent.role,
      roleTitle: mktAgent.roleTitle,
      departmentId: companyDepartmentId,
      deskPosition: deskSlot,
      currentPosition: { ...EXIT_DOOR_SPOT },
      rotationY: 0,
      state: 'walking',
      stateMessage: `Newly hired! Walking into office to report to assigned desk.`,
      avatarColor: mktAgent.avatarColor,
      shirtColor: mktAgent.shirtColor,
      hairColor: mktAgent.hairColor,
      skinColor: mktAgent.skinColor,
      skills: mktAgent.skills,
      bio: mktAgent.bio,
      llmConfig: mktAgent.llmConfig,
      creatorId: mktAgent.creatorUserId,
      liveCodeOutput: mktAgent.sampleOutput,
      stats: {
        tasksCompleted: 0,
        linesOfCode: 0,
        wordsWritten: 0,
        collabCount: 0,
      },
    };

    const waypoints = findPath(EXIT_DOOR_SPOT, deskSlot);
    this.pathStates.set(newAgent.id, {
      agentId: newAgent.id,
      waypoints,
      currentWaypointIndex: 1,
      finalTarget: deskSlot,
      onArrivalState: 'working',
    });

    const event: ActivityEvent = {
      id: `ev-hire-${Date.now()}`,
      timestamp: Date.now(),
      type: 'hire',
      agentId: newAgent.id,
      agentName: newAgent.name,
      description: `🎉 Newly recruited: ${newAgent.name} (${newAgent.roleTitle}) joined the office!`,
    };

    return { newAgent, event };
  }

  // Send agent back to desk
  public returnToDesk(agent: Agent, onArrivalState?: 'idle' | 'working'): Agent {
    const targetState: 'idle' | 'working' = onArrivalState || (agent.currentTaskId ? 'working' : 'idle');
    return this.sendAgentTo(agent, agent.deskPosition, targetState);
  }

  // Dispatch an agent on an out-of-town travel mission (Visits Train Station or Parking first)
  public dispatchAgentOnTravelMission(
    agent: Agent,
    mission: TravelMission
  ): { updatedAgent: Agent; event: ActivityEvent } {
    const isTrain = mission.commuteMode === 'bullet_train';
    const targetSpot = isTrain ? TRAIN_STATION_SPOT : CAR_PARKING_SPOT;
    const destName = mission.targetCompanyName || 'kota tujuan';

    const waypoints = findPath(agent.currentPosition, targetSpot);
    this.pathStates.set(agent.id, {
      agentId: agent.id,
      waypoints,
      currentWaypointIndex: 1,
      finalTarget: targetSpot,
      onArrivalState: isTrain ? 'at_train_station' : 'business_trip',
    });

    const updatedAgent: Agent = {
      ...agent,
      state: 'walking',
      stateMessage: isTrain
        ? `Membawa koper & berkas dinas, berjalan menuju Stasiun Kereta Sentral untuk naik Bullet Train ke ${destName}...`
        : `Menuju mobil kantor di area parkir depan untuk dinas jalan tol ke ${destName}...`,
      targetPosition: targetSpot,
    };

    const event: ActivityEvent = {
      id: `ev-dispatch-world-${Date.now()}`,
      timestamp: Date.now(),
      type: 'movement',
      categoryTag: isTrain ? '🚆 Stasiun Kereta' : '🚗 Mobil Kantor',
      agentId: agent.id,
      agentName: agent.name,
      description: isTrain
        ? `📢 ${agent.name} ditugaskan dinas ke ${destName} dan sedang berjalan mengunjungi Stasiun Kereta Sentral!`
        : `📢 ${agent.name} ditugaskan dinas ke ${destName} dan sedang berjalan menuju Mobil Kantor!`,
    };

    return { updatedAgent, event };
  }

  // Return agent to office desk after completing business trip
  public returnAgentFromTravelMission(
    agent: Agent,
    mission: TravelMission
  ): { updatedAgent: Agent; event: ActivityEvent } {
    const isTrain = mission.commuteMode === 'bullet_train';
    const originSpot = isTrain ? TRAIN_STATION_SPOT : CAR_PARKING_SPOT;

    const startPos =
      agent.state === 'at_train_station' || agent.state === 'business_trip'
        ? originSpot
        : agent.currentPosition;

    const waypoints = findPath(startPos, agent.deskPosition);
    this.pathStates.set(agent.id, {
      agentId: agent.id,
      waypoints,
      currentWaypointIndex: 1,
      finalTarget: agent.deskPosition,
      onArrivalState: 'working',
    });

    const destName = mission.targetCompanyName || 'kota tujuan';
    const updatedAgent: Agent = {
      ...agent,
      currentPosition: { ...startPos },
      state: 'walking',
      stateMessage: `Kembali dari dinas luar kota di ${destName}, berjalan masuk kantor menuju meja kerja...`,
      targetPosition: agent.deskPosition,
    };

    const event: ActivityEvent = {
      id: `ev-return-world-${Date.now()}`,
      timestamp: Date.now(),
      type: 'task_complete',
      categoryTag: isTrain ? '🚆 Stasiun Kereta' : '🚗 Mobil Kantor',
      agentId: agent.id,
      agentName: agent.name,
      description: `🎉 ${agent.name} telah kembali dari dinas luar kota di ${destName} via Stasiun Kereta Sentral dan siap melanjutkan sprint!`,
    };

    return { updatedAgent, event };
  }

  // Simulation step tick
  public update(
    agents: Agent[],
    tasks: TaskTicket[],
    deltaSeconds: number
  ): {
    updatedAgents: Agent[];
    updatedTasks: TaskTicket[];
    newEvents: ActivityEvent[];
  } {
    if (this.isPaused) {
      return { updatedAgents: agents, updatedTasks: tasks, newEvents: [] };
    }

    const effectiveDelta = deltaSeconds * this.speedMultiplier;
    const newEvents: ActivityEvent[] = [];
    const moveSpeed = 3.2; // meters per second

    // Update agent movement and states
    let updatedAgents = agents.map((agent) => {
      let currentAgent = { ...agent };
      const pathState = this.pathStates.get(currentAgent.id);

      if (pathState && currentAgent.state === 'walking') {
        const targetWaypoint = pathState.waypoints[pathState.currentWaypointIndex];
        if (targetWaypoint) {
          const dx = targetWaypoint.x - currentAgent.currentPosition.x;
          const dz = targetWaypoint.z - currentAgent.currentPosition.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const stepDist = moveSpeed * effectiveDelta;

          // Rotate to face moving direction
          if (dist > 0.05) {
            currentAgent.rotationY = Math.atan2(dx, dz);
          }

          if (dist <= stepDist) {
            // Reached this waypoint
            currentAgent.currentPosition = { ...targetWaypoint };
            pathState.currentWaypointIndex++;

            // Check if reached destination
            if (pathState.currentWaypointIndex >= pathState.waypoints.length) {
              // Arrived!
              this.pathStates.delete(currentAgent.id);
              currentAgent.state = pathState.onArrivalState;
              currentAgent.currentPosition = { ...pathState.finalTarget };

              if (pathState.onArrivalState === 'talking' && pathState.targetAgentId) {
                const targetAgent = agents.find((a) => a.id === pathState.targetAgentId);
                const fallbackBanter = generateProceduralCollabBanter(
                  currentAgent,
                  targetAgent || currentAgent,
                  1,
                  undefined,
                  tasks,
                  this.currentCompany?.name
                );
                const dialogMsg = pathState.dialogContext || fallbackBanter.message;
                const dialogCat = pathState.dialogCategory || fallbackBanter.categoryTag;
                const dialogColor = pathState.dialogColor || fallbackBanter.tagColor;

                const dialog: AgentDialog = {
                  id: `dlg-${Date.now()}`,
                  speakerId: currentAgent.id,
                  speakerName: currentAgent.name,
                  targetId: pathState.targetAgentId,
                  targetName: targetAgent ? targetAgent.name : 'Colleague',
                  message: dialogMsg,
                  categoryTag: dialogCat,
                  tagColor: dialogColor,
                  timestamp: Date.now(),
                };

                currentAgent.activeDialog = dialog;
                currentAgent.stateMessage = `${dialogCat}: "${dialogMsg}"`;
                currentAgent.stats.collabCount += 1;
                currentAgent.collabPartnerId = pathState.targetAgentId;
                if (targetAgent) {
                  currentAgent.facingDirection = currentAgent.currentPosition.x < targetAgent.currentPosition.x ? 'right' : 'left';
                }
                if (this.activeMultiTurnDialog && this.activeMultiTurnDialog.senderId === currentAgent.id) {
                  this.activeMultiTurnDialog.turn1Timestamp = Date.now();
                }

                newEvents.push({
                  id: `ev-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  type: dialogCat.includes('Sprint') ? 'collaboration' : 'casual_talk',
                  categoryTag: dialogCat,
                  agentId: currentAgent.id,
                  agentName: currentAgent.name,
                  targetAgentName: targetAgent?.name,
                  description: `${dialogCat}: ${currentAgent.name} & ${targetAgent?.name}: "${dialogMsg}"`,
                });
              } else if (pathState.onArrivalState === 'seeking_approval') {
                const dialogMsg = pathState.decisionRequest?.question || 'Boss, butuh persetujuan keputusan penting!';
                currentAgent.activeDialog = {
                  id: `dlg-${Date.now()}`,
                  speakerId: currentAgent.id,
                  speakerName: currentAgent.name,
                  targetId: 'owner',
                  targetName: 'Owner (Boss)',
                  message: dialogMsg,
                  timestamp: Date.now(),
                };
                currentAgent.stateMessage = `Waiting for Owner approval at Executive Desk: "${dialogMsg}"`;
                currentAgent.facingDirection = 'front';
              } else if (pathState.onArrivalState === 'at_train_station') {
                currentAgent.state = 'at_train_station';
                currentAgent.stateMessage = '🚆 Tiba di peron Stasiun Kereta Sentral. Validasi tiket & boarding ke Express Bullet Train...';
                currentAgent.activeDialog = {
                  id: `dlg-${Date.now()}`,
                  speakerId: currentAgent.id,
                  speakerName: currentAgent.name,
                  targetId: 'station_master',
                  targetName: 'Kepala Stasiun Aerorail',
                  message: 'Tiket boarding valid! Masuk ke gerbong eksekutif kereta cepat.',
                  categoryTag: '🚆 Stasiun Kereta',
                  tagColor: '#4f46e5',
                  timestamp: Date.now(),
                };
                currentAgent.facingDirection = 'front';
                newEvents.push({
                  id: `ev-station-${Date.now()}-${currentAgent.id}`,
                  timestamp: Date.now(),
                  type: 'movement',
                  categoryTag: '🚆 Stasiun Kereta',
                  agentId: currentAgent.id,
                  agentName: currentAgent.name,
                  description: `🚆 ${currentAgent.name} telah tiba di peron Stasiun Kereta Sentral dan menaiki gerbong Express Bullet Train untuk perjalanan dinas luar kota!`,
                });
              } else if (pathState.onArrivalState === 'business_trip') {
                currentAgent.state = 'business_trip';
                currentAgent.stateMessage = '🚗 Tiba di Mobil Kantor. Meluncur melalui jalan tol ke kota tujuan...';
                currentAgent.facingDirection = 'front';
                newEvents.push({
                  id: `ev-car-${Date.now()}-${currentAgent.id}`,
                  timestamp: Date.now(),
                  type: 'movement',
                  categoryTag: '🚗 Mobil Kantor',
                  agentId: currentAgent.id,
                  agentName: currentAgent.name,
                  description: `🚗 ${currentAgent.name} tiba di Mobil Kantor dan meluncur melalui jalan tol untuk tugas dinas luar kota!`,
                });
              } else if (pathState.onArrivalState === 'leaving_office') {
                currentAgent.stateMessage = 'Has left the office premises.';
              } else if (pathState.onArrivalState === 'coffee_break') {
                currentAgent.stateMessage = '☕ Menikmati espresso segar hasil seduhan mesin pantry';
              } else if (pathState.onArrivalState === 'playing_game') {
                currentAgent.state = 'playing_game';
                currentAgent.stateMessage = '👾 Bermain game retro arcade di Game Corner';
                currentAgent.facingDirection = 'front';
              } else if (pathState.onArrivalState === 'meeting') {
                currentAgent.state = 'meeting';
                currentAgent.stateMessage = '📊 Mengamati papan kanban & sticky notes di Sprint Station';
                currentAgent.facingDirection = 'left';
              } else if (pathState.onArrivalState === 'working') {
                currentAgent.stateMessage = 'Focused on coding and implementation';
                currentAgent.activeDialog = undefined;
                currentAgent.collabPartnerId = undefined;
                currentAgent.facingDirection = 'front';
              } else if (pathState.onArrivalState === 'idle') {
                currentAgent.state = 'idle';
                currentAgent.stateMessage = 'Standby di meja kerja, siap menerima tugas sprint.';
                currentAgent.activeDialog = undefined;
                currentAgent.collabPartnerId = undefined;
                currentAgent.facingDirection = 'front';
              }
            }
          } else {
            // Move along segment
            const ratio = stepDist / dist;
            currentAgent.currentPosition = {
              x: currentAgent.currentPosition.x + dx * ratio,
              z: currentAgent.currentPosition.z + dz * ratio,
            };
          }
        }
      }

      // Dialog timeout handling for non-multiturn dialogs
      if (currentAgent.state === 'talking' && currentAgent.activeDialog && !this.activeMultiTurnDialog) {
        const dialogAge = (Date.now() - currentAgent.activeDialog.timestamp) / 1000;
        if (dialogAge > 4.5 / this.speedMultiplier) {
          currentAgent.activeDialog = undefined;
          currentAgent.collabPartnerId = undefined;
          currentAgent.facingDirection = 'front';
          const hasActiveTask = tasks.some(
            (t) => t.assignedAgentId === currentAgent.id && t.status === 'in_progress'
          );
          currentAgent = this.returnToDesk(currentAgent, hasActiveTask ? 'working' : 'idle');
        }
      }

      return currentAgent;
    });

    // Remove agents who have left the office completely
    updatedAgents = updatedAgents.filter((a) => a.stateMessage !== 'Has left the office premises.');

    // Synchronize mutual talking partners so both face each other and participate
    updatedAgents.forEach((agent) => {
      if (agent.state === 'talking' && agent.collabPartnerId) {
        const partner = updatedAgents.find((a) => a.id === agent.collabPartnerId);
        if (
          partner &&
          partner.state !== 'walking' &&
          partner.state !== 'leaving_office' &&
          partner.state !== 'at_train_station' &&
          partner.state !== 'business_trip'
        ) {
          partner.state = 'talking';
          partner.collabPartnerId = agent.id;
          if (agent.currentPosition.x < partner.currentPosition.x) {
            agent.facingDirection = 'right';
            partner.facingDirection = 'left';
          } else {
            agent.facingDirection = 'left';
            partner.facingDirection = 'right';
          }
        } else if (!partner || partner.state === 'working' || partner.state === 'idle' || partner.state === 'walking') {
          const hasActiveTask = tasks.some(
            (t) => t.assignedAgentId === agent.id && t.status === 'in_progress'
          );
          agent.state = hasActiveTask ? 'working' : 'idle';
          agent.activeDialog = undefined;
          agent.collabPartnerId = undefined;
          agent.facingDirection = 'front';
          if (!hasActiveTask && !agent.stateMessage.startsWith('Standby')) {
            agent.stateMessage = 'Standby di meja kerja, siap menerima tugas.';
          }
        }
      }
    });

    // Update tasks progress when assigned agent is working
    const updatedTasks: TaskTicket[] = tasks.map((t) => ({ ...t }));

    for (let i = 0; i < updatedTasks.length; i++) {
      const task = updatedTasks[i];
      const assigned = updatedAgents.find((a) => a.id === task.assignedAgentId);

      if (task.status === 'in_progress' && assigned) {
        // If assigned agent is not yet working or walking, send them back to desk to work immediately
        if (assigned.state !== 'working' && assigned.state !== 'walking') {
          // Cancel any idle timer or multi-turn dialog involving this agent
          this.idleTimers.delete(assigned.id);
          if (
            this.activeMultiTurnDialog &&
            (this.activeMultiTurnDialog.senderId === assigned.id ||
              this.activeMultiTurnDialog.targetId === assigned.id)
          ) {
            this.activeMultiTurnDialog = undefined;
          }

          const sent = this.returnToDesk(assigned, 'working');
          const aIdx = updatedAgents.findIndex((a) => a.id === assigned.id);
          if (aIdx !== -1) {
            updatedAgents[aIdx] = {
              ...sent,
              currentTaskId: task.id,
              stateMessage: `⚡ Dipanggil sistem: Segera kembali ke meja kerja untuk mengeksekusi "${task.title}"`,
            };
            newEvents.push({
              id: `ev-dispatch-${Date.now()}-${Math.random()}`,
              timestamp: Date.now(),
              type: 'system',
              categoryTag: '📢 Sistem Memanggil',
              agentId: assigned.id,
              agentName: assigned.name,
              description: `📢 Sistem otomatis memanggil ${assigned.name} kembali ke meja kerja untuk mengeksekusi tiket "${task.title}"!`,
            });
          }
        }

        if (assigned.state === 'working') {
          assigned.currentTaskId = task.id;
          if (!assigned.stateMessage.startsWith('⚡')) {
            assigned.stateMessage = `⚡ Working on: "${task.title}"`;
          }

          // Active progress rate: 2.4 * effectiveDelta (~42 seconds for 100% at 1x speed, ~8s at 5x)
          const newProgress = Math.min(100, task.progress + (2.4 * effectiveDelta));

          // Periodic live code output lines generation reflecting the active task
          if (Math.random() < 0.22 * effectiveDelta) {
            assigned.stats.linesOfCode += Math.floor(Math.random() * 8) + 3;
            if (task.type === 'content') {
              assigned.stats.wordsWritten += Math.floor(Math.random() * 25) + 12;
            }
            if (!assigned.liveCodeOutput) assigned.liveCodeOutput = [];
            const safeFn = task.title.replace(/[^a-zA-Z0-9]/g, '');
            const snippets = [
              `// [${assigned.name}] Executing task: ${task.title}`,
              `export async function handle${safeFn || 'Service'}(req: Request) {`,
              `  console.log("[Sprint] Processing step at progress: ${Math.round(newProgress)}%");`,
              `  const res = await dispatchAgentPipeline("${task.type}");`,
              `  return Response.json({ success: true, task: "${task.title}" });`,
              `}`,
            ];
            const nextLine = snippets[Math.floor(Math.random() * snippets.length)];
            assigned.liveCodeOutput = [...assigned.liveCodeOutput.slice(-8), nextLine];
          }

          if (newProgress >= 100 && task.progress < 100) {
            // Task completed 100%!
            assigned.stats.tasksCompleted += 1;
            task.progress = 100;
            task.status = 'done';
            task.completedAt = Date.now();

            const safeTitle = task.title.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 24);
            const generatedArtifact = {
              id: `art-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              fileName: task.type === 'coding' ? `src/${safeTitle}.ts` : `docs/${safeTitle}.md`,
              type: task.type === 'coding' ? ('code' as const) : ('markdown' as const),
              content: `// 🚀 Autonomously implemented by ${assigned.name}\n// Task: ${task.title}\n// Status: COMPLETED 100%\n\nexport const sprintDeliverable = {\n  task: "${task.title}",\n  completedBy: "${assigned.name}",\n  completedAt: "${new Date().toISOString()}",\n  artifactsLocation: "~/.vigent/workspaces/${safeTitle}"\n};\n`,
            };
            if (task.artifacts.length === 0) {
              task.artifacts = [generatedArtifact];
            }
            task.logs = [...task.logs, `Completed and verified 100% by ${assigned.name}.`];

            // Check if this agent has another task waiting in the backlog
            const nextBacklogTask = updatedTasks.find(
              (t) => t.id !== task.id && t.assignedAgentId === assigned.id && t.status === 'backlog'
            );

            if (nextBacklogTask) {
              // Auto-promote next backlog task for this agent
              nextBacklogTask.status = 'in_progress';
              assigned.currentTaskId = nextBacklogTask.id;
              assigned.state = 'working';
              assigned.stateMessage = `⚡ Working on: "${nextBacklogTask.title}"`;
              newEvents.push({
                id: `ev-next-${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                type: 'task_start',
                agentId: assigned.id,
                agentName: assigned.name,
                description: `⚡ ${assigned.name} selesai tiket "${task.title}" dan otomatis lanjut mengerjakan: "${nextBacklogTask.title}"!`,
              });
            } else {
              // Cleanly transition agent to IDLE standby
              assigned.state = 'idle';
              assigned.currentTaskId = undefined;
              assigned.stateMessage = `Standby: Tiket "${task.title}" selesai 100%. Menunggu tugas baru.`;
            }

            newEvents.push({
              id: `ev-done-${Date.now()}-${Math.random()}`,
              timestamp: Date.now(),
              type: 'task_complete',
              agentId: assigned.id,
              agentName: assigned.name,
              description: `🎉 ${assigned.name} successfully completed ticket: "${task.title}"! (+150 Company XP)`,
            });

            // Auto-record company episodic memory & XP progression
            if (this.currentCompany?.id && typeof fetch !== 'undefined') {
              fetch('/api/company/memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  companyId: this.currentCompany.id,
                  action: 'experience',
                  taskTitle: task.title,
                  agentName: assigned.name,
                  agentRole: assigned.role,
                  summary: `Berhasil menyelesaikan sprint task "${task.title}" (${task.type}). Artifact tersimpan di ruang kerja perusahaan.`,
                  xpGained: 150,
                }),
              }).catch((err) => {
                console.warn('[MemoryEngine] Gagal sinkronisasi memori tugas:', err);
              });
            }
          } else {
            task.progress = newProgress;
          }
        }
      }
    }

    // Reconcile all agents to ensure no agent is stuck in 'working' state without an active in_progress task
    updatedAgents = updatedAgents.map((agent) => {
      // Preserve agents currently in transit or interactive states
      if (
        agent.state === 'walking' ||
        agent.state === 'talking' ||
        agent.state === 'coffee_break' ||
        agent.state === 'seeking_approval' ||
        agent.state === 'leaving_office' ||
        agent.state === 'at_train_station' ||
        agent.state === 'business_trip'
      ) {
        return agent;
      }

      // Check if this agent has an active in_progress task
      const activeTask = updatedTasks.find(
        (t) => t.assignedAgentId === agent.id && t.status === 'in_progress'
      );

      if (activeTask) {
        if (agent.state !== 'working' || agent.currentTaskId !== activeTask.id) {
          return {
            ...agent,
            state: 'working',
            currentTaskId: activeTask.id,
            stateMessage: `⚡ Working on: "${activeTask.title}"`,
          };
        }
        return agent;
      } else {
        // Agent has NO active in-progress task!
        if (agent.state === 'working') {
          const lastDoneTask = updatedTasks.find(
            (t) => t.assignedAgentId === agent.id && t.status === 'done'
          );
          const standbyMsg = lastDoneTask
            ? `Standby: Tiket "${lastDoneTask.title}" selesai 100%. Menunggu tugas baru.`
            : 'Standby: Siap menerima tugas baru.';
          return {
            ...agent,
            state: 'idle',
            currentTaskId: undefined,
            stateMessage: standbyMsg,
          };
        }
        return agent;
      }
    });

    const now = Date.now();

    // 1. Multi-turn Dialog Step Handling (Back-and-forth LLM conversation)
    if (this.activeMultiTurnDialog) {
      const dialog = this.activeMultiTurnDialog;
      const senderAgent = updatedAgents.find((a) => a.id === dialog.senderId);
      const targetAgent = updatedAgents.find((a) => a.id === dialog.targetId);

      // Check if both agents are still valid and neither has an emergency task interrupt
      const senderHasTask = tasks.some((t) => t.assignedAgentId === dialog.senderId && t.status === 'in_progress');
      const targetHasTask = tasks.some((t) => t.assignedAgentId === dialog.targetId && t.status === 'in_progress');

      if (senderHasTask || targetHasTask || !senderAgent || !targetAgent) {
        this.activeMultiTurnDialog = undefined;
      } else if (dialog.turn === 1 && dialog.turn1Timestamp) {
        // Turn 1 elapsed?
        const turn1Elapsed = (now - dialog.turn1Timestamp) / 1000;
        if (turn1Elapsed > 4.2 / this.speedMultiplier) {
          const turn2MsgText = dialog.turn2Msg || generateProceduralCollabBanter(
            targetAgent,
            senderAgent,
            2,
            dialog.turn1Msg || '',
            tasks,
            this.currentCompany?.name
          ).message;

          // Switch speaker: Target responds to Sender
          senderAgent.activeDialog = undefined;
          senderAgent.stateMessage = `Mendengarkan tanggapan ${targetAgent.name}...`;

          targetAgent.activeDialog = {
            id: `dlg-${now}`,
            speakerId: targetAgent.id,
            speakerName: targetAgent.name,
            targetId: senderAgent.id,
            targetName: senderAgent.name,
            message: turn2MsgText,
            categoryTag: dialog.categoryTag,
            tagColor: dialog.tagColor,
            timestamp: now,
          };
          targetAgent.state = 'talking';
          targetAgent.stateMessage = `${dialog.categoryTag}: "${turn2MsgText}"`;

          dialog.turn = 2;
          dialog.turn2Timestamp = now;

          newEvents.push({
            id: `ev-resp-${now}-${Math.random()}`,
            timestamp: now,
            type: 'casual_talk',
            categoryTag: dialog.categoryTag,
            agentId: targetAgent.id,
            agentName: targetAgent.name,
            targetAgentName: senderAgent.name,
            description: `💬 ${targetAgent.name} (${targetAgent.personality?.mbti || 'Agent'}) menanggapi ${senderAgent.name}: "${turn2MsgText}"`,
          });
        }
      } else if (dialog.turn === 2 && dialog.turn2Timestamp) {
        const turn2Elapsed = (now - dialog.turn2Timestamp) / 1000;
        if (turn2Elapsed > 4.5 / this.speedMultiplier) {
          // Turn 2 complete! Resolve mutually agreed action
          targetAgent.activeDialog = undefined;
          senderAgent.activeDialog = undefined;
          const action = dialog.suggestedAction;
          this.activeMultiTurnDialog = undefined;

          if (action === 'play_game') {
            const r1 = this.triggerPlayGame(senderAgent);
            const r2 = this.triggerPlayGame(targetAgent);
            const sIdx = updatedAgents.findIndex((a) => a.id === senderAgent.id);
            const tIdx = updatedAgents.findIndex((a) => a.id === targetAgent.id);
            if (sIdx !== -1) updatedAgents[sIdx] = r1.updatedAgent;
            if (tIdx !== -1) updatedAgents[tIdx] = r2.updatedAgent;
            newEvents.push({
              id: `ev-game-both-${now}`,
              timestamp: now,
              type: 'break',
              categoryTag: '🎮 Game Corner',
              agentId: senderAgent.id,
              agentName: senderAgent.name,
              targetAgentName: targetAgent.name,
              description: `🎮 ${senderAgent.name} & ${targetAgent.name} sepakat mabar retro arcade bersama di Game Corner!`,
            });
          } else if (action === 'coffee') {
            const r1 = this.triggerCoffeeBreak(senderAgent);
            const r2 = this.triggerCoffeeBreak(targetAgent);
            const sIdx = updatedAgents.findIndex((a) => a.id === senderAgent.id);
            const tIdx = updatedAgents.findIndex((a) => a.id === targetAgent.id);
            if (sIdx !== -1) updatedAgents[sIdx] = r1.updatedAgent;
            if (tIdx !== -1) updatedAgents[tIdx] = r2.updatedAgent;
            newEvents.push({
              id: `ev-coffee-both-${now}`,
              timestamp: now,
              type: 'break',
              categoryTag: '☕ Kopi & Pantry',
              agentId: senderAgent.id,
              agentName: senderAgent.name,
              targetAgentName: targetAgent.name,
              description: `☕ ${senderAgent.name} & ${targetAgent.name} istirahat ngopi bareng di pantry!`,
            });
          } else {
            // Both return to desk peacefully
            const r1 = this.returnToDesk(senderAgent, 'idle');
            const r2 = this.returnToDesk(targetAgent, 'idle');
            const sIdx = updatedAgents.findIndex((a) => a.id === senderAgent.id);
            const tIdx = updatedAgents.findIndex((a) => a.id === targetAgent.id);
            if (sIdx !== -1) updatedAgents[sIdx] = r1;
            if (tIdx !== -1) updatedAgents[tIdx] = r2;
          }
        }
      }
    }

    // 2. Idle Activities Timer Sequencer (Pantry Espresso -> Table, Gaming, Lobby stroll, Sprint board)
    for (const [agentId, timer] of Array.from(this.idleTimers.entries())) {
      const agent = updatedAgents.find((a) => a.id === agentId);
      if (!agent) {
        this.idleTimers.delete(agentId);
        continue;
      }

      // Check task interrupt
      const hasTask = tasks.some((t) => t.assignedAgentId === agentId && t.status === 'in_progress');
      if (hasTask) {
        this.idleTimers.delete(agentId);
        const sent = this.returnToDesk(agent, 'working');
        const idx = updatedAgents.findIndex((a) => a.id === agentId);
        if (idx !== -1) updatedAgents[idx] = sent;
        continue;
      }

      if (now >= timer.startTime + timer.duration) {
        if (timer.nextSpot) {
          const nextSpot = timer.nextSpot;
          const nextState = timer.nextState || 'coffee_break';
          const nextMessage = timer.nextMessage || 'Menikmati waktu istirahat';
          this.idleTimers.set(agentId, {
            startTime: now + 3500,
            duration: 6000,
          });
          const sent = this.sendAgentTo(agent, nextSpot, nextState);
          sent.stateMessage = nextMessage;
          const idx = updatedAgents.findIndex((a) => a.id === agentId);
          if (idx !== -1) updatedAgents[idx] = sent;

          newEvents.push({
            id: `ev-next-${agentId}-${now}`,
            timestamp: now,
            type: 'break',
            categoryTag: '☕ Kopi & Pantry',
            agentId: agent.id,
            agentName: agent.name,
            description: `☕ ${agent.name} menuju meja pantry untuk menikmati kopi hangat.`,
          });
        } else {
          // Break finished, return to desk
          this.idleTimers.delete(agentId);
          const sent = this.returnToDesk(agent, 'idle');
          sent.stateMessage = 'Standby di meja kerja, segar kembali dan siap sprint.';
          const idx = updatedAgents.findIndex((a) => a.id === agentId);
          if (idx !== -1) updatedAgents[idx] = sent;

          newEvents.push({
            id: `ev-return-${agentId}-${now}`,
            timestamp: now,
            type: 'movement',
            categoryTag: '🖥️ Meja Kerja',
            agentId: agent.id,
            agentName: agent.name,
            description: `🖥️ ${agent.name} selesai istirahat dan kembali standby di meja kerja.`,
          });
        }
      }
    }

    // 3. Autonomous Idle Wanderer: idle agents periodically choose a casual activity
    const idleWanderInterval = (22000 + Math.random() * 16000) / this.speedMultiplier;
    if (now - this.lastIdleActivityTime > idleWanderInterval) {
      this.lastIdleActivityTime = now;
      const idleAgents = updatedAgents.filter(
        (a) =>
          a.state === 'idle' &&
          !this.idleTimers.has(a.id) &&
          !this.pathStates.has(a.id) &&
          (!this.activeMultiTurnDialog || (this.activeMultiTurnDialog.senderId !== a.id && this.activeMultiTurnDialog.targetId !== a.id)) &&
          !tasks.some((t) => t.assignedAgentId === a.id && t.status === 'in_progress')
      );

      if (idleAgents.length > 0) {
        const candidate = idleAgents[Math.floor(Math.random() * idleAgents.length)];
        // Higher affinity for Project Managers / System Architects to visit Sprint Station
        const isLead = candidate.role.includes('manager') || candidate.roleTitle.toLowerCase().includes('architect');
        const activityRoll = isLead && Math.random() < 0.6 ? 3 : Math.floor(Math.random() * 4);
        let result: { updatedAgent: Agent; event: ActivityEvent } | null = null;

        if (activityRoll === 0) {
          result = this.triggerCoffeeBreak(candidate);
        } else if (activityRoll === 1) {
          result = this.triggerPlayGame(candidate);
        } else if (activityRoll === 2) {
          result = this.triggerLobbyStroll(candidate);
        } else {
          result = this.triggerSprintViewing(candidate);
        }

        if (result) {
          const idx = updatedAgents.findIndex((a) => a.id === candidate.id);
          if (idx !== -1) updatedAgents[idx] = result.updatedAgent;
          newEvents.push(result.event);
        }
      }
    }

    // 4. Dynamic Personality & LLM Collab banters (~45 - 75 seconds)
    const collabInterval = (45000 + Math.random() * 30000) / this.speedMultiplier;
    if (
      now - this.lastCollabTime > collabInterval &&
      updatedAgents.length >= 2 &&
      !this.activeMultiTurnDialog &&
      !this.isLlmCollabPending
    ) {
      this.lastCollabTime = now;
      const freeAgents = updatedAgents.filter(
        (a) =>
          (a.state === 'working' || a.state === 'idle') &&
          !this.idleTimers.has(a.id) &&
          !this.pathStates.has(a.id)
      );

      if (freeAgents.length >= 2) {
        const sender = freeAgents[Math.floor(Math.random() * freeAgents.length)];
        const possibleTargets = freeAgents.filter((a) => a.id !== sender.id);
        const target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];

        if (sender && target) {
          const { updatedSender, event } = this.triggerCollaboration(sender, target, undefined, tasks);
          const sIdx = updatedAgents.findIndex((a) => a.id === sender.id);
          if (sIdx !== -1) {
            updatedAgents[sIdx] = updatedSender;
          }
          newEvents.push(event);
        }
      }
    }

    return { updatedAgents, updatedTasks, newEvents };
  }
}
