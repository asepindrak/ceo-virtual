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
  {
    id: 'sm-nasgor-cyber',
    name: 'Nasi Goreng Spesial Pujasera Cyber',
    category: 'snack',
    price: 95,
    icon: '🍛',
    effect: '+70 Stamina & Mood Booster Sprint Malam',
    description: 'Menu legendaris kantin pujasera samping kantor, disajikan hangat lengkap dengan telur ceplok dan acar.',
  },
  {
    id: 'sm-es-teh',
    name: 'Es Teh Manis Melati Jumbo Segar',
    category: 'drink',
    price: 45,
    icon: '🧋',
    effect: '+30 Mood Penyegar Dahaga Siang Hari',
    description: 'Minuman wajib siang hari khas warung kota para engineer saat rehat sejenak dari sprint back-end.',
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
    // 1. ShadowMove HQ (wx: -6.5, wz: -7.0)
    // 2. NusaNova Cloud (wx: 6.5, wz: -7.0)
    // 3. Kopi & Koding (wx: -6.5, wz: 6.5)
    // 4. CyberFin Asset (wx: 6.5, wz: 6.5)
    // 5. BatikPixel GenAI (wx: 16.0, wz: -7.0)
    // 6. GarudaLogix Fleet (wx: -16.0, wz: -7.0)
    // 7. Stasiun Sentral Gambir (wx: 0.0, wz: 14.5)
    // 8. SuperMart 24/7 (wx: -15.0, wz: 6.5)
    // 9. Cyber Pujasera 24H (wx: 15.0, wz: 6.5)
    const landmarks = [
      { id: 'company-shadowmove', wx: -6.5, wz: -7.0, radius: 55 },
      { id: 'company-nusanova', wx: 6.5, wz: -7.0, radius: 55 },
      { id: 'company-kopi-koding', wx: -6.5, wz: 6.5, radius: 50 },
      { id: 'company-cyber-fin', wx: 6.5, wz: 6.5, radius: 55 },
      { id: 'company-batik-pixel', wx: 16.0, wz: -7.0, radius: 55 },
      { id: 'company-garuda-logix', wx: -16.0, wz: -7.0, radius: 55 },
      { id: 'stasiun-gambir', wx: 0.0, wz: 14.5, radius: 60 },
      { id: 'supermart-247', wx: -15.0, wz: 6.5, radius: 48 },
      { id: 'pujasera-24h', wx: 15.0, wz: 6.5, radius: 48 },
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
      if (hoveredBuildingId === 'supermart-247' || hoveredBuildingId === 'pujasera-24h') {
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

      // Helper: Draw Lush Isometric Trees (as seen in district campus reference)
      const drawTree = (wx: number, wz: number, scale = 1.0) => {
        const tIso = toIso(wx, wz);
        const s = scale * zoom;
        // Ground shadow
        ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
        ctx.beginPath();
        ctx.ellipse(tIso.isoX, tIso.isoY, 8 * s, 4 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(tIso.isoX - 1.5 * s, tIso.isoY - 12 * s, 3 * s, 12 * s);

        // Lower foliage
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(tIso.isoX, tIso.isoY - 15 * s, 9 * s, 0, Math.PI * 2);
        ctx.fill();

        // Upper canopy
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(tIso.isoX - 1.5 * s, tIso.isoY - 18 * s, 7 * s, 0, Math.PI * 2);
        ctx.fill();

        // Canopy highlight
        ctx.fillStyle = '#86efac';
        ctx.beginPath();
        ctx.arc(tIso.isoX - 2.5 * s, tIso.isoY - 20 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();
      };

      // Helper: Draw Mini Real-Time Agents / Employees in Campus Courtyards
      const drawMiniAgent = (
        wx: number,
        wz: number,
        shirtColor: string,
        hairColor: string,
        activity: 'walking' | 'idle' | 'laptop' = 'idle'
      ) => {
        const aIso = toIso(wx, wz);
        const bob = activity === 'walking' ? Math.sin(timeSec * 8 + (wx + wz) * 3) * 1.5 * zoom : 0;

        // Shadow
        ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
        ctx.beginPath();
        ctx.ellipse(aIso.isoX, aIso.isoY, 4 * zoom, 2 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();

        // Torso / Shirt
        ctx.fillStyle = shirtColor;
        ctx.beginPath();
        ctx.roundRect(aIso.isoX - 2.5 * zoom, aIso.isoY - 10 * zoom + bob, 5 * zoom, 6 * zoom, 1.5 * zoom);
        ctx.fill();

        // Head
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(aIso.isoX, aIso.isoY - 12.5 * zoom + bob, 2.8 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = hairColor;
        ctx.beginPath();
        ctx.arc(aIso.isoX, aIso.isoY - 13.8 * zoom + bob, 2.8 * zoom, Math.PI, Math.PI * 2);
        ctx.fill();

        // Laptop prop if typing
        if (activity === 'laptop') {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(aIso.isoX + 1 * zoom, aIso.isoY - 8 * zoom + bob, 4 * zoom, 2.5 * zoom);
        }
      };

      // =========================================================
      // 4. PERIMETER CAMPUS TREES (Matching Reference Screenshot)
      // =========================================================
      const treeCoords = [
        [-22, -18], [-18, -18], [-12, -18], [-2, -18], [2, -18], [12, -18], [18, -18], [22, -18],
        [-22, -12], [-22, -2], [-22, 12], [-22, 18],
        [22, -12], [22, -2], [22, 12], [22, 18],
        [-10, 18], [10, 18],
      ];
      treeCoords.forEach(([tx, tz]) => {
        drawTree(tx, tz, 0.95);
      });

      // =========================================================
      // 5. CENTRAL CITY FOUNTAIN PLAZA (Intersection Hub)
      // =========================================================
      const fCenter = toIso(0, 0);
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(fCenter.isoX, fCenter.isoY, 18 * zoom, 10 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5 * zoom;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(fCenter.isoX, fCenter.isoY - 2 * zoom, 12 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      const sprayBounce = Math.sin(timeSec * 6) * 3 * zoom;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fCenter.isoX, fCenter.isoY - 8 * zoom - sprayBounce, 2.5 * zoom, 0, Math.PI * 2);
      ctx.fill();

      // =========================================================
      // 6. PERUSAHAAN 1: SHADOWMOVE INC (HQ ANDA - LEVEL 3)
      // =========================================================
      // Location: Northwest Core (wx: -6.5, wz: -7.0)
      const smHovered = hoveredBuildingId === 'company-shadowmove';
      const smSelected = selectedBuildingId === 'company-shadowmove';

      drawIsoBox(-6.5, -7.0, 4.2, 4.2, 4, '#faf5eb', '#d6c5ad', '#bfa588');
      drawIsoBox(-6.5, -7.0, 3.2, 3.2, 64, smHovered || smSelected ? '#fef3e7' : '#e0f2fe', '#0284c7', '#0369a1', smSelected ? '#c85a2b' : undefined);
      drawIsoBox(-6.5, -7.0, 2.2, 2.2, 96, '#bae6fd', '#0369a1', '#075985');

      const smRoofIso = toIso(-6.5, -7.0);
      const spireY = smRoofIso.isoY - 96 * zoom;
      ctx.strokeStyle = '#c85a2b';
      ctx.lineWidth = 2 * zoom;
      ctx.beginPath();
      ctx.moveTo(smRoofIso.isoX, spireY);
      ctx.lineTo(smRoofIso.isoX, spireY - 22 * zoom);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(smRoofIso.isoX, spireY - 22 * zoom, (Math.sin(timeSec * 8) > 0 ? 3 : 1.5) * zoom, 0, Math.PI * 2);
      ctx.fill();

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

      // Mini Courtyard Agents at ShadowMove
      drawMiniAgent(-4.8, -4.8, '#c85a2b', '#1e293b', 'walking');
      drawMiniAgent(-8.2, -4.8, '#0284c7', '#d97706', 'laptop');

      // =========================================================
      // 7. PERUSAHAAN 2: NUSANOVA CLOUD SYSTEMS (LEVEL 4)
      // =========================================================
      // Location: Northeast Core (wx: 6.5, wz: -7.0)
      const nnHovered = hoveredBuildingId === 'company-nusanova';
      const nnSelected = selectedBuildingId === 'company-nusanova';

      drawIsoBox(6.5, -7.0, 4.2, 4.2, 4, '#faf5eb', '#d6c5ad', '#bfa588');
      drawIsoBox(5.5, -7.0, 2.2, 3.0, 56, nnHovered || nnSelected ? '#e0f2fe' : '#f1f5f9', '#334155', '#1e293b', nnSelected ? '#0284c7' : undefined);
      drawIsoBox(8.0, -7.0, 1.8, 2.6, 74, '#38bdf8', '#0284c7', '#0369a1');

      const nnRoofIso = toIso(8.0, -7.0);
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

      // Mini Courtyard Agents at NusaNova
      drawMiniAgent(5.0, -4.8, '#0284c7', '#0f172a', 'laptop');
      drawMiniAgent(8.2, -4.8, '#10b981', '#334155', 'idle');

      // =========================================================
      // 8. PERUSAHAAN 3: KOPI & KODING LABS (LEVEL 2)
      // =========================================================
      // Location: Southwest Core (wx: -6.5, wz: 6.5)
      const kkHovered = hoveredBuildingId === 'company-kopi-koding';
      const kkSelected = selectedBuildingId === 'company-kopi-koding';

      drawIsoBox(-6.5, 6.5, 4.2, 4.2, 4, '#faf5eb', '#d6c5ad', '#bfa588');
      drawIsoBox(-6.5, 6.5, 3.2, 3.0, 46, kkHovered || kkSelected ? '#fdeed9' : '#b45309', '#78350f', '#451a03', kkSelected ? '#d97706' : undefined);

      const kkRoofIso = toIso(-6.5, 6.5);
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

      // Mini Agents at Kopi & Koding cafe patio
      drawMiniAgent(-5.0, 4.5, '#ea580c', '#1e293b', 'walking');
      drawMiniAgent(-8.0, 4.5, '#f59e0b', '#78350f', 'idle');

      // =========================================================
      // 9. PERUSAHAAN 4: CYBERFIN QUANTITATIVE ASSET (LEVEL 5)
      // =========================================================
      // Location: Southeast Core (wx: 6.5, wz: 6.5)
      const cfHovered = hoveredBuildingId === 'company-cyber-fin';
      const cfSelected = selectedBuildingId === 'company-cyber-fin';

      drawIsoBox(6.5, 6.5, 4.2, 4.2, 4, '#faf5eb', '#d6c5ad', '#bfa588');
      drawIsoBox(6.5, 6.5, 3.0, 3.0, 82, cfHovered || cfSelected ? '#1e293b' : '#090d16', '#020617', '#0f172a', cfSelected ? '#10b981' : '#334155');

      const cfRoofIso = toIso(6.5, 6.5);
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

      // Mini Agent at CyberFin
      drawMiniAgent(5.0, 4.5, '#059669', '#090d16', 'laptop');

      // =========================================================
      // 10. PERUSAHAAN 5: BATIKPIXEL CREATIVE & GENAI (LEVEL 3)
      // =========================================================
      // Location: Northeast Outer (wx: 16.0, wz: -7.0)
      const bpHovered = hoveredBuildingId === 'company-batik-pixel';
      const bpSelected = selectedBuildingId === 'company-batik-pixel';

      drawIsoBox(16.0, -7.0, 4.2, 4.2, 4, '#faf5eb', '#d6c5ad', '#bfa588');
      // Glass Atrium with Iridescent Violet & Magenta Tones
      drawIsoBox(16.0, -7.0, 3.2, 3.0, 52, bpHovered || bpSelected ? '#f5f3ff' : '#ddd6fe', '#7c3aed', '#5b21b6', bpSelected ? '#a855f7' : undefined);
      // Top Art Studio Deck
      drawIsoBox(16.0, -7.0, 2.0, 2.0, 72, '#f3e8ff', '#9333ea', '#6b21a8');

      const bpRoofIso = toIso(16.0, -7.0);
      const bpSignY = bpRoofIso.isoY - 72 * zoom;

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(bpRoofIso.isoX - 28 * zoom, bpSignY - 8 * zoom, 56 * zoom, 16 * zoom, 3 * zoom);
      ctx.fill();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.4 * zoom;
      ctx.stroke();

      ctx.fillStyle = '#d8b4fe';
      ctx.font = `bold ${Math.max(4.5, Math.floor(4.8 * zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎨 BATIKPIXEL GENAI', bpRoofIso.isoX, bpSignY - 1.5 * zoom);
      ctx.fillStyle = '#a855f7';
      ctx.font = `bold ${Math.max(3.2, Math.floor(3.4 * zoom))}px monospace`;
      ctx.fillText('3D & CREATIVE • LV 3', bpRoofIso.isoX, bpSignY + 4 * zoom);

      // Mini Agent at BatikPixel
      drawMiniAgent(14.5, -4.8, '#a855f7', '#7c3aed', 'laptop');
      drawMiniAgent(17.5, -4.8, '#ec4899', '#1e293b', 'walking');

      // =========================================================
      // 11. PERUSAHAAN 6: GARUDALOGIX ROBOTICS & DRONE (LEVEL 4)
      // =========================================================
      // Location: Northwest Outer (wx: -16.0, wz: -7.0)
      const glHovered = hoveredBuildingId === 'company-garuda-logix';
      const glSelected = selectedBuildingId === 'company-garuda-logix';

      drawIsoBox(-16.0, -7.0, 4.2, 4.2, 4, '#faf5eb', '#d6c5ad', '#bfa588');
      // Titanium Robotics Hangar with Industrial Hazard Accents
      drawIsoBox(-16.0, -7.0, 3.4, 3.2, 48, glHovered || glSelected ? '#ecfeff' : '#0e7490', '#155e75', '#164e63', glSelected ? '#06b6d4' : undefined);

      // Circular Yellow Helipad on Roof
      const glRoofIso = toIso(-16.0, -7.0);
      const heliY = glRoofIso.isoY - 48 * zoom;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(glRoofIso.isoX, heliY, 14 * zoom, 7 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.5 * zoom;
      ctx.stroke();

      // "H" Marking
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.max(5, Math.floor(6 * zoom))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('H', glRoofIso.isoX, heliY);

      // Hovering Autonomous Delivery Drone above Helipad
      const droneBounce = Math.sin(timeSec * 7) * 4 * zoom;
      const droneY = heliY - 18 * zoom + droneBounce;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(glRoofIso.isoX, droneY, 3 * zoom, 0, Math.PI * 2);
      ctx.fill();
      // Rotor glow
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1 * zoom;
      ctx.beginPath();
      ctx.ellipse(glRoofIso.isoX, droneY, 6 * zoom, 2 * zoom, 0, 0, Math.PI * 2);
      ctx.stroke();

      const glSignY = glRoofIso.isoY - 74 * zoom;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(glRoofIso.isoX - 28 * zoom, glSignY - 8 * zoom, 56 * zoom, 16 * zoom, 3 * zoom);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.4 * zoom;
      ctx.stroke();

      ctx.fillStyle = '#67e8f9';
      ctx.font = `bold ${Math.max(4.5, Math.floor(4.8 * zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🤖 GARUDALOGIX FLEET', glRoofIso.isoX, glSignY - 1.5 * zoom);
      ctx.fillStyle = '#0891b2';
      ctx.font = `bold ${Math.max(3.2, Math.floor(3.4 * zoom))}px monospace`;
      ctx.fillText('ROBOTICS & IOT • LV 4', glRoofIso.isoX, glSignY + 4 * zoom);

      // Mini Agent at GarudaLogix
      drawMiniAgent(-16.0, -4.8, '#0891b2', '#0f172a', 'laptop');

      // =========================================================
      // 12. FASILITAS KOTA: VIGENT SUPERMART 24/7 (MINIMARKET)
      // =========================================================
      // Location: Southwest Outer (wx: -15.0, wz: 6.5)
      const smartHovered = hoveredBuildingId === 'supermart-247';

      drawIsoBox(-15.0, 6.5, 3.2, 3.0, 32, smartHovered ? '#fef3e7' : '#f8fafc', '#dc2626', '#991b1b', smartHovered ? '#c85a2b' : undefined);

      const smartAwningIso = toIso(-15.0, 8.2);
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.roundRect(smartAwningIso.isoX - 14 * zoom, smartAwningIso.isoY - 18 * zoom, 28 * zoom, 6 * zoom, 2 * zoom);
      ctx.fill();

      // Vending Machine
      const vendIso = toIso(-13.0, 8.2);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(vendIso.isoX, vendIso.isoY - 16 * zoom, 6 * zoom, 12 * zoom);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(vendIso.isoX + 1 * zoom, vendIso.isoY - 14 * zoom, 4 * zoom, 4 * zoom);

      const smartRoofIso = toIso(-15.0, 6.5);
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

      // Mini Agent shopper
      drawMiniAgent(-15.0, 4.5, '#dc2626', '#1e293b', 'walking');

      // =========================================================
      // 13. FASILITAS KOTA: CYBER PUJASERA & FOOD COURT 24 JAM
      // =========================================================
      // Location: Southeast Outer (wx: 15.0, wz: 6.5)
      const pujaHovered = hoveredBuildingId === 'pujasera-24h';

      // Warm terracotta courtyard floor
      drawIsoBox(15.0, 6.5, 3.4, 3.0, 24, pujaHovered ? '#fff7ed' : '#fdba74', '#ea580c', '#c2410c', pujaHovered ? '#f97316' : undefined);

      // Orange-Yellow Canopy Awning
      const pujaAwningIso = toIso(15.0, 8.2);
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.roundRect(pujaAwningIso.isoX - 16 * zoom, pujaAwningIso.isoY - 16 * zoom, 32 * zoom, 6 * zoom, 2 * zoom);
      ctx.fill();

      // Outdoor Dining Tables & Stalls
      const tblIso = toIso(14.0, 5.0);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(tblIso.isoX - 6 * zoom, tblIso.isoY - 10 * zoom, 12 * zoom, 4 * zoom);

      const pujaRoofIso = toIso(15.0, 6.5);
      const pujaSignY = pujaRoofIso.isoY - 24 * zoom;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(pujaRoofIso.isoX - 26 * zoom, pujaSignY - 8 * zoom, 52 * zoom, 16 * zoom, 3 * zoom);
      ctx.fill();
      ctx.strokeStyle = pujaHovered ? '#fb923c' : '#ea580c';
      ctx.lineWidth = 1.6 * zoom;
      ctx.stroke();

      ctx.fillStyle = '#fdba74';
      ctx.font = `bold ${Math.max(4.5, Math.floor(4.8 * zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍛 PUJASERA 24H', pujaRoofIso.isoX, pujaSignY - 1.5 * zoom);
      ctx.fillStyle = '#fed7aa';
      ctx.font = `bold ${Math.max(3.2, Math.floor(3.4 * zoom))}px monospace`;
      ctx.fillText('KANTIN KOTA • KLIK MAKAN', pujaRoofIso.isoX, pujaSignY + 4 * zoom);

      // Mini Agent hanging out at Pujasera
      drawMiniAgent(15.0, 4.5, '#f97316', '#78350f', 'idle');

      // =========================================================
      // 14. STASIUN KERETA SENTRAL GAMBIR (Aerorail Transit Terminal)
      // =========================================================
      // Location: South Transit Hub (wx: 0.0, wz: 14.5)
      const stHovered = hoveredBuildingId === 'stasiun-gambir';

      drawIsoBox(0.0, 14.5, 7.5, 2.5, 18, stHovered ? '#eef2ff' : '#f1f5f9', '#475569', '#334155', stHovered ? '#4f46e5' : undefined);

      [15.2, 15.8].forEach((rz) => {
        const tr1 = toIso(-7.5, rz);
        const tr2 = toIso(7.5, rz);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2 * zoom;
        ctx.beginPath();
        ctx.moveTo(tr1.isoX, tr1.isoY);
        ctx.lineTo(tr2.isoX, tr2.isoY);
        ctx.stroke();
      });

      const trainNose = toIso(5.5, 15.5);
      const trainTail = toIso(-5.5, 15.5);
      const trainBounce = Math.sin(timeSec * 3) * 0.3 * zoom;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(trainTail.isoX, trainTail.isoY - 16 * zoom + trainBounce, (trainNose.isoX - trainTail.isoX), 12 * zoom, 4 * zoom);
      ctx.fill();
      ctx.strokeStyle = '#c85a2b';
      ctx.lineWidth = 1.4 * zoom;
      ctx.stroke();

      ctx.fillStyle = '#c85a2b';
      ctx.fillRect(trainTail.isoX, trainTail.isoY - 9 * zoom + trainBounce, (trainNose.isoX - trainTail.isoX), 2 * zoom);
      ctx.fillStyle = '#0f172a';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(trainTail.isoX + 6 * zoom + i * 14 * zoom, trainTail.isoY - 14 * zoom + trainBounce, 8 * zoom, 4 * zoom);
      }

      const stRoofIso = toIso(0.0, 14.5);
      const stCanopyY = stRoofIso.isoY - 24 * zoom;
      ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
      ctx.beginPath();
      ctx.roundRect(stRoofIso.isoX - 44 * zoom, stCanopyY - 12 * zoom, 88 * zoom, 16 * zoom, 6 * zoom);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.8 * zoom;
      ctx.stroke();

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

      // Mini Agents waiting at station platform
      drawMiniAgent(-2.0, 13.2, '#4f46e5', '#1e293b', 'walking');
      drawMiniAgent(2.0, 13.2, '#059669', '#d97706', 'idle');

      // =========================================================
      // 15. HOVER TOOLTIP BADGE
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
          const p = toIso(-6.5, -7.0);
          tx = p.isoX;
          ty = p.isoY - 110 * zoom;
        } else if (hoveredBuildingId === 'company-nusanova') {
          title = '☁️ NusaNova Cloud Systems';
          subtitle = 'Distributed Cloud & Kubernetes Mesh • Level 4';
          badgeColor = '#0284c7';
          const p = toIso(6.5, -7.0);
          tx = p.isoX;
          ty = p.isoY - 85 * zoom;
        } else if (hoveredBuildingId === 'company-kopi-koding') {
          title = '☕ Kopi & Koding Labs';
          subtitle = 'Mobile Apps, Flutter & Dev Tools • Level 2';
          badgeColor = '#d97706';
          const p = toIso(-6.5, 6.5);
          tx = p.isoX;
          ty = p.isoY - 60 * zoom;
        } else if (hoveredBuildingId === 'company-cyber-fin') {
          title = '📈 CyberFin Quantitative Asset';
          subtitle = 'Algorithmic Trading & FinTech Engine • Level 5';
          badgeColor = '#10b981';
          const p = toIso(6.5, 6.5);
          tx = p.isoX;
          ty = p.isoY - 95 * zoom;
        } else if (hoveredBuildingId === 'company-batik-pixel') {
          title = '🎨 BatikPixel Creative & GenAI Studio';
          subtitle = 'Generative Art, 3D Assets & Creative Design • Level 3';
          badgeColor = '#a855f7';
          const p = toIso(16.0, -7.0);
          tx = p.isoX;
          ty = p.isoY - 85 * zoom;
        } else if (hoveredBuildingId === 'company-garuda-logix') {
          title = '🤖 GarudaLogix Robotics & Autonomous Fleet';
          subtitle = 'Autonomous Logistics, Drone Fleet & IoT • Level 4';
          badgeColor = '#06b6d4';
          const p = toIso(-16.0, -7.0);
          tx = p.isoX;
          ty = p.isoY - 85 * zoom;
        } else if (hoveredBuildingId === 'stasiun-gambir') {
          title = '🚆 Stasiun Sentral Gambir Aerorail';
          subtitle = 'Akses Kereta Cepat ke Bandung, Surabaya, Bali, IKN';
          badgeColor = '#4f46e5';
          const p = toIso(0.0, 14.5);
          tx = p.isoX;
          ty = p.isoY - 45 * zoom;
        } else if (hoveredBuildingId === 'supermart-247') {
          title = '🛒 Vigent SuperMart 24/7';
          subtitle = 'Beli Kopi, Snack Koding, dan Perlengkapan Kantor';
          badgeColor = '#16a34a';
          const p = toIso(-15.0, 6.5);
          tx = p.isoX;
          ty = p.isoY - 45 * zoom;
        } else if (hoveredBuildingId === 'pujasera-24h') {
          title = '🍛 Cyber Pujasera & Food Court 24 Jam';
          subtitle = 'Nasi Goreng Cyber, Kopi, Es Teh Jumbo & Tempat Nongkrong';
          badgeColor = '#ea580c';
          const p = toIso(15.0, 6.5);
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
            <span>SuperMart</span>
          </button>

          <button
            onClick={() => setIsSupermarketOpen(true)}
            className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-3 py-1.5 rounded-xl shadow-md text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Buka Cyber Pujasera & Food Court 24 Jam (Nasi Goreng, Es Teh, Kopi)"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Pujasera 24H</span>
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
