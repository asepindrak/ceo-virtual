'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Agent, TaskTicket, ActivityEvent, Position3D } from '@/types/office';
import { OfficeSimulation } from '@/lib/simulationEngine';
import { formatNumber } from '@/lib/utils';
import {
  Sparkles,
  Coffee,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Footprints,
  MessageSquare,
  CheckSquare,
  Settings,
  Wrench,
  ChevronUp,
  ChevronDown,
  Bot,
  X,
  Layers,
  MapPin,
  Flame,
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass,
  MessagesSquare,
} from 'lucide-react';

interface IsometricOfficeProps {
  agents: Agent[];
  tasks: TaskTicket[];
  simulation: OfficeSimulation;
  selectedAgentId?: string;
  onSelectAgent: (agentId: string) => void;
  onSimulationUpdate: (updatedAgents: Agent[], updatedTasks: TaskTicket[], newEvents: ActivityEvent[]) => void;
  onOpenChat?: () => void;
  onOpenTasks?: () => void;
  onOpenSettings?: () => void;
}

interface FootprintStep {
  id: string;
  x: number;
  z: number;
  angle: number;
  side: 'left' | 'right';
  timestamp: number;
  color: string;
}

interface Particle {
  x: number;
  z: number;
  y: number;
  vy: number;
  alpha: number;
  type: 'steam' | 'sparkle' | 'heart' | 'snooze';
  color: string;
  size: number;
  text?: string;
}

