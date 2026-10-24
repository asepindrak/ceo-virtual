/**
 * 🗺️ CEO VIRTUAL - Open World Regional Districts & Decentralized Transit Engine
 * 
 * Features:
 * 1. Macro World Map with 5 Distinct Regional Districts.
 * 2. Cross-City Transit Simulation: Express Bullet Train & Company Cyber-Car.
 * 3. Inter-Company Visiting & Trade Protocol (Lobby check-in, B2B Pitch, Skill Purchases).
 * 4. P2P Regional Isolation with Ephemeral Guest Tunneling.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  RegionalDistrict,
  RegionalCompanyInfo,
  TravelMission,
  CommuteMode,
  TravelMissionType,
} from '@/types/office';
import { VIGENT_HOME } from './workspaceManager';

const VIGENT_DIR = VIGENT_HOME;
const MISSIONS_FILE = path.join(VIGENT_DIR, 'world_missions.json');

function ensureVigentDir() {
  if (!fs.existsSync(VIGENT_DIR)) {
    fs.mkdirSync(VIGENT_DIR, { recursive: true });
  }
}

// -----------------------------------------------------------------------------
// CURATED REGIONAL DISTRICTS & ACTIVE COMPANIES
// -----------------------------------------------------------------------------

export const REGIONAL_DISTRICTS: RegionalDistrict[] = [
  {
    id: 'region-jakarta',
    name: 'Neo-Jakarta Silicon District',
    codename: 'SECTOR-01-JKT',
    theme: 'Cyberpunk Financial & Startup Hub',
    description: 'Pusat metropolitan dengan kepadatan startup AI tertinggi, menara korporat pencakar langit, dan infrastruktur cloud sub-detik.',
    color: '#c85a2b',
    badge: '🏙️ Metropolitan Core',
    coordinates: { x: 20, y: 46 },
    transitHubName: 'Stasiun Sentral Gambir Aerorail',
    highwayDistanceKm: 0,
    trainTravelSeconds: 30,
    carTravelSeconds: 20,
    companies: [
      {
        id: 'company-shadowmove',
        name: 'ShadowMove Inc',
        industry: 'Autonomous AI & 3D Interactive Web',
        level: 3,
        ownerName: 'Sang Pratama (You)',
        buildingType: 'Modern Glass Tower',
        specialization: 'Fullstack Next.js, AI Agents, Low-Poly 3D',
        reputation: 98,
        status: 'open_for_trade',
        openBounties: [
          {
            id: 'bounty-sm-1',
            title: 'Audit Keamanan Smart Contract & Next.js SSR',
            rewardXp: 350,
            budgetCoins: 1200,
            type: 'audit',
          },
          {
            id: 'bounty-sm-2',
            title: 'Kembangkan 3D Low-Poly Character Rig',
            rewardXp: 280,
            budgetCoins: 950,
            type: 'design',
          },
        ],
        marketOffers: [
          {
            id: 'offer-sm-1',
            title: 'ShadowMove 3D Scene Starter Template',
            priceCoins: 500,
            category: 'skill_template',
            description: 'Source code template Three.js low-poly office siap pakai dengan collision detection.',
          },
        ],
      },
      {
        id: 'company-nusanova',
        name: 'NusaNova Cloud Systems',
        industry: 'Distributed Cloud & Kubernetes Mesh',
        level: 4,
        ownerName: 'Dimas Wicaksono',
        buildingType: 'Hyper-Scale Server Complex',
        specialization: 'High Availability, Zero-Downtime Migration',
        reputation: 94,
        status: 'open_for_trade',
        openBounties: [
          {
            id: 'bounty-nn-1',
            title: 'Optimasi Rust Proxy untuk P2P NAT Traversal',
            rewardXp: 450,
            budgetCoins: 1600,
            type: 'coding',
          },
        ],
        marketOffers: [
          {
            id: 'offer-nn-1',
            title: 'Enterprise MCP Gateway Protocol License',
            priceCoins: 850,
            category: 'api_license',
            description: 'Akses middleware multi-tenant untuk sinkronisasi microservices antar-kantor.',
          },
        ],
      },
      {
        id: 'company-kopi-koding',
        name: 'Kopi & Koding Labs',
        industry: 'Mobile Apps & Developer Tools',
        level: 2,
        ownerName: 'Rian Pratama',
        buildingType: 'Industrial Loft Studio',
        specialization: 'React Native, Flutter, Swift',
        reputation: 86,
        status: 'open_for_trade',
        openBounties: [
          {
            id: 'bounty-kk-1',
            title: 'Buat Landing Page Promo App Developer Tools',
            rewardXp: 200,
            budgetCoins: 600,
            type: 'content',
          },
        ],
        marketOffers: [
          {
            id: 'offer-kk-1',
            title: 'Mobile UI Design Kit (Figma + Tailwind)',
            priceCoins: 350,
            category: 'skill_template',
            description: 'Komponen mobile siap pakai dengan varian dark-mode estetis.',
          },
        ],
      },
      {
        id: 'company-cyber-fin',
        name: 'CyberFin Quantitative Asset',
        industry: 'Algorithmic Trading & FinTech Core',
        level: 5,
        ownerName: 'Helena Tan',
        buildingType: 'Black Obsidian Monolith',
        specialization: 'Low-Latency Order Engine, Risk Management',
        reputation: 99,
        status: 'in_meeting',
        openBounties: [
          {
            id: 'bounty-cf-1',
            title: 'Stress-test Vector Database under 50k Concurrent Queries',
            rewardXp: 600,
            budgetCoins: 2500,
            type: 'coding',
          },
        ],
        marketOffers: [
          {
            id: 'offer-cf-1',
            title: 'Financial Time-Series Dataset Q3 2026',
            priceCoins: 1200,
            category: 'dataset',
            description: 'Dataset terverifikasi 10 juta transaksi untuk melatih model sentimen pasar.',
          },
        ],
      },
      {
        id: 'company-batik-pixel',
        name: 'BatikPixel Creative & GenAI Studio',
        industry: 'Generative Art, 3D Assets & Creative Design',
        level: 3,
        ownerName: 'Siska Maharani',
        buildingType: 'Neo-Tradisi Glass Atrium & Design Gallery',
        specialization: 'Generative UI, 3D Brand Assets, Motion Design',
        reputation: 92,
        status: 'open_for_trade',
        openBounties: [
          {
            id: 'bounty-bp-1',
            title: 'Desain Ilustrasi Isometrik Karakter Cyberpunk Nusantara',
            rewardXp: 320,
            budgetCoins: 1100,
            type: 'design',
          },
          {
            id: 'bounty-bp-2',
            title: 'Prompt Engineering & Fine-tuning Model LoRA Visual',
            rewardXp: 400,
            budgetCoins: 1400,
            type: 'content',
          },
        ],
        marketOffers: [
          {
            id: 'offer-bp-1',
            title: 'BatikPixel Isometric UI Kit & Icon Set Vol. 1',
            priceCoins: 450,
            category: 'skill_template',
            description: 'Paket icon vektor dan aset dekorasi kantor isometrik bernuansa Nusantara modern.',
          },
        ],
      },
      {
        id: 'company-garuda-logix',
        name: 'GarudaLogix Robotics & Autonomous Fleet',
        industry: 'Autonomous Logistics, Drone Fleet & IoT Embedded',
        level: 4,
        ownerName: 'Budi Santoso',
        buildingType: 'Smart Drone Hangar & Robotics Assembly Lab',
        specialization: 'Drone Dispatch Algorithms, Hardware Firmware, Edge AI',
        reputation: 95,
        status: 'open_for_trade',
        openBounties: [
          {
            id: 'bounty-gl-1',
            title: 'Implementasi Pathfinding A* untuk Drone Swarm Armada Kota',
            rewardXp: 500,
            budgetCoins: 1800,
            type: 'coding',
          },
          {
            id: 'bounty-gl-2',
            title: 'Kalibrasi Sensor Telemetri & MQTT Edge Gateway',
            rewardXp: 380,
            budgetCoins: 1300,
            type: 'audit',
          },
        ],
        marketOffers: [
          {
            id: 'offer-gl-1',
            title: 'GarudaLogix Micro-Telemetry SDK (C++ / Rust / Node)',
            priceCoins: 750,
            category: 'api_license',
            description: 'Library komunikasi data sub-milidetik untuk sinkronisasi perangkat IoT dan robotika.',
          },
        ],
      },
    ],
  },
  {
    id: 'region-bandung',
    name: 'Cyber-Bandung Creative Valley',
    codename: 'SECTOR-02-BDG',
    theme: 'Game Studio, Visual Arts & AI Research',
    description: 'Lembah sejuk berteknologi tinggi dengan komunitas developer indie terbesar, studio animasi 3D, dan riset model bahasa lokal.',
    color: '#059669',
    badge: '🎨 Creative & Research Valley',
    coordinates: { x: 36, y: 72 },
    transitHubName: 'Stasiun Dago Express Terminal',
    highwayDistanceKm: 145,
    trainTravelSeconds: 25,
    carTravelSeconds: 18,
    companies: [
      {
        id: 'company-pixelforge',
        name: 'PixelForge Interactive',
        industry: 'Voxel Engine & Indie RPG Studio',
        level: 3,
        ownerName: 'Gita Saraswati',
        buildingType: 'Timber-Glass Creative Dome',
        specialization: 'Voxel Art, Procedural Generation, Audio FX',
        reputation: 92,
        status: 'open_for_trade',
        openBounties: [
          {
            id: 'bounty-pf-1',
            title: 'Tulis Dialog Interaktif NPC Berbasis LLM Bahasa Sunda & Gaul',
            rewardXp: 260,
            budgetCoins: 750,
            type: 'content',
          },
        ],
        marketOffers: [
          {
            id: 'offer-pf-1',
            title: 'Soundtrack Lo-Fi Ambient Pack untuk Kantor Virtual',
            priceCoins: 300,
            category: 'skill_template',
            description: '15 track audio eksklusif bebas royalti untuk ambient music ruang kerja virtual.',
          },
          {
            id: 'offer-pf-2',
            title: 'Low-Poly 3D Office Furniture Pack',
            priceCoins: 450,
            category: 'skill_template',
            description: 'Model 3D meja gaming, sofa beanbag, coffee maker, dan server rack futuristik.',
          },
        ],
      },
      {
        id: 'company-sundatech',
        name: 'SundaTech Deep Cognitive Labs',
        industry: 'Speech-to-Text & Localized LLM Weights',
        level: 4,
        ownerName: 'Dr. Cecep Hidayat',
        buildingType: 'Bio-Digital Research Facility',
        specialization: 'Dialect Understanding, Acoustic Embedding',
        reputation: 96,
        status: 'open_for_trade',
        openBounties: [
          {
            id: 'bounty-st-1',
            title: 'Pembersihan Dataset Suara Multilingual 100 Jam',
            rewardXp: 380,
            budgetCoins: 1100,
            type: 'content',
          },
        ],
        marketOffers: [
          {
            id: 'offer-st-1',
            title: 'Indonesian Dialect Embedding Weights',
            priceCoins: 700,
            category: 'dataset',
            description: 'Model embedding khusus untuk memahami nuansa lokal percakapan Telegram & slang kantor.',
          },
        ],
      },
    ],
  },
  {
    id: 'region-surabaya',
    name: 'Surabaya Mega-Port & Quantum Hub',
    codename: 'SECTOR-03-SUB',
    theme: 'Maritime IoT, Hardware & Industrial Robotics',
    description: 'Pusat industri timur nusantara dengan pelabuhan pintar otomatis, pabrik robotika, dan transmisi data maritim.',
    color: '#0284c7',
    badge: '⚓ Industrial & Maritime Hub',
    coordinates: { x: 58, y: 68 },
    transitHubName: 'Stasiun Sentral Tanjung Perak Aerotrain',
    highwayDistanceKm: 780,
    trainTravelSeconds: 35,
    carTravelSeconds: 24,
    companies: [
      {
        id: 'company-maritimiot',
        name: 'MaritimIoT Nusantara',
        industry: 'Vessel Telemetry & Smart Port Automation',
        level: 4,
        ownerName: 'Bambang Soediro',
        buildingType: 'Harbor Control Tower',
        specialization: 'Sensor Networks, LoRaWAN, Realtime Geo-Fencing',
        reputation: 95,
        status: 'open_for_trade',
        openBounties: [
          {
            id: 'bounty-mi-1',
            title: 'Dashboard Visualisasi Pelayaran Realtime dengan Mapbox & WebGL',
            rewardXp: 400,
            budgetCoins: 1400,
            type: 'coding',
          },
        ],
        marketOffers: [
          {
            id: 'offer-mi-1',
            title: 'Geo-Spatial Routing Algorithm Plugin',
            priceCoins: 600,
            category: 'api_license',
            description: 'Plugin optimasi rute pelayaran dan kurir logistik antar-regional.',
          },
        ],
      },
      {
        id: 'company-areksmart',
        name: 'ArekSmart Robotics Corp',
        industry: 'PLC Automation & Industrial Edge AI',
        level: 3,
        ownerName: 'Satria Wibowo',
        buildingType: 'Heavy Machining Hangar',
        specialization: 'Computer Vision Inspections, Assembly Lines',
        reputation: 90,
        status: 'open_for_trade',
        openBounties: [
          {
            id: 'bounty-as-1',
            title: 'Integrasi Telegram Bot untuk Peringatan Kerusakan Mesin Pabrik',
            rewardXp: 250,
            budgetCoins: 700,
            type: 'coding',
          },
        ],
        marketOffers: [
          {
            id: 'offer-as-1',
            title: 'Defect Detection Computer Vision Dataset',
            priceCoins: 500,
            category: 'dataset',
            description: '25.000 foto komponen industri terlabeli untuk training model inspeksi cacat barang.',
          },
        ],
      },
    ],
  },
  {
    id: 'region-bali',
    name: 'Bali Silicon Coast & Web3 Sanctuary',
    codename: 'SECTOR-04-DPS',
    theme: 'Decentralized Protocols & Global Digital Nomads',
    description: 'Surga tropis para arsitek terdesentralisasi, agensi branding global, dan developer P2P yang bekerja di pinggir pantai.',
    color: '#d97706',
    badge: '🌴 Nomad & Decentralized Coast',
    coordinates: { x: 78, y: 74 },
    transitHubName: 'Stasiun Sunset Coast Aerorail',
    highwayDistanceKm: 1150,
    trainTravelSeconds: 40,
    carTravelSeconds: 28,
    companies: [
      {
        id: 'company-islandweb3',
        name: 'IslandDAO Decentralized Protocols',
        industry: 'P2P Mesh, Cryptography & Decentralized Identity',
        level: 4,
        ownerName: 'Made Aryawan',
        buildingType: 'Bamboo-Solar Open Pavilion',
        specialization: 'Hyperswarm, Zero-Knowledge Proofs, Local-First Sync',
        reputation: 97,
        status: 'open_for_trade',
        openBounties: [
          {
            id: 'bounty-iw-1',
            title: 'Rancang Skema Enkripsi E2EE untuk Private Meeting Agen CEO Virtual',
            rewardXp: 500,
            budgetCoins: 1800,
            type: 'audit',
          },
        ],
        marketOffers: [
          {
            id: 'offer-iw-1',
            title: 'Decentralized Identity (DID) Auth Kit',
            priceCoins: 800,
            category: 'api_license',
            description: 'Modul login kriptografis tanpa password menggunakan keypair Ed25519.',
          },
        ],
      },
      {
        id: 'company-sunsetgrowth',
        name: 'Sunset Growth Hackers',
        industry: 'Global Brand Strategy & Virality Engineering',
        level: 3,
        ownerName: 'Chloe Dupont',
        buildingType: 'Beachfront Co-Working Villa',
        specialization: 'Influencer Marketing, Viral Copywriting, Product Hunt Launch',
        reputation: 89,
        status: 'open_for_trade',
        openBounties: [
          {
            id: 'bounty-sg-1',
            title: 'Rilis 5 Varian Copywriting Landing Page High-Converting untuk AI SaaS',
            rewardXp: 300,
            budgetCoins: 900,
            type: 'content',
          },
        ],
        marketOffers: [
          {
            id: 'offer-sg-1',
            title: 'SaaS Launch Playbook & PR Contact List 2026',
            priceCoins: 400,
            category: 'skill_template',
            description: 'Panduan lengkap meluncurkan produk tech ke pasar internasional.',
          },
        ],
      },
    ],
  },
  {
    id: 'region-ikn',
    name: 'Nusantara Virtual Core (IKN)',
    codename: 'SECTOR-05-IKN',
    theme: 'Smart Capital, Green Energy & Super-Government Cloud',
    description: 'Ibu kota virtual berstandar hijau tertinggi di tengah rimbunnya hutan digital, tempat pertemuan investor global dan regulasi AI nasional.',
    color: '#7c3aed',
    badge: '🏛️ Sovereign Capital Core',
    coordinates: { x: 50, y: 28 },
    transitHubName: 'Stasiun Hyperloop Titik Nol Nusantara',
    highwayDistanceKm: 1400,
    trainTravelSeconds: 38,
    carTravelSeconds: 26,
    companies: [
      {
        id: 'company-garudagov',
        name: 'Garuda Sovereign Cloud & Security',
        industry: 'National Data Security & Public Digital Infrastructure',
        level: 5,
        ownerName: 'Ir. Hendro Pranoto',
        buildingType: 'Falcon Palace Tech Citadel',
        specialization: 'Post-Quantum Cryptography, National Identity API',
        reputation: 100,
        status: 'in_meeting',
        openBounties: [
          {
            id: 'bounty-gg-1',
            title: 'Audit Keamanan Lintas-Regional Protocol CEO Virtual P2P Node',
            rewardXp: 750,
            budgetCoins: 3000,
            type: 'audit',
          },
        ],
        marketOffers: [
          {
            id: 'offer-gg-1',
            title: 'Sovereign Digital Signature Compliance Certificate',
            priceCoins: 1500,
            category: 'api_license',
            description: 'Sertifikasi integritas data resmi untuk bursa trading antar-perusahaan virtual.',
          },
        ],
      },
      {
        id: 'company-borneogreen',
        name: 'Borneo Smart Energy Grid AI',
        industry: 'Renewable Solar-Hydro Grid Automation',
        level: 4,
        ownerName: 'Dewi Lestari',
        buildingType: 'Canopy Ecological Dome',
        specialization: 'Clean Energy Dispatch, Carbon Offset Ledger',
        reputation: 96,
        status: 'open_for_trade',
        openBounties: [
          {
            id: 'bounty-bg-1',
            title: 'Algoritma Prediksi Beban Listrik Kantor Virtual Jam Sibuk',
            rewardXp: 420,
            budgetCoins: 1350,
            type: 'coding',
          },
        ],
        marketOffers: [
          {
            id: 'offer-bg-1',
            title: 'Carbon Neutral Certificate Token Pack',
            priceCoins: 650,
            category: 'dataset',
            description: 'Offset kredit energi hijau untuk meningkatkan skor reputasi kantor virtual Anda.',
          },
        ],
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// DYNAMIC REGIONAL DISTRICTS ENGINE (INTEGRATES ACTIVE COMPANY & P2P PEERS)
// -----------------------------------------------------------------------------

export function getDynamicRegionalDistricts(activeCompany?: any, peers?: any[]): RegionalDistrict[] {
  return REGIONAL_DISTRICTS.map((district) => {
    let companies = [...district.companies];

    // If district is Jakarta (or active company's designated sector)
    if (district.id === 'region-jakarta') {
      const activeId = activeCompany?.id || 'company-shadowmove';
      const activeName = activeCompany?.name || 'ShadowMove Inc';
      const activeIndustry = activeCompany?.industry || 'Autonomous AI & 3D Interactive Web';

      companies = companies.map((c) => {
        if (c.id === 'company-shadowmove' || c.id === activeId) {
          const userBounties = (Array.isArray(activeCompany?.tasks) && activeCompany.tasks.length > 0)
            ? activeCompany.tasks.slice(0, 3).map((t: any) => ({
                id: `bounty-${t.id}`,
                title: t.title,
                rewardXp: 300,
                budgetCoins: 1000,
                type: (t.type || 'coding') as any,
              }))
            : c.openBounties;

          return {
            ...c,
            id: activeId,
            name: activeName,
            industry: activeIndustry,
            ownerName: 'Sang Pratama (You)',
            openBounties: userBounties,
            specialization: activeCompany?.description || c.specialization,
          };
        }
        return c;
      });
    }

    // Merge live P2P peers into their respective sector
    if (Array.isArray(peers) && peers.length > 0) {
      peers.forEach((peer: any) => {
        const peerSector = peer.regionalSector || 'region-jakarta';
        if (peerSector === district.id && !companies.some((c) => c.id === peer.nodeId || c.id === peer.companyId)) {
          companies.push({
            id: peer.companyId || peer.nodeId,
            name: peer.companyName || 'Decentralized Peer Node',
            industry: peer.industry || 'Decentralized P2P Mesh Studio',
            level: 3,
            ownerName: `Node Peer (${peer.ip || 'Remote PC'})`,
            buildingType: 'P2P Decentralized Node',
            specialization: `Direct Tunnel: ${peer.endpointUrl || 'LAN Mesh'}`,
            reputation: peer.reputationScore || 98,
            status: peer.isOnline ? 'open_for_trade' : 'offline',
            isLivePeer: true,
            peerEndpoint: peer.endpointUrl,
            peerNodeId: peer.nodeId,
            openBounties: [
              {
                id: `bounty-peer-${peer.nodeId}`,
                title: `B2B Task Sync & Collaboration with ${peer.companyName}`,
                rewardXp: 350,
                budgetCoins: 1200,
                type: 'coding',
              },
            ],
            marketOffers: [
              {
                id: `offer-peer-${peer.nodeId}`,
                title: `${peer.companyName} Remote API License`,
                priceCoins: 500,
                category: 'api_license',
                description: `Akses endpoint terdesentralisasi ke node ${peer.companyName}.`,
              },
            ],
          });
        }
      });
    }

    return {
      ...district,
      companies,
    };
  });
}

// -----------------------------------------------------------------------------
// TRAVEL MISSIONS STORAGE & ENGINE
// -----------------------------------------------------------------------------

export function loadAllMissions(): TravelMission[] {
  ensureVigentDir();
  if (!fs.existsSync(MISSIONS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(MISSIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAllMissions(missions: TravelMission[]) {
  ensureVigentDir();
  try {
    fs.writeFileSync(MISSIONS_FILE, JSON.stringify(missions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save world missions:', err);
  }
}

/**
 * Dispatch an employee to travel to another regional office
 */
