'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  RegionalDistrict,
  RegionalCompanyInfo,
  Company,
  Agent,
  CommuteMode,
  TravelMissionType,
} from '@/types/office';
import {
  Building2,
  Train,
  ShoppingBag,
  Coffee,
  Sparkles,
  Car,
  CheckCircle2,
  ArrowRight,
  Coins,
  Briefcase,
  Award,
  ExternalLink,
  X,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  Send,
  Radio,
  Clock,
  Layers,
  MapPin,
  Utensils,
  Zap,
} from 'lucide-react';

interface SupermarketItem {
  id: string;
  name: string;
  category: 'snack' | 'drink' | 'gear';
  price: number;
  icon: string;
  effect: string;
  description: string;
}

export const SUPERMARKET_CATALOG: SupermarketItem[] = [
  {
    id: 'sm-coffee-beans',
    name: 'Biji Kopi Arabica Gayo Special',
    category: 'drink',
    price: 150,
    icon: '☕',
    effect: '+50 Energi Tim & Stamina Ngoding',
    description: 'Biji kopi pilihan untuk mesin espresso kantor, membuat tim selalu segar saat sprint.',
  },
  {
    id: 'sm-energy-drink',
    name: 'Cyber-Volt Energy Drink (Krat 12 Kaleng)',
    category: 'drink',
    price: 220,
    icon: '⚡',
    effect: '+100 Kecepatan Eksekusi & Anti-Snooze',
    description: 'Minuman berenergi dengan nootropic alami untuk memacu sub-second response time.',
  },
  {
    id: 'sm-matcha-chocolate',
    name: 'Snack Koding & Cokelat Matcha Tokyo',
    category: 'snack',
    price: 120,
    icon: '🍫',
    effect: '+80 Mood Tim & Redakan Stres Debugging',
    description: 'Camilan manis renyah untuk dinikmati bersama di pantry atau lounge.',
  },
  {
    id: 'sm-cup-noodles',
    name: 'Ramen Instan Cup Pedas Midnight',
    category: 'snack',
    price: 80,
    icon: '🍜',
    effect: '+40 Mood & Menemani Lembur Rilis Produk',
    description: 'Makanan penyelamat saat sprint rilis malam hari di war room.',
  },
  {
    id: 'sm-mech-switches',
    name: 'Custom Mechanical Switches Pack (Lubed)',
    category: 'gear',
    price: 350,
    icon: '⌨️',
    effect: '+150 Fokus Dev & Suara Ketikan Lebih Renyah',
    description: 'Switch tactile premium untuk keyboard mekanik di meja kerja para engineer.',
  },
];

interface IsometricCityViewProps {
  district: RegionalDistrict;
  currentCompany: Company;
  agents: Agent[];
  userPoints?: number;
  onDispatchMission?: (params: {
    agentId: string;
    targetCompanyId: string;
    targetCompanyName: string;
    commuteMode: CommuteMode;
    missionType: TravelMissionType;
  }) => void;
  onBuyItem?: (item: SupermarketItem) => void;
  onOpenMacroMap?: () => void;
  onOpenTrainSchedule?: () => void;
}

