import { Agent, TaskTicket, Position3D, ActivityEvent, AgentDialog, HumanDecisionRequest, MarketplaceAgent } from '@/types/office';
import { findPath } from '@/lib/pathfinding';
import { PANTRY_CENTER, MEETING_ROOM_CENTER, WATER_COOLER_SPOT, OWNER_INTERACTION_SPOT, EXIT_DOOR_SPOT } from '@/lib/companyPresets';

export interface AgentPathState {
  agentId: string;
  waypoints: Position3D[];
  currentWaypointIndex: number;
  finalTarget: Position3D;
  onArrivalState: 'idle' | 'working' | 'talking' | 'meeting' | 'coffee_break' | 'seeking_approval' | 'leaving_office';
  targetAgentId?: string;
  dialogContext?: string;
  decisionRequest?: HumanDecisionRequest;
}

export class OfficeSimulation {
  private pathStates: Map<string, AgentPathState> = new Map();
  private speedMultiplier: number = 1.0;
  private isPaused: boolean = false;
  private lastCollabTime: number = Date.now();
  private activeDialogs: Map<string, AgentDialog> = new Map();

  constructor(speed: number = 1.0) {
    this.speedMultiplier = speed;
  }

  public setSpeed(speed: number) {
    this.speedMultiplier = speed;
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
  }