export function dispatchTravelMission(params: {
  agentId: string;
  agentName: string;
  agentRole: string;
  originRegionId?: string;
  originCompanyName?: string;
  targetRegionId: string;
  targetCompanyId: string;
  targetCompanyName: string;
  commuteMode: CommuteMode;
  missionType: TravelMissionType;
}): TravelMission {
  const missions = loadAllMissions();

  const targetRegion = REGIONAL_DISTRICTS.find((r) => r.id === params.targetRegionId);
  const travelDuration =
    params.commuteMode === 'bullet_train'
      ? targetRegion?.trainTravelSeconds || 30
      : targetRegion?.carTravelSeconds || 20;

  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const initialDialogLogs = [
    {
      time: timeStr,
      speaker: params.agentName,
      text:
        params.commuteMode === 'bullet_train'
          ? `Membawa tas berkas, menuju stasiun untuk naik Express Bullet Train ke ${targetRegion?.name || 'kota tujuan'}.`
          : `Menyalakan mesin Cyber-Car kantor, bersiap meluncur melalui jalan tol antar-kota menuju ${params.targetCompanyName}.`,
    },
  ];

  const newMission: TravelMission = {
    id: `mission-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    agentId: params.agentId,
    agentName: params.agentName,
    agentRole: params.agentRole,
    originRegionId: params.originRegionId || 'region-jakarta',
    originCompanyName: params.originCompanyName || 'ShadowMove Inc',
    targetRegionId: params.targetRegionId,
    targetCompanyId: params.targetCompanyId,
    targetCompanyName: params.targetCompanyName,
    commuteMode: params.commuteMode,
    missionType: params.missionType,
    status: 'departing',
    departedAt: now,
    durationSeconds: travelDuration,
    progressPercent: 5,
    currentStepMessage:
      params.commuteMode === 'bullet_train'
        ? `Memasuki gerbong Express Train di Stasiun Sentral.`
        : `Mobil kantor keluar dari garasi bawah tanah menuju Highway.`,
    dialogLogs: initialDialogLogs,
  };

  missions.unshift(newMission);
  saveAllMissions(missions);

  return newMission;
}

/**
 * Advance mission simulation step (called by timer or UI polling)
 */
export function advanceMissionTick(missionId: string): TravelMission | null {
  const missions = loadAllMissions();
  const mission = missions.find((m) => m.id === missionId);
  if (!mission) return null;

  if (mission.status === 'completed') return mission;

  const elapsedSeconds = (Date.now() - mission.departedAt) / 1000;
  const progressRatio = Math.min(1.0, elapsedSeconds / mission.durationSeconds);
  const currentPercent = Math.round(progressRatio * 100);
  mission.progressPercent = currentPercent;

  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  if (progressRatio < 0.3) {
    mission.status = 'in_transit';
    mission.currentStepMessage =
      mission.commuteMode === 'bullet_train'
        ? `Sedang melaju kencang di rel aerorail menuju ${mission.targetRegionId.replace('region-', '').toUpperCase()}.`
        : `Menembus jalan tol lintas kota dengan kecepatan 160 km/jam.`;
  } else if (progressRatio >= 0.3 && progressRatio < 0.6) {
    if (mission.dialogLogs.length === 1) {
      mission.dialogLogs.push({
        time: timeStr,
        speaker: mission.agentName,
        text:
          mission.commuteMode === 'bullet_train'
            ? `Pemandangan di luar jendela kereta sangat futuristik. Bertemu rekan traveler di gerbong kafe!`
            : `Keluar gerbang tol regional. Memasuki area distrik ${mission.targetCompanyName}.`,
      });
    }
    mission.status = 'arrived_at_lobby';
    mission.currentStepMessage = `Tiba di lobi gedung ${mission.targetCompanyName}. Melakukan check-in di meja resepsionis.`;
  } else if (progressRatio >= 0.6 && progressRatio < 0.9) {
    mission.status = 'negotiating';
    mission.currentStepMessage = `Sedang berdiskusi di Guest Lounge dengan perwakilan ${mission.targetCompanyName}.`;

    if (mission.dialogLogs.length === 2) {
      const missionTypeText =
        mission.missionType === 'b2b_pitch'
          ? `Mempresentasikan proposal integrasi dan pertukaran layanan antar-kantor.`
          : mission.missionType === 'buy_trade'
          ? `Memverifikasi lisensi template & bertransaksi menggunakan koin virtual.`
          : mission.missionType === 'market_research'
          ? `Mengumpulkan tren industri dan bertukar wawasan dengan tim setempat.`
          : `Silaturahmi bisnis dan memperkuat koneksi aliansi.`;

      mission.dialogLogs.push({
        time: timeStr,
        speaker: 'Resepsionis Kantor Tamu',
        text: `Selamat datang di ${mission.targetCompanyName}! Proposal Anda sedang ditinjau oleh pimpinan.`,
      });

      mission.dialogLogs.push({
        time: timeStr,
        speaker: mission.agentName,
        text: missionTypeText,
      });
    }
  } else {
    // Completed!
    mission.status = 'completed';
    mission.progressPercent = 100;
    mission.currentStepMessage = `Misi sukses selesai! Karyawan telah kembali ke kantor utama membawa hasil kesepakatan.`;

    if (!mission.outcome) {
      const earnedXp = Math.floor(Math.random() * 200) + 150;
      const earnedCoins = Math.floor(Math.random() * 400) + 200;

      mission.dialogLogs.push({
        time: timeStr,
        speaker: mission.agentName,
        text: `Alhamdulillah! Kesepakatan disetujui. Kita mendapatkan +${earnedXp} XP dan +${earnedCoins} Koin Kantor!`,
      });

      mission.outcome = {
        success: true,
        summary: `Kunjungan ke ${mission.targetCompanyName} berhasil dengan sangat memuaskan. Hubungan B2B terjalin erat.`,
        earnedXp,
        earnedCoins,
        tradeContract: `CTR-B2B-${Math.floor(Math.random() * 90000) + 10000}`,
      };
    }
  }

  saveAllMissions(missions);
  return mission;
}

/**
 * Cancel or recall an in-progress mission
 */
export function cancelTravelMission(missionId: string): boolean {
  const missions = loadAllMissions();
  const mission = missions.find((m) => m.id === missionId);
  if (!mission) return false;

  mission.status = 'completed';
  mission.currentStepMessage = 'Misi dibatalkan oleh pengguna. Karyawan kembali ke kantor.';
  mission.outcome = {
    success: false,
    summary: 'Misi dibatalkan sebelum tiba di kantor tujuan.',
    earnedXp: 0,
    earnedCoins: 0,
  };

  saveAllMissions(missions);
  return true;
}