export const IsometricOffice: React.FC<IsometricOfficeProps> = ({
  agents,
  tasks,
  simulation,
  selectedAgentId,
  onSelectAgent,
  onSimulationUpdate,
  onOpenChat,
  onOpenTasks,
  onOpenSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport Pan & Zoom (Spacious default zoom for grand expanded office)
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 15 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Hovered agent or mascot
  const [hoveredAgent, setHoveredAgent] = useState<Agent | null>(null);
  const [isCatHovered, setIsCatHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showTracks, setShowTracks] = useState(true);

  // HUD Card visibility toggles
  const [isAgentListOpen, setIsAgentListOpen] = useState(true);
  const [isMiniMapExpanded, setIsMiniMapExpanded] = useState(true);

  // Cat petting reaction
  const [catPurrUntil, setCatPurrUntil] = useState<number>(0);

  // Footprint trails & ambient particles
  const footprintsRef = useRef<FootprintStep[]>([]);
  const lastStepPositionsRef = useRef<Map<string, { x: number; z: number; side: 'left' | 'right' }>>(new Map());
  const particlesRef = useRef<Particle[]>([]);

  // Refs for animation loop
  const agentsRef = useRef<Agent[]>(agents);
  agentsRef.current = agents;
  const tasksRef = useRef<TaskTicket[]>(tasks);
  tasksRef.current = tasks;

  // Isometric Projection Math:
  // TILE_W = 60, TILE_H = 32 gives standard 2:1 isometric trimetric projection
  const TILE_W = 60;
  const TILE_H = 32;

  const worldToIso = useCallback(
    (wx: number, wz: number, width: number, height: number) => {
      const centerX = width / 2 + pan.x;
      const centerY = height / 2 - 25 + pan.y;
      const isoX = (wx - wz) * (TILE_W * 0.5 * zoom) + centerX;
      const isoY = (wx + wz) * (TILE_H * 0.5 * zoom) + centerY;
      return { isoX, isoY };
    },
    [pan.x, pan.y, zoom]
  );

  // Mascot Cat "Mochi" Roaming AI state & cozy spots (Home: Cat House & Bed)
  const CAT_COZY_SPOTS = [
    { x: -11.5, z: -4.5, name: 'Mochi Cat House & Bed', primaryAction: 'sleeping' as const },
    { x: -10.5, z: -7.5, name: 'Lounge Sofa', primaryAction: 'sitting' as const },
    { x: -11.0, z: 4.8, name: 'Pantry Rug', primaryAction: 'sitting' as const },
    { x: -2.0, z: -1.8, name: 'Open Pods Carpet', primaryAction: 'stretching' as const },
    { x: 1.5, z: 6.8, name: 'Lobby Plants', primaryAction: 'sitting' as const },
  ];

  interface CatRoamingState {
    x: number;
    z: number;
    targetX: number;
    targetZ: number;
    facing: 'left' | 'right';
    action: 'sleeping' | 'walking' | 'sitting' | 'stretching';
    actionUntil: number;
    purrUntil: number;
    meowText: string;
    meowUntil: number;
  }

  const catRef = useRef<CatRoamingState>({
    x: -11.5,
    z: -4.5,
    targetX: -11.5,
    targetZ: -4.5,
    facing: 'left',
    action: 'sleeping',
    actionUntil: Date.now() + 12000,
    purrUntil: 0,
    meowText: '',
    meowUntil: 0,
  });

  // Viewport navigation helpers
  const handleFocusZone = (targetX: number, targetZ: number) => {
    setPan({
      x: Math.round(-(targetX - targetZ) * (TILE_W * 0.5 * zoom)),
      y: Math.round(-(targetX + targetZ) * (TILE_H * 0.5 * zoom) + 25),
    });
  };

  const handleResetCamera = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 15 });
  };

  // Pointer interactions
  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    setMousePos({ x: clientX, y: clientY });

    if (isDragging) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
      return;
    }

    const width = canvasRef.current.width / (window.devicePixelRatio || 1);
    const height = canvasRef.current.height / (window.devicePixelRatio || 1);

    // Hit test against agents
    let foundAgent: Agent | null = null;
    for (const agent of agentsRef.current) {
      const { isoX, isoY } = worldToIso(agent.currentPosition.x, agent.currentPosition.z, width, height);
      const dist = Math.hypot(clientX - isoX, clientY - (isoY - 22 * zoom));
      if (dist < 32 * zoom) {
        foundAgent = agent;
        break;
      }
    }
    setHoveredAgent(foundAgent);

    // Hit test against roaming Cat Mochi
    const catIso = worldToIso(catRef.current.x, catRef.current.z, width, height);
    const catDist = Math.hypot(clientX - catIso.isoX, clientY - (catIso.isoY - 10 * zoom));
    setIsCatHovered(catDist < 25 * zoom);
  };

  const handlePointerUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);

    const dx = Math.abs(e.clientX - (dragStartRef.current.x + pan.x));
    const dy = Math.abs(e.clientY - (dragStartRef.current.y + pan.y));
    if (dx < 6 && dy < 6) {
      if (hoveredAgent) {
        onSelectAgent(hoveredAgent.id);
      } else if (isCatHovered) {
        catRef.current.purrUntil = Date.now() + 4500;
        catRef.current.meowText = 'Purrr~ Nyaa! ❤️';
        catRef.current.meowUntil = Date.now() + 3500;
        setCatPurrUntil(Date.now() + 4500);
        // Spawn heart particles around cat
        for (let i = 0; i < 6; i++) {
          particlesRef.current.push({
            x: catRef.current.x + (Math.random() - 0.5) * 0.8,
            z: catRef.current.z + (Math.random() - 0.5) * 0.8,
            y: 1.2 + Math.random() * 0.4,
            vy: 0.6 + Math.random() * 0.4,
            alpha: 1.0,
            type: 'heart',
            color: '#f43f5e',
            size: 14 * zoom,
          });
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const newZoom = Math.min(2.4, Math.max(0.65, zoom - e.deltaY * 0.0012));
    setZoom(newZoom);
  };

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const render = () => {
      animId = requestAnimationFrame(render);

      const currentTime = performance.now();
      const deltaSeconds = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;
      const now = Date.now();

      // Update simulation engine
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

      // Check whether React state needs synchronization
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

      // Step Footprint Trail generation
      updatedAgents.forEach((agent) => {
        if (agent.state === 'walking') {
          const last = lastStepPositionsRef.current.get(agent.id);
          const currentX = agent.currentPosition.x;
          const currentZ = agent.currentPosition.z;

          if (!last) {
            lastStepPositionsRef.current.set(agent.id, { x: currentX, z: currentZ, side: 'left' });
          } else {
            const dist = Math.hypot(currentX - last.x, currentZ - last.z);
            if (dist >= 0.42) {
              const moveAngle = Math.atan2(currentZ - last.z, currentX - last.x);
              const nextSide = last.side === 'left' ? 'right' : 'left';
              footprintsRef.current.push({
                id: `step-${now}-${Math.random()}`,
                x: currentX,
                z: currentZ,
                angle: moveAngle,
                side: nextSide,
                timestamp: now,
                color: agent.avatarColor || '#ec4899',
              });
              lastStepPositionsRef.current.set(agent.id, { x: currentX, z: currentZ, side: nextSide });
            }
          }
        } else {
          lastStepPositionsRef.current.delete(agent.id);
        }
      });

      // Expire old footsteps (> 3.8 seconds)
      footprintsRef.current = footprintsRef.current.filter((fp) => now - fp.timestamp < 3800);

      // Ambient steam particles at coffee bar (espresso machine at -11.8, 5.2)
      if (Math.random() < 0.35) {
        particlesRef.current.push({
          x: -11.8 + (Math.random() - 0.5) * 0.4,
          z: 5.2 + (Math.random() - 0.5) * 0.3,
          y: 1.1,
          vy: 0.45 + Math.random() * 0.35,
          alpha: 0.8,
          type: 'steam',
          color: '#ffffff',
          size: 5 + Math.random() * 4,
        });
      }

      // Mochi the Orange Cat Roaming AI step
      const cat = catRef.current;
      if (cat.action === 'walking') {
        const cdx = cat.targetX - cat.x;
        const cdz = cat.targetZ - cat.z;
        const cdist = Math.hypot(cdx, cdz);
        if (cdist < 0.08) {
          cat.x = cat.targetX;
          cat.z = cat.targetZ;
          const matchedSpot = CAT_COZY_SPOTS.find(
            (s) => Math.hypot(s.x - cat.x, s.z - cat.z) < 0.5
          );
          cat.action = matchedSpot?.primaryAction || 'sitting';
          cat.actionUntil = now + (14000 + Math.random() * 14000);
          if (Math.random() < 0.5) {
            cat.meowText = cat.action === 'sleeping' ? 'Zzz...' : 'Nyaa~ 🐾';
            cat.meowUntil = now + 4000;
          }
        } else {
          cat.facing = cdx < 0 ? 'left' : 'right';
          const catSpeed = 1.35 * deltaSeconds;
          const ratio = Math.min(1, catSpeed / cdist);
          cat.x += cdx * ratio;
          cat.z += cdz * ratio;
        }
      } else {
        if (now > cat.actionUntil) {
          // Home-based roaming AI: If away from home, 65% chance to head back home to Cat House & Bed
          const isAtHome = Math.hypot(cat.x - (-11.5), cat.z - (-4.5)) < 1.0;
          let nextSpot = CAT_COZY_SPOTS[0]; // Mochi's Cat House & Bed
          if (isAtHome) {
            // Pick a scenic office spot to stroll
            const strollSpots = CAT_COZY_SPOTS.slice(1);
            nextSpot = strollSpots[Math.floor(Math.random() * strollSpots.length)];
          } else {
            if (Math.random() < 0.65) {
              nextSpot = CAT_COZY_SPOTS[0]; // Head back to bed
            } else {
              const otherSpots = CAT_COZY_SPOTS.filter(
                (s) => Math.hypot(s.x - cat.x, s.z - cat.z) > 1.5
              );
              nextSpot = otherSpots[Math.floor(Math.random() * otherSpots.length)] || CAT_COZY_SPOTS[0];
            }
          }
          cat.targetX = nextSpot.x;
          cat.targetZ = nextSpot.z;
          cat.action = 'walking';
          cat.meowText = Math.random() < 0.4 ? 'Meow! 🐾' : '';
          cat.meowUntil = now + 3000;
        }
      }

      // Snooze "z" particles floating up from cat when sleeping
      if (cat.action === 'sleeping' && Math.random() < 0.06) {
        particlesRef.current.push({
          x: cat.x + (Math.random() - 0.5) * 0.3,
          z: cat.z + (Math.random() - 0.5) * 0.3,
          y: 0.6,
          vy: 0.25 + Math.random() * 0.15,
          alpha: 0.85,
          type: 'snooze',
          color: '#ea580c',
          size: 8 * zoom,
          text: Math.random() > 0.5 ? 'z' : 'Z',
        });
      }

      // Update ambient particles
      particlesRef.current.forEach((p) => {
        p.y += p.vy * deltaSeconds;
        p.alpha -= deltaSeconds * 0.42;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);

      // Canvas Resolution
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const toIso = (wx: number, wz: number) => worldToIso(wx, wz, width, height);
      const timeSec = currentTime * 0.001;

      // =========================================================
      // 1. GENTLE OUTDOOR NATURE SURROUNDINGS & FLOATING MEADOW
      // =========================================================
      // Warm, sunny soft background sky
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#f9f6ef');
      bgGrad.addColorStop(1, '#ebe0d0');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Outer lush floating lawn with natural curved contours (Generously Expanded for Roadway)
      const lawnPoly = [
        toIso(-28.0, -18.0),
        toIso(28.0, -18.0),
        toIso(28.0, 26.0),
        toIso(-28.0, 26.0),
      ];
      ctx.beginPath();
      ctx.moveTo(lawnPoly[0].isoX, lawnPoly[0].isoY);
      for (let i = 1; i < lawnPoly.length; i++) ctx.lineTo(lawnPoly[i].isoX, lawnPoly[i].isoY);
      ctx.closePath();
      // Rich vibrant spring green lawn (matching image_0.jpg)
      ctx.fillStyle = '#9fd38d';
      ctx.fill();

      // Subtle grass shading texture rings
      ctx.strokeStyle = '#8bc377';
      ctx.lineWidth = 1.2;
      for (let g = 0; g < 24; g++) {
        const gx = -21 + (g * 7.7) % 42;
        const gz = -16 + (g * 5.3) % 32;
        const gIso = toIso(gx, gz);
        ctx.beginPath();
        ctx.moveTo(gIso.isoX - 3 * zoom, gIso.isoY);
        ctx.lineTo(gIso.isoX, gIso.isoY - 4 * zoom);
        ctx.lineTo(gIso.isoX + 3 * zoom, gIso.isoY);
        ctx.stroke();
      }

      // Daisies & wildflowers on the lawn (matching image_0.jpg)
      const flowerPositions = [
        { x: -21, z: -14 }, { x: -18, z: -9 }, { x: -21.5, z: 2 }, { x: -19, z: 10 }, { x: -18, z: 15 },
        { x: 19, z: -15 }, { x: 21.5, z: -7 }, { x: 20.5, z: 4 }, { x: 18.5, z: 13 }, { x: 21, z: 15 },
        { x: -10, z: 16.5 }, { x: 8, z: 16.5 }, { x: -12, z: -16.5 }, { x: 12, z: -16.5 },
      ];
      flowerPositions.forEach((fp) => {
        const fIso = toIso(fp.x, fp.z);
        // Yellow center
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(fIso.isoX, fIso.isoY, 2.5 * zoom, 0, Math.PI * 2);
        ctx.fill();
        // White daisy petals
        ctx.fillStyle = '#ffffff';
        for (let a = 0; a < 5; a++) {
          const ang = (a * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.arc(
            fIso.isoX + Math.cos(ang) * 4.2 * zoom,
            fIso.isoY + Math.sin(ang) * 4.2 * zoom,
            2.2 * zoom,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      });

      // Outdoor Stepping Stone Pavers leading into the central entrance
      for (let sz = 11.2; sz <= 16.5; sz += 0.85) {
        const stIso = toIso(0.0, sz);
        ctx.fillStyle = '#dcd2c4';
        ctx.beginPath();
        ctx.ellipse(stIso.isoX, stIso.isoY, 16 * zoom, 8.5 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c4b6a4';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // =========================================================
      // GRAND SHADY TREES AROUND OFFICE PERIMETER (SEJUK & RINDANG)
      // =========================================================
      const drawBigTree = (tx: number, tz: number, treeScale = 1.35, seed = 0) => {
        const tIso = toIso(tx, tz);
        const s = treeScale * zoom;
        const sway = Math.sin(timeSec * 1.6 + seed) * 3 * zoom;

        // 1. Soft Grass Ambient Shadow
        ctx.fillStyle = 'rgba(25, 45, 18, 0.28)';
        ctx.beginPath();
        ctx.ellipse(tIso.isoX, tIso.isoY, 28 * s, 15 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Thick Natural Wooden Trunk & Splayed Roots
        ctx.fillStyle = '#5c3a21';
        ctx.beginPath();
        ctx.moveTo(tIso.isoX - 13 * s, tIso.isoY + 2 * s);
        ctx.lineTo(tIso.isoX - 6 * s, tIso.isoY - 8 * s);
        ctx.lineTo(tIso.isoX - 4.5 * s, tIso.isoY - 36 * s);
        ctx.lineTo(tIso.isoX + 4.5 * s, tIso.isoY - 36 * s);
        ctx.lineTo(tIso.isoX + 6 * s, tIso.isoY - 8 * s);
        ctx.lineTo(tIso.isoX + 13 * s, tIso.isoY + 2 * s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#3e2312';
        ctx.lineWidth = 1.4 * s;
        ctx.stroke();

        // Bark vertical texture ridges
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.moveTo(tIso.isoX - 2.5 * s, tIso.isoY - 32 * s);
        ctx.lineTo(tIso.isoX - 3.5 * s, tIso.isoY - 4 * s);
        ctx.moveTo(tIso.isoX + 2.5 * s, tIso.isoY - 30 * s);
        ctx.lineTo(tIso.isoX + 3.5 * s, tIso.isoY - 5 * s);
        ctx.stroke();

        // 3. Volumetric Layered Foliage Canopies (4-Tier Lush Greens)
        const crownCenterY = tIso.isoY - 54 * s;

        // Tier 1: Deep Forest Green Base Shadow
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(tIso.isoX - 18 * s + sway * 0.4, crownCenterY + 9 * s, 21 * s, 0, Math.PI * 2);
        ctx.arc(tIso.isoX + 18 * s + sway * 0.4, crownCenterY + 9 * s, 22 * s, 0, Math.PI * 2);
        ctx.arc(tIso.isoX + sway * 0.5, crownCenterY - 16 * s, 25 * s, 0, Math.PI * 2);
        ctx.fill();

        // Tier 2: Rich Spring Emerald Canopy
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(tIso.isoX - 15 * s + sway * 0.6, crownCenterY + 5 * s, 20 * s, 0, Math.PI * 2);
        ctx.arc(tIso.isoX + 15 * s + sway * 0.6, crownCenterY + 6 * s, 20 * s, 0, Math.PI * 2);
        ctx.arc(tIso.isoX + sway * 0.7, crownCenterY - 12 * s, 23 * s, 0, Math.PI * 2);
        ctx.fill();

        // Tier 3: Vibrant Sunlit Lime Canopy
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(tIso.isoX - 11 * s + sway * 0.8, crownCenterY - 3 * s, 16 * s, 0, Math.PI * 2);
        ctx.arc(tIso.isoX + 11 * s + sway * 0.8, crownCenterY - 2 * s, 16 * s, 0, Math.PI * 2);
        ctx.arc(tIso.isoX + sway * 0.9, crownCenterY - 18 * s, 18 * s, 0, Math.PI * 2);
        ctx.fill();

        // Tier 4: Warm Golden-Green Sunlit Highlights
        ctx.fillStyle = '#86efac';
        ctx.beginPath();
        ctx.arc(tIso.isoX - 6 * s + sway, crownCenterY - 21 * s, 10 * s, 0, Math.PI * 2);
        ctx.arc(tIso.isoX + 5 * s + sway, crownCenterY - 14 * s, 11 * s, 0, Math.PI * 2);
        ctx.fill();
      };

      // 15 Grand Perimeter Shady Trees surrounding the office park
      // A. Top-Back Panoramic Row (visible through rear panoramic glass windows)
      drawBigTree(-15.0, -16.0, 1.35, 1);
      drawBigTree(-8.0, -16.8, 1.45, 2);
      drawBigTree(0.0, -17.2, 1.55, 3);
      drawBigTree(8.0, -16.8, 1.45, 4);
      drawBigTree(15.0, -16.0, 1.35, 5);

      // B. Left Flank Perimeter (surrounding Pantry & Lounge gardens)
      drawBigTree(-21.5, -12.5, 1.30, 6);
      drawBigTree(-22.5, -5.0, 1.40, 7);
      drawBigTree(-22.0, 3.5, 1.35, 8);
      drawBigTree(-20.5, 11.0, 1.25, 9);

      // C. Right Flank Perimeter (surrounding Lead Suite & Sprint gardens)
      drawBigTree(21.5, -12.5, 1.30, 10);
      drawBigTree(22.5, -5.0, 1.40, 11);
      drawBigTree(22.0, 3.5, 1.35, 12);
      drawBigTree(20.5, 11.0, 1.25, 13);

      // D. Front Meadow Framing Corners
      drawBigTree(-15.0, 15.5, 1.25, 14);
      drawBigTree(15.0, 15.5, 1.25, 15);

      // =========================================================
      // 2. MAIN BUILDING FOUNDATION & 3D PLATFORM SLAB (EXPANDED)
      // =========================================================
      const slabDepth = 10 * zoom;
      const fTL = toIso(-16.5, -12.0);
      const fTR = toIso(16.5, -12.0);
      const fBR = toIso(16.5, 12.0);
      const fBL = toIso(-16.5, 12.0);

      // Deep foundation drop shadow
      ctx.fillStyle = 'rgba(40, 25, 15, 0.18)';
      ctx.beginPath();
      ctx.moveTo(fTL.isoX, fTL.isoY + slabDepth + 14 * zoom);
      ctx.lineTo(fTR.isoX, fTR.isoY + slabDepth + 14 * zoom);
      ctx.lineTo(fBR.isoX, fBR.isoY + slabDepth + 18 * zoom);
      ctx.lineTo(fBL.isoX, fBL.isoY + slabDepth + 18 * zoom);
      ctx.closePath();
      ctx.fill();

      // Front Foundation Bevel (Chiseled Stone Plinth)
      ctx.fillStyle = '#c7b49e';
      ctx.beginPath();
      ctx.moveTo(fBL.isoX, fBL.isoY);
      ctx.lineTo(fBR.isoX, fBR.isoY);
      ctx.lineTo(fBR.isoX, fBR.isoY + slabDepth);
      ctx.lineTo(fBL.isoX, fBL.isoY + slabDepth);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#a8947e';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Right Foundation Bevel
      ctx.fillStyle = '#b5a18a';
      ctx.beginPath();
      ctx.moveTo(fBR.isoX, fBR.isoY);
      ctx.lineTo(fTR.isoX, fTR.isoY);
      ctx.lineTo(fTR.isoX, fTR.isoY + slabDepth);
      ctx.lineTo(fBR.isoX, fBR.isoY + slabDepth);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Main Central Office Base Slab (Scandinavian Natural Light Birch)
      ctx.beginPath();
      ctx.moveTo(fTL.isoX, fTL.isoY);
      ctx.lineTo(fTR.isoX, fTR.isoY);
      ctx.lineTo(fBR.isoX, fBR.isoY);
      ctx.lineTo(fBL.isoX, fBL.isoY);
      ctx.closePath();
      ctx.fillStyle = '#f8f2e7';
      ctx.fill();
      ctx.strokeStyle = '#d6c5af';
      ctx.lineWidth = 2 * zoom;
      ctx.stroke();

      // Helper to fill smooth polygonal room zones
      const fillZone = (p1: Position3D, p2: Position3D, p3: Position3D, p4: Position3D, fill: string, stroke?: string) => {
        const pt1 = toIso(p1.x, p1.z);
        const pt2 = toIso(p2.x, p2.z);
        const pt3 = toIso(p3.x, p3.z);
        const pt4 = toIso(p4.x, p4.z);
        ctx.beginPath();
        ctx.moveTo(pt1.isoX, pt1.isoY);
        ctx.lineTo(pt2.isoX, pt2.isoY);
        ctx.lineTo(pt3.isoX, pt3.isoY);
        ctx.lineTo(pt4.isoX, pt4.isoY);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      };

      // =========================================================
      // 3. ARCHITECTURAL ZONED FLOORING (SPACIOUS & EXPANDED)
      // =========================================================
      // ZONE 1: Cafe & Pantry (Terracotta Tile Flooring on Left)
      fillZone(
        { x: -16.2, z: 0.5 },
        { x: -7.2, z: 0.5 },
        { x: -7.2, z: 11.8 },
        { x: -16.2, z: 11.8 },
        '#e8a882',
        '#c98a65'
      );
      // Terracotta tile lines
      ctx.strokeStyle = 'rgba(180, 105, 65, 0.35)';
      ctx.lineWidth = 1;
      for (let tx = -15.6; tx <= -7.8; tx += 1.6) {
        const t1 = toIso(tx, 0.5);
        const t2 = toIso(tx, 11.8);
        ctx.beginPath();
        ctx.moveTo(t1.isoX, t1.isoY);
        ctx.lineTo(t2.isoX, t2.isoY);
        ctx.stroke();
      }

      // ZONE 2: Entrance & Lobby (Modern Checkered Transition Floor at Center Bottom)
      fillZone(
        { x: -4.5, z: 7.2 },
        { x: 4.5, z: 7.2 },
        { x: 4.5, z: 11.8 },
        { x: -4.5, z: 11.8 },
        '#f5ede1',
        '#d4c4b0'
      );
      // Checkered pattern squares
      for (let cx = -4.2; cx < 4.2; cx += 1.6) {
        for (let cz = 7.4; cz < 11.6; cz += 1.5) {
          if ((Math.round(cx) + Math.round(cz)) % 2 === 0) {
            fillZone(
              { x: cx, z: cz },
              { x: cx + 1.5, z: cz },
              { x: cx + 1.5, z: cz + 1.4 },
              { x: cx, z: cz + 1.4 },
              '#e0d2c0'
            );
          }
        }
      }

      // ZONE 3: Relax / Break Area (Cream Area Rug on Top-Left)
      fillZone(
        { x: -16.2, z: -11.8 },
        { x: -7.2, z: -11.8 },
        { x: -7.2, z: -0.5 },
        { x: -16.2, z: -0.5 },
        '#fdfaf3',
        '#e8decb'
      );

      // ZONE 4: Lead Private Suite (Bright Luxury Scandinavian Parquet)
      fillZone(
        { x: 6.8, z: -11.8 },
        { x: 16.2, z: -11.8 },
        { x: 16.2, z: -1.0 },
        { x: 6.8, z: -1.0 },
        '#f5f0e6',
        '#e6decb'
      );
      // Clean, subtle light oak plank stripes
      ctx.strokeStyle = 'rgba(180, 160, 140, 0.35)';
      ctx.lineWidth = 1;
      for (let px = 7.2; px <= 15.8; px += 1.4) {
        const p1 = toIso(px, -11.8);
        const p2 = toIso(px, -1.0);
        ctx.beginPath();
        ctx.moveTo(p1.isoX, p1.isoY);
        ctx.lineTo(p2.isoX, p2.isoY);
        ctx.stroke();
      }

      // ZONE 5: Open Workspace Pod Carpets (Center Zone - Ergonomic & Spacious)
      // Left Wing Pod: Green Sage Carpet (Engineering & Architecture Pod)
      fillZone(
        { x: -5.8, z: -10.5 },
        { x: -1.4, z: -10.5 },
        { x: -1.4, z: 7.2 },
        { x: -5.8, z: 7.2 },
        '#c8e6ce',
        '#a7d3ae'
      );

      // Right Wing Pod: Purple Lavender Carpet (Creative, QA & Product Pod)
      fillZone(
        { x: 1.4, z: -10.5 },
        { x: 5.8, z: -10.5 },
        { x: 5.8, z: 7.2 },
        { x: 1.4, z: 7.2 },
        '#dfd5f0',
        '#c2b0dc'
      );

      // ZONE 6: Sprint Station (Bottom-Right Cyan Glass Pavilion)
      fillZone(
        { x: 6.8, z: 0.5 },
        { x: 16.2, z: 0.5 },
        { x: 16.2, z: 11.8 },
        { x: 6.8, z: 11.8 },
        '#e6f7f6',
        '#b4e8e4'
      );

      // =========================================================
      // 4. PANORAMIC GLASS WINDOWS & BACK WALL BORDERS
      // =========================================================
      // Back-left wall & Back-right wall floor-to-ceiling windows
      const drawWindowBay = (pStart: Position3D, pEnd: Position3D, heightPx: number) => {
        const isoS = toIso(pStart.x, pStart.z);
        const isoE = toIso(pEnd.x, pEnd.z);

        // Glass panes
        ctx.fillStyle = 'rgba(215, 238, 245, 0.45)';
        ctx.beginPath();
        ctx.moveTo(isoS.isoX, isoS.isoY);
        ctx.lineTo(isoE.isoX, isoE.isoY);
        ctx.lineTo(isoE.isoX, isoE.isoY - heightPx);
        ctx.lineTo(isoS.isoX, isoS.isoY - heightPx);
        ctx.closePath();
        ctx.fill();

        // White window frame mullions
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5 * zoom;
        ctx.stroke();

        // Vertical window mullions
        const steps = 4;
        for (let i = 1; i < steps; i++) {
          const ratio = i / steps;
          const mx = isoS.isoX + (isoE.isoX - isoS.isoX) * ratio;
          const my = isoS.isoY + (isoE.isoY - isoS.isoY) * ratio;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(mx, my - heightPx);
          ctx.stroke();
        }

        // Warm sunlight reflection sheen
        const sunGrad = ctx.createLinearGradient(isoS.isoX, isoS.isoY - heightPx, isoE.isoX, isoE.isoY);
        sunGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        sunGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.moveTo(isoS.isoX, isoS.isoY);
        ctx.lineTo(isoE.isoX, isoE.isoY);
        ctx.lineTo(isoE.isoX, isoE.isoY - heightPx);
        ctx.lineTo(isoS.isoX, isoS.isoY - heightPx);
        ctx.closePath();
        ctx.fill();
      };

      // Top-left window bay (behind Relax Area)
      drawWindowBay({ x: -16.2, z: -11.8 }, { x: -7.2, z: -11.8 }, 44 * zoom);
      // Top-right window bay (behind Lead Suite)
      drawWindowBay({ x: 6.8, z: -11.8 }, { x: 16.2, z: -11.8 }, 44 * zoom);
      // Far right window bay (behind Sprint Station)
      drawWindowBay({ x: 16.2, z: 0.5 }, { x: 16.2, z: 11.8 }, 44 * zoom);
      // Far left window bay (behind Cafe)
      drawWindowBay({ x: -16.2, z: 0.5 }, { x: -16.2, z: 11.8 }, 44 * zoom);

      // Hanging macrame plants along top window frame
      const hangingPlantIso1 = toIso(-13.5, -11.5);
      const hangingPlantIso2 = toIso(13.5, -11.5);
      [hangingPlantIso1, hangingPlantIso2].forEach((hIso) => {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hIso.isoX, hIso.isoY - 44 * zoom);
        ctx.lineTo(hIso.isoX, hIso.isoY - 26 * zoom);
        ctx.stroke();
        // Pot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hIso.isoX, hIso.isoY - 24 * zoom, 4.5 * zoom, 0, Math.PI * 2);
        ctx.fill();
        // Vines
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(hIso.isoX, hIso.isoY - 20 * zoom, 6.5 * zoom, 0, Math.PI * 2);
        ctx.fill();
      });

      // =========================================================
      // 5. ARCHITECTURAL PARTITION WALLS (SLATTED WOOD & GLASS)
      // =========================================================
      // A. Cafe Slatted Wood Partition Wall
      const slatStartX = -7.2;
      for (let sz = 0.8; sz <= 8.5; sz += 0.8) {
        if (sz >= 3.6 && sz <= 5.4) continue; // Wide doorway opening
        const sIso = toIso(slatStartX, sz);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(sIso.isoX - 1.2 * zoom, sIso.isoY - 38 * zoom, 2.4 * zoom, 38 * zoom);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(sIso.isoX - 0.6 * zoom, sIso.isoY - 38 * zoom, 1.2 * zoom, 38 * zoom);
      }

      // B. Lead Suite Open Architectural Partition (Zero Doors / No Yellow Elements)
      for (let sz = -11.5; sz <= -1.2; sz += 0.8) {
        if (sz >= -7.2 && sz <= -3.8) continue; // Wide, airy open walkthrough entrance
        const sIso = toIso(6.8, sz);
        ctx.fillStyle = '#78553d';
        ctx.fillRect(sIso.isoX - 1.2 * zoom, sIso.isoY - 38 * zoom, 2.4 * zoom, 38 * zoom);
      }

      // C. Sprint Station Cyan Glass Balustrade Wall
      const ssCorner1 = toIso(6.8, 0.5);
      const ssCorner2 = toIso(16.2, 0.5);
      const ssCorner3 = toIso(6.8, 11.8);
      // Top glass rail
      ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
      ctx.beginPath();
      ctx.moveTo(ssCorner1.isoX, ssCorner1.isoY);
      ctx.lineTo(ssCorner2.isoX, ssCorner2.isoY);
      ctx.lineTo(ssCorner2.isoX, ssCorner2.isoY - 26 * zoom);
      ctx.lineTo(ssCorner1.isoX, ssCorner1.isoY - 26 * zoom);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2 * zoom;
      ctx.stroke();

      // Left glass rail
      ctx.beginPath();
      ctx.moveTo(ssCorner1.isoX, ssCorner1.isoY);
      ctx.lineTo(ssCorner3.isoX, ssCorner3.isoY);
      ctx.lineTo(ssCorner3.isoX, ssCorner3.isoY - 26 * zoom);
      ctx.lineTo(ssCorner1.isoX, ssCorner1.isoY - 26 * zoom);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Chrome handrail caps
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5 * zoom;
      ctx.beginPath();
      ctx.moveTo(ssCorner1.isoX, ssCorner1.isoY - 26 * zoom);
      ctx.lineTo(ssCorner2.isoX, ssCorner2.isoY - 26 * zoom);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ssCorner1.isoX, ssCorner1.isoY - 26 * zoom);
      ctx.lineTo(ssCorner3.isoX, ssCorner3.isoY - 26 * zoom);
      ctx.stroke();

      // =========================================================
      // 6. ZONE ASSETS & FURNITURE (HIGH-DENSITY ISOMETRIC ART)
      // =========================================================

      // ---------------------------------------------------------
      // ZONE 1: ENTRANCE & LOBBY (Center-Bottom)
      // ---------------------------------------------------------
      // Futuristic Digital Security Gate / Portal Arch (X: 0.0, Z: 10.0)
      const gateIso = toIso(0.0, 10.0);
      // Gate Arch Shell
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2 * zoom;
      ctx.beginPath();
      ctx.roundRect(gateIso.isoX - 22 * zoom, gateIso.isoY - 44 * zoom, 44 * zoom, 44 * zoom, [14, 14, 2, 2]);
      ctx.fill();
      ctx.stroke();
      // Glowing Cyan Neon Inner Scanline
      const scanGlow = (Math.sin(timeSec * 5) + 1) * 0.5;
      ctx.strokeStyle = `rgba(6, 182, 212, ${0.7 + scanGlow * 0.3})`;
      ctx.lineWidth = 3.5 * zoom;
      ctx.beginPath();
      ctx.roundRect(gateIso.isoX - 15 * zoom, gateIso.isoY - 37 * zoom, 30 * zoom, 37 * zoom, [10, 10, 0, 0]);
      ctx.stroke();

      // Hologram Projector Pad on Floor (X: 0.0, Z: 8.5)
      const holoPadIso = toIso(0.0, 8.5);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(holoPadIso.isoX, holoPadIso.isoY, 16 * zoom, 8 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2 * zoom;
      ctx.stroke();
      // Concentric inner ring
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 1 * zoom;
      ctx.beginPath();
      ctx.ellipse(holoPadIso.isoX, holoPadIso.isoY, 10 * zoom, 5 * zoom, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Hologram Light Cone Radiating Upwards
      const holoBob = Math.sin(timeSec * 4) * 3 * zoom;
      const holoCone = ctx.createLinearGradient(
        holoPadIso.isoX,
        holoPadIso.isoY,
        holoPadIso.isoX,
        holoPadIso.isoY - 32 * zoom
      );
      holoCone.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
      holoCone.addColorStop(1, 'rgba(34, 211, 238, 0.05)');
      ctx.fillStyle = holoCone;
      ctx.beginPath();
      ctx.moveTo(holoPadIso.isoX - 12 * zoom, holoPadIso.isoY);
      ctx.lineTo(holoPadIso.isoX + 12 * zoom, holoPadIso.isoY);
      ctx.lineTo(holoPadIso.isoX + 16 * zoom, holoPadIso.isoY - 32 * zoom + holoBob);
      ctx.lineTo(holoPadIso.isoX - 16 * zoom, holoPadIso.isoY - 32 * zoom + holoBob);
      ctx.closePath();
      ctx.fill();

      // Floating Chibi 3D Robot Hologram Avatar
      const holoHeadY = holoPadIso.isoY - 26 * zoom + holoBob;
      ctx.fillStyle = '#38bdf8';
      // Hologram head
      ctx.beginPath();
      ctx.arc(holoPadIso.isoX, holoHeadY, 7 * zoom, 0, Math.PI * 2);
      ctx.fill();
      // Glowing robot visor eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(holoPadIso.isoX - 4 * zoom, holoHeadY - 1.5 * zoom, 8 * zoom, 3 * zoom);
      // Robot body
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(holoPadIso.isoX - 6 * zoom, holoHeadY + 7 * zoom, 12 * zoom, 9 * zoom, 3);
      ctx.fill();

      // Curved Modern Reception Desk (X: 2.8, Z: 8.8)
      const recIso = toIso(2.8, 8.8);
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(recIso.isoX - 20 * zoom, recIso.isoY - 12 * zoom, 40 * zoom, 24 * zoom, 8);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Counter top
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.roundRect(recIso.isoX - 18 * zoom, recIso.isoY - 15 * zoom, 36 * zoom, 18 * zoom, 6);
      ctx.fill();
      // Receptionist Robot Avatar in white lab coat
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(recIso.isoX, recIso.isoY - 26 * zoom, 6 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(recIso.isoX - 3.5 * zoom, recIso.isoY - 27 * zoom, 7 * zoom, 2.5 * zoom);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(recIso.isoX + 6 * zoom, recIso.isoY - 20 * zoom, 10 * zoom, 8 * zoom);

      // Indoor Potted Monstera / Palm Plants near entrance
      const plantIso1 = toIso(-2.8, 9.2);
      const plantIso2 = toIso(3.8, 9.8);
      [plantIso1, plantIso2].forEach((pIso) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(pIso.isoX, pIso.isoY, 6 * zoom, 4 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(pIso.isoX - 5 * zoom, pIso.isoY - 8 * zoom, 10 * zoom, 8 * zoom);
        // Lush green monstera fronds
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(pIso.isoX - 4 * zoom, pIso.isoY - 14 * zoom, 6 * zoom, 0, Math.PI * 2);
        ctx.arc(pIso.isoX + 4 * zoom, pIso.isoY - 16 * zoom, 7 * zoom, 0, Math.PI * 2);
        ctx.arc(pIso.isoX, pIso.isoY - 20 * zoom, 6.5 * zoom, 0, Math.PI * 2);
        ctx.fill();
      });

      // ---------------------------------------------------------
      // ZONE 2: CAFE & PANTRY (Spacious Left Wing)
      // ---------------------------------------------------------
      // Barista Counter with Commercial Espresso Machine (X: -11.8, Z: 5.5)
      const cafeCounter = toIso(-11.8, 5.5);

      // 1. Italian Calacatta White Marble Countertop & Walnut Base
      // Walnut Wood Base
      ctx.fillStyle = '#5c3a21';
      ctx.beginPath();
      ctx.roundRect(cafeCounter.isoX - 44 * zoom, cafeCounter.isoY - 8 * zoom, 88 * zoom, 28 * zoom, 6);
      ctx.fill();
      ctx.strokeStyle = '#3e2415';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Polished Calacatta Marble Slab Top
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(cafeCounter.isoX - 45 * zoom, cafeCounter.isoY - 15 * zoom, 90 * zoom, 16 * zoom, 5);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Subtle gray marble veins
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cafeCounter.isoX - 35 * zoom, cafeCounter.isoY - 12 * zoom);
      ctx.lineTo(cafeCounter.isoX - 20 * zoom, cafeCounter.isoY - 7 * zoom);
      ctx.lineTo(cafeCounter.isoX - 5 * zoom, cafeCounter.isoY - 10 * zoom);
      ctx.moveTo(cafeCounter.isoX + 12 * zoom, cafeCounter.isoY - 14 * zoom);
      ctx.lineTo(cafeCounter.isoX + 28 * zoom, cafeCounter.isoY - 8 * zoom);
      ctx.stroke();

      // 2. High-Detail 3D Isometric Commercial Espresso Machine (Slayer / La Marzocco style)
      // Positioned centrally on the counter at (X: -11.8, Z: 5.2)
      const espIso = toIso(-11.8, 5.2);

      // Deep Shadow beneath machine
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.ellipse(espIso.isoX, espIso.isoY - 8 * zoom, 22 * zoom, 9 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();

      // Heavy Sturdy Chrome Feet (4 corner feet)
      ctx.fillStyle = '#64748b';
      [-16, 14].forEach((fx) => {
        ctx.fillRect(espIso.isoX + fx * zoom, espIso.isoY - 12 * zoom, 3 * zoom, 4 * zoom);
      });

      // Machine Main Chassis (Italian Rosso Corsa Crimson #dc2626 / #991b1b)
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.roundRect(espIso.isoX - 18 * zoom, espIso.isoY - 34 * zoom, 36 * zoom, 24 * zoom, 4);
      ctx.fill();
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Brushed Stainless Steel Side Wings / Accents
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(espIso.isoX - 20 * zoom, espIso.isoY - 32 * zoom, 3 * zoom, 20 * zoom);
      ctx.fillRect(espIso.isoX + 17 * zoom, espIso.isoY - 32 * zoom, 3 * zoom, 20 * zoom);

      // Mirror-Chrome Front Fascia / Control Panel
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(espIso.isoX - 15 * zoom, espIso.isoY - 29 * zoom, 30 * zoom, 12 * zoom, 3);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Dual Brass Pressure Barometers (Boiler & Pump Gauges)
      [-9, 9].forEach((gx) => {
        // Brass bezel
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(espIso.isoX + gx * zoom, espIso.isoY - 24 * zoom, 3.2 * zoom, 0, Math.PI * 2);
        ctx.fill();
        // White gauge face
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(espIso.isoX + gx * zoom, espIso.isoY - 24 * zoom, 2.2 * zoom, 0, Math.PI * 2);
        ctx.fill();
        // Needle
        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(espIso.isoX + gx * zoom, espIso.isoY - 24 * zoom);
        ctx.lineTo(espIso.isoX + (gx + 1) * zoom, espIso.isoY - 25.5 * zoom);
        ctx.stroke();
      });

      // Digital Shot Timer LCD Display (Center)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(espIso.isoX - 4 * zoom, espIso.isoY - 26 * zoom, 8 * zoom, 4 * zoom);
      ctx.fillStyle = '#06b6d4';
      ctx.font = `bold ${Math.max(4, Math.floor(4 * zoom))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('28s', espIso.isoX, espIso.isoY - 24 * zoom);

      // Dual Groupheads & Portafilters
      [-6, 6].forEach((ghx) => {
        // Chrome Grouphead Collar
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(espIso.isoX + (ghx - 3) * zoom, espIso.isoY - 17 * zoom, 6 * zoom, 4 * zoom);
        // Slanted Portafilter Handle jutting forward towards agent
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.2 * zoom;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(espIso.isoX + ghx * zoom, espIso.isoY - 14 * zoom);
        ctx.lineTo(espIso.isoX + (ghx + 2) * zoom, espIso.isoY - 9 * zoom);
        ctx.stroke();
        // Wooden handle grip
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.8 * zoom;
        ctx.beginPath();
        ctx.moveTo(espIso.isoX + (ghx + 1.2) * zoom, espIso.isoY - 11.5 * zoom);
        ctx.lineTo(espIso.isoX + (ghx + 3.2) * zoom, espIso.isoY - 8 * zoom);
        ctx.stroke();
      });

      // Stainless Steel Slotted Drip Tray
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(espIso.isoX - 16 * zoom, espIso.isoY - 13 * zoom, 32 * zoom, 4 * zoom, 1.5);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      // Drip tray slots
      for (let s = -12; s <= 12; s += 3) {
        ctx.beginPath();
        ctx.moveTo(espIso.isoX + s * zoom, espIso.isoY - 12.5 * zoom);
        ctx.lineTo(espIso.isoX + s * zoom, espIso.isoY - 10 * zoom);
        ctx.stroke();
      }

      // 2 Ceramic Espresso Demitasse Cups on the Drip Tray with Crema
      [-6, 6].forEach((cx) => {
        // White cup body
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(espIso.isoX + cx * zoom, espIso.isoY - 11 * zoom, 2.8 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // Golden espresso crema inside
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(espIso.isoX + cx * zoom, espIso.isoY - 11 * zoom, 1.6 * zoom, 0, Math.PI * 2);
        ctx.fill();
      });

      // Dual Articulated Stainless Steam Wands on left & right
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.4 * zoom;
      // Left wand
      ctx.beginPath();
      ctx.moveTo(espIso.isoX - 15 * zoom, espIso.isoY - 20 * zoom);
      ctx.lineTo(espIso.isoX - 19 * zoom, espIso.isoY - 15 * zoom);
      ctx.lineTo(espIso.isoX - 17 * zoom, espIso.isoY - 11 * zoom);
      ctx.stroke();
      // Right wand
      ctx.beginPath();
      ctx.moveTo(espIso.isoX + 15 * zoom, espIso.isoY - 20 * zoom);
      ctx.lineTo(espIso.isoX + 19 * zoom, espIso.isoY - 15 * zoom);
      ctx.lineTo(espIso.isoX + 17 * zoom, espIso.isoY - 11 * zoom);
      ctx.stroke();

      // Top Cup Warming Rack & Railing
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(espIso.isoX - 17 * zoom, espIso.isoY - 34 * zoom);
      ctx.lineTo(espIso.isoX + 17 * zoom, espIso.isoY - 34 * zoom);
      ctx.stroke();

      // Stacked White Ceramic Cups warming on top rack
      [-10, -3, 4, 11].forEach((cx) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(espIso.isoX + cx * zoom, espIso.isoY - 36 * zoom, 2.6 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });

      // Dual Clear Glass Bean Hoppers on top
      [-10, 10].forEach((hx) => {
        // Glass dome
        ctx.fillStyle = 'rgba(224, 242, 254, 0.7)';
        ctx.beginPath();
        ctx.arc(espIso.isoX + hx * zoom, espIso.isoY - 43 * zoom, 4.5 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Dark roasted whole coffee beans inside
        ctx.fillStyle = '#3e1f0e';
        ctx.beginPath();
        ctx.arc(espIso.isoX + hx * zoom, espIso.isoY - 42 * zoom, 3.2 * zoom, 0, Math.PI * 2);
        ctx.fill();
        // Chrome lid
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(espIso.isoX + (hx - 3.5) * zoom, espIso.isoY - 48.5 * zoom, 7 * zoom, 2 * zoom);
      });

      // Clean Sleek Label above Espresso Station (Dynamic width, zero overflow)
      const signText = 'ESPRESSO BAR';
      ctx.font = `bold ${Math.max(6, Math.floor(6.5 * zoom))}px ui-sans-serif, system-ui, sans-serif`;
      const signTextW = ctx.measureText(signText).width;
      const badgeW = signTextW + 16 * zoom;
      const badgeH = 12 * zoom;
      const signY = espIso.isoY - 56 * zoom;

      ctx.fillStyle = 'rgba(254, 243, 199, 0.95)';
      ctx.beginPath();
      ctx.roundRect(espIso.isoX - badgeW / 2, signY - badgeH / 2, badgeW, badgeH, 3 * zoom);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#78350f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(signText, espIso.isoX, signY);
      ctx.textBaseline = 'alphabetic'; // Reset baseline

      // 4 High Wooden Bar Stools (leaving center space clear for Barista agent)
      [-30, -15, 15, 30].forEach((offset) => {
        const stoolX = cafeCounter.isoX + offset * zoom;
        const stoolY = cafeCounter.isoY + 12 * zoom;
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(stoolX, stoolY, 6 * zoom, 3.5 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Stool legs
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(stoolX, stoolY);
        ctx.lineTo(stoolX, stoolY + 9 * zoom);
        ctx.stroke();
      });

      // Stainless Steel Double-Door Refrigerator (X: -15.0, Z: 2.5)
      const fridgeIso = toIso(-15.0, 2.5);
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(fridgeIso.isoX - 12 * zoom, fridgeIso.isoY - 38 * zoom, 24 * zoom, 40 * zoom, 4);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Center split & handles
      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(fridgeIso.isoX, fridgeIso.isoY - 38 * zoom);
      ctx.lineTo(fridgeIso.isoX, fridgeIso.isoY + 2 * zoom);
      ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.fillRect(fridgeIso.isoX - 3 * zoom, fridgeIso.isoY - 24 * zoom, 1.5 * zoom, 8 * zoom);
      ctx.fillRect(fridgeIso.isoX + 1.5 * zoom, fridgeIso.isoY - 24 * zoom, 1.5 * zoom, 8 * zoom);

      // Glass Beverage Chiller (X: -15.0, Z: 4.8)
      const chillerIso = toIso(-15.0, 4.8);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.roundRect(chillerIso.isoX - 10 * zoom, chillerIso.isoY - 32 * zoom, 20 * zoom, 34 * zoom, 3);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Colorful soda cans inside
      const canColors = ['#ef4444', '#10b981', '#3b82f6'];
      canColors.forEach((cc, cIdx) => {
        ctx.fillStyle = cc;
        ctx.fillRect(chillerIso.isoX - 6 * zoom + cIdx * 5 * zoom, chillerIso.isoY - 22 * zoom, 3.5 * zoom, 6 * zoom);
      });

      // 2 Small Wooden Dining Tables with Chairs (X: -9.5, Z: 8.8) and (X: -13.0, Z: 9.0)
      [toIso(-9.5, 8.8), toIso(-13.0, 9.0)].forEach((tbl) => {
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.roundRect(tbl.isoX - 14 * zoom, tbl.isoY - 8 * zoom, 28 * zoom, 16 * zoom, 4);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Ceramic coffee cup & tiny succulent
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(tbl.isoX - 4 * zoom, tbl.isoY - 2 * zoom, 2.5 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(tbl.isoX + 4 * zoom, tbl.isoY - 2 * zoom, 2.8 * zoom, 0, Math.PI * 2);
        ctx.fill();
      });

      // ---------------------------------------------------------
      // ZONE 3: RELAX / BREAK AREA (Spacious Top-Left Lounge)
      // ---------------------------------------------------------
      // Soft Orange/Terracotta 3-Seater Sofa (X: -11.8, Z: -8.8)
      const sofaIso = toIso(-11.8, -8.8);
      // Sofa Base & Cushions
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(sofaIso.isoX - 32 * zoom, sofaIso.isoY - 16 * zoom, 64 * zoom, 30 * zoom, 10);
      ctx.fill();
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Sofa backrest
      ctx.fillStyle = '#c2410c';
      ctx.beginPath();
      ctx.roundRect(sofaIso.isoX - 32 * zoom, sofaIso.isoY - 28 * zoom, 64 * zoom, 16 * zoom, 8);
      ctx.fill();
      // Accent Pillows
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(sofaIso.isoX - 26 * zoom, sofaIso.isoY - 18 * zoom, 10 * zoom, 10 * zoom, 3);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(sofaIso.isoX + 16 * zoom, sofaIso.isoY - 18 * zoom, 10 * zoom, 10 * zoom, 3);
      ctx.fill();

      // Low Solid Oak Coffee Table (X: -11.8, Z: -6.5)
      const cTableIso = toIso(-11.8, -6.5);
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(cTableIso.isoX - 22 * zoom, cTableIso.isoY - 8 * zoom, 44 * zoom, 16 * zoom, 4);
      ctx.fill();
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Colorful Beanbags in Lounge
      const beanBags = [
        { iso: toIso(-9.0, -4.5), color: '#ea580c' },
        { iso: toIso(-14.0, -5.0), color: '#0284c7' },
        { iso: toIso(-8.5, -9.0), color: '#a855f7' },
      ];
      beanBags.forEach((bb) => {
        ctx.fillStyle = bb.color;
        ctx.beginPath();
        ctx.ellipse(bb.iso.isoX, bb.iso.isoY, 13 * zoom, 9 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.ellipse(bb.iso.isoX - 3 * zoom, bb.iso.isoY - 2 * zoom, 6 * zoom, 4 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Tall Wooden Library Bookcase on Back Wall (X: -9.5, Z: -11.5)
      const bcaseIso = toIso(-9.5, -11.5);
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(bcaseIso.isoX - 18 * zoom, bcaseIso.isoY - 42 * zoom, 36 * zoom, 44 * zoom, 3);
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const bookColors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
      for (let r = 0; r < 3; r++) {
        const shelfY = bcaseIso.isoY - 36 * zoom + r * 11 * zoom;
        ctx.fillStyle = '#451a03';
        ctx.fillRect(bcaseIso.isoX - 16 * zoom, shelfY + 7 * zoom, 32 * zoom, 2 * zoom);
        for (let b = 0; b < 6; b++) {
          ctx.fillStyle = bookColors[(r + b) % bookColors.length];
          ctx.fillRect(bcaseIso.isoX - 14 * zoom + b * 5 * zoom, shelfY, 3.5 * zoom, 7 * zoom);
        }
      }

      // Water Cooler Dispenser with Blue 5-Gallon Bottle (X: -14.5, Z: -8.5)
      const coolerIso = toIso(-14.5, -8.5);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(coolerIso.isoX - 7 * zoom, coolerIso.isoY - 18 * zoom, 14 * zoom, 20 * zoom, 3);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Blue inverted bottle
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(coolerIso.isoX, coolerIso.isoY - 24 * zoom, 6.5 * zoom, 0, Math.PI * 2);
      ctx.fill();

      // ---------------------------------------------------------
      // RETRO ARCADE GAME CORNER (X: -8.8, Z: -3.8)
      // ---------------------------------------------------------
      const arcadeIso = toIso(-8.8, -3.8);
      // Floor glow mat
      ctx.fillStyle = 'rgba(168, 85, 247, 0.22)';
      ctx.beginPath();
      ctx.ellipse(arcadeIso.isoX, arcadeIso.isoY + 4 * zoom, 28 * zoom, 16 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main Cabinet Body (Dark purple / Obsidian)
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.roundRect(arcadeIso.isoX - 16 * zoom, arcadeIso.isoY - 38 * zoom, 32 * zoom, 42 * zoom, 5);
      ctx.fill();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Side trim neon strip (Magenta & Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(arcadeIso.isoX - 15 * zoom, arcadeIso.isoY - 35 * zoom);
      ctx.lineTo(arcadeIso.isoX - 15 * zoom, arcadeIso.isoY + 2 * zoom);
      ctx.stroke();
      ctx.strokeStyle = '#ec4899';
      ctx.beginPath();
      ctx.moveTo(arcadeIso.isoX + 15 * zoom, arcadeIso.isoY - 35 * zoom);
      ctx.lineTo(arcadeIso.isoX + 15 * zoom, arcadeIso.isoY + 2 * zoom);
      ctx.stroke();

      // Illuminated Marquee Top (Sleek Retro Neon Marquee)
      const marqueeGlow = Math.sin(timeSec * 4) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(236, 72, 153, ${marqueeGlow})`;
      ctx.beginPath();
      ctx.roundRect(arcadeIso.isoX - 15 * zoom, arcadeIso.isoY - 37 * zoom, 30 * zoom, 9 * zoom, 2);
      ctx.fill();
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Compact, perfectly fitted text "ARCADE" without oversized emoji overflow
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.max(4, Math.round(5 * zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ARCADE', arcadeIso.isoX, arcadeIso.isoY - 32.5 * zoom);
      ctx.textBaseline = 'alphabetic'; // reset baseline

      // CRT Monitor Screen (Animated Pixel Game)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(arcadeIso.isoX - 12 * zoom, arcadeIso.isoY - 24 * zoom, 24 * zoom, 15 * zoom, 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Animated retro pixel elements inside CRT screen
      const pixelShipX = arcadeIso.isoX + Math.sin(timeSec * 3) * 7 * zoom;
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(pixelShipX - 2.5 * zoom, arcadeIso.isoY - 14 * zoom, 5 * zoom, 3 * zoom); // Spaceship
      ctx.fillStyle = '#f43f5e';
      const invaderY = arcadeIso.isoY - 21 * zoom + (Math.floor(timeSec * 2) % 2) * 1.5 * zoom;
      ctx.fillRect(arcadeIso.isoX - 6 * zoom, invaderY, 4 * zoom, 3 * zoom); // Invader 1
      ctx.fillRect(arcadeIso.isoX + 2 * zoom, invaderY, 4 * zoom, 3 * zoom); // Invader 2

      // Angled Control Panel Deck
      ctx.fillStyle = '#312e81';
      ctx.beginPath();
      ctx.roundRect(arcadeIso.isoX - 15 * zoom, arcadeIso.isoY - 8 * zoom, 30 * zoom, 10 * zoom, 3);
      ctx.fill();
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Joysticks & Buttons
      // Joystick 1 (Red ball)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(arcadeIso.isoX - 9 * zoom, arcadeIso.isoY - 3 * zoom);
      ctx.lineTo(arcadeIso.isoX - 9 * zoom, arcadeIso.isoY - 6 * zoom);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(arcadeIso.isoX - 9 * zoom, arcadeIso.isoY - 6.5 * zoom, 2.2 * zoom, 0, Math.PI * 2);
      ctx.fill();

      // Joystick 2 (Blue ball)
      ctx.beginPath();
      ctx.moveTo(arcadeIso.isoX + 2 * zoom, arcadeIso.isoY - 3 * zoom);
      ctx.lineTo(arcadeIso.isoX + 2 * zoom, arcadeIso.isoY - 6 * zoom);
      ctx.stroke();
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(arcadeIso.isoX + 2 * zoom, arcadeIso.isoY - 6.5 * zoom, 2.2 * zoom, 0, Math.PI * 2);
      ctx.fill();

      // Action Buttons (Yellow & Green)
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(arcadeIso.isoX - 3 * zoom, arcadeIso.isoY - 3.5 * zoom, 1.4 * zoom, 0, Math.PI * 2);
      ctx.arc(arcadeIso.isoX + 8 * zoom, arcadeIso.isoY - 3.5 * zoom, 1.4 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(arcadeIso.isoX - 1 * zoom, arcadeIso.isoY - 5 * zoom, 1.4 * zoom, 0, Math.PI * 2);
      ctx.arc(arcadeIso.isoX + 10 * zoom, arcadeIso.isoY - 5 * zoom, 1.4 * zoom, 0, Math.PI * 2);
      ctx.fill();

      // Coin Door / Glowing 25¢ Insert
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(arcadeIso.isoX - 5 * zoom, arcadeIso.isoY + 5 * zoom, 10 * zoom, 8 * zoom);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(arcadeIso.isoX - 2.5 * zoom, arcadeIso.isoY + 7 * zoom, 5 * zoom, 1.5 * zoom);

      // ---------------------------------------------------------
      // MOCHI'S COZY CAT HOUSE & PLUSH BED (Rumah & Kasur Kucing Mochi)
      // ---------------------------------------------------------
      const catHouseIso = toIso(-11.5, -4.5);

      // 1. Soft Braided Round Floor Mat (Karpet Bulat Pastel)
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.ellipse(catHouseIso.isoX, catHouseIso.isoY + 2 * zoom, 26 * zoom, 15 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2 * zoom;
      ctx.stroke();

      // Mini stitched paw print decoration on rug
      ctx.fillStyle = 'rgba(217, 119, 6, 0.22)';
      ctx.beginPath();
      ctx.ellipse(catHouseIso.isoX - 14 * zoom, catHouseIso.isoY + 4 * zoom, 2.5 * zoom, 1.8 * zoom, 0, 0, Math.PI * 2);
      ctx.arc(catHouseIso.isoX - 16 * zoom, catHouseIso.isoY + 1.2 * zoom, 0.9 * zoom, 0, Math.PI * 2);
      ctx.arc(catHouseIso.isoX - 14 * zoom, catHouseIso.isoY + 0.8 * zoom, 0.9 * zoom, 0, Math.PI * 2);
      ctx.arc(catHouseIso.isoX - 12 * zoom, catHouseIso.isoY + 1.2 * zoom, 0.9 * zoom, 0, Math.PI * 2);
      ctx.fill();

      // 2. Charming Wooden Cat House Cabin (Kotak Rumah Kucing Kayu)
      const houseX = catHouseIso.isoX - 6 * zoom;
      const houseY = catHouseIso.isoY - 17 * zoom;
      const houseW = 20 * zoom;
      const houseH = 17 * zoom;

      // Wooden Cabin Walls
      ctx.fillStyle = '#fed7aa'; // Warm Scandinavian birch
      ctx.beginPath();
      ctx.roundRect(houseX - houseW / 2, houseY - houseH / 2, houseW, houseH, 4 * zoom);
      ctx.fill();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.4 * zoom;
      ctx.stroke();

      // Roof with cute cat-ear shaped gables
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(houseX - houseW / 2 - 2 * zoom, houseY - houseH / 2);
      ctx.lineTo(houseX, houseY - houseH / 2 - 8 * zoom); // Peak
      ctx.lineTo(houseX + houseW / 2 + 2 * zoom, houseY - houseH / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 1.2 * zoom;
      ctx.stroke();

      // Cute wooden cat ears on roof peak
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(houseX - 4.5 * zoom, houseY - houseH / 2 - 5 * zoom);
      ctx.lineTo(houseX - 7 * zoom, houseY - houseH / 2 - 10 * zoom);
      ctx.lineTo(houseX - 1.5 * zoom, houseY - houseH / 2 - 7 * zoom);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(houseX + 1.5 * zoom, houseY - houseH / 2 - 7 * zoom);
      ctx.lineTo(houseX + 7 * zoom, houseY - houseH / 2 - 10 * zoom);
      ctx.lineTo(houseX + 4.5 * zoom, houseY - houseH / 2 - 5 * zoom);
      ctx.closePath();
      ctx.fill();

      // Arched Doorway (Cat face entrance)
      ctx.fillStyle = '#431407'; // Dark cozy interior
      ctx.beginPath();
      ctx.arc(houseX, houseY + 2 * zoom, 5 * zoom, Math.PI, 0, false);
      ctx.lineTo(houseX + 5 * zoom, houseY + 8 * zoom);
      ctx.lineTo(houseX - 5 * zoom, houseY + 8 * zoom);
      ctx.closePath();
      ctx.fill();

      // 3. Sisal Scratching Post with Dangling Pom-Pom Toy
      const postX = catHouseIso.isoX + 14 * zoom;
      const postY = catHouseIso.isoY - 7 * zoom;
      // Pole
      ctx.fillStyle = '#d97706';
      ctx.fillRect(postX - 2 * zoom, postY - 16 * zoom, 4 * zoom, 18 * zoom);
      ctx.fillStyle = '#b45309';
      for (let r = 0; r < 5; r++) {
        ctx.fillRect(postX - 2 * zoom, postY - 15 * zoom + r * 3.5 * zoom, 4 * zoom, 1 * zoom);
      }
      // Top platform
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(postX, postY - 16 * zoom, 5 * zoom, 2.5 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      // Dangling wire & pink pom-pom toy
      const toySway = Math.sin(timeSec * 4) * 2 * zoom;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(postX - 2.5 * zoom, postY - 15 * zoom);
      ctx.quadraticCurveTo(postX - 6 * zoom, postY - 10 * zoom, postX - 5 * zoom + toySway, postY - 7 * zoom);
      ctx.stroke();
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(postX - 5 * zoom + toySway, postY - 7 * zoom, 1.8 * zoom, 0, Math.PI * 2);
      ctx.fill();

      // 4. Plush Donut Bed (Kasur Bulat Empuk Mochi di depan rumah)
      const donutX = catHouseIso.isoX - 2 * zoom;
      const donutY = catHouseIso.isoY + 3 * zoom;
      // Outer velvet ring (Plush warm orange rim)
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.ellipse(donutX, donutY, 15 * zoom, 9 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 1.6 * zoom;
      ctx.stroke();

      // Soft fleece inner cushion nest (Cream soft cotton)
      ctx.fillStyle = '#ffedd5';
      ctx.beginPath();
      ctx.ellipse(donutX, donutY, 10 * zoom, 5.8 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();

      // 5. Ceramic Double Bowls (Makanan & Air Minum)
      const bowlX = catHouseIso.isoX - 16 * zoom;
      const bowlY = catHouseIso.isoY - 2 * zoom;
      // Base tray
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(bowlX - 6 * zoom, bowlY - 3 * zoom, 12 * zoom, 6 * zoom, 3 * zoom);
      ctx.fill();
      // Left bowl: Blue water
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(bowlX - 3 * zoom, bowlY, 2.2 * zoom, 0, Math.PI * 2);
      ctx.fill();
      // Right bowl: Salmon kibbles
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(bowlX + 3 * zoom, bowlY, 2.2 * zoom, 0, Math.PI * 2);
      ctx.fill();

      // Draw Roaming Cat at catRef.current position
      const catState = catRef.current;
      const catIso = toIso(catState.x, catState.z);
      const isFacingRight = catState.facing === 'right';
      const dirMultiplier = isFacingRight ? 1 : -1;

      ctx.save();
      ctx.translate(catIso.isoX, catIso.isoY);

      if (catState.action === 'sleeping') {
        // --- SLEEPING CAT ---
        const catBreath = Math.sin(timeSec * 2) * 1.2 * zoom;
        // Body
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.ellipse(0, -3 * zoom + catBreath, 9.5 * zoom, 7.5 * zoom, -0.2, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(-6 * zoom, -6 * zoom + catBreath, 6 * zoom, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.fillStyle = '#c2410c';
        ctx.beginPath();
        ctx.moveTo(-9.5 * zoom, -10 * zoom + catBreath);
        ctx.lineTo(-6.5 * zoom, -14 * zoom + catBreath);
        ctx.lineTo(-4.5 * zoom, -9 * zoom + catBreath);
        ctx.closePath();
        ctx.fill();
        // Tail
        const tailSwish = Math.sin(timeSec * 2.5) * 4 * zoom;
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 3 * zoom;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(6 * zoom, -2 * zoom);
        ctx.quadraticCurveTo(13 * zoom, -6 * zoom + tailSwish, 11 * zoom, -12 * zoom + tailSwish);
        ctx.stroke();
      } else if (catState.action === 'walking') {
        // --- WALKING CAT ---
        const walkBob = Math.abs(Math.sin(timeSec * 8)) * 1.8 * zoom;
        const pawSwing = Math.sin(timeSec * 8) * 3.5 * zoom;
        // Legs / Paws
        ctx.fillStyle = '#c2410c';
        // Back paws
        ctx.beginPath();
        ctx.arc(-6 * dirMultiplier * zoom - pawSwing, 1 * zoom, 2.2 * zoom, 0, Math.PI * 2);
        ctx.arc(-2 * dirMultiplier * zoom + pawSwing, 1 * zoom, 2.2 * zoom, 0, Math.PI * 2);
        // Front paws
        ctx.arc(3 * dirMultiplier * zoom - pawSwing, 1 * zoom, 2.2 * zoom, 0, Math.PI * 2);
        ctx.arc(7 * dirMultiplier * zoom + pawSwing, 1 * zoom, 2.2 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.ellipse(0, -5 * zoom - walkBob, 10 * zoom, 6.5 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();

        // White belly patch
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.ellipse(0, -4 * zoom - walkBob, 6 * zoom, 3 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(7 * dirMultiplier * zoom, -9 * zoom - walkBob, 5.5 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = '#c2410c';
        ctx.beginPath();
        ctx.moveTo(5 * dirMultiplier * zoom, -13 * zoom - walkBob);
        ctx.lineTo(8 * dirMultiplier * zoom, -17 * zoom - walkBob);
        ctx.lineTo(10 * dirMultiplier * zoom, -12 * zoom - walkBob);
        ctx.closePath();
        ctx.fill();

        // Tail (Upright wagging)
        const tailWag = Math.sin(timeSec * 8) * 4 * zoom;
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 3 * zoom;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-8 * dirMultiplier * zoom, -6 * zoom - walkBob);
        ctx.quadraticCurveTo(-14 * dirMultiplier * zoom, -14 * zoom + tailWag, -11 * dirMultiplier * zoom, -18 * zoom + tailWag);
        ctx.stroke();
      } else if (catState.action === 'sitting') {
        // --- SITTING CAT ---
        const sitBreathe = Math.sin(timeSec * 2.5) * 0.8 * zoom;
        // Body (Upright oval)
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.ellipse(0, -6 * zoom + sitBreathe, 7.5 * zoom, 9.5 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();

        // White chest patch
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.ellipse(0, -4 * zoom + sitBreathe, 4 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(0, -15 * zoom + sitBreathe, 5.8 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = '#c2410c';
        ctx.beginPath();
        ctx.moveTo(-4 * zoom, -18 * zoom + sitBreathe);
        ctx.lineTo(-6 * zoom, -22 * zoom + sitBreathe);
        ctx.lineTo(-1 * zoom, -19 * zoom + sitBreathe);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(1 * zoom, -19 * zoom + sitBreathe);
        ctx.lineTo(6 * zoom, -22 * zoom + sitBreathe);
        ctx.lineTo(4 * zoom, -18 * zoom + sitBreathe);
        ctx.closePath();
        ctx.fill();

        // Front Paws
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.arc(-2.5 * zoom, 1 * zoom, 2.2 * zoom, 0, Math.PI * 2);
        ctx.arc(2.5 * zoom, 1 * zoom, 2.2 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Tail curled around body
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2.8 * zoom;
        ctx.beginPath();
        ctx.arc(0, 0, 8 * zoom, 0, Math.PI * 0.8);
        ctx.stroke();
      } else {
        // --- STRETCHING CAT ---
        // Back high, front low
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.ellipse(-4 * dirMultiplier * zoom, -9 * zoom, 8 * zoom, 6 * zoom, -0.3 * dirMultiplier, 0, Math.PI * 2);
        ctx.fill();

        // Front paws extended forward
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.arc(6 * dirMultiplier * zoom, 0, 2.5 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Head lowered
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(4 * dirMultiplier * zoom, -5 * zoom, 5.2 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Tail arched up high
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 3 * zoom;
        ctx.beginPath();
        ctx.moveTo(-10 * dirMultiplier * zoom, -10 * zoom);
        ctx.quadraticCurveTo(-14 * dirMultiplier * zoom, -18 * zoom, -12 * dirMultiplier * zoom, -21 * zoom);
        ctx.stroke();
      }

      // Cute Meow Bubble (Dynamically measured to avoid any text overflow)
      if (catState.meowText && now < catState.meowUntil) {
        const fontSize = Math.max(8.5, 9 * zoom);
        ctx.font = `bold ${Math.round(fontSize)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textMetrics = ctx.measureText(catState.meowText);
        const textWidth = textMetrics.width;
        const padX = Math.max(9, 8 * zoom);
        const bubbleWidth = textWidth + padX * 2;
        const bubbleHeight = Math.max(16, 17 * zoom);
        const bubbleX = -bubbleWidth / 2;
        const bubbleY = -35 * zoom;
        const radius = Math.min(6 * zoom, bubbleHeight / 2);

        // Speech bubble body + pointer tail pointing to cat
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1.5;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 1.2;

        const tailW = 4 * zoom;
        const tailH = 3.5 * zoom;
        ctx.beginPath();
        ctx.moveTo(bubbleX + radius, bubbleY);
        ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
        ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
        ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
        ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
        ctx.lineTo(tailW, bubbleY + bubbleHeight);
        ctx.lineTo(0, bubbleY + bubbleHeight + tailH);
        ctx.lineTo(-tailW, bubbleY + bubbleHeight);
        ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
        ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
        ctx.lineTo(bubbleX, bubbleY + radius);
        ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Text cleanly centered inside bubble without any overflow
        ctx.fillStyle = '#ea580c';
        ctx.font = `bold ${Math.round(fontSize)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(catState.meowText, 0, bubbleY + bubbleHeight / 2);
      } else if (now < catState.purrUntil || now < catPurrUntil || isCatHovered) {
        // Purring Heart / Snooze Indicator (shown when bubble is not active)
        ctx.fillStyle = '#ec4899';
        ctx.font = `bold ${Math.round(8.5 * zoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐾 Purrr~ ❤️', 0, -22 * zoom);
      }

      ctx.restore();

      // ---------------------------------------------------------
      // ZONE 4: LEAD PRIVATE SUITE (Spacious Top-Right Suite for Highest-Rank Agent)
      // ---------------------------------------------------------
      // Find the highest-ranking agent (Founder & System Architect / Product Lead)
      const leadAgent = agentsRef.current.find(
        (a) => a.role === 'project_manager' || a.id.includes('kenji') || a.id.includes('alex')
      ) || agentsRef.current[0];

      // Grand Executive Desk (X: 11.5, Z: -7.0)
      const bossDeskIso = toIso(11.5, -7.0);
      // Executive Desk shadow
      ctx.fillStyle = 'rgba(40, 20, 10, 0.25)';
      ctx.beginPath();
      ctx.roundRect(bossDeskIso.isoX - 36 * zoom, bossDeskIso.isoY - 10 * zoom, 72 * zoom, 32 * zoom, 8);
      ctx.fill();
      // Refined Walnut Desk Body with sleek titanium border (no yellow/amber)
      ctx.fillStyle = '#3b1c0a';
      ctx.beginPath();
      ctx.roundRect(bossDeskIso.isoX - 34 * zoom, bossDeskIso.isoY - 16 * zoom, 68 * zoom, 30 * zoom, 8);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.8 * zoom;
      ctx.stroke();
      // Luxury leather desktop blotter
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.roundRect(bossDeskIso.isoX - 22 * zoom, bossDeskIso.isoY - 12 * zoom, 44 * zoom, 20 * zoom, 4);
      ctx.fill();

      // Executive Sleek Laptop (Open with cyan code)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(bossDeskIso.isoX - 8 * zoom, bossDeskIso.isoY - 11 * zoom, 16 * zoom, 10 * zoom);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(bossDeskIso.isoX - 7 * zoom, bossDeskIso.isoY - 10 * zoom, 14 * zoom, 8 * zoom);

      // Modern Minimalist Chrome & Emerald Banker Desk Lamp (no yellow)
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(bossDeskIso.isoX + 22 * zoom, bossDeskIso.isoY - 12 * zoom, 3.8 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.ellipse(bossDeskIso.isoX + 22 * zoom, bossDeskIso.isoY - 16 * zoom, 6 * zoom, 3 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();

      // High-back Executive Leather Swivel Chair behind desk
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.roundRect(bossDeskIso.isoX - 12 * zoom, bossDeskIso.isoY - 32 * zoom, 24 * zoom, 24 * zoom, 6);
      ctx.fill();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Potted Luxury Monstera in Window Corner (Replacing old brown containers with fresh greenery)
      const plantIso = toIso(15.0, -11.0);
      // White fluted ceramic planter
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(plantIso.isoX - 8 * zoom, plantIso.isoY - 14 * zoom, 16 * zoom, 16 * zoom, 3);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Lush tropical monstera foliage
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(plantIso.isoX - 6 * zoom, plantIso.isoY - 22 * zoom, 8 * zoom, 0, Math.PI * 2);
      ctx.arc(plantIso.isoX + 6 * zoom, plantIso.isoY - 24 * zoom, 9 * zoom, 0, Math.PI * 2);
      ctx.arc(plantIso.isoX, plantIso.isoY - 30 * zoom, 8.5 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(plantIso.isoX + 2 * zoom, plantIso.isoY - 26 * zoom, 5.5 * zoom, 0, Math.PI * 2);
      ctx.fill();

      // ---------------------------------------------------------
      // ZONE 5: DEDICATED AGENT WORKSTATIONS (SPACIOUS & INDIVIDUAL)
      // ---------------------------------------------------------
      // 8 Individual Desks in Open Workspace (Rows 1-4, Left and Right Wings)
      const deskPositions = [
        // Row 1
        {
          id: 2,
          slotIndex: 1,
          x: 3.6,
          z: -8.0,
          pod: 'purple',
          defaultTitle: '🎨 Rei Kasumi',
          defaultRole: 'Creative Frontend Engineer',
          specialty: 'frontend',
        },
        {
          id: 3,
          slotIndex: 2,
          x: -3.6,
          z: -8.0,
          pod: 'green',
          defaultTitle: '⚡ Damian Vance',
          defaultRole: 'Lead Backend & Cloud',
          specialty: 'backend',
        },
        // Row 2
        {
          id: 4,
          slotIndex: 3,
          x: 3.6,
          z: -3.5,
          pod: 'purple',
          defaultTitle: '🛡️ Yuki Tanaka',
          defaultRole: 'QA & AI Automation',
          specialty: 'qa',
        },
        {
          id: 5,
          slotIndex: 4,
          x: -3.6,
          z: -3.5,
          pod: 'green',
          defaultTitle: '☁️ Cloud Platform',
          defaultRole: 'DevOps & Infrastructure',
          specialty: 'devops',
        },
        // Row 3
        {
          id: 6,
          slotIndex: 5,
          x: 3.6,
          z: 1.2,
          pod: 'purple',
          defaultTitle: '✨ UI/UX Design',
          defaultRole: 'Product & Design Systems',
          specialty: 'design',
        },
        {
          id: 7,
          slotIndex: 6,
          x: -3.6,
          z: 1.2,
          pod: 'green',
          defaultTitle: '🧠 AI Workstation',
          defaultRole: 'AI & Data Science',
          specialty: 'ai',
        },
        // Row 4
        {
          id: 8,
          slotIndex: 7,
          x: 3.6,
          z: 5.6,
          pod: 'purple',
          defaultTitle: '📱 Mobile Workstation',
          defaultRole: 'Mobile & Fullstack',
          specialty: 'mobile',
        },
        {
          id: 9,
          slotIndex: 8,
          x: -3.6,
          z: 5.6,
          pod: 'green',
          defaultTitle: '🔒 Security Ops',
          defaultRole: 'Cybersecurity & Reliability',
          specialty: 'security',
        },
      ];

      deskPositions.forEach((dp) => {
        const dIso = toIso(dp.x, dp.z);
        // Find which agent is assigned to this desk
        const assignedAgent = agentsRef.current.find(
          (a) => Math.hypot(a.deskPosition.x - dp.x, a.deskPosition.z - dp.z) < 1.0
        );

        const agentName = assignedAgent ? assignedAgent.name : dp.defaultTitle;
        const agentRole = assignedAgent ? assignedAgent.roleTitle.split(' ')[0] : dp.defaultRole.split(' ')[0];
        const isOccupied = !!assignedAgent;

        // Spacious Desk Drop Shadow
        ctx.fillStyle = 'rgba(40, 25, 15, 0.16)';
        ctx.beginPath();
        ctx.roundRect(dIso.isoX - 28 * zoom, dIso.isoY - 10 * zoom, 56 * zoom, 28 * zoom, 8);
        ctx.fill();

        // Sleek Light-Oak / Birch Desk Tabletop (Spacious Dimensions)
        ctx.fillStyle = '#f5ebdc';
        ctx.beginPath();
        ctx.roundRect(dIso.isoX - 27 * zoom, dIso.isoY - 14 * zoom, 54 * zoom, 26 * zoom, 6);
        ctx.fill();
        ctx.strokeStyle = isOccupied ? (dp.pod === 'green' ? '#10b981' : '#a855f7') : '#cbd5e1';
        ctx.lineWidth = isOccupied ? 1.8 * zoom : 1.2;
        ctx.stroke();

        // Workstation Monitors & Specialized Persona Gadgets
        if (dp.specialty === 'architect') {
          // Triple Monitor Setup for Founder / Architect
          ctx.fillStyle = '#0f172a';
          // Center main display
          ctx.fillRect(dIso.isoX - 8 * zoom, dIso.isoY - 15 * zoom, 16 * zoom, 11 * zoom);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(dIso.isoX - 6 * zoom, dIso.isoY - 13 * zoom, 12 * zoom, 2 * zoom);
          ctx.fillRect(dIso.isoX - 6 * zoom, dIso.isoY - 9 * zoom, 9 * zoom, 2 * zoom);

          // Left angled monitor
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(dIso.isoX - 24 * zoom, dIso.isoY - 14 * zoom, 13 * zoom, 10 * zoom);
          ctx.fillStyle = '#10b981';
          ctx.fillRect(dIso.isoX - 22 * zoom, dIso.isoY - 12 * zoom, 9 * zoom, 1.8 * zoom);

          // Right angled monitor
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(dIso.isoX + 11 * zoom, dIso.isoY - 14 * zoom, 13 * zoom, 10 * zoom);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(dIso.isoX + 13 * zoom, dIso.isoY - 12 * zoom, 9 * zoom, 1.8 * zoom);

          // Dark ceramic espresso mug & golden paperclip
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.arc(dIso.isoX - 20 * zoom, dIso.isoY - 2 * zoom, 3 * zoom, 0, Math.PI * 2);
          ctx.fill();
        } else if (dp.specialty === 'frontend') {
          // Dual Curved Ultra-wide Monitors for Creative Frontend
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(dIso.isoX - 20 * zoom, dIso.isoY - 14 * zoom, 18 * zoom, 11 * zoom);
          ctx.fillRect(dIso.isoX + 2 * zoom, dIso.isoY - 14 * zoom, 18 * zoom, 11 * zoom);
          // Colorful Tailwind / Three.js UI Preview
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(dIso.isoX - 18 * zoom, dIso.isoY - 12 * zoom, 14 * zoom, 3 * zoom);
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(dIso.isoX + 4 * zoom, dIso.isoY - 12 * zoom, 14 * zoom, 7 * zoom);

          // Wacom drawing tablet with stylus pen
          ctx.fillStyle = '#334155';
          ctx.fillRect(dIso.isoX + 10 * zoom, dIso.isoY - 3 * zoom, 10 * zoom, 7 * zoom);
          // Mini succulent pot plant
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(dIso.isoX - 22 * zoom, dIso.isoY - 2 * zoom, 3.5 * zoom, 0, Math.PI * 2);
          ctx.fill();
        } else if (dp.specialty === 'backend') {
          // Dual Monitors: 1 Vertical Terminal, 1 Horizontal DB Schema
          ctx.fillStyle = '#0f172a';
          // Vertical terminal
          ctx.fillRect(dIso.isoX - 21 * zoom, dIso.isoY - 18 * zoom, 12 * zoom, 15 * zoom);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(dIso.isoX - 19 * zoom, dIso.isoY - 16 * zoom, 8 * zoom, 1.5 * zoom);
          ctx.fillRect(dIso.isoX - 19 * zoom, dIso.isoY - 13 * zoom, 6 * zoom, 1.5 * zoom);
          ctx.fillRect(dIso.isoX - 19 * zoom, dIso.isoY - 10 * zoom, 7 * zoom, 1.5 * zoom);

          // Horizontal main display
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(dIso.isoX - 5 * zoom, dIso.isoY - 14 * zoom, 18 * zoom, 11 * zoom);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(dIso.isoX - 3 * zoom, dIso.isoY - 12 * zoom, 14 * zoom, 2 * zoom);

          // Mini server tower dock with blinking green LED
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(dIso.isoX + 17 * zoom, dIso.isoY - 12 * zoom, 7 * zoom, 13 * zoom);
          const ledBlink = (Math.sin(timeSec * 8) + 1) * 0.5 > 0.4 ? '#22c55e' : '#14532d';
          ctx.fillStyle = ledBlink;
          ctx.beginPath();
          ctx.arc(dIso.isoX + 20.5 * zoom, dIso.isoY - 8 * zoom, 1.2 * zoom, 0, Math.PI * 2);
          ctx.fill();
        } else if (dp.specialty === 'qa') {
          // Dual Clean Displays with Green Checkmarks (Test Runner PASS)
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(dIso.isoX - 18 * zoom, dIso.isoY - 14 * zoom, 16 * zoom, 11 * zoom);
          ctx.fillRect(dIso.isoX + 2 * zoom, dIso.isoY - 14 * zoom, 16 * zoom, 11 * zoom);
          ctx.fillStyle = '#10b981';
          ctx.fillRect(dIso.isoX - 16 * zoom, dIso.isoY - 12 * zoom, 12 * zoom, 2.5 * zoom);
          ctx.fillRect(dIso.isoX + 4 * zoom, dIso.isoY - 12 * zoom, 12 * zoom, 2.5 * zoom);

          // Cute Mini Cat Figurine "Mochi Jr" on Yuki's Desk
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.arc(dIso.isoX + 18 * zoom, dIso.isoY - 2 * zoom, 3 * zoom, 0, Math.PI * 2);
          ctx.fill();
          // Matcha green tea cup
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(dIso.isoX - 21 * zoom, dIso.isoY - 2 * zoom, 2.8 * zoom, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Standard Dual High-Res Workstation for Expansion Desks
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(dIso.isoX - 18 * zoom, dIso.isoY - 13 * zoom, 16 * zoom, 10 * zoom);
          ctx.fillRect(dIso.isoX + 2 * zoom, dIso.isoY - 13 * zoom, 16 * zoom, 10 * zoom);
          ctx.fillStyle = dp.pod === 'green' ? '#38bdf8' : '#ec4899';
          ctx.fillRect(dIso.isoX - 16 * zoom, dIso.isoY - 10 * zoom, 10 * zoom, 1.5 * zoom);
          ctx.fillRect(dIso.isoX + 4 * zoom, dIso.isoY - 10 * zoom, 10 * zoom, 1.5 * zoom);
        }

        // Ergonomic High-Back Swivel Chair behind desk
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(dIso.isoX, dIso.isoY + 12 * zoom, 8 * zoom, 4.5 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // ---------------------------------------------------------
      // ZONE 6: SPRINT STATION (Spacious Bottom-Right Pavilion)
      // ---------------------------------------------------------
      // Large Round Conference Table (X: 11.5, Z: 6.0)
      const confIso = toIso(11.5, 6.0);
      // Table shadow
      ctx.fillStyle = 'rgba(40, 25, 15, 0.2)';
      ctx.beginPath();
      ctx.ellipse(confIso.isoX, confIso.isoY + 5 * zoom, 46 * zoom, 25 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      // Table top (Warm Teakwood)
      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.ellipse(confIso.isoX, confIso.isoY, 44 * zoom, 23 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 2.4 * zoom;
      ctx.stroke();

      // Ergonomic Swivel Chairs around Conference Table
      const chairAngles = [0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9, 5.6];
      chairAngles.forEach((ang) => {
        const cx = confIso.isoX + Math.cos(ang) * 46 * zoom;
        const cy = confIso.isoY + Math.sin(ang) * 24 * zoom;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 6 * zoom, 3.8 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Glowing Circular Holographic Emitter in Center of Table
      ctx.fillStyle = '#0891b2';
      ctx.beginPath();
      ctx.ellipse(confIso.isoX, confIso.isoY, 14 * zoom, 7 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2 * zoom;
      ctx.stroke();

      // Floating, Rotating 3D Cyan Wireframe Cube Hologram
      const holoSpin = timeSec * 1.5;
      const holoBobConf = Math.sin(timeSec * 3) * 3 * zoom;
      const cubeCenterY = confIso.isoY - 26 * zoom + holoBobConf;
      const cubeSize = 11 * zoom;

      // Hologram Light Cone
      const confCone = ctx.createLinearGradient(confIso.isoX, confIso.isoY, confIso.isoX, cubeCenterY);
      confCone.addColorStop(0, 'rgba(6, 182, 212, 0.55)');
      confCone.addColorStop(1, 'rgba(34, 211, 238, 0.05)');
      ctx.fillStyle = confCone;
      ctx.beginPath();
      ctx.moveTo(confIso.isoX - 14 * zoom, confIso.isoY);
      ctx.lineTo(confIso.isoX + 14 * zoom, confIso.isoY);
      ctx.lineTo(confIso.isoX + 16 * zoom, cubeCenterY + cubeSize);
      ctx.lineTo(confIso.isoX - 16 * zoom, cubeCenterY + cubeSize);
      ctx.closePath();
      ctx.fill();

      // Rotating Wireframe Cube
      ctx.save();
      ctx.translate(confIso.isoX, cubeCenterY);
      ctx.rotate(holoSpin * 0.5);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.6 * zoom;
      ctx.strokeRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize);
      ctx.strokeRect(-cubeSize / 3, -cubeSize / 3, cubeSize, cubeSize);
      ctx.beginPath();
      ctx.moveTo(-cubeSize / 2, -cubeSize / 2);
      ctx.lineTo(-cubeSize / 3, -cubeSize / 3);
      ctx.moveTo(cubeSize / 2, -cubeSize / 2);
      ctx.lineTo(cubeSize * 2 / 3, -cubeSize / 3);
      ctx.stroke();
      ctx.restore();

      // Mobile Rolling Whiteboard labeled "SPRINT STATION" (X: 14.5, Z: 3.5)
      const wbIso = toIso(14.5, 3.5);
      // Board frame
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(wbIso.isoX - 36 * zoom, wbIso.isoY - 38 * zoom, 72 * zoom, 34 * zoom, 4);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2 * zoom;
      ctx.stroke();
      // Stand & Caster Wheels
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wbIso.isoX - 24 * zoom, wbIso.isoY - 4 * zoom);
      ctx.lineTo(wbIso.isoX - 24 * zoom, wbIso.isoY + 6 * zoom);
      ctx.moveTo(wbIso.isoX + 24 * zoom, wbIso.isoY - 4 * zoom);
      ctx.lineTo(wbIso.isoX + 24 * zoom, wbIso.isoY + 6 * zoom);
      ctx.stroke();

      // Colorful Sticky Notes (pink, yellow, green, orange, cyan)
      const stickyCols = ['#f43f5e', '#facc15', '#22c55e', '#fb923c', '#06b6d4'];
      for (let sc = 0; sc < 8; sc++) {
        const sx = wbIso.isoX - 25 * zoom + (sc % 4) * 13 * zoom;
        const sy = wbIso.isoY - 26 * zoom + Math.floor(sc / 4) * 11 * zoom;
        ctx.fillStyle = stickyCols[sc % stickyCols.length];
        ctx.fillRect(sx, sy, 9 * zoom, 8 * zoom);
      }

      // =========================================================
      // 7. WALKING TRACK & FOOTPRINTS
      // =========================================================
      if (showTracks) {
        footprintsRef.current.forEach((fp) => {
          const age = now - fp.timestamp;
          const alpha = Math.max(0, 1 - age / 3800) * 0.75;
          if (alpha <= 0.02) return;

          const pt = toIso(fp.x, fp.z);
          const sideOffset = fp.side === 'left' ? -3.5 * zoom : 3.5 * zoom;
          const perpAngle = fp.angle + Math.PI / 2;
          const fx = pt.isoX + Math.cos(perpAngle) * sideOffset;
          const fy = pt.isoY + Math.sin(perpAngle) * sideOffset;

          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(fp.angle + 0.6);

          ctx.fillStyle = `rgba(180, 83, 9, ${alpha * 0.7})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, 3.5 * zoom, 2.2 * zoom, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(217, 119, 6, ${alpha * 0.8})`;
          [-2, 0, 2].forEach((tx) => {
            ctx.beginPath();
            ctx.arc(tx * zoom, -3.2 * zoom, 1 * zoom, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        });
      }

      // =========================================================
      // 8. RENDER AGENT CHARACTERS (CHIBI ANIME & ROBOT AGENTS)
      // =========================================================
      const screenAgents = updatedAgents.map((agent) => {
        const { isoX, isoY } = toIso(agent.currentPosition.x, agent.currentPosition.z);
        return {
          agent,
          renderX: isoX,
          renderY: isoY,
          facing: agent.facingDirection || 'front',
        };
      });

      // Sort by isometric Y depth so foreground agents render in front
      screenAgents.sort((a, b) => a.renderY - b.renderY);

      screenAgents.forEach(({ agent, renderX, renderY, facing }) => {
        const isSelected = agent.id === selectedAgentId;
        const isHovered = hoveredAgent?.id === agent.id;

        // Ground shadow
        ctx.fillStyle = 'rgba(40, 25, 15, 0.22)';
        ctx.beginPath();
        ctx.ellipse(renderX, renderY, 15 * zoom, 7.5 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();

        // Selected / Hovered pulse ring
        if (isSelected || isHovered) {
          ctx.strokeStyle = isSelected ? '#ec4899' : '#0284c7';
          ctx.lineWidth = 3 * zoom;
          ctx.beginPath();
          ctx.ellipse(
            renderX,
            renderY,
            (20 + Math.sin(timeSec * 4) * 2.5) * zoom,
            (10 + Math.sin(timeSec * 4) * 1.2) * zoom,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }

        // Bouncy movement & gestures
        const isWalking = agent.state === 'walking';
        const isTalking = agent.state === 'talking';
        const walkBounce = isWalking ? Math.abs(Math.sin(timeSec * 7)) * 3.8 * zoom : 0;
        const walkSway = isWalking ? Math.sin(timeSec * 7) * 0.08 : 0;
        const talkBounce = isTalking ? Math.sin(timeSec * 5) * 1.2 * zoom : 0;
        const workTyping = agent.state === 'working' ? Math.sin(timeSec * 8) * 0.8 * zoom : 0;
        const charY = renderY - 12 * zoom - walkBounce + talkBounce;

        ctx.save();
        ctx.translate(renderX, charY);
        ctx.rotate(walkSway);

        // Gender & Styling
        const isFemale =
          agent.gender === 'female' ||
          ['Rei', 'Yuki', 'Maya', 'Elena', 'Chloe', 'Sarah', 'Aurora', 'Sofia', 'Aria'].some((fn) =>
            agent.name.includes(fn)
          );

        const hairColor = agent.hairColor || (isFemale ? '#ec4899' : '#0f172a');
        const eyeColor = agent.eyeColor || (isFemale ? '#9333ea' : '#1e293b');
        const headShift = facing === 'right' ? 1.5 * zoom : facing === 'left' ? -1.5 * zoom : 0;
        const headY = -25 * zoom;

        // Female Hair Behind Body (Graceful long/medium hair, statis & rapi, tidak gerak-gerak seperti tangan)
        if (isFemale) {
          ctx.fillStyle = hairColor;
          // Rambut belakang mengalir anggun di belakang kepala dan bahu
          ctx.beginPath();
          ctx.ellipse(headShift, headY + 4 * zoom, 13.5 * zoom, 15 * zoom, 0, 0, Math.PI * 2);
          ctx.fill();

          // Sisi rambut jatuh alami membingkai wajah (side bangs - statis dan elegan)
          ctx.beginPath();
          ctx.ellipse(-10 * zoom + headShift, headY + 5 * zoom, 3.2 * zoom, 8 * zoom, 0.08, 0, Math.PI * 2);
          ctx.ellipse(10 * zoom + headShift, headY + 5 * zoom, 3.2 * zoom, 8 * zoom, -0.08, 0, Math.PI * 2);
          ctx.fill();
        }

        // Chibi Torso
        ctx.fillStyle = agent.shirtColor || '#3b82f6';
        ctx.beginPath();
        ctx.roundRect(-11 * zoom, -14 * zoom, 22 * zoom, 16 * zoom, 6 * zoom);
        ctx.fill();

        // White collar
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-4 * zoom, -14 * zoom);
        ctx.lineTo(0, -9 * zoom);
        ctx.lineTo(4 * zoom, -14 * zoom);
        ctx.closePath();
        ctx.fill();

        // Chibi Head
        ctx.fillStyle = agent.skinColor || '#fcd34d';
        ctx.beginPath();
        ctx.arc(headShift, headY, 11 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Rosy Cheeks
        ctx.fillStyle = isFemale ? 'rgba(255, 99, 132, 0.65)' : 'rgba(255, 120, 140, 0.42)';
        ctx.beginPath();
        ctx.ellipse(-6.5 * zoom + headShift, headY + 3.2 * zoom, 3 * zoom, 2 * zoom, 0, 0, Math.PI * 2);
        ctx.ellipse(6.5 * zoom + headShift, headY + 3.2 * zoom, 3 * zoom, 2 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();

        // Expressive Eyes
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(-4.5 * zoom + headShift, headY + 0.5 * zoom, 2.4 * zoom, 0, Math.PI * 2);
        ctx.arc(4.5 * zoom + headShift, headY + 0.5 * zoom, 2.4 * zoom, 0, Math.PI * 2);
        ctx.fill();
        // Eye sparkles
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-5.2 * zoom + headShift, headY - 0.2 * zoom, 1 * zoom, 0, Math.PI * 2);
        ctx.arc(3.8 * zoom + headShift, headY - 0.2 * zoom, 1 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Hair Cap & Bangs (Poni Depan Chibi)
        ctx.fillStyle = hairColor;
        ctx.beginPath();
        ctx.arc(headShift, headY - 2 * zoom, 11.5 * zoom, Math.PI * 0.85, Math.PI * 2.15);
        ctx.fill();

        if (isFemale) {
          // Poni depan wanita melengkung manis (Cute Chibi Bangs)
          ctx.beginPath();
          ctx.arc(headShift - 3.5 * zoom, headY - 3 * zoom, 7.5 * zoom, 0, Math.PI * 0.7);
          ctx.arc(headShift + 3.5 * zoom, headY - 3 * zoom, 7.5 * zoom, Math.PI * 0.3, Math.PI);
          ctx.fill();

          // Jepit rambut mungil (Hairpin)
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.roundRect(-8 * zoom + headShift, headY - 6.5 * zoom, 4.2 * zoom, 2 * zoom, 1 * zoom);
          ctx.fill();

          // Highlight rambut anime (Hair gloss)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1.5 * zoom;
          ctx.beginPath();
          ctx.arc(headShift, headY - 4 * zoom, 9.5 * zoom, Math.PI * 1.2, Math.PI * 1.5);
          ctx.stroke();
        } else {
          // Poni pria rapi
          ctx.beginPath();
          ctx.arc(headShift, headY - 3 * zoom, 10.5 * zoom, Math.PI * 0.9, Math.PI * 1.9);
          ctx.fill();
        }

        // Hands & typing animation
        ctx.fillStyle = agent.skinColor || '#fcd34d';
        if (agent.state === 'working') {
          ctx.beginPath();
          ctx.arc(-7 * zoom, 2 * zoom + workTyping, 2.8 * zoom, 0, Math.PI * 2);
          ctx.arc(7 * zoom, 2 * zoom - workTyping, 2.8 * zoom, 0, Math.PI * 2);
          ctx.fill();
        } else if (agent.state === 'coffee_break') {
          // Holding coffee mug
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(-4 * zoom, -2 * zoom, 8 * zoom, 7 * zoom, 2);
          ctx.fill();
          ctx.fillStyle = '#92400e';
          ctx.fillRect(-3 * zoom, -1 * zoom, 6 * zoom, 2 * zoom);
        } else if (agent.state === 'playing_game') {
          // Rapid arcade joystick & button pressing
          const arcadeTapping = Math.sin(timeSec * 16) * 1.5 * zoom;
          ctx.fillStyle = '#ef4444'; // Red joystick ball in hand
          ctx.beginPath();
          ctx.arc(-6 * zoom, 1 * zoom + arcadeTapping, 2.5 * zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = agent.skinColor || '#fcd34d';
          ctx.beginPath();
          ctx.arc(6 * zoom, 1 * zoom - arcadeTapping, 2.8 * zoom, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Calm resting hands on desk
          ctx.beginPath();
          ctx.arc(-7 * zoom, 2.5 * zoom, 2.5 * zoom, 0, Math.PI * 2);
          ctx.arc(7 * zoom, 2.5 * zoom, 2.5 * zoom, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // --- CUTE NAME BADGE PILL ---
        ctx.save();
        const tagY = charY - 48 * zoom;
        const genderSymbol = isFemale ? '♀' : '♂';
        const nameText = `${agent.name.split(' ')[0]} ${genderSymbol}`;
        ctx.font = `bold ${Math.round(9.5 * zoom)}px sans-serif`;
        const nameWidth = ctx.measureText(nameText).width;

        let roleEmoji = '💻';
        if (agent.role.includes('manager')) roleEmoji = '📋';
        if (agent.role.includes('designer')) roleEmoji = '🎨';
        if (agent.role.includes('writer')) roleEmoji = '✍️';
        if (agent.role.includes('qa')) roleEmoji = '🛡️';
        if (agent.state === 'walking') roleEmoji = '🚶';
        if (agent.state === 'coffee_break') roleEmoji = '☕';
        if (agent.state === 'playing_game') roleEmoji = '👾';
        if (agent.state === 'talking') roleEmoji = '💬';
        if (agent.state === 'meeting') roleEmoji = '📊';
        if (agent.state === 'seeking_approval') roleEmoji = '⚠️';
        if (agent.state === 'idle') roleEmoji = '✨';

        const tagW = nameWidth + 24 * zoom;
        const tagH = 16 * zoom;

        // Badge shadow & pill
        ctx.fillStyle = 'rgba(40, 25, 15, 0.16)';
        ctx.beginPath();
        ctx.roundRect(renderX - tagW / 2, tagY + 2, tagW, tagH, 8 * zoom);
        ctx.fill();

        ctx.fillStyle = isSelected ? '#ec4899' : '#ffffff';
        ctx.strokeStyle = isSelected ? '#db2777' : '#e2d5c3';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(renderX - tagW / 2, tagY, tagW, tagH, 8 * zoom);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isSelected ? '#ffffff' : (isFemale ? '#831843' : '#1e293b');
        ctx.textAlign = 'left';
        ctx.fillText(nameText, renderX - tagW / 2 + 7 * zoom, tagY + 11.5 * zoom);

        ctx.font = `${Math.round(9 * zoom)}px sans-serif`;
        ctx.fillText(roleEmoji, renderX + tagW / 2 - 13 * zoom, tagY + 11.5 * zoom);

        // --- PLAYFUL ACTIVITY BUBBLE (MATCHING IMAGE_0.JPG: 🎵, !, ☕, 💻, 🕹️) ---
        let activityEmoji = '';
        if (agent.state === 'working') {
          activityEmoji = agent.role.includes('qa') ? '!' : '🎵';
        } else if (agent.state === 'coffee_break') {
          activityEmoji = '☕';
        } else if (agent.state === 'playing_game') {
          activityEmoji = '🕹️';
        } else if (agent.state === 'talking') {
          activityEmoji = '💬';
        } else if (agent.state === 'meeting') {
          activityEmoji = '📊';
        }

        if (activityEmoji && !agent.activeDialog) {
          const actBubbleY = tagY - 18 * zoom;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(renderX, actBubbleY, 8 * zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = activityEmoji === '!' ? '#ef4444' : '#6366f1';
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.fillStyle = activityEmoji === '!' ? '#ef4444' : '#4f46e5';
          ctx.font = `bold ${Math.round(9 * zoom)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(activityEmoji, renderX, actBubbleY + 3.2 * zoom);
        }

        // --- ACTIVE TASK PROGRESS PILL ---
        if (agent.state === 'working' && agent.currentTaskId) {
          const activeTask = tasksRef.current.find((t) => t.id === agent.currentTaskId);
          if (activeTask && activeTask.status === 'in_progress') {
            const pct = Math.round(activeTask.progress);
            const pillW = 54 * zoom;
            const pillH = 14 * zoom;
            const pillY = tagY - 17 * zoom;

            ctx.fillStyle = '#064e3b';
            ctx.beginPath();
            ctx.roundRect(renderX - pillW / 2, pillY, pillW, pillH, 7 * zoom);
            ctx.fill();
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.roundRect(
              renderX - pillW / 2 + 1.5 * zoom,
              pillY + 1.5 * zoom,
              Math.max(4 * zoom, (pillW - 3 * zoom) * (pct / 100)),
              pillH - 3 * zoom,
              5 * zoom
            );
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(8 * zoom)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(`⚡ ${pct}%`, renderX, pillY + 10 * zoom);
          }
        }

        // --- SPEECH BUBBLE WITH CATEGORY HIGHLIGHT ---
        if (agent.activeDialog) {
          const msg = agent.activeDialog.message;
          const catTag = agent.activeDialog.categoryTag;
          const tagColor = agent.activeDialog.tagColor || (agent.state === 'seeking_approval' ? '#f97316' : '#94a3b8');

          ctx.font = `bold ${Math.round(8.8 * zoom)}px sans-serif`;
          const maxTextW = 210 * zoom;
          let displayMsg = msg;
          if (ctx.measureText(displayMsg).width > maxTextW) {
            while (ctx.measureText(displayMsg + '...').width > maxTextW && displayMsg.length > 5) {
              displayMsg = displayMsg.slice(0, -1);
            }
            displayMsg = displayMsg.trim() + '...';
          }
          const textW = ctx.measureText(displayMsg).width;
          const tagW = catTag ? ctx.measureText(catTag).width + 16 * zoom : 0;
          const bubbleH = catTag ? 31 * zoom : 20 * zoom;
          const msgW = Math.max(tagW + 22 * zoom, textW + 22 * zoom);

          const bubbleOffsetX = facing === 'right' ? -22 * zoom : facing === 'left' ? 22 * zoom : 0;
          const bubbleCenterX = renderX + bubbleOffsetX;
          const bubbleY = tagY - (catTag ? 36 * zoom : 24 * zoom);

          // Shadow
          ctx.fillStyle = 'rgba(40, 25, 15, 0.18)';
          ctx.beginPath();
          ctx.roundRect(bubbleCenterX - msgW / 2, bubbleY + 2, msgW, bubbleH, 8 * zoom);
          ctx.fill();

          // Body
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = tagColor;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.roundRect(bubbleCenterX - msgW / 2, bubbleY, msgW, bubbleH, 8 * zoom);
          ctx.fill();
          ctx.stroke();

          // Category Tag
          if (catTag) {
            ctx.fillStyle = tagColor;
            ctx.beginPath();
            ctx.roundRect(bubbleCenterX - tagW / 2, bubbleY + 3.5 * zoom, tagW, 11 * zoom, 5 * zoom);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(7.5 * zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(catTag, bubbleCenterX, bubbleY + 11.5 * zoom);
          }

          // Tail
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(renderX - 4 * zoom, bubbleY + bubbleH);
          ctx.lineTo(renderX + 4 * zoom, bubbleY + bubbleH);
          ctx.lineTo(renderX, bubbleY + bubbleH + 5 * zoom);
          ctx.closePath();
          ctx.fill();

          // Text
          ctx.fillStyle = '#1e293b';
          ctx.font = `bold ${Math.round(8.8 * zoom)}px sans-serif`;
          ctx.textAlign = 'center';
          const textY = catTag ? bubbleY + 23.5 * zoom : bubbleY + 13 * zoom;
          ctx.fillText(displayMsg, bubbleCenterX, textY);
        }

        ctx.restore();
      });

      // =========================================================
      // 8. FRONT BOULEVARD: HIGHWAY, SIDEWALK, PARKED & DRIVING CARS
      // =========================================================
      // 1. Sidewalk & Curb (Pedestrian promenade in front of office)
      const swTL = toIso(-26.0, 15.6);
      const swTR = toIso(24.0, 15.6);
      const swBR = toIso(24.0, 17.2);
      const swBL = toIso(-26.0, 17.2);

      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(swTL.isoX, swTL.isoY);
      ctx.lineTo(swTR.isoX, swTR.isoY);
      ctx.lineTo(swBR.isoX, swBR.isoY);
      ctx.lineTo(swBL.isoX, swBL.isoY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1 * zoom;
      ctx.stroke();

      // Granite curb stone edge
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2 * zoom;
      ctx.beginPath();
      ctx.moveTo(swBL.isoX, swBL.isoY);
      ctx.lineTo(swBR.isoX, swBR.isoY);
      ctx.stroke();

      // 2. Highway Asphalt Surface (Two-lane avenue + parking strip)
      const roadTL = toIso(-26.0, 17.2);
      const roadTR = toIso(24.0, 17.2);
      const roadBR = toIso(24.0, 22.8);
      const roadBL = toIso(-26.0, 22.8);

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(roadTL.isoX, roadTL.isoY);
      ctx.lineTo(roadTR.isoX, roadTR.isoY);
      ctx.lineTo(roadBR.isoX, roadBR.isoY);
      ctx.lineTo(roadBL.isoX, roadBL.isoY);
      ctx.closePath();
      ctx.fill();

      // Outer road curb
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5 * zoom;
      ctx.beginPath();
      ctx.moveTo(roadBL.isoX, roadBL.isoY);
      ctx.lineTo(roadBR.isoX, roadBR.isoY);
      ctx.stroke();

      // 3. Double Solid/Dashed Yellow Center Divider Line (wz = 20.6)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.6 * zoom;
      ctx.setLineDash([8 * zoom, 6 * zoom]);
      const divL = toIso(-26.0, 20.6);
      const divR = toIso(24.0, 20.6);
      ctx.beginPath();
      ctx.moveTo(divL.isoX, divL.isoY);
      ctx.lineTo(divR.isoX, divR.isoY);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // 4. White Parking Stalls (wz = 17.2 to 18.8)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.2 * zoom;
      const stallXCoords = [-15.0, -11.0, -7.0, -3.0, 5.0, 9.0, 13.0, 17.0];
      stallXCoords.forEach((sx) => {
        const pStart = toIso(sx, 17.2);
        const pEnd = toIso(sx, 18.8);
        ctx.beginPath();
        ctx.moveTo(pStart.isoX, pStart.isoY);
        ctx.lineTo(pEnd.isoX, pEnd.isoY);
        ctx.stroke();
      });
      // Parking boundary line parallel to road
      const parkEdgeL = toIso(-26.0, 18.8);
      const parkEdgeR = toIso(24.0, 18.8);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1 * zoom;
      ctx.beginPath();
      ctx.moveTo(parkEdgeL.isoX, parkEdgeL.isoY);
      ctx.lineTo(parkEdgeR.isoX, parkEdgeR.isoY);
      ctx.stroke();

      // 5. Pedestrian Zebra Crosswalk at Office Main Entrance (wx = -1.8 to +1.8, wz = 17.2..22.8)
      ctx.fillStyle = '#ffffff';
      for (let zx = -1.6; zx <= 1.6; zx += 0.65) {
        const zw1 = toIso(zx - 0.2, 17.3);
        const zw2 = toIso(zx + 0.2, 17.3);
        const zw3 = toIso(zx + 0.2, 22.7);
        const zw4 = toIso(zx - 0.2, 22.7);
        ctx.beginPath();
        ctx.moveTo(zw1.isoX, zw1.isoY);
        ctx.lineTo(zw2.isoX, zw2.isoY);
        ctx.lineTo(zw3.isoX, zw3.isoY);
        ctx.lineTo(zw4.isoX, zw4.isoY);
        ctx.closePath();
        ctx.fill();
      }

      // 6. Modern Solar LED Streetlights along Sidewalk
      [-18.0, -5.0, 12.0].forEach((slx) => {
        const slIso = toIso(slx, 16.0);
        // Base plate
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.ellipse(slIso.isoX, slIso.isoY, 3 * zoom, 1.8 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();
        // Slender curved pole
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2 * zoom;
        ctx.beginPath();
        ctx.moveTo(slIso.isoX, slIso.isoY);
        ctx.lineTo(slIso.isoX, slIso.isoY - 32 * zoom);
        ctx.quadraticCurveTo(slIso.isoX, slIso.isoY - 40 * zoom, slIso.isoX + 7 * zoom, slIso.isoY - 38 * zoom);
        ctx.stroke();
        // LED lamp head
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(slIso.isoX + 4 * zoom, slIso.isoY - 39 * zoom, 7 * zoom, 3 * zoom);
        // Warm LED glow
        ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
        ctx.beginPath();
        ctx.ellipse(slIso.isoX + 6 * zoom, slIso.isoY, 14 * zoom, 7 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // 7. Authentic 3D Isometric Car Drawing Engine
      // Correctly projected into 2:1 isometric world space matching road heading and lighting.
      const drawIsometricCar = (
        carX: number,
        carZ: number,
        carColor: string,
        direction: 'down_right' | 'up_left',
        carType: 'sedan' | 'sports' | 'suv' | 'taxi' | 'van' = 'sedan',
        isMoving: boolean = false
      ) => {
        const cIso = toIso(carX, carZ);
        const isDR = direction === 'down_right';
        const bounce = isMoving ? Math.sin(timeSec * 16 + carX * 2.5) * 0.45 : 0;

        // Coordinate transformation helpers:
        // 1. Road surface projection (on asphalt plane, no vertical suspension bounce)
        const projRoad = (u: number, v: number) => {
          const wxOff = isDR ? u : -u;
          const wzOff = v; // +v is towards viewer (+wz)
          return {
            x: cIso.isoX + (wxOff - wzOff) * (30 * zoom),
            y: cIso.isoY + (wxOff + wzOff) * (16 * zoom),
          };
        };

        // 2. 3D Isometric vertex projection with height and suspension bounce
        const proj = (u: number, v: number, h: number = 0) => {
          const wxOff = isDR ? u : -u;
          const wzOff = v;
          return {
            x: cIso.isoX + (wxOff - wzOff) * (30 * zoom),
            y: cIso.isoY + (wxOff + wzOff) * (16 * zoom) - ((h + bounce) * zoom),
          };
        };

        // Polygon drawing helper
        const drawPoly = (pts: { x: number; y: number }[], fillColor: string | CanvasGradient, strokeColor?: string, strokeW: number = 1) => {
          if (pts.length < 3) return;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
          ctx.fillStyle = fillColor;
          ctx.fill();
          if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeW;
            ctx.stroke();
          }
        };

        // Vehicle specifications per type
        let L = 1.48; // total length
        let vW = 0.32; // half-width
        let uF = 0.74; // front bumper
        let uH = 0.24; // hood / base of windshield
        let uCF = 0.08; // cabin front / roof top
        let uCR = -0.32; // cabin rear / roof rear
        let uTR = -0.48; // trunk / base of rear window
        let uR = -0.74; // rear bumper
        let hBase = 2.0; // rocker sill height
        let hBelt = 7.5; // waistline / hood height
        let hRoof = 15.0; // roof height
        let hTrunk = 7.2; // trunk height

        if (carType === 'sports') {
          L = 1.44;
          vW = 0.34;
          uF = 0.72;
          uH = 0.28;
          uCF = 0.10;
          uCR = -0.26;
          uTR = -0.42;
          uR = -0.72;
          hBase = 1.8;
          hBelt = 6.2;
          hRoof = 12.8;
          hTrunk = 6.2;
        } else if (carType === 'suv') {
          L = 1.56;
          vW = 0.36;
          uF = 0.78;
          uH = 0.26;
          uCF = 0.10;
          uCR = -0.52;
          uTR = -0.66;
          uR = -0.78;
          hBase = 3.2;
          hBelt = 9.8;
          hRoof = 18.2;
          hTrunk = 16.5;
        } else if (carType === 'van') {
          L = 1.64;
          vW = 0.36;
          uF = 0.82;
          uH = 0.55;
          uCF = 0.44;
          uCR = -0.72;
          uTR = -0.78;
          uR = -0.82;
          hBase = 2.6;
          hBelt = 10.2;
          hRoof = 19.8;
          hTrunk = 19.8;
        } else if (carType === 'taxi') {
          L = 1.48;
          vW = 0.32;
          uF = 0.74;
          uH = 0.24;
          uCF = 0.08;
          uCR = -0.32;
          uTR = -0.48;
          uR = -0.74;
          hBase = 2.0;
          hBelt = 7.5;
          hRoof = 15.0;
          hTrunk = 7.2;
        }

        // 1. Soft Isometric Ground Contact Shadow (oriented along road axis)
        const shadowCorners = [
          projRoad(-L * 0.52, -vW * 1.15),
          projRoad(L * 0.54, -vW * 1.15),
          projRoad(L * 0.54, vW * 1.25),
          projRoad(-L * 0.52, vW * 1.25),
        ];
        drawPoly(shadowCorners, 'rgba(15, 23, 42, 0.40)');

        // 2. Headlight Beams & Light Projection on Asphalt (pointing strictly along forward travel path)
        if (isMoving) {
          const beamStartL = projRoad(uF, -vW * 0.55);
          const beamStartR = projRoad(uF, vW * 0.55);
          const beamEndL = projRoad(uF + 3.2, -vW * 1.8);
          const beamEndR = projRoad(uF + 3.2, vW * 2.2);
          const beamStartMid = projRoad(uF, 0);
          const beamEndMid = projRoad(uF + 3.2, 0);

          const beamGrad = ctx.createLinearGradient(beamStartMid.x, beamStartMid.y, beamEndMid.x, beamEndMid.y);
          beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
          beamGrad.addColorStop(0.35, 'rgba(254, 240, 138, 0.22)');
          beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0.0)');

          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(beamStartL.x, beamStartL.y);
          ctx.lineTo(beamEndL.x, beamEndL.y);
          ctx.lineTo(beamEndR.x, beamEndR.y);
          ctx.lineTo(beamStartR.x, beamStartR.y);
          ctx.closePath();
          ctx.fill();

          // Taillight red road reflection behind car
          const redStartMid = projRoad(uR, 0);
          const redEndMid = projRoad(uR - 0.9, 0);
          const redGrad = ctx.createLinearGradient(redStartMid.x, redStartMid.y, redEndMid.x, redEndMid.y);
          redGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
          redGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
          const redCorners = [
            projRoad(uR, -vW * 0.5),
            projRoad(uR - 0.8, -vW * 0.9),
            projRoad(uR - 0.8, vW * 0.9),
            projRoad(uR, vW * 0.5),
          ];
          drawPoly(redCorners, redGrad);
        }

        // 3. Far side wheels (partially visible under carriage)
        const wheelR = (carType === 'suv' || carType === 'van') ? 4.5 * zoom : 3.8 * zoom;
        const uW_Front = uF - 0.28;
        const uW_Rear = uR + 0.28;
        [uW_Front, uW_Rear].forEach((uw) => {
          const ptFar = projRoad(uw, -vW * 0.85);
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(ptFar.x, ptFar.y - 1.5 * zoom, wheelR * 0.7, wheelR * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        });

        // 4. Undercarriage & dark rocker panels
        const rockerCorners = [
          proj(uR, -vW * 0.9, 0),
          proj(uF, -vW * 0.9, 0),
          proj(uF, vW * 0.9, hBase),
          proj(uR, vW * 0.9, hBase),
        ];
        drawPoly(rockerCorners, '#0f172a');

        // 5. Main Body Panels (Isometric 3D Surfaces)
        // A. Front Hood Top Surface
        const hoodPoly = [
          proj(uF, -vW * 0.85, hBelt * 0.95),
          proj(uF, vW * 0.85, hBelt * 0.95),
          proj(uH, vW * 0.90, hBelt),
          proj(uH, -vW * 0.90, hBelt),
        ];
        drawPoly(hoodPoly, carColor, 'rgba(0, 0, 0, 0.15)', 0.8);
        drawPoly(hoodPoly, 'rgba(255, 255, 255, 0.18)'); // sunlit gloss

        // B. Front Windshield
        const windshieldPoly = [
          proj(uH, -vW * 0.88, hBelt),
          proj(uH, vW * 0.88, hBelt),
          proj(uCF, vW * 0.80, hRoof),
          proj(uCF, -vW * 0.80, hRoof),
        ];
        drawPoly(windshieldPoly, 'rgba(186, 230, 253, 0.90)', 'rgba(15, 23, 42, 0.35)', 1);
        // Specular reflection line across windshield
        const glStart = proj(uH * 0.5 + uCF * 0.5, -vW * 0.4, hBelt * 0.5 + hRoof * 0.5);
        const glEnd = proj(uH * 0.2 + uCF * 0.8, vW * 0.3, hBelt * 0.2 + hRoof * 0.8);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1.2 * zoom;
        ctx.beginPath();
        ctx.moveTo(glStart.x, glStart.y);
        ctx.lineTo(glEnd.x, glEnd.y);
        ctx.stroke();

        // C. Roof Top Surface
        const roofPoly = [
          proj(uCF, -vW * 0.80, hRoof),
          proj(uCF, vW * 0.80, hRoof),
          proj(uCR, vW * 0.80, hRoof),
          proj(uCR, -vW * 0.80, hRoof),
        ];
        drawPoly(roofPoly, carColor, 'rgba(0, 0, 0, 0.18)', 0.8);
        drawPoly(roofPoly, 'rgba(255, 255, 255, 0.25)'); // roof highlight

        // D. Rear Window & Trunk
        if (carType !== 'van') {
          // Rear window glass
          const rearWinPoly = [
            proj(uCR, -vW * 0.80, hRoof),
            proj(uCR, vW * 0.80, hRoof),
            proj(uTR, vW * 0.86, hTrunk),
            proj(uTR, -vW * 0.86, hTrunk),
          ];
          drawPoly(rearWinPoly, 'rgba(186, 230, 253, 0.82)', 'rgba(15, 23, 42, 0.35)', 1);

          // Trunk top
          const trunkPoly = [
            proj(uTR, -vW * 0.86, hTrunk),
            proj(uTR, vW * 0.86, hTrunk),
            proj(uR, vW * 0.86, hTrunk * 0.95),
            proj(uR, -vW * 0.86, hTrunk * 0.95),
          ];
          drawPoly(trunkPoly, carColor, 'rgba(0, 0, 0, 0.15)', 0.8);
          drawPoly(trunkPoly, 'rgba(255, 255, 255, 0.15)');
        } else {
          // Van flat rear top
          const vanRearRoof = [
            proj(uCR, -vW * 0.80, hRoof),
            proj(uCR, vW * 0.80, hRoof),
            proj(uR, vW * 0.84, hRoof),
            proj(uR, -vW * 0.84, hRoof),
          ];
          drawPoly(vanRearRoof, carColor, 'rgba(0, 0, 0, 0.15)', 0.8);
        }

        // E. Near Side Body Panel (facing viewer at +vW)
        const sidePanelPoly = [
          proj(uR, vW, hBase),
          proj(uF, vW, hBase),
          proj(uF, vW, hBelt),
          proj(uH, vW, hBelt),
          proj(uCR, vW, hTrunk),
          proj(uR, vW, hTrunk),
        ];
        drawPoly(sidePanelPoly, carColor, 'rgba(0, 0, 0, 0.22)', 1);
        drawPoly(sidePanelPoly, 'rgba(0, 0, 0, 0.18)'); // lateral shadow

        // Side horizontal character accent crease
        const creaseStart = proj(uR + 0.12, vW + 0.01, hBelt * 0.55);
        const creaseEnd = proj(uF - 0.12, vW + 0.01, hBelt * 0.55);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(creaseStart.x, creaseStart.y);
        ctx.lineTo(creaseEnd.x, creaseEnd.y);
        ctx.stroke();

        // Near Side Windows (Greenhouse Side Glass)
        const sideGlassPoly = [
          proj(uCF, vW * 0.98, hRoof),
          proj(uH, vW * 0.98, hBelt),
          proj(uCR, vW * 0.98, hTrunk),
          proj(uCR, vW * 0.98, hRoof),
        ];
        drawPoly(sideGlassPoly, 'rgba(203, 213, 225, 0.85)', 'rgba(15, 23, 42, 0.35)', 0.8);

        // Center B-pillar vertical division bar
        const bPillarTop = proj((uCF + uCR) * 0.5, vW + 0.01, hRoof);
        const bPillarBottom = proj((uH + uCR) * 0.5, vW + 0.01, (hBelt + hTrunk) * 0.5);
        ctx.strokeStyle = carColor;
        ctx.lineWidth = 1.8 * zoom;
        ctx.beginPath();
        ctx.moveTo(bPillarTop.x, bPillarTop.y);
        ctx.lineTo(bPillarBottom.x, bPillarBottom.y);
        ctx.stroke();

        // Side door handles
        const dhF = proj(0.06, vW + 0.01, hBelt * 0.72);
        const dhR = proj(-0.24, vW + 0.01, hBelt * 0.72);
        ctx.fillStyle = '#cbd5e1';
        [dhF, dhR].forEach((dh) => {
          ctx.fillRect(dh.x - 1.2 * zoom, dh.y - 0.6 * zoom, 2.5 * zoom, 1.2 * zoom);
        });

        // Aerodynamic Side Mirror
        const mirrorBase = proj(uCF, vW + 0.02, hBelt + 0.6);
        const mirrorTip = proj(uCF, vW + 0.08, hBelt + 1.2);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2 * zoom;
        ctx.beginPath();
        ctx.moveTo(mirrorBase.x, mirrorBase.y);
        ctx.lineTo(mirrorTip.x, mirrorTip.y);
        ctx.stroke();
        ctx.fillStyle = carColor;
        ctx.beginPath();
        ctx.arc(mirrorTip.x, mirrorTip.y, 1.3 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // F. Near Side Wheels & Chrome Hubs
        [uW_Front, uW_Rear].forEach((uw) => {
          const ptW = proj(uw, vW, wheelR * 0.52);
          // Rubber tire outer ring
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(ptW.x, ptW.y, wheelR * 0.95, wheelR * 0.82, 0, 0, Math.PI * 2);
          ctx.fill();
          // Alloy wheel rim
          ctx.fillStyle = carType === 'sports' ? '#334155' : '#cbd5e1';
          ctx.beginPath();
          ctx.ellipse(ptW.x, ptW.y, wheelR * 0.58, wheelR * 0.50, 0, 0, Math.PI * 2);
          ctx.fill();
          // Chrome center hub cap
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(ptW.x, ptW.y, wheelR * 0.20, 0, Math.PI * 2);
          ctx.fill();
          // Tire outline
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 0.8 * zoom;
          ctx.stroke();
        });

        // 6. Directional Fascia & Headlights/Taillights
        if (isDR) {
          // FRONT FASCIA (Facing Down-Right towards viewer/direction of motion)
          const fasciaPoly = [
            proj(uF, -vW * 0.85, hBase),
            proj(uF, vW * 0.85, hBase),
            proj(uF, vW * 0.85, hBelt),
            proj(uF, -vW * 0.85, hBelt),
          ];
          drawPoly(fasciaPoly, carColor, 'rgba(0, 0, 0, 0.25)', 1);
          drawPoly(fasciaPoly, 'rgba(0, 0, 0, 0.12)');

          // Front Grille
          const grillePoly = [
            proj(uF, -vW * 0.45, hBase + 1.2),
            proj(uF, vW * 0.45, hBase + 1.2),
            proj(uF, vW * 0.45, hBelt - 1.2),
            proj(uF, -vW * 0.45, hBelt - 1.2),
          ];
          drawPoly(grillePoly, '#0f172a', '#334155', 0.8);

          // Front License Plate
          const pPlate = proj(uF, 0, hBase + 1.2);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(pPlate.x - 3.5 * zoom, pPlate.y - 1.6 * zoom, 7 * zoom, 3.2 * zoom);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 0.6;
          ctx.strokeRect(pPlate.x - 3.5 * zoom, pPlate.y - 1.6 * zoom, 7 * zoom, 3.2 * zoom);

          // Twin LED Headlights
          const pHL = proj(uF, -vW * 0.65, hBelt - 2.0);
          const pHR = proj(uF, vW * 0.65, hBelt - 2.0);

          [pHL, pHR].forEach((ph) => {
            // Polycarbonate housing
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.ellipse(ph.x, ph.y, 2.8 * zoom, 2.2 * zoom, 0, 0, Math.PI * 2);
            ctx.fill();

            // Headlight lens / LED emitter
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(ph.x, ph.y, 1.8 * zoom, 1.4 * zoom, 0, 0, Math.PI * 2);
            ctx.fill();

            // Glow flare
            ctx.fillStyle = isMoving ? 'rgba(254, 240, 138, 0.75)' : 'rgba(254, 240, 138, 0.35)';
            ctx.beginPath();
            ctx.ellipse(ph.x, ph.y, (isMoving ? 4.5 : 2.5) * zoom, (isMoving ? 3.5 : 2.0) * zoom, 0, 0, Math.PI * 2);
            ctx.fill();
          });

          // Rear corner marker
          const pRearMarker = proj(uR, vW * 0.88, hTrunk - 1.8);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(pRearMarker.x, pRearMarker.y, 1.5 * zoom, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // REAR FASCIA (Facing Down-Right towards camera/traffic behind)
          const rearPoly = [
            proj(uR, -vW * 0.85, hBase),
            proj(uR, vW * 0.85, hBase),
            proj(uR, vW * 0.85, hTrunk),
            proj(uR, -vW * 0.85, hTrunk),
          ];
          drawPoly(rearPoly, carColor, 'rgba(0, 0, 0, 0.25)', 1);
          drawPoly(rearPoly, 'rgba(0, 0, 0, 0.16)');

          // Rear Diffuser
          const diffPoly = [
            proj(uR, -vW * 0.75, hBase),
            proj(uR, vW * 0.75, hBase),
            proj(uR, vW * 0.75, hBase + 1.2),
            proj(uR, -vW * 0.75, hBase + 1.2),
          ];
          drawPoly(diffPoly, '#0f172a');

          // Dual Chrome Exhaust Tips
          const exL = proj(uR, -vW * 0.52, hBase + 0.4);
          const exR = proj(uR, vW * 0.52, hBase + 0.4);
          [exL, exR].forEach((ex) => {
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.ellipse(ex.x, ex.y, 1.6 * zoom, 1.2 * zoom, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.ellipse(ex.x, ex.y, 0.9 * zoom, 0.7 * zoom, 0, 0, Math.PI * 2);
            ctx.fill();
          });

          // Rear License Plate
          const pPlate = proj(uR, 0, hBase + 1.8);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(pPlate.x - 3.5 * zoom, pPlate.y - 1.6 * zoom, 7 * zoom, 3.2 * zoom);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 0.6;
          ctx.strokeRect(pPlate.x - 3.5 * zoom, pPlate.y - 1.6 * zoom, 7 * zoom, 3.2 * zoom);

          // Full-width Continuous Red LED Light Bar or Twin Taillights
          const pTL = proj(uR, -vW * 0.72, hTrunk - 1.8);
          const pTR = proj(uR, vW * 0.72, hTrunk - 1.8);

          // Horizontal Connecting Light Bar
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2.0 * zoom;
          ctx.beginPath();
          ctx.moveTo(pTL.x, pTL.y);
          ctx.lineTo(pTR.x, pTR.y);
          ctx.stroke();

          // Left & Right Brilliant Ruby-Red Clusters
          [pTL, pTR].forEach((pt) => {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.ellipse(pt.x, pt.y, 2.8 * zoom, 2.0 * zoom, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fca5a5';
            ctx.beginPath();
            ctx.ellipse(pt.x, pt.y, 1.6 * zoom, 1.2 * zoom, 0, 0, Math.PI * 2);
            ctx.fill();
            if (isMoving) {
              ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
              ctx.beginPath();
              ctx.ellipse(pt.x, pt.y, 4.5 * zoom, 3.2 * zoom, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          });

          // Near front corner headlight marker (shows active front headlights as it travels away)
          if (isMoving) {
            const pFrontMarker = proj(uF, vW * 0.88, hBelt - 2.0);
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(pFrontMarker.x, pFrontMarker.y, 1.8 * zoom, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 7. Vehicle Accessories
        if (carType === 'taxi') {
          // 3D Taxi Rooftop Signbox
          const signCenter = proj(0, 0, hRoof);
          const signW = 10 * zoom;
          const signH = 4.2 * zoom;
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.roundRect(signCenter.x - signW / 2, signCenter.y - signH - 1 * zoom, signW, signH, 1.5 * zoom);
          ctx.fill();
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#000000';
          ctx.font = `bold ${Math.max(3.5, Math.floor(3.5 * zoom))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('TAXI', signCenter.x, signCenter.y - signH * 0.5 - 1 * zoom);
        } else if (carType === 'sports') {
          // Rear aerodynamic racing spoiler wing
          const spStrutL = proj(uR + 0.1, -vW * 0.65, hTrunk);
          const spStrutR = proj(uR + 0.1, vW * 0.65, hTrunk);
          const spWingL = proj(uR + 0.05, -vW * 0.85, hTrunk + 4.2);
          const spWingR = proj(uR + 0.05, vW * 0.85, hTrunk + 4.2);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.6 * zoom;
          ctx.beginPath();
          ctx.moveTo(spStrutL.x, spStrutL.y);
          ctx.lineTo(spWingL.x, spWingL.y);
          ctx.moveTo(spStrutR.x, spStrutR.y);
          ctx.lineTo(spWingR.x, spWingR.y);
          ctx.stroke();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.4 * zoom;
          ctx.beginPath();
          ctx.moveTo(spWingL.x, spWingL.y);
          ctx.lineTo(spWingR.x, spWingR.y);
          ctx.stroke();
        } else if (carType === 'suv') {
          // Roof rails
          const railL_start = proj(uCF, -vW * 0.72, hRoof + 1.2);
          const railL_end = proj(uCR, -vW * 0.72, hRoof + 1.2);
          const railR_start = proj(uCF, vW * 0.72, hRoof + 1.2);
          const railR_end = proj(uCR, vW * 0.72, hRoof + 1.2);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.5 * zoom;
          ctx.beginPath();
          ctx.moveTo(railL_start.x, railL_start.y);
          ctx.lineTo(railL_end.x, railL_end.y);
          ctx.moveTo(railR_start.x, railR_start.y);
          ctx.lineTo(railR_end.x, railR_end.y);
          ctx.stroke();
        }
      };

      // 8. RENDER PARKED CARS (Curbside Stalls along wz = 18.0)
      // Car A: Cyberpunk Pearl White Sedan
      drawIsometricCar(-13.0, 18.0, '#f8fafc', 'down_right', 'sedan', false);
      // Car B: Italian Rosso Corsa Red Sports Coupe
      drawIsometricCar(-9.0, 18.0, '#dc2626', 'down_right', 'sports', false);
      // Car C: Royal Sapphire Blue SUV
      drawIsometricCar(7.0, 18.0, '#1d4ed8', 'down_right', 'suv', false);
      // Car D: Mint Green Eco Urban EV
      drawIsometricCar(11.0, 18.0, '#10b981', 'down_right', 'sedan', false);

      // 9. RENDER MOVING TRAFFIC (Cars driving past the office in real-time)
      // Lane 1: Driving southeast / down-right along wz = 19.8
      // Car 1: NYC Classic Yellow Taxi Cab
      const moveCar1X = -26.0 + (((timeSec * 5.2) + 0) % 52.0);
      drawIsometricCar(moveCar1X, 19.8, '#eab308', 'down_right', 'taxi', true);

      // Car 2: Electric Cyan High-Speed Coupe (following behind)
      const moveCar2X = -26.0 + (((timeSec * 7.0) + 26.0) % 52.0);
      drawIsometricCar(moveCar2X, 19.8, '#06b6d4', 'down_right', 'sports', true);

      // Lane 2: Driving northwest / up-left along wz = 21.6
      // Car 3: Pure White Delivery Cargo Van
      const moveCar3X = 24.0 - (((timeSec * 4.0) + 0) % 52.0);
      drawIsometricCar(moveCar3X, 21.6, '#f1f5f9', 'up_left', 'van', true);

      // Car 4: Purple Metallic Sports Sedan
      const moveCar4X = 24.0 - (((timeSec * 5.5) + 26.0) % 52.0);
      drawIsometricCar(moveCar4X, 21.6, '#9333ea', 'up_left', 'sedan', true);

      // =========================================================
      // 9. RENDER AMBIENT PARTICLES (STEAM, SNOOZE ZZZ, HEARTS)
      // =========================================================
      particlesRef.current.forEach((p) => {
        const { isoX, isoY } = toIso(p.x, p.z);
        const py = isoY - p.y * 32 * zoom;

        if (p.type === 'steam') {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.75})`;
          ctx.beginPath();
          ctx.arc(isoX, py, p.size * zoom, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'snooze' && p.text) {
          ctx.fillStyle = `rgba(71, 85, 105, ${p.alpha})`;
          ctx.font = `bold ${Math.round(p.size)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(p.text, isoX, py);
        } else if (p.type === 'heart') {
          ctx.fillStyle = `rgba(244, 63, 94, ${p.alpha})`;
          ctx.font = `${Math.round(p.size)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('❤️', isoX, py);
        }
      });

      ctx.restore();
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [catPurrUntil, hoveredAgent, isCatHovered, onSelectAgent, onSimulationUpdate, selectedAgentId, showTracks, simulation, worldToIso, zoom]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-[#f9f6ef]">
      {/* 2.5D Canvas Viewport */}
      <canvas
        ref={canvasRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onWheel={handleWheel}
        className={`w-full h-full block ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      />

      {/* ========================================================= */}
      {/* HUD 1: TOP-LEFT "AI AGENT" FLOATING GAME CARD (MATCH TOPNAV) */}
      {/* ========================================================= */}
      <div className="absolute top-[4.75rem] left-4 sm:left-6 z-20 flex flex-col gap-2 pointer-events-auto transition-all">
        <div className="bg-[#faf5eb]/95 backdrop-blur-xl border-2 border-[#d6c5ad] rounded-2xl shadow-xl text-[#2c231c] w-60 overflow-hidden transition-all duration-200">
          {/* Card Header */}
          <div className="px-3 py-2 bg-[#f4ebe1] border-b border-[#d6c5ad] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5]">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs tracking-wide text-[#2c231c]">AI Agent</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#f0e3ce] text-[#784620] border border-[#dccab3] font-mono font-bold">
                {agents.length}
              </span>
            </div>
            <button
              onClick={() => setIsAgentListOpen(!isAgentListOpen)}
              className="text-[#786653] hover:text-[#2c231c] p-1 rounded-lg hover:bg-[#ede2d1] transition-colors"
              title={isAgentListOpen ? 'Kecilkan List' : 'Buka List'}
            >
              {isAgentListOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Agent Items List */}
          {isAgentListOpen && (
            <div className="p-1.5 space-y-1 max-h-52 overflow-y-auto bg-[#fffdf9]">
              {agents.map((ag) => {
                const isSelected = ag.id === selectedAgentId;
                const statusLabel =
                  ag.state === 'working'
                    ? 'Sibuk'
                    : ag.state === 'coffee_break'
                    ? 'Ngopi'
                    : ag.state === 'playing_game'
                    ? 'Main Game'
                    : ag.state === 'talking'
                    ? 'Ngobrol'
                    : ag.state === 'meeting'
                    ? 'Sprint'
                    : ag.state === 'idle'
                    ? 'Standby'
                    : 'Aktif';
                const statusDotColor =
                  ag.state === 'working'
                    ? 'bg-rose-500'
                    : ag.state === 'coffee_break'
                    ? 'bg-amber-500'
                    : ag.state === 'playing_game'
                    ? 'bg-purple-500'
                    : ag.state === 'meeting'
                    ? 'bg-cyan-500'
                    : 'bg-emerald-500';

                return (
                  <button
                    key={ag.id}
                    onClick={() => onSelectAgent(ag.id)}
                    className={`w-full px-2 py-1.5 rounded-xl flex items-center justify-between text-left transition-all ${
                      isSelected
                        ? 'bg-[#fdeed9] border border-[#e8ba8c] text-[#c85a2b] shadow-xs'
                        : 'hover:bg-[#f4ebe1] text-[#2c231c] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Avatar Circle */}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs ring-1 ring-white/50"
                        style={{ backgroundColor: ag.avatarColor || '#c85a2b' }}
                      >
                        {ag.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate leading-tight text-[#2c231c]">{ag.name.split(' ')[0]}</div>
                        <div className="text-[9px] text-[#786653] truncate">{statusLabel}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${statusDotColor} ${ag.state === 'working' ? 'animate-pulse' : ''}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* HUD 2: TOP-RIGHT ISOMETRIC MINI-MAP HUD (MATCH TOPNAV)     */}
      {/* ========================================================= */}
      <div
        className={`absolute top-[4.75rem] right-4 sm:right-6 z-20 flex flex-col items-end gap-2 pointer-events-auto transition-all duration-300 ${
          selectedAgentId ? 'opacity-0 pointer-events-none translate-x-8' : 'opacity-100 translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Mini-Map Floating Box */}
          <div className="bg-[#faf5eb]/95 backdrop-blur-xl border-2 border-[#d6c5ad] rounded-2xl shadow-xl p-2.5 w-64 text-[#2c231c]">
            <div className="flex items-center justify-between pb-1.5 px-1 border-b border-[#d6c5ad] text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-[#2c231c]">
                <Compass className="w-3.5 h-3.5 text-[#c85a2b]" />
                <span>Office Radar</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#fdeed9] text-[9px] text-[#c85a2b] font-medium border border-[#f0c8a5]">
                  {agents.length} Agent
                </span>
              </span>
              <button
                onClick={() => setIsMiniMapExpanded(!isMiniMapExpanded)}
                className="text-[#786653] hover:text-[#2c231c] p-0.5 rounded hover:bg-[#ede2d1] transition-colors"
                title={isMiniMapExpanded ? 'Kecilkan Mini-Map' : 'Buka Mini-Map'}
              >
                {isMiniMapExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isMiniMapExpanded && (
              <div className="mt-2 flex flex-col gap-2">
                {/* SVG Isometric Floor Radar */}
                <div className="relative w-full h-[126px] bg-[#1a1512] rounded-xl overflow-hidden border border-[#d6c5ad] shadow-inner">
                  <svg
                    viewBox="0 0 220 126"
                    className="w-full h-full select-none"
                  >
                    {/* Background Grid Pattern */}
                    <defs>
                      <pattern id="radarGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                      </pattern>
                      {/* Gradient for zones */}
                      <linearGradient id="pantryGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#c2410c" stopOpacity="0.10" />
                      </linearGradient>
                      <linearGradient id="loungeGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.10" />
                      </linearGradient>
                      <linearGradient id="leadGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#4338ca" stopOpacity="0.10" />
                      </linearGradient>
                      <linearGradient id="sprintGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#0284c7" stopOpacity="0.10" />
                      </linearGradient>
                      <linearGradient id="podsGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#059669" stopOpacity="0.10" />
                      </linearGradient>
                    </defs>

                    <rect width="220" height="126" fill="url(#radarGrid)" />

                    {/* Outer Platform Diamond (Bounds: X: -16.5..16.5, Z: -12..12) */}
                    <polygon
                      points="95,9 204,71 125,117 16,55"
                      fill="#261e18"
                      stroke="#854d0e"
                      strokeWidth="1.2"
                      strokeOpacity="0.6"
                    />

                    {/* Zone Polygons (Clickable to center camera) */}
                    {/* 1. Lounge & Arcade & Cat (X: -16..-6, Z: -12..-2.5) */}
                    <polygon
                      points="97,10 130,29 98,47 65,28"
                      fill="url(#loungeGrad)"
                      stroke="#a855f7"
                      strokeWidth="0.9"
                      strokeOpacity="0.7"
                      className="cursor-pointer hover:fill-purple-500/30 transition-colors"
                      onClick={() => handleFocusZone(-11, -7)}
                    />
                    <text
                      x="97"
                      y="29"
                      fill="#d8b4fe"
                      fontSize="7.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none select-none font-sans"
                    >
                      🎮 LOUNGE
                    </text>

                    {/* 2. Pantry & Espresso Bar (X: -16..-6, Z: 2.5..12) */}
                    <polygon
                      points="49,38 82,56 50,74 17,55"
                      fill="url(#pantryGrad)"
                      stroke="#f97316"
                      strokeWidth="0.9"
                      strokeOpacity="0.7"
                      className="cursor-pointer hover:fill-orange-500/30 transition-colors"
                      onClick={() => handleFocusZone(-11.8, 6.0)}
                    />
                    <text
                      x="50"
                      y="56"
                      fill="#fdba74"
                      fontSize="7.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none select-none font-sans"
                    >
                      ☕ PANTRY
                    </text>

                    {/* 3. Open Engineering & Design Pods (X: -5..5, Z: -6..4) */}
                    <polygon
                      points="113,42 146,61 113,80 80,61"
                      fill="url(#podsGrad)"
                      stroke="#10b981"
                      strokeWidth="0.9"
                      strokeOpacity="0.7"
                      className="cursor-pointer hover:fill-emerald-500/30 transition-colors"
                      onClick={() => handleFocusZone(0, -1)}
                    />
                    <text
                      x="113"
                      y="62"
                      fill="#6ee7b7"
                      fontSize="7.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none select-none font-sans"
                    >
                      💻 PODS
                    </text>

                    {/* 4. Lead Suite (X: 6..16, Z: -12..-2.5) */}
                    <polygon
                      points="169,51 202,71 171,89 138,70"
                      fill="url(#leadGrad)"
                      stroke="#6366f1"
                      strokeWidth="0.9"
                      strokeOpacity="0.7"
                      className="cursor-pointer hover:fill-indigo-500/30 transition-colors"
                      onClick={() => handleFocusZone(11, -7)}
                    />
                    <text
                      x="170"
                      y="70"
                      fill="#c7d2fe"
                      fontSize="7.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none select-none font-sans"
                    >
                      👑 LEAD
                    </text>

                    {/* 5. Sprint & QA War Room (X: 6..16, Z: 2.5..12) */}
                    <polygon
                      points="121,79 154,98 123,116 90,97"
                      fill="url(#sprintGrad)"
                      stroke="#06b6d4"
                      strokeWidth="0.9"
                      strokeOpacity="0.7"
                      className="cursor-pointer hover:fill-cyan-500/30 transition-colors"
                      onClick={() => handleFocusZone(11, 7)}
                    />
                    <text
                      x="122"
                      y="98"
                      fill="#67e8f9"
                      fontSize="7.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none select-none font-sans"
                    >
                      📊 SPRINT
                    </text>

                    {/* Mochi Cat Indicator on Mini-Map */}
                    {(() => {
                      const mcx = 110 + (catRef.current.x - catRef.current.z) * 3.3;
                      const mcy = 63 + (catRef.current.x + catRef.current.z) * 1.9;
                      return (
                        <g className="cursor-pointer" onClick={() => handleFocusZone(catRef.current.x, catRef.current.z)}>
                          <circle cx={mcx} cy={mcy} r="4.2" fill="#ea580c" stroke="#ffffff" strokeWidth="1.2" />
                          <circle cx={mcx} cy={mcy} r="6.5" fill="none" stroke="#ea580c" strokeWidth="0.8" opacity="0.6" />
                          <text x={mcx} y={mcy - 5.5} fill="#fb923c" fontSize="6.5" textAnchor="middle" fontWeight="bold">
                            🐱
                          </text>
                        </g>
                      );
                    })()}

                    {/* Real-Time Agent Blips */}
                    {agents.map((ag) => {
                      const sx = 110 + (ag.currentPosition.x - ag.currentPosition.z) * 3.3;
                      const sy = 63 + (ag.currentPosition.x + ag.currentPosition.z) * 1.9;
                      const isSel = selectedAgentId === ag.id;

                      return (
                        <g
                          key={ag.id}
                          className="cursor-pointer group"
                          onClick={() => {
                            onSelectAgent(ag.id);
                            handleFocusZone(ag.currentPosition.x, ag.currentPosition.z);
                          }}
                        >
                          {isSel && (
                            <circle
                              cx={sx}
                              cy={sy}
                              r="8"
                              fill="none"
                              stroke={ag.avatarColor || '#38bdf8'}
                              strokeWidth="1.5"
                              strokeDasharray="2,2"
                              className="animate-spin"
                            />
                          )}
                          <circle
                            cx={sx}
                            cy={sy}
                            r={isSel ? 4.8 : 3.8}
                            fill={ag.avatarColor || '#f97316'}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                          <title>{`${ag.name} (${ag.stateMessage || ag.state})`}</title>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Quick Navigation Chips */}
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
                    <button
                      onClick={() => handleFocusZone(-11.8, 6.0)}
                      className="px-1.5 py-0.5 rounded-lg bg-[#fffdf9] hover:bg-[#fdeed9] text-[#78350f] border border-[#d6c5ad] font-semibold transition-colors flex items-center gap-1 shrink-0"
                      title="Fokus ke Pantry & Mesin Kopi"
                    >
                      ☕ Pantry
                    </button>
                    <button
                      onClick={() => handleFocusZone(-11, -7)}
                      className="px-1.5 py-0.5 rounded-lg bg-[#fffdf9] hover:bg-[#ede2d1] text-[#4c1d95] border border-[#d6c5ad] font-semibold transition-colors flex items-center gap-1 shrink-0"
                      title="Fokus ke Lounge & Arcade"
                    >
                      🎮 Lounge
                    </button>
                    <button
                      onClick={() => handleFocusZone(0, -1)}
                      className="px-1.5 py-0.5 rounded-lg bg-[#fffdf9] hover:bg-[#ede2d1] text-[#065f46] border border-[#d6c5ad] font-semibold transition-colors flex items-center gap-1 shrink-0"
                      title="Fokus ke Workstation Pods"
                    >
                      💻 Pods
                    </button>
                    <button
                      onClick={() => handleFocusZone(11, 7)}
                      className="px-1.5 py-0.5 rounded-lg bg-[#fffdf9] hover:bg-[#ede2d1] text-[#0e7490] border border-[#d6c5ad] font-semibold transition-colors flex items-center gap-1 shrink-0"
                      title="Fokus ke Sprint & QA"
                    >
                      📊 Sprint
                    </button>
                    <button
                      onClick={() => handleFocusZone(11, -7)}
                      className="px-1.5 py-0.5 rounded-lg bg-[#fffdf9] hover:bg-[#ede2d1] text-[#4338ca] border border-[#d6c5ad] font-semibold transition-colors flex items-center gap-1 shrink-0"
                      title="Fokus ke Lead Suite"
                    >
                      👑 Lead
                    </button>
                  </div>
                  <button
                    onClick={handleResetCamera}
                    className="p-1 rounded-lg bg-[#fffdf9] hover:bg-[#ede2d1] text-[#786653] hover:text-[#2c231c] border border-[#d6c5ad] transition-colors shrink-0"
                    title="Reset Kamera ke Posisi Semula"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* HUD 4: BOTTOM-RIGHT UNIFIED GAME ACTION DOCK (MATCH TOPNAV)*/}
      {/* ========================================================= */}
      <div className="absolute bottom-5 right-4 sm:right-6 z-20 flex items-center gap-2 pointer-events-auto">
        <div className="bg-[#faf5eb]/95 backdrop-blur-xl border-2 border-[#d6c5ad] p-1.5 rounded-2xl shadow-xl flex items-center gap-1.5 text-[#2c231c]">
          {onOpenChat && (
            <button
              onClick={onOpenChat}
              className="px-3.5 py-1.5 rounded-xl bg-[#4338ca] hover:bg-[#3730a3] text-white shadow-md shadow-[#4338ca]/20 border border-indigo-400/40 flex items-center gap-1.5 transition-all text-xs font-semibold group hover:scale-[1.02]"
              title="Buka Office War Room Chat & Diskusi Agent (@tag didukung)"
            >
              <MessagesSquare className="w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform" />
              <span>War Room</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded font-mono text-[9px] text-indigo-100 font-bold hidden sm:inline">
                @tag
              </span>
            </button>
          )}

          {onOpenTasks && (
            <button
              onClick={onOpenTasks}
              className="px-2.5 py-1.5 rounded-xl bg-[#fffdf9] hover:bg-[#f4ebe1] text-[#2c231c] border border-[#d6c5ad] flex items-center gap-1.5 text-xs font-medium transition-colors shadow-2xs"
              title="Kanban Sprint Board"
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#c85a2b]" />
              <span className="text-[11px]">Tasks</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-2.5 py-1.5 rounded-xl bg-[#fffdf9] hover:bg-[#f4ebe1] text-[#2c231c] border border-[#d6c5ad] flex items-center gap-1.5 text-xs font-medium transition-colors shadow-2xs"
              title="Workspace Disk & Pengaturan"
            >
              <Settings className="w-3.5 h-3.5 text-[#786653]" />
              <span className="text-[11px]">Settings</span>
            </button>
          )}

          <button
            onClick={() => setShowTracks((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors text-xs font-medium shadow-2xs ${
              showTracks
                ? 'bg-[#fdeed9] text-[#c85a2b] border-[#e8ba8c]'
                : 'bg-[#fffdf9] hover:bg-[#f4ebe1] text-[#6e5a48] border-[#d6c5ad]'
            }`}
            title="Toggle Footprint & Walking Tracks"
          >
            <Footprints className="w-3.5 h-3.5 text-[#c85a2b]" />
            <span className="text-[11px]">Track</span>
          </button>

          <div className="h-5 w-px bg-[#d6c5ad] mx-1" />

          {/* Zoom & Viewport Controls */}
          <button
            onClick={() => setZoom((z) => Math.min(2.4, z + 0.15))}
            className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-xl transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.65, z - 0.15))}
            className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-xl transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 15 });
            }}
            className="p-1.5 text-[#786653] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-xl transition-colors"
            title="Reset Viewport"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hover Floating Card for Agent */}
      {hoveredAgent && !isDragging && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full z-30 transition-all duration-75"
          style={{ left: `${mousePos.x}px`, top: `${mousePos.y - 18}px` }}
        >
          <div className="bg-[#faf5eb]/98 backdrop-blur-xl border-2 border-[#d6c5ad] rounded-2xl p-3.5 shadow-2xl text-[#2c231c] max-w-xs">
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-md ring-1 ring-white/40"
                style={{ backgroundColor: hoveredAgent.avatarColor || '#c85a2b' }}
              >
                {hoveredAgent.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5 text-[#2c231c]">
                  <span>{hoveredAgent.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#fdeed9] text-[#c85a2b] font-semibold border border-[#f0c8a5]">
                    {hoveredAgent.state === 'walking'
                      ? '🚶 Berjalan'
                      : hoveredAgent.state === 'working'
                      ? '💻 Fokus'
                      : hoveredAgent.state === 'idle'
                      ? '✨ Standby'
                      : hoveredAgent.state === 'talking'
                      ? '💬 Diskusi'
                      : hoveredAgent.state === 'meeting'
                      ? '📊 Review Sprint'
                      : '☕ Istirahat'}
                  </span>
                </div>
                <div className="text-[10px] text-[#c85a2b] font-semibold">{hoveredAgent.roleTitle}</div>
              </div>
            </div>

            <div className="text-[11px] text-[#4d3c2e] italic mb-2.5 bg-[#fffdf9] p-2 rounded-xl border border-[#d6c5ad]">
              &ldquo;{hoveredAgent.stateMessage}&rdquo;
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#786653] font-mono pt-1.5 border-t border-[#d6c5ad]">
              <span className="text-[#c85a2b] font-bold">✨ Klik untuk inspeksi agent</span>
              <span>{formatNumber(hoveredAgent.stats.linesOfCode)} loc</span>
            </div>
          </div>
        </div>
      )}

      {/* Hover Floating Card for Mascot Cat */}
      {isCatHovered && !hoveredAgent && !isDragging && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full z-30"
          style={{ left: `${mousePos.x}px`, top: `${mousePos.y - 18}px` }}
        >
          <div className="bg-[#faf5eb]/98 backdrop-blur-xl border-2 border-[#e8ba8c] rounded-2xl p-2.5 shadow-2xl text-[#2c231c] max-w-xs">
            <div className="flex items-center gap-2">
              <span className="text-xl">🐱</span>
              <div>
                <div className="font-bold text-xs text-[#c85a2b]">Mochi si Kucing Kantor</div>
                <div className="text-[10px] text-[#786653]">Maskot Resmi Vigent • Klik untuk elus-elus ❤️</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
