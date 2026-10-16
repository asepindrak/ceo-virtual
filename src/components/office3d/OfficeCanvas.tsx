'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Agent, TaskTicket, ActivityEvent } from '@/types/office';
import { OfficeSimulation } from '@/lib/simulationEngine';

interface OfficeCanvasProps {
  agents: Agent[];
  tasks: TaskTicket[];
  simulation: OfficeSimulation;
  selectedAgentId?: string;
  onSelectAgent: (agentId: string) => void;
  onSimulationUpdate: (updatedAgents: Agent[], updatedTasks: TaskTicket[], newEvents: ActivityEvent[]) => void;
}

export const OfficeCanvas: React.FC<OfficeCanvasProps> = ({
  agents,
  tasks,
  simulation,
  selectedAgentId,
  onSelectAgent,
  onSimulationUpdate,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  
  // Meshes mapped by Agent ID for animations
  const agentMeshesRef = useRef<Map<string, {
    group: THREE.Group;
    body: THREE.Mesh;
    head: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
  }>>(new Map());

  // Store latest agents and tasks in refs for animation loop
  const agentsRef = useRef<Agent[]>(agents);
  const tasksRef = useRef<TaskTicket[]>(tasks);

  // Synchronize incoming agents from parent without snapping back actively moving agents
  useEffect(() => {
    const liveMap = new Map(agentsRef.current.map((a) => [a.id, a]));
    const merged = agents.map((incoming) => {
      const live = liveMap.get(incoming.id);
      if (live) {
        const isWalking = live.state === 'walking' || simulation.getAgentPathState(incoming.id);
        if (isWalking) {
          return {
            ...incoming,
            currentPosition: live.currentPosition,
            rotationY: live.rotationY,
            facingDirection: live.facingDirection,
            state: live.state,
            stateMessage: live.stateMessage,
          };
        }
      }
      return incoming;
    });
    agentsRef.current = merged;
  }, [agents, simulation]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const [hoveredAgent, setHoveredAgent] = useState<Agent | null>(null);
  const [cameraMode, setCameraMode] = useState<'free' | 'follow'>('free');

  // Build the complete 3D Office Environment
  const buildOfficeScene = useCallback((scene: THREE.Scene) => {
    // 1. Flooring - Retro warm parquet
    const floorGeo = new THREE.PlaneGeometry(28, 22);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xede0cf, // Warm retro parquet
      roughness: 0.7,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Area rugs for cozy zones (NO dizzying grid squares!)
    // Meeting Room Carpet
    const meetCarpet = new THREE.Mesh(
      new THREE.PlaneGeometry(6.0, 8.2),
      new THREE.MeshStandardMaterial({ color: 0xcfe2da, roughness: 0.9 })
    );
    meetCarpet.rotation.x = -Math.PI / 2;
    meetCarpet.position.set(9.2, 0.01, -5.5);
    scene.add(meetCarpet);

    // Pantry / Cafe Floor Deck
    const cafeCarpet = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 7.8),
      new THREE.MeshStandardMaterial({ color: 0xf1dfd0, roughness: 0.85 })
    );
    cafeCarpet.rotation.x = -Math.PI / 2;
    cafeCarpet.position.set(-9.2, 0.01, 5.5);
    scene.add(cafeCarpet);

    // Workstation Pod Left Rug
    const pod1Carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 6.8),
      new THREE.MeshStandardMaterial({ color: 0xe8f2ec, roughness: 0.9 })
    );
    pod1Carpet.rotation.x = -Math.PI / 2;
    pod1Carpet.position.set(-2.7, 0.01, -2.5);
    scene.add(pod1Carpet);

    // Workstation Pod Right Rug
    const pod2Carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 6.8),
      new THREE.MeshStandardMaterial({ color: 0xf0eaf4, roughness: 0.9 })
    );
    pod2Carpet.rotation.x = -Math.PI / 2;
    pod2Carpet.position.set(2.7, 0.01, -2.5);
    scene.add(pod2Carpet);

    // Boss Suite Rug
    const bossCarpet = new THREE.Mesh(
      new THREE.PlaneGeometry(7.0, 3.0),
      new THREE.MeshStandardMaterial({ color: 0x243b55, roughness: 0.9 })
    );
    bossCarpet.rotation.x = -Math.PI / 2;
    bossCarpet.position.set(0, 0.01, -8.3);
    scene.add(bossCarpet);

    // 2. Perimeter Walls - Warm vintage cream
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3e8d8, roughness: 0.9 });
    const wallHeight = 2.5;

    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(26, wallHeight, 0.4), wallMat);
    backWall.position.set(0, wallHeight / 2, -10.2);
    scene.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, wallHeight, 20), wallMat);
    leftWall.position.set(-13.2, wallHeight / 2, 0);
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, wallHeight, 20), wallMat);
    rightWall.position.set(13.2, wallHeight / 2, 0);
    scene.add(rightWall);

    // 3. Meeting Room (Glass Partitions on Right: x: 7 to 13, z: -10 to 0)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.7,
      thickness: 0.5,
    });
    
    // Meeting room partition wall
    const glassWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, wallHeight, 8), glassMat);
    glassWall.position.set(6.0, wallHeight / 2, -5.5);
    scene.add(glassWall);

    const glassWallBottom = new THREE.Mesh(new THREE.BoxGeometry(6.5, wallHeight, 0.1), glassMat);
    glassWallBottom.position.set(9.5, wallHeight / 2, -1.5);
    scene.add(glassWallBottom);

    // Meeting Room Conference Table (Large mahogany/dark wood table)
    const confTable = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 0.75, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4, metalness: 0.2 })
    );
    confTable.position.set(9.5, 0.38, -5.5);
    confTable.castShadow = true;
    confTable.receiveShadow = true;
    scene.add(confTable);

    // Conference Room Whiteboard
    const whiteboard = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 1.4, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 })
    );
    whiteboard.position.set(9.5, 1.5, -9.95);
    scene.add(whiteboard);

    // 4. Pantry / Break Room (Left side: x: -13 to -6, z: 2 to 10)
    // Pantry Partition
    const pantryWall = new THREE.Mesh(new THREE.BoxGeometry(6.5, wallHeight, 0.15), wallMat);
    pantryWall.position.set(-9.5, wallHeight / 2, 2.0);
    scene.add(pantryWall);

    // Kitchen Counter
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const kitchenCounter = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.85, 1.2), counterMat);
    kitchenCounter.position.set(-10.5, 0.42, 6.5);
    scene.add(kitchenCounter);

    // Coffee Machine (Espresso Maker)
    const coffeeMaker = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3, metalness: 0.6 })
    );
    coffeeMaker.position.set(-11.5, 1.1, 6.5);
    scene.add(coffeeMaker);

    // Water Cooler Dispenser
    const coolerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 1.0, 16),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9 })
    );
    coolerBase.position.set(-7.5, 0.5, 4.0);
    scene.add(coolerBase);

    const waterBottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 })
    );
    waterBottle.position.set(-7.5, 1.25, 4.0);
    scene.add(waterBottle);

    // Cozy Pantry Sofa
    const sofa = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.65, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
    );
    sofa.position.set(-9.0, 0.32, 8.5);
    scene.add(sofa);

    // 5. Workstations / Developer Desks
    // Helper function to build a workstation with monitors and chair
    const createWorkstation = (x: number, z: number, rotation: number = 0) => {
      const deskGroup = new THREE.Group();

      // Wooden Desktop - Vintage Teak Wood
      const deskTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.08, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xb59e82, roughness: 0.5 })
      );
      deskTop.position.set(0, 0.72, 0);
      deskTop.castShadow = true;
      deskTop.receiveShadow = true;
      deskGroup.add(deskTop);

      // Desk Metal Legs
      const legMat = new THREE.MeshStandardMaterial({ color: 0x4a3b32, metalness: 0.6 });
      const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8);
      const offsets = [
        [-0.72, -0.38],
        [0.72, -0.38],
        [-0.72, 0.38],
        [0.72, 0.38],
      ];
      offsets.forEach(([ox, oz]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(ox, 0.36, oz);
        deskGroup.add(leg);
      });

      // Dual CRT Monitors with Classic Beige Casing
      const monitorMat = new THREE.MeshStandardMaterial({ color: 0xdfd3c3, roughness: 0.7 });
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // Phosphor green retro screen
      
      const mon1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.08), monitorMat);
      mon1.position.set(-0.32, 0.98, -0.25);
      mon1.rotation.y = 0.15;
      deskGroup.add(mon1);

      const scr1 = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.29), screenMat);
      scr1.position.set(-0.32, 0.98, -0.20);
      scr1.rotation.y = 0.15;
      deskGroup.add(scr1);

      const mon2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.08), monitorMat);
      mon2.position.set(0.32, 0.98, -0.25);
      mon2.rotation.y = -0.15;
      deskGroup.add(mon2);

      const scr2 = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.29), screenMat);
      scr2.position.set(0.32, 0.98, -0.22);
      scr2.rotation.y = -0.15;
      deskGroup.add(scr2);

      // Keyboard & Mouse
      const kb = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.02, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x27272a })
      );
      kb.position.set(0, 0.77, 0.12);
      deskGroup.add(kb);

      // Office Ergonomic Chair
      const chairGroup = new THREE.Group();
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.06, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
      );
      seat.position.set(0, 0.45, 0.55);
      chairGroup.add(seat);

      const backrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.55, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      backrest.position.set(0, 0.72, 0.78);
      chairGroup.add(backrest);
      deskGroup.add(chairGroup);

      deskGroup.position.set(x, 0, z);
      deskGroup.rotation.y = rotation;
      scene.add(deskGroup);
    };

    // Spawn 8 workstation setups in modern agile pods with spacious spacing
    createWorkstation(-3.8, -4.5, 0);
    createWorkstation(-1.6, -4.5, 0);
    createWorkstation(-3.8, -0.5, Math.PI);
    createWorkstation(-1.6, -0.5, Math.PI);

    createWorkstation(1.6, -4.5, 0);
    createWorkstation(3.8, -4.5, 0);
    createWorkstation(1.6, -0.5, Math.PI);
    createWorkstation(3.8, -0.5, Math.PI);

    // 6. Modern Indoor Plants (Green Monstera pots)
    const createPlant = (px: number, pz: number) => {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.22, 0.55, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
      );
      pot.position.set(px, 0.28, pz);
      scene.add(pot);

      const plantGeo = new THREE.DodecahedronGeometry(0.45, 1);
      const plantMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.7 });
      const foliage = new THREE.Mesh(plantGeo, plantMat);
      foliage.position.set(px, 0.75, pz);
      scene.add(foliage);
    };

    createPlant(-5.5, -9.0);
    createPlant(5.5, -9.0);
    createPlant(-5.5, 1.2);
    createPlant(5.5, 1.2);
    createPlant(12.0, -9.0);

    // 7. Owner's Grand Executive Suite Desk (x: 0, z: -8.6)
    const ownerDeskGroup = new THREE.Group();
    ownerDeskGroup.name = 'owner-executive-desk';

    // Executive mahogany desk surface
    const execDeskTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.09, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.3, metalness: 0.2 })
    );
    execDeskTop.position.set(0, 0.74, 0);
    execDeskTop.castShadow = true;
    execDeskTop.receiveShadow = true;
    ownerDeskGroup.add(execDeskTop);

    // Sleek gold trim edge
    const goldTrim = new THREE.Mesh(
      new THREE.BoxGeometry(2.52, 0.02, 1.22),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 })
    );
    goldTrim.position.set(0, 0.73, 0);
    ownerDeskGroup.add(goldTrim);

    // Executive Legs
    const execLegMat = new THREE.MeshStandardMaterial({ color: 0x09090b });
    const el1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.74, 1.0), execLegMat);
    el1.position.set(-1.15, 0.37, 0);
    ownerDeskGroup.add(el1);
    const el2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.74, 1.0), execLegMat);
    el2.position.set(1.15, 0.37, 0);
    ownerDeskGroup.add(el2);

    // Owner's Ultra-Wide Curved Monitor / Laptop
    const execLaptop = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.03, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.1 })
    );
    execLaptop.position.set(0, 0.79, 0);
    ownerDeskGroup.add(execLaptop);

    const execScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.4, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 }) // Glowing royal purple owner screen
    );
    execScreen.position.set(0, 0.98, -0.2);
    ownerDeskGroup.add(execScreen);

    // Owner Executive Leather High-Back Chair
    const execChair = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.85, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x3b1d11, roughness: 0.6 })
    );
    execChair.position.set(0, 0.65, -0.65);
    ownerDeskGroup.add(execChair);

    ownerDeskGroup.position.set(0, 0, -8.6);
    scene.add(ownerDeskGroup);

    // 8. Office Entrance & Exit Glass Double Doors (x: 0, z: 9.8)
    const exitSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.3, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x10b981 }) // Glowing green exit sign
    );
    exitSign.position.set(0, 2.2, 9.7);
    scene.add(exitSign);
  }, []);

  // Create or Update stylized 3D Avatars for agents
  const updateAgentMeshes = useCallback((scene: THREE.Scene, currentAgents: Agent[]) => {
    // Clean up meshes of agents who were removed / fired
    const currentAgentIds = new Set(currentAgents.map((a) => a.id));
    agentMeshesRef.current.forEach((val, id) => {
      if (!currentAgentIds.has(id)) {
        scene.remove(val.group);
        agentMeshesRef.current.delete(id);
      }
    });

    currentAgents.forEach((agent) => {
      let agentEntry = agentMeshesRef.current.get(agent.id);

      if (!agentEntry) {
        // Construct stylized procedural low-poly human avatar
        const group = new THREE.Group();
        group.name = `agent-${agent.id}`;

        // Skin material
        const skinMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(agent.skinColor || '#fcd34d'),
          roughness: 0.5,
        });

        // Clothes / Shirt material
        const shirtMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(agent.shirtColor || '#3b82f6'),
          roughness: 0.6,
        });

        // Hair material
        const hairMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(agent.hairColor || '#0f172a'),
          roughness: 0.8,
        });

        // Pants / Leg material
        const pantsMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.7,
        });

        // 1. Torso
        const bodyGeo = new THREE.BoxGeometry(0.42, 0.55, 0.26);
        const body = new THREE.Mesh(bodyGeo, shirtMat);
        body.position.set(0, 0.75, 0);
        body.castShadow = true;
        group.add(body);

        // 2. Head
        const headGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.set(0, 1.22, 0);
        head.castShadow = true;
        group.add(head);

        // Hair on top of head
        const hairGeo = new THREE.BoxGeometry(0.34, 0.12, 0.34);
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.set(0, 1.34, 0);
        group.add(hair);

        // 3. Arms
        const armGeo = new THREE.BoxGeometry(0.12, 0.45, 0.12);
        const leftArm = new THREE.Mesh(armGeo, shirtMat);
        leftArm.position.set(-0.28, 0.75, 0);
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, shirtMat);
        rightArm.position.set(0.28, 0.75, 0);
        group.add(rightArm);

        // 4. Legs
        const legGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
        const leftLeg = new THREE.Mesh(legGeo, pantsMat);
        leftLeg.position.set(-0.12, 0.25, 0);
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, pantsMat);
        rightLeg.position.set(0.12, 0.25, 0);
        group.add(rightLeg);

        // Add selection ring indicator underneath
        const ringGeo = new THREE.RingGeometry(0.4, 0.48, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(agent.avatarColor),
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        group.add(ring);

        group.position.set(agent.currentPosition.x, 0, agent.currentPosition.z);
        scene.add(group);

        agentEntry = {
          group,
          body,
          head,
          leftArm,
          rightArm,
          leftLeg,
          rightLeg,
        };
        agentMeshesRef.current.set(agent.id, agentEntry);
      }

      // Update position and rotation
      agentEntry.group.position.x = agent.currentPosition.x;
      agentEntry.group.position.z = agent.currentPosition.z;
      agentEntry.group.rotation.y = agent.rotationY;

      // Face talking partner directly in 3D!
      if (agent.state === 'talking' && agent.collabPartnerId) {
        const partner = agents.find((a) => a.id === agent.collabPartnerId);
        if (partner) {
          const dx = partner.currentPosition.x - agent.currentPosition.x;
          const dz = partner.currentPosition.z - agent.currentPosition.z;
          agentEntry.group.rotation.y = Math.atan2(dx, dz);
        }
      }

      // Animate character limbs based on state
      const time = performance.now() * 0.005;

      if (agent.state === 'walking') {
        // Walking animation cycle
        const swing = Math.sin(time * 3);
        agentEntry.leftLeg.rotation.x = swing * 0.7;
        agentEntry.rightLeg.rotation.x = -swing * 0.7;
        agentEntry.leftArm.rotation.x = -swing * 0.7;
        agentEntry.rightArm.rotation.x = swing * 0.7;
        agentEntry.group.position.y = Math.abs(Math.sin(time * 6)) * 0.06;
      } else if (agent.state === 'working') {
        // Sitting & typing animation
        agentEntry.leftLeg.rotation.x = -Math.PI / 2.2;
        agentEntry.rightLeg.rotation.x = -Math.PI / 2.2;
        agentEntry.group.position.y = -0.15; // Lower to sit on chair

        // Calm focused typing posture
        agentEntry.leftArm.rotation.x = -Math.PI / 3 + Math.sin(time * 3) * 0.05;
        agentEntry.rightArm.rotation.x = -Math.PI / 3 + Math.cos(time * 3) * 0.05;
        agentEntry.head.rotation.x = 0.12 + Math.sin(time * 1.2) * 0.02;
      } else if (agent.state === 'idle') {
        // Sitting calmly at desk without frantic typing, resting hands
        agentEntry.leftLeg.rotation.x = -Math.PI / 2.2;
        agentEntry.rightLeg.rotation.x = -Math.PI / 2.2;
        agentEntry.group.position.y = -0.15; // Sitting on chair
        agentEntry.leftArm.rotation.x = -0.2;
        agentEntry.rightArm.rotation.x = -0.2;
        agentEntry.head.rotation.x = Math.sin(time * 0.8) * 0.02;
        agentEntry.head.rotation.y = 0;
      } else if (agent.state === 'talking') {
        // Lively conversation posture facing colleague
        agentEntry.leftLeg.rotation.x = 0;
        agentEntry.rightLeg.rotation.x = 0;
        agentEntry.group.position.y = 0;
        agentEntry.leftArm.rotation.x = -0.2;
        agentEntry.rightArm.rotation.x = -Math.PI / 4 + Math.sin(time * 5) * 0.18; // Conversational gesture
        agentEntry.head.rotation.y = Math.sin(time * 2) * 0.08;
        agentEntry.head.rotation.x = 0.05;
      } else if (agent.state === 'seeking_approval') {
        // Standing at Owner's Executive desk waiting for decision
        agentEntry.leftLeg.rotation.x = 0;
        agentEntry.rightLeg.rotation.x = 0;
        agentEntry.group.position.y = 0;
        agentEntry.leftArm.rotation.x = -0.4;
        agentEntry.rightArm.rotation.x = -0.4;
        agentEntry.head.rotation.x = -0.12;
        agentEntry.head.rotation.y = Math.sin(time * 1.5) * 0.08;
      } else {
        // Standby standing
        agentEntry.leftLeg.rotation.x = 0;
        agentEntry.rightLeg.rotation.x = 0;
        agentEntry.leftArm.rotation.x = 0;
        agentEntry.rightArm.rotation.x = 0;
        agentEntry.group.position.y = 0;
      }
    });
  }, []);

  // Initialize Three.js viewport
  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene - Warm retro sepia/cream background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4ebe1);
    scene.fog = new THREE.FogExp2(0xf4ebe1, 0.02);
    sceneRef.current = scene;

    // 2. Camera: Isometric Trimetric Angle
    const aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(13, 17, 16);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing and optimized performance
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25)); // Ultra-efficient 60fps
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.15; // Don't go below ground
    controls.minDistance = 5;
    controls.maxDistance = 35;
    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;

    // 5. Lighting Setup - Warm vintage daylight
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 0.95);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    dirLight.position.set(12, 18, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    const d = 16;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Warm accent light for breakroom / conference
    const warmPoint = new THREE.PointLight(0xf59e0b, 1.2, 12);
    warmPoint.position.set(-8.5, 2.5, 6.0);
    scene.add(warmPoint);

    const confPoint = new THREE.PointLight(0x38bdf8, 1.2, 14);
    confPoint.position.set(9.5, 2.8, -5.5);
    scene.add(confPoint);

    // Build Static Architecture
    buildOfficeScene(scene);

    // Raycaster for clicking agents in 3D
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      for (const hit of intersects) {
        let parent: THREE.Object3D | null = hit.object;
        while (parent) {
          if (parent.name && parent.name.startsWith('agent-')) {
            const agentId = parent.name.replace('agent-', '');
            onSelectAgent(agentId);
            return;
          }
          parent = parent.parent;
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Animation & Simulation Loop
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const currentTime = performance.now();
      const deltaSeconds = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Update simulation physics & behaviors
      const prevAgents = agentsRef.current;
      const prevTasks = tasksRef.current;

      const { updatedAgents, updatedTasks, newEvents } = simulation.update(
        prevAgents,
        prevTasks,
        deltaSeconds
      );

      // Keep internal animation refs in sync each frame
      agentsRef.current = updatedAgents;
      tasksRef.current = updatedTasks;

      // Sync updated state up to React parent
      const hasMovement = updatedAgents.some(
        (a, i) =>
          Math.abs(a.currentPosition.x - (prevAgents[i]?.currentPosition.x ?? 0)) > 0.01 ||
          Math.abs(a.currentPosition.z - (prevAgents[i]?.currentPosition.z ?? 0)) > 0.01 ||
          a.state !== prevAgents[i]?.state ||
          a.currentTaskId !== prevAgents[i]?.currentTaskId ||
          a.stateMessage !== prevAgents[i]?.stateMessage
      );

      const hasTaskChange = updatedTasks.some(
        (t, i) =>
          Math.floor(t.progress) !== Math.floor(prevTasks[i]?.progress ?? 0) ||
          t.status !== prevTasks[i]?.status
      );

      if (newEvents.length > 0 || hasMovement || hasTaskChange) {
        onSimulationUpdate(updatedAgents, updatedTasks, newEvents);
      }

      // Update 3D avatar meshes
      updateAgentMeshes(scene, updatedAgents);

      // Render 3D Walking Track Lines for walking agents
      const existingTrackGroup = scene.getObjectByName('agent-walking-tracks');
      if (existingTrackGroup) {
        scene.remove(existingTrackGroup);
      }
      const trackGroup = new THREE.Group();
      trackGroup.name = 'agent-walking-tracks';

      updatedAgents.forEach((agent) => {
        if (agent.state === 'walking') {
          const pathState = simulation.getAgentPathState(agent.id);
          if (pathState && pathState.waypoints.length > 0) {
            const curIdx = Math.min(pathState.waypoints.length - 1, pathState.currentWaypointIndex);
            const pts: THREE.Vector3[] = [
              new THREE.Vector3(agent.currentPosition.x, 0.06, agent.currentPosition.z),
            ];
            for (let i = curIdx; i < pathState.waypoints.length; i++) {
              pts.push(new THREE.Vector3(pathState.waypoints[i].x, 0.06, pathState.waypoints[i].z));
            }
            if (pts.length >= 2) {
              const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
              const lineMat = new THREE.LineBasicMaterial({
                color: agent.id === selectedAgentId ? 0xec4899 : 0x0284c7,
                linewidth: 3,
              });
              const line = new THREE.Line(lineGeo, lineMat);
              trackGroup.add(line);

              // Target point beacon
              const targetPt = pathState.finalTarget;
              const targetMarker = new THREE.Mesh(
                new THREE.RingGeometry(0.2, 0.35, 16),
                new THREE.MeshBasicMaterial({
                  color: agent.id === selectedAgentId ? 0xec4899 : 0x0284c7,
                  side: THREE.DoubleSide,
                })
              );
              targetMarker.rotation.x = -Math.PI / 2;
              targetMarker.position.set(targetPt.x, 0.07, targetPt.z);
              trackGroup.add(targetMarker);
            }
          }
        }
      });
      scene.add(trackGroup);

      // Follow Camera Mode
      if (cameraMode === 'follow' && selectedAgentId && controlsRef.current) {
        const followed = updatedAgents.find((a) => a.id === selectedAgentId);
        if (followed) {
          const targetPos = new THREE.Vector3(followed.currentPosition.x, 0.8, followed.currentPosition.z);
          controlsRef.current.target.lerp(targetPos, 0.05);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [buildOfficeScene, cameraMode, onSelectAgent, onSimulationUpdate, selectedAgentId, simulation, updateAgentMeshes]);

  // Project 3D agent positions to 2D screen coordinates for Speech Bubbles & Names
  const [projectedBubbles, setProjectedBubbles] = useState<
    { agent: Agent; x: number; y: number }[]
  >([]);

  useEffect(() => {
    const updateOverlays = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      const width = renderer.domElement.clientWidth;
      const height = renderer.domElement.clientHeight;

      const overlays = agents.map((agent) => {
        const pos = new THREE.Vector3(agent.currentPosition.x, 1.85, agent.currentPosition.z);
        pos.project(camera);
        const x = (pos.x * 0.5 + 0.5) * width;
        const y = (-(pos.y * 0.5) + 0.5) * height;
        return { agent, x, y };
      });

      setProjectedBubbles(overlays);
    };

    const interval = setInterval(updateOverlays, 30);
    return () => clearInterval(interval);
  }, [agents]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Clickable Badges & Speech Bubbles on top of 3D heads */}
      {projectedBubbles.map(({ agent, x, y }) => {
        const isSelected = agent.id === selectedAgentId;
        return (
          <div
            key={agent.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectAgent(agent.id);
            }}
            className="absolute transform -translate-x-1/2 -translate-y-full transition-all duration-75 z-20 cursor-pointer pointer-events-auto hover:scale-110 active:scale-95 group"
            style={{ left: `${x}px`, top: `${y - 12}px` }}
            title={`Klik untuk lihat status ${agent.name}`}
          >
            {/* Active Speech Bubble (vintage stationery paper style) */}
            {agent.activeDialog && (
              <div className="mb-1 bg-[#fffdfa]/95 backdrop-blur-md border-2 border-[#d6c5ad] text-[#2c231c] px-3 py-1.5 rounded-xl shadow-lg text-xs max-w-xs font-mono font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c85a2b] animate-pulse shrink-0" />
                <span className="truncate">{agent.activeDialog.message}</span>
              </div>
            )}

            {/* Persistent Clickable Name Tag */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border-2 text-[11px] font-mono font-bold shadow-md backdrop-blur-md transition-all ${
                isSelected
                  ? 'bg-[#c85a2b] text-white border-[#9c3e16] ring-2 ring-[#c85a2b]/30'
                  : 'bg-[#fffdf9]/95 text-[#2c231c] border-[#d6c5ad] group-hover:border-[#c85a2b] group-hover:text-[#c85a2b]'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: agent.avatarColor }}
              />
              <span className="truncate max-w-[80px]">{agent.name.split(' ')[0]}</span>
              <span className="text-[10px]">
                {agent.state === 'walking'
                  ? '🚶'
                  : agent.state === 'talking'
                  ? '💬'
                  : agent.state === 'coffee_break'
                  ? '☕'
                  : agent.state === 'seeking_approval'
                  ? '⚠️'
                  : '💻'}
              </span>
            </div>
          </div>
        );
      })}

      {/* Camera & View Controls Float */}
      <div className="absolute bottom-5 right-5 flex items-center gap-2 bg-[#faf5eb]/95 backdrop-blur-md border-2 border-[#d6c5ad] p-1.5 rounded-xl shadow-lg z-10 font-mono">
        <button
          onClick={() => {
            if (controlsRef.current && cameraRef.current) {
              cameraRef.current.position.set(13, 17, 16);
              controlsRef.current.target.set(0, 0.5, 0);
              setCameraMode('free');
            }
          }}
          className="px-3 py-1.5 text-xs font-bold text-[#5c4a3d] hover:text-[#2c231c] hover:bg-[#ebdcc9] rounded-lg transition-colors flex items-center gap-1.5"
          title="Reset Isometric Angle"
        >
          📐 Isometric Reset
        </button>
        {selectedAgentId && (
          <button
            onClick={() => setCameraMode(cameraMode === 'follow' ? 'free' : 'follow')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              cameraMode === 'follow'
                ? 'bg-[#c85a2b] text-white border border-[#9c3e16]'
                : 'text-[#5c4a3d] hover:text-[#2c231c] hover:bg-[#ebdcc9]'
            }`}
          >
            🎥 {cameraMode === 'follow' ? 'Following Agent' : 'Follow Agent'}
          </button>
        )}
      </div>

      {/* 3D Office Floor Guide Overlay */}
      <div className="absolute top-5 left-5 pointer-events-none flex flex-col gap-1 text-[11px] text-[#5c4a3d] font-mono">
        <div className="flex items-center gap-2 bg-[#faf5eb]/90 backdrop-blur px-2.5 py-1 rounded-md border border-[#d6c5ad] shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-[#c85a2b] inline-block" />
          <span>Workstations (8 Desks)</span>
        </div>
        <div className="flex items-center gap-2 bg-[#faf5eb]/90 backdrop-blur px-2.5 py-1 rounded-md border border-[#d6c5ad] shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-[#288279] inline-block" />
          <span>Conference Room</span>
        </div>
        <div className="flex items-center gap-2 bg-[#faf5eb]/90 backdrop-blur px-2.5 py-1 rounded-md border border-[#d6c5ad] shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-[#c68f23] inline-block" />
          <span>Pantry & Espresso Bar</span>
        </div>
      </div>
    </div>
  );
};