  // Instruct an agent to walk to a destination
  public sendAgentTo(
    agent: Agent,
    destination: Position3D,
    onArrivalState: 'idle' | 'working' | 'talking' | 'meeting' | 'coffee_break',
    targetAgentId?: string,
    dialogContext?: string
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

  // Trigger a physical collaboration where agent A walks to agent B
  public triggerCollaboration(
    sender: Agent,
    target: Agent,
    context?: string
  ): { updatedSender: Agent; event: ActivityEvent } {
    const dialogText = context || this.generateCollabDialogue(sender, target);
    
    // Target position next to colleague's desk
    const colDesk = target.deskPosition;
    const dest = { x: colDesk.x + 0.8, z: colDesk.z + 0.6 };

    const updatedSender = this.sendAgentTo(
      sender,
      dest,
      'talking',
      target.id,
      dialogText
    );

    const event: ActivityEvent = {
      id: `ev-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: 'collaboration',
      agentId: sender.id,
      agentName: sender.name,
      targetAgentName: target.name,
      description: `${sender.name} is walking to ${target.name}'s desk to collaborate on ${dialogText.slice(0, 45)}...`,
    };

    return { updatedSender, event };
  }

  // Send an agent for coffee break
  public triggerCoffeeBreak(agent: Agent): { updatedAgent: Agent; event: ActivityEvent } {
    const dest = Math.random() > 0.5 ? PANTRY_CENTER : WATER_COOLER_SPOT;
    const updatedAgent = this.sendAgentTo(agent, dest, 'coffee_break');

    const event: ActivityEvent = {
      id: `ev-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: 'break',
      agentId: agent.id,
      agentName: agent.name,
      description: `${agent.name} is heading to the pantry for a coffee break.`,
    };

    return { updatedAgent, event };
  }

  // Trigger human approval: agent walks to owner executive desk
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
      stateMessage: `Walking to Owner's Executive Desk for decision approval: "${request.title}"`,
      targetPosition: OWNER_INTERACTION_SPOT,
    };

    const event: ActivityEvent = {
      id: `ev-human-${Date.now()}`,
      timestamp: Date.now(),
      type: 'human_loop',
      agentId: agent.id,
      agentName: agent.name,
      description: `⚠️ ${agent.name} is walking to Boss desk seeking Owner decision on "${request.title}"`,
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
      ? `Siap Bos! Disetujui, langsung kami eksekusi.`
      : `Baik Bos! Kami revisi pendekatannya sesuai instruksi.`;

    const dialog: AgentDialog = {
      id: `dlg-${Date.now()}`,
      speakerId: agent.id,
      speakerName: agent.name,
      targetId: 'owner',
      targetName: 'Owner (Boss)',
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
      description: `Owner ${approved ? 'APPROVED' : 'REJECTED'} request from ${agent.name}: "${feedback || ackMessage}"`,
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
      stateMessage: `Terminated by Owner. Packing up and heading to exit door.`,
      targetPosition: EXIT_DOOR_SPOT,
    };

    const event: ActivityEvent = {
      id: `ev-fire-${Date.now()}`,
      timestamp: Date.now(),
      type: 'fire',
      agentId: agent.id,
      agentName: agent.name,
      description: `🛑 ${agent.name} (${agent.roleTitle}) was fired by Owner and is leaving the office.`,
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
  public returnToDesk(agent: Agent): Agent {
    return this.sendAgentTo(agent, agent.deskPosition, 'working');
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
                const dialogMsg = pathState.dialogContext || 'Checking in on sprint deliverables.';
                const dialog: AgentDialog = {
                  id: `dlg-${Date.now()}`,
                  speakerId: currentAgent.id,
                  speakerName: currentAgent.name,
                  targetId: pathState.targetAgentId,
                  targetName: targetAgent ? targetAgent.name : 'Colleague',
                  message: dialogMsg,
                  timestamp: Date.now(),
                };

                currentAgent.activeDialog = dialog;
                currentAgent.stateMessage = `Discussing: "${dialogMsg}"`;
                currentAgent.stats.collabCount += 1;

                newEvents.push({
                  id: `ev-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  type: 'collaboration',
                  agentId: currentAgent.id,
                  agentName: currentAgent.name,
                  targetAgentName: targetAgent?.name,
                  description: `${currentAgent.name} talking to ${targetAgent?.name}: "${dialogMsg}"`,
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
              } else if (pathState.onArrivalState === 'leaving_office') {
                currentAgent.stateMessage = 'Has left the office premises.';
              } else if (pathState.onArrivalState === 'coffee_break') {
                currentAgent.stateMessage = 'Taking a sip of freshly brewed espresso';
              } else if (pathState.onArrivalState === 'working') {
                currentAgent.stateMessage = 'Focused on coding and implementation';
                currentAgent.activeDialog = undefined;
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

      // Dialog timeout handling: after talking for ~4.5 seconds, wrap up and walk back to desk
      if (currentAgent.state === 'talking' && currentAgent.activeDialog) {
        const dialogAge = (Date.now() - currentAgent.activeDialog.timestamp) / 1000;
        if (dialogAge > 4.5 / this.speedMultiplier) {
          currentAgent.activeDialog = undefined;
          currentAgent = this.returnToDesk(currentAgent);
        }
      }

      // Coffee break timeout: after 5 seconds, walk back to desk
      if (currentAgent.state === 'coffee_break') {
        if (!currentAgent.targetPosition && Math.random() < 0.02 * effectiveDelta) {
          currentAgent = this.returnToDesk(currentAgent);
        }
      }

      return currentAgent;
    });

    // Remove agents who have left the office completely
    updatedAgents = updatedAgents.filter((a) => a.stateMessage !== 'Has left the office premises.');

    // Update tasks progress when assigned agent is working
    const updatedTasks = tasks.map((task) => {
      const assigned = updatedAgents.find((a) => a.id === task.assignedAgentId);
      if (task.status === 'in_progress' && assigned && assigned.state === 'working') {
        const newProgress = Math.min(100, task.progress + (1.2 * effectiveDelta));
        
        // Periodic code output lines generation
        if (Math.random() < 0.1 * effectiveDelta) {
          assigned.stats.linesOfCode += Math.floor(Math.random() * 8) + 2;
          if (task.type === 'content') {
            assigned.stats.wordsWritten += Math.floor(Math.random() * 25) + 10;
          }
        }

        if (newProgress >= 100 && task.progress < 100) {
          assigned.stats.tasksCompleted += 1;
          newEvents.push({
            id: `ev-done-${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            type: 'task_complete',
            agentId: assigned.id,
            agentName: assigned.name,
            description: `🎉 ${assigned.name} successfully completed ticket: "${task.title}"!`,
          });

          return {
            ...task,
            progress: 100,
            status: 'done' as const,
            completedAt: Date.now(),
            logs: [...task.logs, `Completed and verified by ${assigned.name}.`],
          };
        }

        return { ...task, progress: newProgress };
      }
      return task;
    });

    // Auto-trigger spontaneous interaction every ~15-25 seconds if idle
    const now = Date.now();
    if (now - this.lastCollabTime > 20000 / this.speedMultiplier && updatedAgents.length >= 2) {
      this.lastCollabTime = now;
      const freeAgents = updatedAgents.filter((a) => a.state === 'working');
      if (freeAgents.length >= 2) {
        const sender = freeAgents[Math.floor(Math.random() * freeAgents.length)];
        const possibleTargets = freeAgents.filter((a) => a.id !== sender.id);
        const target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];

        if (sender && target) {
          const { updatedSender, event } = this.triggerCollaboration(sender, target);
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

  // Realistic dialogue generator based on roles
  private generateCollabDialogue(sender: Agent, target: Agent): string {
    const dialogPairs = [
      {
        roles: ['frontend_dev', 'backend_dev'],
        lines: [
          'Hey, could we align on the response schema for the real-time activity feed?',
          'Do we have pagination on the agent events endpoint, or is it pure streaming?',
          'Quick check on CORS headers for the local dev environment, mind taking a look?',
        ],
      },
      {
        roles: ['frontend_dev', 'project_manager'],
        lines: [
          'I just finished the Three.js viewport controls. Can we review the camera zoom limits?',
          'The design tokens for dark mode are ready for your review in sprint review.',
        ],
      },
      {
        roles: ['backend_dev', 'qa_engineer'],
        lines: [
          'Can you run the concurrency stress test on the A* pathfinding worker?',
          'The database migration passed local tests, ready for staging validation.',
        ],
      },
      {
        roles: ['content_writer', 'project_manager'],
        lines: [
          'Drafted the technical release notes for version 1.0, want to glance over the tone?',
          'Which key metrics should we highlight in the quarterly documentation summary?',
        ],
      },
      {
        roles: ['qa_engineer', 'frontend_dev'],
        lines: [
          'Noticed a subtle edge case when agents cross the pantry door frame, fixed it!',
          'Test suite 4.1 passed all 48 test assertions with zero regressions.',
        ],
      },
    ];

    for (const pair of dialogPairs) {
      if (
        (sender.role === pair.roles[0] && target.role === pair.roles[1]) ||
        (sender.role === pair.roles[1] && target.role === pair.roles[0])
      ) {
        return pair.lines[Math.floor(Math.random() * pair.lines.length)];
      }
    }

    return `Hey ${target.name.split(' ')[0]}, let's quickly review the latest task requirements.`;
  }
}