export const IsometricCityView: React.FC<IsometricCityViewProps> = ({
  district,
  currentCompany,
  agents,
  userPoints = 1250,
  onDispatchMission,
  onBuyItem,
  onOpenMacroMap,
  onOpenTrainSchedule,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport Pan & Zoom
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: -20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Hover & Active Selection State
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>('company-shadowmove');
  const [isSupermarketOpen, setIsSupermarketOpen] = useState(false);
  const [purchaseToast, setPurchaseToast] = useState('');

  // Dispatch Form in Drawer
  const [dispatchAgentId, setDispatchAgentId] = useState<string>(agents[0]?.id || '');
  const [dispatchCommuteMode, setDispatchCommuteMode] = useState<CommuteMode>('bullet_train');
  const [dispatchMissionType, setDispatchMissionType] = useState<TravelMissionType>('b2b_pitch');

  // Isometric Grid Projection Math (2:1 Trimetric)
  const TILE_W = 64;
  const TILE_H = 32;

  const worldToIso = useCallback(
    (wx: number, wz: number, width: number, height: number) => {
      const centerX = width / 2 + pan.x;
      const centerY = height / 2 + pan.y;
      const isoX = (wx - wz) * (TILE_W * 0.5 * zoom) + centerX;
      const isoY = (wx + wz) * (TILE_H * 0.5 * zoom) + centerY;
      return { isoX, isoY };
    },
    [pan.x, pan.y, zoom]
  );

  // Pointer Drag & Pan
  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (isDragging) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
      return;
    }

    const width = canvasRef.current.width / (window.devicePixelRatio || 1);
    const height = canvasRef.current.height / (window.devicePixelRatio || 1);

    // Hit-testing against distinct city landmark locations:
    // 1. ShadowMove HQ (wx: -7.5, wz: -6.5)
    // 2. NusaNova Cloud (wx: 7.5, wz: -6.5)
    // 3. Kopi & Koding (wx: -7.5, wz: 6.5)
    // 4. CyberFin Asset (wx: 7.5, wz: 6.5)
    // 5. Stasiun Sentral Gambir (wx: 0.0, wz: 13.5)
    // 6. SuperMart 24/7 (wx: -12.5, wz: 0.0)
    // 7. City Central Fountain Plaza (wx: 0.0, wz: 0.0)
    const landmarks = [
      { id: 'company-shadowmove', wx: -7.5, wz: -6.5, radius: 55 },
      { id: 'company-nusanova', wx: 7.5, wz: -6.5, radius: 55 },
      { id: 'company-kopi-koding', wx: -7.5, wz: 6.5, radius: 50 },
      { id: 'company-cyber-fin', wx: 7.5, wz: 6.5, radius: 55 },
      { id: 'stasiun-gambir', wx: 0.0, wz: 13.5, radius: 60 },
      { id: 'supermart-247', wx: -12.5, wz: 0.0, radius: 45 },
    ];

    let found: string | null = null;
    for (const lm of landmarks) {
      const pos = worldToIso(lm.wx, lm.wz, width, height);
      const dist = Math.hypot(clientX - pos.isoX, clientY - (pos.isoY - 25 * zoom));
      if (dist < lm.radius * zoom) {
        found = lm.id;
        break;
      }
    }
    setHoveredBuildingId(found);
  };

  const handlePointerUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    const dx = Math.abs(e.clientX - (dragStartRef.current.x + pan.x));
    const dy = Math.abs(e.clientY - (dragStartRef.current.y + pan.y));
    if (dx < 6 && dy < 6 && hoveredBuildingId) {
      if (hoveredBuildingId === 'supermart-247') {
        setIsSupermarketOpen(true);
      } else if (hoveredBuildingId === 'stasiun-gambir') {
        if (onOpenTrainSchedule) onOpenTrainSchedule();
      } else {
        setSelectedBuildingId(hoveredBuildingId);
        setIsSupermarketOpen(false);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const newZoom = Math.min(2.0, Math.max(0.65, zoom - e.deltaY * 0.0012));
    setZoom(newZoom);
  };

  const handleResetCamera = () => {
    setZoom(1.0);
    setPan({ x: 0, y: -20 });
  };

  // Main Render Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const render = () => {
      const now = performance.now();
      const timeSec = now / 1000;
      animId = requestAnimationFrame(render);

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

      // Coordinate converter helper
      const toIso = (wx: number, wz: number) => worldToIso(wx, wz, width, height);

      // Point type accepting either iso coordinates or raw canvas points
      type Point = { x: number; y: number } | { isoX: number; isoY: number };
      const getPt = (p: Point) => ({
        x: 'isoX' in p ? p.isoX : p.x,
        y: 'isoY' in p ? p.isoY : p.y,
      });

      // Polygon drawing helper
      const drawPoly = (
        pts: Point[],
        fillColor: string | CanvasGradient,
        strokeColor?: string,
        strokeW: number = 1
      ) => {
        if (pts.length < 3) return;
        const p0 = getPt(pts[0]);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < pts.length; i++) {
          const pt = getPt(pts[i]);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        if (strokeColor) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeW;
          ctx.stroke();
        }
      };

      // 3D Isometric box projection helper
      const drawIsoBox = (
        cx: number,
        cz: number,
        halfW: number,
        halfD: number,
        heightPx: number,
        topColor: string,
        leftColor: string,
        rightColor: string,
        strokeColor?: string
      ) => {
        const h = heightPx * zoom;
        const bTL = toIso(cx - halfW, cz - halfD);
        const bTR = toIso(cx + halfW, cz - halfD);
        const bBR = toIso(cx + halfW, cz + halfD);
        const bBL = toIso(cx - halfW, cz + halfD);

        const tTL = { x: bTL.isoX, y: bTL.isoY - h };
        const tTR = { x: bTR.isoX, y: bTR.isoY - h };
        const tBR = { x: bBR.isoX, y: bBR.isoY - h };
        const tBL = { x: bBL.isoX, y: bBL.isoY - h };

        // Soft ground shadow
        drawPoly(
          [
            { x: bBL.isoX - 8 * zoom, y: bBL.isoY + 4 * zoom },
            { x: bBR.isoX + 8 * zoom, y: bBR.isoY + 4 * zoom },
            { x: bTR.isoX + 8 * zoom, y: bTR.isoY - 2 * zoom },
            { x: bTL.isoX - 8 * zoom, y: bTL.isoY - 2 * zoom },
          ],
          'rgba(15, 23, 42, 0.18)'
        );

        // Left Face (West-facing, softer shadow)
        drawPoly([bBL, tBL, tTL, bTL], leftColor, strokeColor, 1);
        // Right Face (South-facing, direct ambient)
        drawPoly([bBL, tBL, tBR, bBR], rightColor, strokeColor, 1);
        // Top Roof Surface (Sunlit)
        drawPoly([tTL, tTR, tBR, tBL], topColor, strokeColor, 1);

        return { tTL, tTR, tBR, tBL, bBL, bBR };
      };

      // =========================================================
      // 1. CITY GROUND FOUNDATION & METROPOLITAN SOIL
      // =========================================================
      const gTL = toIso(-24, -20);
      const gTR = toIso(24, -20);
      const gBR = toIso(24, 22);
      const gBL = toIso(-24, 22);

      // Warm parchment city ground plinth
      drawPoly([gTL, gTR, gBR, gBL], '#f6ede0', '#d6c5ad', 2 * zoom);

      // Subtle architectural city grid guidelines
      ctx.strokeStyle = 'rgba(214, 197, 173, 0.45)';
      ctx.lineWidth = 1;
      for (let gx = -22; gx <= 22; gx += 4) {
        const p1 = toIso(gx, -20);
        const p2 = toIso(gx, 22);
        ctx.beginPath();
        ctx.moveTo(p1.isoX, p1.isoY);
        ctx.lineTo(p2.isoX, p2.isoY);
        ctx.stroke();
      }
      for (let gz = -18; gz <= 20; gz += 4) {
        const p1 = toIso(-24, gz);
        const p2 = toIso(24, gz);
        ctx.beginPath();
        ctx.moveTo(p1.isoX, p1.isoY);
        ctx.lineTo(p2.isoX, p2.isoY);
        ctx.stroke();
      }

      // =========================================================
      // 2. CITY AVENUES & ASPHALT ROAD INTERSECTIONS
      // =========================================================
      // Main Avenue 1: Sudirman-Thamrin Central Boulevard (Runs along X-axis, wz: -2 to +2)
      const av1TL = toIso(-24, -2.2);
      const av1TR = toIso(24, -2.2);
      const av1BR = toIso(24, 2.2);
      const av1BL = toIso(-24, 2.2);
      drawPoly([av1TL, av1TR, av1BR, av1BL], '#1e293b', '#64748b', 1.5 * zoom);

      // Main Avenue 2: Gatot Subroto Cross Avenue (Runs along Z-axis, wx: -2 to +2)
      const av2TL = toIso(-2.2, -20);
      const av2TR = toIso(2.2, -20);
      const av2BR = toIso(2.2, 18);
      const av2BL = toIso(-2.2, 18);
      drawPoly([av2TL, av2TR, av2BR, av2BL], '#1e293b', '#64748b', 1.5 * zoom);

      // Double Yellow Center Divider Lines on Avenues
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.4 * zoom;
      ctx.setLineDash([8 * zoom, 6 * zoom]);

      // West & East Avenue Dividers
      const divW1 = toIso(-24, 0);
      const divW2 = toIso(-2.2, 0);
      ctx.beginPath();
      ctx.moveTo(divW1.isoX, divW1.isoY);
      ctx.lineTo(divW2.isoX, divW2.isoY);
      ctx.stroke();

      const divE1 = toIso(2.2, 0);
      const divE2 = toIso(24, 0);
      ctx.beginPath();
      ctx.moveTo(divE1.isoX, divE1.isoY);
      ctx.lineTo(divE2.isoX, divE2.isoY);
      ctx.stroke();

      // North & South Avenue Dividers
      const divN1 = toIso(0, -20);
      const divN2 = toIso(0, -2.2);
      ctx.beginPath();
      ctx.moveTo(divN1.isoX, divN1.isoY);
      ctx.lineTo(divN2.isoX, divN2.isoY);
      ctx.stroke();

      const divS1 = toIso(0, 2.2);
      const divS2 = toIso(0, 18);
      ctx.beginPath();
      ctx.moveTo(divS1.isoX, divS1.isoY);
      ctx.lineTo(divS2.isoX, divS2.isoY);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Central Intersection Zebra Crosswalks (Roundabout / 4-way crosswalk)
      ctx.fillStyle = '#ffffff';
      [-1.8, -0.6, 0.6, 1.8].forEach((crossOffset) => {
        // Crosswalk West entrance
        const cwW1 = toIso(-2.4, crossOffset - 0.2);
        const cwW2 = toIso(-2.4, crossOffset + 0.2);
        const cwW3 = toIso(-3.2, crossOffset + 0.2);
        const cwW4 = toIso(-3.2, crossOffset - 0.2);
        drawPoly([cwW1, cwW2, cwW3, cwW4], '#ffffff');

        // Crosswalk East entrance
        const cwE1 = toIso(2.4, crossOffset - 0.2);
        const cwE2 = toIso(2.4, crossOffset + 0.2);
        const cwE3 = toIso(3.2, crossOffset + 0.2);
        const cwE4 = toIso(3.2, crossOffset - 0.2);
        drawPoly([cwE1, cwE2, cwE3, cwE4], '#ffffff');
      });

      // =========================================================
      // 3. MOVING CITY TRAFFIC (TAXIS, CARS, VANS)
      // =========================================================
      const drawTrafficCar = (
        carX: number,
        carZ: number,
        color: string,
        isTaxi = false
      ) => {
        const cIso = toIso(carX, carZ);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cIso.isoX, cIso.isoY, 12 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();

        // Car Body (Low poly isometric vehicle)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(cIso.isoX - 10 * zoom, cIso.isoY - 14 * zoom, 20 * zoom, 10 * zoom, 3 * zoom);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Windshield & Roof
        ctx.fillStyle = 'rgba(186, 230, 253, 0.9)';
        ctx.fillRect(cIso.isoX - 6 * zoom, cIso.isoY - 18 * zoom, 12 * zoom, 5 * zoom);
        ctx.fillStyle = color;
        ctx.fillRect(cIso.isoX - 5 * zoom, cIso.isoY - 20 * zoom, 10 * zoom, 3 * zoom);

        if (isTaxi) {
          ctx.fillStyle = '#facc15';
          ctx.fillRect(cIso.isoX - 3 * zoom, cIso.isoY - 22 * zoom, 6 * zoom, 2 * zoom);
        }

        // Headlights
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(cIso.isoX + 9 * zoom, cIso.isoY - 9 * zoom, 1.8 * zoom, 0, Math.PI * 2);
        ctx.fill();
      };

      // Car 1: NYC Classic Yellow Taxi driving East
      const car1X = -24 + (((timeSec * 5.0) + 4) % 48);
      if (Math.abs(car1X) > 2.5) {
        drawTrafficCar(car1X, 1.0, '#eab308', true);
      }

      // Car 2: Pearl White SUV driving West
      const car2X = 24 - (((timeSec * 4.5) + 12) % 48);
      if (Math.abs(car2X) > 2.5) {
        drawTrafficCar(car2X, -1.0, '#f8fafc', false);
      }

      // Car 3: Cyber-Cyan Coupe driving South
      const car3Z = -20 + (((timeSec * 4.2) + 8) % 38);
      if (Math.abs(car3Z) > 2.5) {
        drawTrafficCar(1.0, car3Z, '#06b6d4', false);
      }

      // =========================================================
      // 4. CENTRAL CITY FOUNTAIN PLAZA (Intersection Hub)
      // =========================================================
      const fCenter = toIso(0, 0);
      // Plaza circle stone
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(fCenter.isoX, fCenter.isoY, 18 * zoom, 10 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5 * zoom;
      ctx.stroke();

      // Fountain Basin
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(fCenter.isoX, fCenter.isoY - 2 * zoom, 12 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      // Water fountain spray animation
      const sprayBounce = Math.sin(timeSec * 6) * 3 * zoom;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fCenter.isoX, fCenter.isoY - 8 * zoom - sprayBounce, 2.5 * zoom, 0, Math.PI * 2);
      ctx.fill();

      // =========================================================
      // 5. CORPORATE HEADQUARTERS 1: SHADOWMOVE INC (HQ Anda)
      // =========================================================
      // Location: North-West Block (wx: -7.5, wz: -6.5)
      const smHovered = hoveredBuildingId === 'company-shadowmove';
      const smSelected = selectedBuildingId === 'company-shadowmove';

      // Company Sidewalk Base Slab
      drawIsoBox(-7.5, -6.5, 4.2, 4.2, 4, '#faf5eb', '#d6c5ad', '#bfa588');

      // Main Glass Corporate Tower (2-Tier Cascading Glass Skyscraper)
      // Tier 1 Base
      drawIsoBox(
        -7.5,
        -6.5,
        3.2,
        3.2,
        64,
        smHovered || smSelected ? '#fef3e7' : '#e0f2fe',
        '#0284c7',
        '#0369a1',
        smSelected ? '#c85a2b' : undefined
      );

      // Tier 2 Top Penthouse
      drawIsoBox(
        -7.5,
        -6.5,
        2.2,
        2.2,
        96,
        '#bae6fd',
        '#0369a1',
        '#075985'
      );

      // Rooftop Spire & Telecommunications Mast
      const smRoofIso = toIso(-7.5, -6.5);
      const spireY = smRoofIso.isoY - 96 * zoom;
      ctx.strokeStyle = '#c85a2b';
      ctx.lineWidth = 2 * zoom;
      ctx.beginPath();
      ctx.moveTo(smRoofIso.isoX, spireY);
      ctx.lineTo(smRoofIso.isoX, spireY - 22 * zoom);
      ctx.stroke();

      // Spire Glowing Beacon Light
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(smRoofIso.isoX, spireY - 22 * zoom, (Math.sin(timeSec * 8) > 0 ? 3 : 1.5) * zoom, 0, Math.PI * 2);
      ctx.fill();

      // ShadowMove Neon Signboard Billboard
      const smSignY = smRoofIso.isoY - 60 * zoom;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(smRoofIso.isoX - 28 * zoom, smSignY - 8 * zoom, 56 * zoom, 16 * zoom, 3 * zoom);
      ctx.fill();
      ctx.strokeStyle = smSelected || smHovered ? '#ea580c' : '#c85a2b';
      ctx.lineWidth = 1.6 * zoom;
      ctx.stroke();

      ctx.fillStyle = '#fbf7ee';
      ctx.font = `bold ${Math.max(4.5, Math.floor(4.8 * zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏢 SHADOWMOVE (HQ)', smRoofIso.isoX, smSignY - 1.5 * zoom);
      ctx.fillStyle = '#fdeed9';
      ctx.font = `bold ${Math.max(3.2, Math.floor(3.4 * zoom))}px monospace`;
      ctx.fillText('KANTOR ANDA • LV 3', smRoofIso.isoX, smSignY + 4 * zoom);

      // =========================================================
      // 6. CORPORATE HEADQUARTERS 2: NUSANOVA CLOUD SYSTEMS
      // =========================================================
      // Location: North-East Block (wx: 7.5, wz: -6.5)
      const nnHovered = hoveredBuildingId === 'company-nusanova';
      const nnSelected = selectedBuildingId === 'company-nusanova';

      // Sidewalk Base Slab
      drawIsoBox(7.5, -6.5, 4.2, 4.2, 4, '#faf5eb', '#d6c5ad', '#bfa588');

      // Hyper-Scale Server Complex (Twin Server Vaults with Cooling Tower)
      drawIsoBox(
        6.5,
        -6.5,
        2.2,
        3.0,
        56,
        nnHovered || nnSelected ? '#e0f2fe' : '#f1f5f9',
        '#334155',
        '#1e293b',
        nnSelected ? '#0284c7' : undefined
      );
      drawIsoBox(
        9.0,
        -6.5,
        1.8,
        2.6,
        74,
        '#38bdf8',
        '#0284c7',
        '#0369a1'
      );

      // Rooftop Satellite Parabolic Dish
      const nnRoofIso = toIso(9.0, -6.5);
      const dishY = nnRoofIso.isoY - 74 * zoom;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2 * zoom;
      ctx.beginPath();
      ctx.moveTo(nnRoofIso.isoX, dishY);
      ctx.lineTo(nnRoofIso.isoX + 4 * zoom, dishY - 12 * zoom);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(nnRoofIso.isoX + 4 * zoom, dishY - 12 * zoom, 6 * zoom, 4 * zoom, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Cyan LED Server Louvers
      const nnSignY = nnRoofIso.isoY - 50 * zoom;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(nnRoofIso.isoX - 28 * zoom, nnSignY - 8 * zoom, 56 * zoom, 16 * zoom, 3 * zoom);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.4 * zoom;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = `bold ${Math.max(4.5, Math.floor(4.8 * zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☁️ NUSANOVA CLOUD', nnRoofIso.isoX, nnSignY - 1.5 * zoom);
      ctx.fillStyle = '#94a3b8';
      ctx.font = `bold ${Math.max(3.2, Math.floor(3.4 * zoom))}px monospace`;
      ctx.fillText('KUBERNETES MESH • LV 4', nnRoofIso.isoX, nnSignY + 4 * zoom);

      // =========================================================
      // 7. CORPORATE HEADQUARTERS 3: KOPI & KODING LABS
      // =========================================================
      // Location: South-West Block (wx: -7.5, wz: 6.5)
      const kkHovered = hoveredBuildingId === 'company-kopi-koding';
      const kkSelected = selectedBuildingId === 'company-kopi-koding';

      // Sidewalk Base Slab
      drawIsoBox(-7.5, 6.5, 4.2, 4.2, 4, '#faf5eb', '#d6c5ad', '#bfa588');

      // Red-Brick Industrial Loft Studio with Warm Rooftop Deck
      drawIsoBox(
        -7.5,
        6.5,
        3.2,
        3.0,
        46,
        kkHovered || kkSelected ? '#fdeed9' : '#b45309',
        '#78350f',
        '#451a03',
        kkSelected ? '#d97706' : undefined
      );

      // Outdoor Cafe Barista Awning on Ground Floor
      const kkBaseIso = toIso(-7.5, 8.2);
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(kkBaseIso.isoX - 12 * zoom, kkBaseIso.isoY - 14 * zoom, 24 * zoom, 6 * zoom, 2 * zoom);
      ctx.fill();

      // Rooftop Coffee Cup & Steam
      const kkRoofIso = toIso(-7.5, 6.5);
      const kkSignY = kkRoofIso.isoY - 46 * zoom;

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(kkRoofIso.isoX - 26 * zoom, kkSignY - 8 * zoom, 52 * zoom, 16 * zoom, 3 * zoom);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.4 * zoom;
      ctx.stroke();

      ctx.fillStyle = '#fde68a';
      ctx.font = `bold ${Math.max(4.5, Math.floor(4.8 * zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☕ KOPI & KODING', kkRoofIso.isoX, kkSignY - 1.5 * zoom);
      ctx.fillStyle = '#d97706';
      ctx.font = `bold ${Math.max(3.2, Math.floor(3.4 * zoom))}px monospace`;
      ctx.fillText('DEV TOOLS • LV 2', kkRoofIso.isoX, kkSignY + 4 * zoom);

      // =========================================================
      // 8. CORPORATE HEADQUARTERS 4: CYBERFIN QUANTITATIVE ASSET
      // =========================================================
      // Location: South-East Block (wx: 7.5, wz: 6.5)
      const cfHovered = hoveredBuildingId === 'company-cyber-fin';
      const cfSelected = selectedBuildingId === 'company-cyber-fin';

      // Sidewalk Base Slab
      drawIsoBox(7.5, 6.5, 4.2, 4.2, 4, '#faf5eb', '#d6c5ad', '#bfa588');

      // Futuristic Black Obsidian Financial Monolith
      drawIsoBox(
        7.5,
        6.5,
        3.0,
        3.0,
        82,
        cfHovered || cfSelected ? '#1e293b' : '#090d16',
        '#020617',
        '#0f172a',
        cfSelected ? '#10b981' : '#334155'
      );

      // Live Scrolling Green Stock Ticker across Monolith Facade
      const cfRoofIso = toIso(7.5, 6.5);
      const cfSignY = cfRoofIso.isoY - 82 * zoom;

      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.roundRect(cfRoofIso.isoX - 28 * zoom, cfSignY - 8 * zoom, 56 * zoom, 16 * zoom, 3 * zoom);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.4 * zoom;
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = `bold ${Math.max(4.5, Math.floor(4.8 * zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📈 CYBERFIN ASSET', cfRoofIso.isoX, cfSignY - 1.5 * zoom);
      ctx.fillStyle = '#10b981';
      ctx.font = `bold ${Math.max(3.2, Math.floor(3.4 * zoom))}px monospace`;
      ctx.fillText('FINTECH CORE • LV 5', cfRoofIso.isoX, cfSignY + 4 * zoom);

      // =========================================================
      // 9. SUPERMARKET: VIGENT SUPERMART 24/7 (Commercial Corner)
      // =========================================================
      // Location: West Promenade Corner (wx: -12.5, wz: 0.0)
      const smartHovered = hoveredBuildingId === 'supermart-247';

      drawIsoBox(-12.5, 0.0, 3.2, 3.0, 32, smartHovered ? '#fef3e7' : '#f8fafc', '#dc2626', '#991b1b', smartHovered ? '#c85a2b' : undefined);

      // Red & Green Striped Awning
      const smartAwningIso = toIso(-12.5, 1.8);
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.roundRect(smartAwningIso.isoX - 14 * zoom, smartAwningIso.isoY - 18 * zoom, 28 * zoom, 6 * zoom, 2 * zoom);
      ctx.fill();

      // Vending Machine Beside Store
      const vendIso = toIso(-10.5, 1.8);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(vendIso.isoX, vendIso.isoY - 16 * zoom, 6 * zoom, 12 * zoom);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(vendIso.isoX + 1 * zoom, vendIso.isoY - 14 * zoom, 4 * zoom, 4 * zoom);

      // SuperMart Illuminated Roof Sign
      const smartRoofIso = toIso(-12.5, 0.0);
      const smartSignY = smartRoofIso.isoY - 32 * zoom;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(smartRoofIso.isoX - 26 * zoom, smartSignY - 8 * zoom, 52 * zoom, 16 * zoom, 3 * zoom);
      ctx.fill();
      ctx.strokeStyle = smartHovered ? '#ea580c' : '#16a34a';
      ctx.lineWidth = 1.6 * zoom;
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.font = `bold ${Math.max(4.5, Math.floor(4.8 * zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛒 SUPERMART 24/7', smartRoofIso.isoX, smartSignY - 1.5 * zoom);
      ctx.fillStyle = '#86efac';
      ctx.font = `bold ${Math.max(3.2, Math.floor(3.4 * zoom))}px monospace`;
      ctx.fillText('SNACK & KOPI • KLIK SHOP', smartRoofIso.isoX, smartSignY + 4 * zoom);

      // =========================================================
      // 10. STASIUN KERETA SENTRAL GAMBIR (Aerorail Transit Terminal)
      // =========================================================
      // Location: South Transit Hub (wx: 0.0, wz: 13.5)
      const stHovered = hoveredBuildingId === 'stasiun-gambir';

      // Elevated Aerorail Station Platform Base
      drawIsoBox(0.0, 13.5, 7.5, 2.5, 18, stHovered ? '#eef2ff' : '#f1f5f9', '#475569', '#334155', stHovered ? '#4f46e5' : undefined);

      // Twin Aerorail Track Rails along wz = 14.8
      [14.2, 14.8].forEach((rz) => {
        const tr1 = toIso(-7.5, rz);
        const tr2 = toIso(7.5, rz);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2 * zoom;
        ctx.beginPath();
        ctx.moveTo(tr1.isoX, tr1.isoY);
        ctx.lineTo(tr2.isoX, tr2.isoY);
        ctx.stroke();
      });

      // Whoosh Express Bullet Train Docked at Station Platform
      const trainNose = toIso(5.5, 14.5);
      const trainTail = toIso(-5.5, 14.5);
      const trainBounce = Math.sin(timeSec * 3) * 0.3 * zoom;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(trainTail.isoX, trainTail.isoY - 16 * zoom + trainBounce, (trainNose.isoX - trainTail.isoX), 12 * zoom, 4 * zoom);
      ctx.fill();
      ctx.strokeStyle = '#c85a2b';
      ctx.lineWidth = 1.4 * zoom;
      ctx.stroke();

      // Speed Stripe & Tinted Windows
      ctx.fillStyle = '#c85a2b';
      ctx.fillRect(trainTail.isoX, trainTail.isoY - 9 * zoom + trainBounce, (trainNose.isoX - trainTail.isoX), 2 * zoom);
      ctx.fillStyle = '#0f172a';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(trainTail.isoX + 6 * zoom + i * 14 * zoom, trainTail.isoY - 14 * zoom + trainBounce, 8 * zoom, 4 * zoom);
      }

      // Station Curved Glass Roof Canopy
      const stRoofIso = toIso(0.0, 13.5);
      const stCanopyY = stRoofIso.isoY - 24 * zoom;
      ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
      ctx.beginPath();
      ctx.roundRect(stRoofIso.isoX - 44 * zoom, stCanopyY - 12 * zoom, 88 * zoom, 16 * zoom, 6 * zoom);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.8 * zoom;
      ctx.stroke();

      // Station Illuminated Board
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(stRoofIso.isoX - 36 * zoom, stCanopyY - 22 * zoom, 72 * zoom, 16 * zoom, 3 * zoom);
      ctx.fill();
      ctx.strokeStyle = stHovered ? '#ea580c' : '#4f46e5';
      ctx.lineWidth = 1.5 * zoom;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = `bold ${Math.max(4.5, Math.floor(4.8 * zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚆 STASIUN SENTRAL GAMBIR', stRoofIso.isoX, stCanopyY - 15.5 * zoom);
      ctx.fillStyle = '#38bdf8';
      ctx.font = `bold ${Math.max(3.2, Math.floor(3.4 * zoom))}px monospace`;
      ctx.fillText('AERORAIL 350 KM/H • JALUR WHOOSH', stRoofIso.isoX, stCanopyY - 10 * zoom);

      // =========================================================
      // 11. HOVER TOOLTIP BADGE
      // =========================================================
      if (hoveredBuildingId) {
        let title = '';
        let subtitle = '';
        let badgeColor = '#c85a2b';
        let tx = 0;
        let ty = 0;

        if (hoveredBuildingId === 'company-shadowmove') {
          title = '🏢 ShadowMove Inc (Kantor Anda)';
          subtitle = 'Autonomous AI & 3D Interactive Web • Level 3';
          badgeColor = '#c85a2b';
          const p = toIso(-7.5, -6.5);
          tx = p.isoX;
          ty = p.isoY - 110 * zoom;
        } else if (hoveredBuildingId === 'company-nusanova') {
          title = '☁️ NusaNova Cloud Systems';
          subtitle = 'Distributed Cloud & Kubernetes Mesh • Level 4';
          badgeColor = '#0284c7';
          const p = toIso(7.5, -6.5);
          tx = p.isoX;
          ty = p.isoY - 85 * zoom;
        } else if (hoveredBuildingId === 'company-kopi-koding') {
          title = '☕ Kopi & Koding Labs';
          subtitle = 'Mobile Apps, Flutter & Dev Tools • Level 2';
          badgeColor = '#d97706';
          const p = toIso(-7.5, 6.5);
          tx = p.isoX;
          ty = p.isoY - 60 * zoom;
        } else if (hoveredBuildingId === 'company-cyber-fin') {
          title = '📈 CyberFin Quantitative Asset';
          subtitle = 'Algorithmic Trading & FinTech Engine • Level 5';
          badgeColor = '#10b981';
          const p = toIso(7.5, 6.5);
          tx = p.isoX;
          ty = p.isoY - 95 * zoom;
        } else if (hoveredBuildingId === 'stasiun-gambir') {
          title = '🚆 Stasiun Sentral Gambir Aerorail';
          subtitle = 'Akses Kereta Cepat ke Bandung, Surabaya, Bali, IKN';
          badgeColor = '#4f46e5';
          const p = toIso(0.0, 13.5);
          tx = p.isoX;
          ty = p.isoY - 45 * zoom;
        } else if (hoveredBuildingId === 'supermart-247') {
          title = '🛒 Vigent SuperMart 24/7';
          subtitle = 'Beli Kopi, Snack Koding, dan Perlengkapan Kantor';
          badgeColor = '#16a34a';
          const p = toIso(-12.5, 0.0);
          tx = p.isoX;
          ty = p.isoY - 45 * zoom;
        }

        ctx.font = `bold ${Math.max(5, Math.floor(5.2 * zoom))}px sans-serif`;
        const tipW = Math.max(ctx.measureText(title).width, ctx.measureText(subtitle).width) + 16 * zoom;
        const tipH = 22 * zoom;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.beginPath();
        ctx.roundRect(tx - tipW / 2, ty - tipH / 2, tipW, tipH, 5 * zoom);
        ctx.fill();
        ctx.strokeStyle = badgeColor;
        ctx.lineWidth = 1.5 * zoom;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, tx, ty - 3.5 * zoom);
        ctx.fillStyle = '#94a3b8';
        ctx.font = `normal ${Math.max(3.8, Math.floor(4 * zoom))}px sans-serif`;
        ctx.fillText(subtitle, tx, ty + 4 * zoom);
      }

      ctx.restore();
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [district, hoveredBuildingId, selectedBuildingId, worldToIso, zoom]);

  // Selected Company Information
  const selectedCompany = district.companies.find((c) => c.id === selectedBuildingId);
  const isMyCompanySelected = selectedCompany?.id === currentCompany.id;

  const handleDispatchToSelected = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !onDispatchMission) return;
    onDispatchMission({
      agentId: dispatchAgentId,
      targetCompanyId: selectedCompany.id,
      targetCompanyName: selectedCompany.name,
      commuteMode: dispatchCommuteMode,
      missionType: dispatchMissionType,
    });
  };

  const handleBuySupermarket = (item: SupermarketItem) => {
    if (onBuyItem) {
      onBuyItem(item);
    }
    setPurchaseToast(`🛒 Berhasil membeli ${item.name}! (${item.effect})`);
    setTimeout(() => setPurchaseToast(''), 4000);
  };

  return (
    <div className="relative w-full h-full flex flex-col sm:flex-row overflow-hidden bg-[#fbf7ee] text-[#2c231c]">
      {/* 1. Main 2.5D Canvas Viewport */}
      <div className="relative flex-1 h-full overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onWheel={handleWheel}
          className={`w-full h-full block ${isDragging ? 'cursor-grabbing' : hoveredBuildingId ? 'cursor-pointer' : 'cursor-grab'}`}
        />

        {/* Floating Quick Action Overlay Controls */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-auto">
          <div className="bg-[#faf5eb]/95 backdrop-blur-md border border-[#d6c5ad] px-3 py-1.5 rounded-xl shadow-md flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-[#2c231c]">
              Distrik {district.name.split(' ')[0]} ({district.companies.length} Perusahaan)
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-[#f0e3ce] text-[#784620] rounded font-mono font-bold">
              {district.codename}
            </span>
          </div>

          <button
            onClick={() => setIsSupermarketOpen(true)}
            className="bg-[#16a34a] hover:bg-[#15803d] text-white px-3 py-1.5 rounded-xl shadow-md text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Buka Vigent SuperMart 24/7 (Belanja Kopi & Snack Kantor)"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>SuperMart 24/7</span>
          </button>

          {onOpenMacroMap && (
            <button
              onClick={onOpenMacroMap}
              className="bg-[#fffdf9] hover:bg-[#ede2d1] text-[#786653] hover:text-[#2c231c] border border-[#d6c5ad] px-2.5 py-1.5 rounded-xl shadow-sm text-xs font-semibold flex items-center gap-1 transition-all"
              title="Kembali ke Peta Makro 5 Sektor Indonesia"
            >
              <Compass className="w-3.5 h-3.5 text-[#c85a2b]" />
              <span className="hidden sm:inline">Peta Makro</span>
            </button>
          )}
        </div>

        {/* Camera Zoom & Reset Controls (Bottom Left) */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 bg-[#faf5eb]/95 backdrop-blur-md border border-[#d6c5ad] p-1 rounded-xl shadow-md pointer-events-auto">
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
            className="p-1.5 hover:bg-[#ede2d1] rounded-lg text-[#786653] hover:text-[#2c231c] transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.65, z - 0.15))}
            className="p-1.5 hover:bg-[#ede2d1] rounded-lg text-[#786653] hover:text-[#2c231c] transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetCamera}
            className="p-1.5 hover:bg-[#ede2d1] rounded-lg text-[#786653] hover:text-[#2c231c] transition-colors"
            title="Reset Sudut Pandang"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Purchase Notification Toast */}
        {purchaseToast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-[#e6f4ea] border border-[#34a853] text-[#137333] px-4 py-2 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#137333]" />
            <span>{purchaseToast}</span>
          </div>
        )}
      </div>

      {/* 2. Side Panel / Interactive Drawer */}
      <div className="w-full sm:w-80 md:w-96 bg-[#fffdf9] border-t sm:border-t-0 sm:border-l-2 border-[#d6c5ad] flex flex-col h-72 sm:h-full shrink-0 overflow-hidden shadow-xl z-20">
        {/* A. SUPERMARKET 24/7 MODAL DRAWER */}
        {isSupermarketOpen ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-4 bg-[#f0fdf4] border-b border-[#bbf7d0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#22c55e] text-white shadow-xs">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#14532d]">Vigent SuperMart 24/7</h3>
                  <p className="text-[11px] text-[#15803d]">Kantin & Minimarket Digital Distrik Neo-Jakarta</p>
                </div>
              </div>
              <button
                onClick={() => setIsSupermarketOpen(false)}
                className="p-1 text-[#15803d] hover:bg-[#dcfce7] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 flex-1 overflow-y-auto space-y-3">
              <div className="p-2.5 rounded-xl bg-[#fef8e7] border border-[#fde68a] text-[11px] text-[#92400e] flex items-center justify-between">
                <span>Saldo Poin / Koin Anda:</span>
                <span className="font-mono font-bold text-xs text-[#b45309]">🪙 {userPoints} Koin</span>
              </div>

              <div className="space-y-2.5">
                {SUPERMARKET_CATALOG.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#faf5eb] border border-[#d6c5ad] hover:border-[#16a34a] transition-all space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <h4 className="font-bold text-xs text-[#2c231c]">{item.name}</h4>
                          <span className="text-[10px] text-[#15803d] font-semibold">{item.effect}</span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs text-[#b45309] shrink-0">
                        {item.price} Koin
                      </span>
                    </div>

                    <p className="text-[10px] text-[#786653] leading-relaxed">{item.description}</p>

                    <button
                      onClick={() => handleBuySupermarket(item)}
                      className="w-full py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Beli & Kirim ke Kantor</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : selectedCompany ? (
          /* B. COMPANY DETAIL & DISPATCH DRAWER */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-[#f4ebe1] border-b border-[#d6c5ad] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#fdeed9] text-[#c85a2b] border border-[#f0c8a5] shadow-xs">
                  <Building2 className="w-5 h-5 text-[#c85a2b]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-[#2c231c]">{selectedCompany.name}</h3>
                    {isMyCompanySelected && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#c85a2b] text-white rounded font-bold">
                        HQ Anda
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#786653]">{selectedCompany.industry}</p>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
              {/* Badge & Owner specs */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-[#faf5eb] border border-[#ede2d1]">
                  <span className="text-[#9e8b78] block text-[9px]">Pimpinan / Owner:</span>
                  <strong className="text-[#2c231c]">{selectedCompany.ownerName}</strong>
                </div>
                <div className="p-2 rounded-xl bg-[#faf5eb] border border-[#ede2d1]">
                  <span className="text-[#9e8b78] block text-[9px]">Arsitektur Gedung:</span>
                  <strong className="text-[#2c231c]">{selectedCompany.buildingType}</strong>
                </div>
                <div className="p-2 rounded-xl bg-[#faf5eb] border border-[#ede2d1]">
                  <span className="text-[#9e8b78] block text-[9px]">Reputasi Bisnis:</span>
                  <strong className="text-[#15803d]">★ {selectedCompany.reputation}% Terpercaya</strong>
                </div>
                <div className="p-2 rounded-xl bg-[#faf5eb] border border-[#ede2d1]">
                  <span className="text-[#9e8b78] block text-[9px]">Level Gedung:</span>
                  <strong className="text-[#c85a2b]">Level {selectedCompany.level}</strong>
                </div>
              </div>

              {/* Specialization */}
              <div className="p-2.5 rounded-xl bg-[#faf5eb] border border-[#ede2d1] text-[11px]">
                <span className="text-[10px] text-[#786653] font-bold block mb-0.5">Spesialisasi Teknologi:</span>
                <span className="text-[#2c231c] font-medium">{selectedCompany.specialization}</span>
              </div>

              {/* Open Bounties / Project Tiket */}
              {selectedCompany.openBounties && selectedCompany.openBounties.length > 0 && (
                <div className="space-y-2">
                  <div className="font-bold text-[#2c231c] flex items-center justify-between text-xs">
                    <span>Tiket Bounty Terbuka ({selectedCompany.openBounties.length}):</span>
                    <span className="text-[10px] text-[#786653]">Dapat diambil</span>
                  </div>
                  <div className="space-y-2">
                    {selectedCompany.openBounties.map((bounty) => (
                      <div
                        key={bounty.id}
                        className="p-2.5 rounded-xl bg-[#fffdf9] border border-[#d6c5ad] space-y-1"
                      >
                        <div className="font-bold text-[11px] text-[#2c231c]">{bounty.title}</div>
                        <div className="flex items-center justify-between text-[10px] text-[#786653] font-mono">
                          <span className="text-[#137333] font-bold">+{bounty.rewardXp} XP</span>
                          <span className="text-[#b45309] font-bold">+{bounty.budgetCoins} Koin</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Market Offers / Code & License */}
              {selectedCompany.marketOffers && selectedCompany.marketOffers.length > 0 && (
                <div className="space-y-2">
                  <div className="font-bold text-[#2c231c] text-xs">Produk & Lisensi Dijual:</div>
                  <div className="space-y-2">
                    {selectedCompany.marketOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className="p-2.5 rounded-xl bg-[#faf5eb] border border-[#ede2d1] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-[11px] text-[#2c231c]">{offer.title}</strong>
                          <span className="font-mono font-bold text-[10px] text-[#b45309]">
                            {offer.priceCoins} Koin
                          </span>
                        </div>
                        <p className="text-[10px] text-[#786653] leading-relaxed">{offer.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* One-Click Dispatch Form to This Company (If Not User Company) */}
              {!isMyCompanySelected && onDispatchMission && (
                <form
                  onSubmit={handleDispatchToSelected}
                  className="p-3 rounded-2xl bg-[#f4ebe1] border border-[#d6c5ad] space-y-2.5 pt-3"
                >
                  <div className="font-bold text-xs text-[#2c231c] flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Tugaskan Karyawan ke {selectedCompany.name}:</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#786653]">Pilih Karyawan:</label>
                    <select
                      value={dispatchAgentId}
                      onChange={(e) => setDispatchAgentId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#fffdf9] border border-[#d6c5ad] rounded-lg text-xs"
                    >
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name} ({ag.roleTitle})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDispatchCommuteMode('bullet_train')}
                      className={`p-1.5 rounded-lg border text-center transition-all ${
                        dispatchCommuteMode === 'bullet_train'
                          ? 'bg-[#eef2ff] border-[#4f46e5] text-[#4f46e5] font-bold'
                          : 'bg-[#fffdf9] border-[#d6c5ad] text-[#786653]'
                      }`}
                    >
                      🚆 Kereta / Stasiun
                    </button>
                    <button
                      type="button"
                      onClick={() => setDispatchCommuteMode('company_car')}
                      className={`p-1.5 rounded-lg border text-center transition-all ${
                        dispatchCommuteMode === 'company_car'
                          ? 'bg-[#eef2ff] border-[#4f46e5] text-[#4f46e5] font-bold'
                          : 'bg-[#fffdf9] border-[#d6c5ad] text-[#786653]'
                      }`}
                    >
                      🚗 Mobil Kantor
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Karyawan ke Kantor Ini</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-[#786653] flex flex-col items-center justify-center h-full space-y-2">
            <Building2 className="w-8 h-8 text-[#d6c5ad]" />
            <p className="text-xs">Klik salah satu gedung kantor atau supermarket di peta untuk melihat detail.</p>
          </div>
        )}
      </div>
    </div>
  );
};
