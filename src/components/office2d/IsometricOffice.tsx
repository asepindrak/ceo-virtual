'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Agent, TaskTicket, ActivityEvent } from '@/types/office';
import { OfficeSimulation } from '@/lib/simulationEngine';
import { formatNumber } from '@/lib/utils';
import { Sparkles, Terminal, MessageSquare, Coffee, ShieldAlert, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface IsometricOfficeProps {
  agents: Agent[];
  tasks: TaskTicket[];
  simulation: OfficeSimulation;
  selectedAgentId?: string;
  onSelectAgent: (agentId: string) => void;
  onSimulationUpdate: (updatedAgents: Agent[], updatedTasks: TaskTicket[], newEvents: ActivityEvent[]) => void;
}

export const IsometricOffice: React.FC<IsometricOfficeProps> = ({
  agents,
  tasks,
  simulation,
  selectedAgentId,
  onSelectAgent,
  onSimulationUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport Pan & Zoom
  const [zoom, setZoom] = useState(1.1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Hovered agent
  const [hoveredAgent, setHoveredAgent] = useState<Agent | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Refs for animation loop
  const agentsRef = useRef<Agent[]>(agents);
  agentsRef.current = agents;
  const tasksRef = useRef<TaskTicket[]>(tasks);
  tasksRef.current = tasks;

  // Isometric Projection Math:
  // World: x: [-12, 12], z: [-10, 10]
  // Iso projection:
  // screenX = (worldX - worldZ) * tileW / 2
  // screenY = (worldX + worldZ) * tileH / 2
  const TILE_W = 44;
  const TILE_H = 24;

  const worldToIso = useCallback(
    (wx: number, wz: number, width: number, height: number) => {
      const centerX = width / 2 + pan.x;
      const centerY = height / 2 - 20 + pan.y;
      const isoX = (wx - wz) * (TILE_W * 0.5 * zoom) + centerX;
      const isoY = (wx + wz) * (TILE_H * 0.5 * zoom) + centerY;
      return { isoX, isoY };
    },
    [pan.x, pan.y, zoom]
  );

  // Mouse interaction: detect clicking or hovering on agent
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

    // Check hit test against agents
    const width = canvasRef.current.width / (window.devicePixelRatio || 1);
    const height = canvasRef.current.height / (window.devicePixelRatio || 1);

    let foundAgent: Agent | null = null;
    for (const agent of agentsRef.current) {
      const { isoX, isoY } = worldToIso(agent.currentPosition.x, agent.currentPosition.z, width, height);
      // Hit radius: 30px
      const dist = Math.hypot(clientX - isoX, clientY - (isoY - 18 * zoom));
      if (dist < 28 * zoom) {
        foundAgent = agent;
        break;
      }
    }
    setHoveredAgent(foundAgent);
  };

  const handlePointerUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);

    // If click didn't drag far, treat as click selection
    const dx = Math.abs(e.clientX - (dragStartRef.current.x + pan.x));
    const dy = Math.abs(e.clientY - (dragStartRef.current.y + pan.y));
    if (dx < 5 && dy < 5 && hoveredAgent) {
      onSelectAgent(hoveredAgent.id);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const newZoom = Math.min(2.2, Math.max(0.6, zoom - e.deltaY * 0.001));
    setZoom(newZoom);
  };

  // Render loop
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
      const deltaSeconds = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Update simulation logic
      const { updatedAgents, updatedTasks, newEvents } = simulation.update(
        agentsRef.current,
        tasksRef.current,
        deltaSeconds
      );

      if (
        newEvents.length > 0 ||
        updatedAgents.some((a, i) => a.currentPosition.x !== agentsRef.current[i]?.currentPosition.x)
      ) {
        onSimulationUpdate(updatedAgents, updatedTasks, newEvents);
      }

      // Resize canvas to match display size
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

      // 1. Background retro light warm parchment gradient
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width);
      bgGrad.addColorStop(0, '#fbf7ee');
      bgGrad.addColorStop(1, '#ebdcc9');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Helper to project
      const toIso = (wx: number, wz: number) => worldToIso(wx, wz, width, height);

      // 2. Draw Office Floor Tiles (Grid from -12 to 12 in X, -10 to 10 in Z)
      ctx.lineWidth = 1;
      for (let x = -12; x <= 12; x += 2) {
        for (let z = -10; z <= 10; z += 2) {
          const p1 = toIso(x, z);
          const p2 = toIso(x + 2, z);
          const p3 = toIso(x + 2, z + 2);
          const p4 = toIso(x, z + 2);

          ctx.beginPath();
          ctx.moveTo(p1.isoX, p1.isoY);
          ctx.lineTo(p2.isoX, p2.isoY);
          ctx.lineTo(p3.isoX, p3.isoY);
          ctx.lineTo(p4.isoX, p4.isoY);
          ctx.closePath();

          // Department colored flooring areas (Retro Light Palette)
          if (x >= 6 && z <= 0) {
            // Meeting room floor (vintage sage green wool carpet)
            ctx.fillStyle = (x + z) % 4 === 0 ? '#d2e4db' : '#c6dcd1';
          } else if (x <= -6 && z >= 2) {
            // Pantry floor (warm bistro terracotta tile)
            ctx.fillStyle = (x + z) % 4 === 0 ? '#ecd2bd' : '#e0c2ab';
          } else if (z <= -7 && Math.abs(x) <= 3) {
            // Owner Executive suite (classic teak parquet)
            ctx.fillStyle = (x + z) % 4 === 0 ? '#d8c2aa' : '#cca383';
          } else {
            // Main engineering floor (warm Scandinavian birch parquet)
            ctx.fillStyle = (x + z) % 4 === 0 ? '#faf4eb' : '#eee2d0';
          }
          ctx.fill();

          ctx.strokeStyle = '#dbc7af';
          ctx.stroke();
        }
      }

      // 3. Draw Room Boundaries / Glass Partitions
      // Meeting Room glass wall (X=6, Z between -10 and -1)
      const gTop = toIso(6, -10);
      const gBot = toIso(6, -1);
      ctx.beginPath();
      ctx.moveTo(gTop.isoX, gTop.isoY);
      ctx.lineTo(gBot.isoX, gBot.isoY);
      ctx.strokeStyle = '#288279';
      ctx.lineWidth = 2 * zoom;
      ctx.stroke();

      // Meeting Room conference table (x: 9.5, z: -5.5)
      const conf = toIso(9.5, -5.5);
      ctx.fillStyle = '#8b4926';
      ctx.beginPath();
      ctx.ellipse(conf.isoX, conf.isoY, 32 * zoom, 18 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c68f23';
      ctx.lineWidth = 2 * zoom;
      ctx.stroke();
      ctx.fillStyle = '#fef8e7';
      ctx.font = `bold ${Math.round(9 * zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('MEETING ROOM', conf.isoX, conf.isoY + 3 * zoom);

      // 4. Pantry & Coffee Bar (x: -9.5, z: 5.5)
      const pantry = toIso(-9.5, 5.5);
      ctx.fillStyle = '#a64d25';
      ctx.beginPath();
      ctx.roundRect(pantry.isoX - 28 * zoom, pantry.isoY - 14 * zoom, 56 * zoom, 28 * zoom, 6);
      ctx.fill();
      ctx.strokeStyle = '#dfba94';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fffdf9';
      ctx.font = `bold ${Math.round(9 * zoom)}px sans-serif`;
      ctx.fillText('☕ ESPRESSO PANTRY', pantry.isoX, pantry.isoY + 3 * zoom);

      // 5. Owner's Grand Executive Desk (x: 0, z: -8.5)
      const ownerDesk = toIso(0, -8.5);
      ctx.fillStyle = '#5e2c14';
      ctx.beginPath();
      ctx.roundRect(ownerDesk.isoX - 35 * zoom, ownerDesk.isoY - 16 * zoom, 70 * zoom, 32 * zoom, 8);
      ctx.fill();
      ctx.strokeStyle = '#c68f23'; // Vintage gold border
      ctx.lineWidth = 2 * zoom;
      ctx.stroke();

      // Owner Laptop (vintage chassis with amber screen)
      ctx.fillStyle = '#d4c5ae';
      ctx.fillRect(ownerDesk.isoX - 8 * zoom, ownerDesk.isoY - 6 * zoom, 16 * zoom, 12 * zoom);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(ownerDesk.isoX - 7 * zoom, ownerDesk.isoY - 5 * zoom, 14 * zoom, 10 * zoom);
      ctx.fillStyle = '#fef08a';
      ctx.font = `bold ${Math.round(9 * zoom)}px sans-serif`;
      ctx.fillText('👑 OWNER DESK', ownerDesk.isoX, ownerDesk.isoY + 12 * zoom);

      // 6. Office Exit Door (x: 0, z: 9.5)
      const exitDoor = toIso(0, 9.5);
      ctx.fillStyle = '#287a55';
      ctx.beginPath();
      ctx.roundRect(exitDoor.isoX - 22 * zoom, exitDoor.isoY - 10 * zoom, 44 * zoom, 20 * zoom, 4);
      ctx.fill();
      ctx.fillStyle = '#f3faf6';
      ctx.font = `bold ${Math.round(9 * zoom)}px sans-serif`;
      ctx.fillText('EXIT 🟢', exitDoor.isoX, exitDoor.isoY + 4 * zoom);

      // 7. Workstations (8 Desks in pods)
      const deskPositions = [
        { x: -3.5, z: -5.5 },
        { x: -1.5, z: -5.5 },
        { x: -3.5, z: -0.5 },
        { x: -1.5, z: -0.5 },
        { x: 1.5, z: -5.5 },
        { x: 3.5, z: -5.5 },
        { x: 1.5, z: -0.5 },
        { x: 3.5, z: -0.5 },
      ];

      deskPositions.forEach((dp, idx) => {
        const dIso = toIso(dp.x, dp.z);
        // Desk surface (warm retro birch wood)
        ctx.fillStyle = '#e8dac4';
        ctx.beginPath();
        ctx.roundRect(dIso.isoX - 22 * zoom, dIso.isoY - 12 * zoom, 44 * zoom, 24 * zoom, 5);
        ctx.fill();
        ctx.strokeStyle = '#c4b198';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Retro beige CRT computer monitor casing
        ctx.fillStyle = '#d8cdba';
        ctx.fillRect(dIso.isoX - 15 * zoom, dIso.isoY - 11 * zoom, 14 * zoom, 9 * zoom);
        ctx.fillRect(dIso.isoX + 1 * zoom, dIso.isoY - 11 * zoom, 14 * zoom, 9 * zoom);

        // Retro CRT screens: glowing amber & terminal green
        ctx.fillStyle = '#1b2d23'; // dark green CRT screen
        ctx.fillRect(dIso.isoX - 14 * zoom, dIso.isoY - 10 * zoom, 12 * zoom, 7 * zoom);
        ctx.fillStyle = '#2b2114'; // dark amber CRT screen
        ctx.fillRect(dIso.isoX + 2 * zoom, dIso.isoY - 10 * zoom, 12 * zoom, 7 * zoom);

        // Phosphor scanline hints
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(dIso.isoX - 12 * zoom, dIso.isoY - 8 * zoom, 8 * zoom, 1.5 * zoom);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(dIso.isoX + 4 * zoom, dIso.isoY - 8 * zoom, 8 * zoom, 1.5 * zoom);

        ctx.fillStyle = '#7a654e';
        ctx.font = `${Math.round(7 * zoom)}px monospace`;
        ctx.fillText(`Desk #${idx + 1}`, dIso.isoX, dIso.isoY + 7 * zoom);
      });

      // 8. Sort Agents by isometric Y depth so foreground agents render over background agents
      const sortedAgents = [...updatedAgents].sort((a, b) => {
        const yA = a.currentPosition.x + a.currentPosition.z;
        const yB = b.currentPosition.x + b.currentPosition.z;
        return yA - yB;
      });

      // 9. Draw Agents (Stylized Cute 2.5D Avatars with Shadows & Badges)
      const timeSec = performance.now() * 0.005;

      sortedAgents.forEach((agent) => {
        const { isoX, isoY } = toIso(agent.currentPosition.x, agent.currentPosition.z);
        const isSelected = agent.id === selectedAgentId;
        const isHovered = hoveredAgent?.id === agent.id;

        // Ground shadow (soft warm shadow)
        ctx.fillStyle = 'rgba(75, 55, 35, 0.22)';
        ctx.beginPath();
        ctx.ellipse(isoX, isoY, 14 * zoom, 7 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();

        // Selected / Hovered pulse ring (Retro Terracotta & Teal)
        if (isSelected || isHovered) {
          ctx.strokeStyle = isSelected ? '#c85a2b' : '#288279';
          ctx.lineWidth = 2.5 * zoom;
          ctx.beginPath();
          ctx.ellipse(isoX, isoY, (18 + Math.sin(timeSec * 4) * 2) * zoom, 9 * zoom, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Smooth, natural walking bounce and calm focused desk posture (no rapid vibration)
        const walkBounce = agent.state === 'walking' ? Math.abs(Math.sin(timeSec * 3.5)) * 2.2 * zoom : 0;
        const subtleBreathing = agent.state === 'working' ? Math.sin(timeSec * 1.2) * 0.35 * zoom : 0;
        const charY = isoY - 10 * zoom - walkBounce + subtleBreathing;

        // Avatar Body / Torso
        ctx.fillStyle = agent.shirtColor || '#3b82f6';
        ctx.beginPath();
        ctx.roundRect(isoX - 10 * zoom, charY - 12 * zoom, 20 * zoom, 16 * zoom, 4);
        ctx.fill();

        // Hands resting calmly on desk when working
        if (agent.state === 'working') {
          ctx.fillStyle = agent.skinColor || '#fcd34d';
          const handY = charY + 3 * zoom;
          ctx.beginPath();
          ctx.arc(isoX - 6 * zoom, handY, 2.5 * zoom, 0, Math.PI * 2);
          ctx.arc(isoX + 6 * zoom, handY, 2.5 * zoom, 0, Math.PI * 2);
          ctx.fill();
        }

        // Avatar Head
        ctx.fillStyle = agent.skinColor || '#fcd34d';
        ctx.beginPath();
        ctx.arc(isoX, charY - 20 * zoom, 9 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Avatar Hair
        ctx.fillStyle = agent.hairColor || '#0f172a';
        ctx.beginPath();
        ctx.arc(isoX, charY - 23 * zoom, 9 * zoom, Math.PI, 0);
        ctx.fill();

        // Role Indicator Dot on head
        ctx.fillStyle = agent.avatarColor || '#3b82f6';
        ctx.beginPath();
        ctx.arc(isoX, charY - 32 * zoom, 3 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Name Tag Box (Retro Light Card styling)
        ctx.fillStyle = isSelected ? '#c85a2b' : 'rgba(255, 253, 249, 0.96)';
        ctx.strokeStyle = isSelected ? '#a34219' : '#d2c0aa';
        ctx.lineWidth = 1.2;
        const nameText = agent.name.split(' ')[0];
        ctx.font = `bold ${Math.round(10 * zoom)}px sans-serif`;
        const nameWidth = ctx.measureText(nameText).width;
        const tagW = nameWidth + 12 * zoom;
        const tagH = 14 * zoom;

        ctx.beginPath();
        ctx.roundRect(isoX - tagW / 2, charY - 45 * zoom, tagW, tagH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isSelected ? '#ffffff' : '#2c231c';
        ctx.textAlign = 'center';
        ctx.fillText(nameText, isoX, charY - 34 * zoom);

        // State Badge (e.g. 🚶 Walking, 💻 Coding, ☕ Break)
        let stateEmoji = '💻';
        if (agent.state === 'walking') stateEmoji = '🚶';
        if (agent.state === 'talking') stateEmoji = '💬';
        if (agent.state === 'coffee_break') stateEmoji = '☕';
        if (agent.state === 'seeking_approval') stateEmoji = '⚠️';

        ctx.font = `${Math.round(10 * zoom)}px sans-serif`;
        ctx.fillText(stateEmoji, isoX + tagW / 2 + 7 * zoom, charY - 35 * zoom);

        // 3-Dot Speech Wave Indicator above head when talking (Retro Terracotta wave)
        if (agent.state === 'talking') {
          const dotY = charY - 50 * zoom;
          const dotBaseX = isoX - 6 * zoom;
          for (let i = 0; i < 3; i++) {
            const alpha = 0.35 + 0.65 * Math.abs(Math.sin(timeSec * 3 + i * 0.9));
            ctx.fillStyle = `rgba(200, 90, 43, ${alpha})`;
            ctx.beginPath();
            ctx.arc(dotBaseX + i * 6 * zoom, dotY, 2 * zoom, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Speech Bubble if agent has active dialog (Retro Stationery Paper Bubble)
        if (agent.activeDialog) {
          const msg = agent.activeDialog.message;
          ctx.font = `bold ${Math.round(9 * zoom)}px sans-serif`;
          const msgW = Math.min(220, ctx.measureText(msg).width + 16);
          const bubbleY = charY - 64 * zoom;

          // Bubble background & border
          ctx.fillStyle = 'rgba(255, 254, 250, 0.98)';
          ctx.strokeStyle = agent.state === 'seeking_approval' ? '#c85a2b' : '#bfa787';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(isoX - msgW / 2, bubbleY - 14 * zoom, msgW, 18 * zoom, 6);
          ctx.fill();
          ctx.stroke();

          // Bubble pointer triangle down
          ctx.fillStyle = 'rgba(255, 254, 250, 0.98)';
          ctx.beginPath();
          ctx.moveTo(isoX - 4 * zoom, bubbleY + 4 * zoom);
          ctx.lineTo(isoX + 4 * zoom, bubbleY + 4 * zoom);
          ctx.lineTo(isoX, bubbleY + 8 * zoom);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = agent.state === 'seeking_approval' ? '#c85a2b' : '#2c231c';
          const truncatedMsg = msg.length > 34 ? msg.slice(0, 32) + '...' : msg;
          ctx.fillText(truncatedMsg, isoX, bubbleY);
        }
      });

      ctx.restore();
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [hoveredAgent, onSelectAgent, onSimulationUpdate, selectedAgentId, simulation, worldToIso, zoom]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-[#f4ebe1]">
      {/* 2.5D Canvas Viewport */}
      <canvas
        ref={canvasRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onWheel={handleWheel}
        className={`w-full h-full block ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      />

      {/* Floating Hover Card when mouse hovers over an Agent */}
      {hoveredAgent && !isDragging && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full z-30 transition-all duration-75"
          style={{ left: `${mousePos.x}px`, top: `${mousePos.y - 15}px` }}
        >
          <div className="bg-[#fffdf9]/95 backdrop-blur-xl border-2 border-[#d6c5ad] rounded-2xl p-3.5 shadow-2xl text-[#2c231c] max-w-xs ring-2 ring-[#c85a2b]/20">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm"
                style={{ backgroundColor: hoveredAgent.avatarColor }}
              >
                {hoveredAgent.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <div className="font-bold text-xs text-[#2c231c]">{hoveredAgent.name}</div>
                <div className="text-[10px] text-[#c85a2b] font-semibold">{hoveredAgent.roleTitle}</div>
              </div>
            </div>

            <div className="text-[11px] text-[#4d3c2e] italic mb-2.5 bg-[#f8f1e6] p-2 rounded-lg border border-[#e2d5c3]">
              &ldquo;{hoveredAgent.stateMessage}&rdquo;
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#7d6752] font-mono pt-1.5 border-t border-[#e2d5c3]">
              <span className="text-[#288279] font-bold">Klik untuk profil & monitor</span>
              <span>{formatNumber(hoveredAgent.stats.linesOfCode)} loc</span>
            </div>
          </div>
        </div>
      )}

      {/* Viewport Zoom & Reset Controls */}
      <div className="absolute bottom-5 right-5 flex items-center gap-2 bg-[#fffdf9]/95 backdrop-blur-md border border-[#d6c5ad] p-1.5 rounded-xl shadow-xl z-10 text-xs">
        <button
          onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
          className="p-1.5 text-[#5c4939] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors"
          title="Perbesar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
          className="p-1.5 text-[#5c4939] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors"
          title="Perkecil"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoom(1.1);
            setPan({ x: 0, y: 0 });
          }}
          className="px-2.5 py-1 text-[#5c4939] hover:text-[#2c231c] hover:bg-[#ede2d1] rounded-lg transition-colors flex items-center gap-1 font-semibold"
          title="Reset Tampilan"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Help Banner at Top Left */}
      <div className="absolute top-5 left-5 pointer-events-none flex flex-col gap-1 text-[11px] text-[#615042] font-mono">
        <div className="bg-[#fffdf9]/95 backdrop-blur px-3 py-1.5 rounded-xl border border-[#d6c5ad] text-[#4d3c2e] shadow-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#c85a2b] animate-ping" />
          <span>💡 Klik pada agent mana saja untuk melihat apa yang sedang dikerjakannya</span>
        </div>
      </div>
    </div>
  );
};
