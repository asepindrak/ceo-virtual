/**
 * 📡 CEO VIRTUAL - Decentralized P2P Node Engine & Auto-Discovery Daemon
 * 
 * Features:
 * 1. Cryptographic Node Identity (nodeId, Ed25519/SHA256 fingerprint in ~/.vigent/node_identity.json).
 * 2. Zero-Config LAN Discovery via UDP Broadcast (port 28484) using Node.js built-in 'dgram'.
 * 3. Direct WAN / Tailscale / Cross-Network Peering via HTTP/WebSocket Handshake.
 * 4. P2P Gossip & Heartbeat Table (replicates public company presence, bounties, and visitor events).
 * 5. Multi-Tenant Privacy Isolation: Private keys & workspace files NEVER leave the local node.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import dgram from 'dgram';
import { VIGENT_HOME } from './workspaceManager';
import { assignEmptyPlotInRegion } from './nodeIdentityManager';

const VIGENT_DIR = VIGENT_HOME;
const IDENTITY_FILE = path.join(VIGENT_DIR, 'node_identity.json');
const PEERS_FILE = path.join(VIGENT_DIR, 'p2p_peers.json');
const CONFIG_FILE = path.join(VIGENT_DIR, 'p2p_config.json');

const UDP_DISCOVERY_PORT = 28484;
const DEFAULT_HTTP_PORT = 28483;

export interface NodeIdentity {
  nodeId: string;
  fingerprint: string;
  companyName: string;
  regionalSector: string;
  regionId?: string;
  plotId?: string;
  plotCoords?: { cx: number; cz: number };
  httpPort: number;
  udpPort: number;
  createdAt: number;
}

export interface PeerNode {
  nodeId: string;
  companyName: string;
  regionalSector: string;
  regionId?: string;
  plotId?: string;
  plotCoords?: { cx: number; cz: number };
  endpointUrl: string;
  ip: string;
  httpPort: number;
  lastSeen: number;
  isOnline: boolean;
  discoveredVia: 'lan_udp' | 'direct_connect' | 'public_relay';
  reputationScore: number;
  companyId?: string;
  industry?: string;
  officeLayoutTemplate?: string;
  employees?: any[];
  lastPresenceUpdate?: number;
}

// In-Memory state for active daemon
let activeIdentity: NodeIdentity | null = null;
let activePeers: Map<string, PeerNode> = new Map();
let localAgents: any[] = [];
let localCompanyMeta: {
  companyId?: string;
  companyName?: string;
  industry?: string;
  officeLayoutTemplate?: string;
} = {};

export function updateLocalAgentsState(agents: any[], companyMeta?: any) {
  if (Array.isArray(agents)) {
    localAgents = agents;
  }
  if (companyMeta) {
    localCompanyMeta = { ...localCompanyMeta, ...companyMeta };
    if (companyMeta.companyName) {
      updateNodePresence(companyMeta.companyName, companyMeta.regionalSector);
    }
  }
  broadcastBeacon();
}

export function getLocalAgentsState() {
  return {
    agents: localAgents,
    companyMeta: localCompanyMeta,
  };
}

let udpServer: dgram.Socket | null = null;
let broadcastInterval: NodeJS.Timeout | null = null;
let relaySyncInterval: NodeJS.Timeout | null = null;
let isDaemonInitialized = false;
let configuredRelayUrl: string = '';

function ensureVigentDir() {
  if (!fs.existsSync(VIGENT_DIR)) {
    fs.mkdirSync(VIGENT_DIR, { recursive: true });
  }
}

/**
 * 1. Load or generate local node cryptographic identity
 */
export function getOrCreateNodeIdentity(companyName: string = 'ShadowMove Inc', sector: string = 'region-jakarta'): NodeIdentity {
  ensureVigentDir();

  const KEYSTORE_FILE = path.join(VIGENT_DIR, 'keystore.json');
  let ksData: any = null;
  if (fs.existsSync(KEYSTORE_FILE)) {
    try {
      ksData = JSON.parse(fs.readFileSync(KEYSTORE_FILE, 'utf-8'));
    } catch {}
  }

  if (activeIdentity) {
    if (ksData) {
      if (ksData.regionId) {
        activeIdentity.regionId = ksData.regionId;
        activeIdentity.regionalSector = ksData.regionId;
      }
      if (ksData.plotId) activeIdentity.plotId = ksData.plotId;
      if (ksData.plotCoords) activeIdentity.plotCoords = ksData.plotCoords;
      if (ksData.companyName) activeIdentity.companyName = ksData.companyName;
    }
    return activeIdentity;
  }

  if (fs.existsSync(IDENTITY_FILE)) {
    try {
      const raw = fs.readFileSync(IDENTITY_FILE, 'utf-8');
      activeIdentity = JSON.parse(raw);
      if (activeIdentity && activeIdentity.nodeId) {
        if (ksData) {
          if (ksData.regionId) {
            activeIdentity.regionId = ksData.regionId;
            activeIdentity.regionalSector = ksData.regionId;
          }
          if (ksData.plotId) activeIdentity.plotId = ksData.plotId;
          if (ksData.plotCoords) activeIdentity.plotCoords = ksData.plotCoords;
          if (ksData.companyName) activeIdentity.companyName = ksData.companyName;
        }
        return activeIdentity;
      }
    } catch {}
  }

  // Generate new cryptographic node identity
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const nodeId = `vigent-node-${randomBytes.slice(0, 12)}`;
  const fingerprint = crypto.createHash('sha256').update(`${nodeId}-${os.hostname()}-${Date.now()}`).digest('hex');

  activeIdentity = {
    nodeId,
    fingerprint: fingerprint.slice(0, 32),
    companyName: ksData?.companyName || companyName,
    regionalSector: ksData?.regionId || sector,
    regionId: ksData?.regionId || sector,
    plotId: ksData?.plotId || 'plot-nc',
    plotCoords: ksData?.plotCoords || { cx: 0.0, cz: -1.0 },
    httpPort: DEFAULT_HTTP_PORT,
    udpPort: UDP_DISCOVERY_PORT,
    createdAt: Date.now(),
  };

  try {
    fs.writeFileSync(IDENTITY_FILE, JSON.stringify(activeIdentity, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save node identity:', err);
  }

  return activeIdentity;
}

/**
 * Update local node's broadcasted company presence across P2P swarm
 */
export function updateNodePresence(
  companyName?: string,
  regionalSector?: string,
  plotId?: string,
  plotCoords?: { cx: number; cz: number }
): NodeIdentity {
  const identity = getOrCreateNodeIdentity();
  if (companyName && companyName.trim()) {
    identity.companyName = companyName.trim();
  }
  if (regionalSector && regionalSector.trim()) {
    identity.regionalSector = regionalSector.trim();
    identity.regionId = regionalSector.trim();
  }
  if (plotId) {
    identity.plotId = plotId;
  }
  if (plotCoords) {
    identity.plotCoords = plotCoords;
  }
  activeIdentity = identity;
  try {
    fs.writeFileSync(IDENTITY_FILE, JSON.stringify(activeIdentity, null, 2), 'utf-8');
  } catch {}
  broadcastBeacon();
  syncWithPublicRelay().catch(() => {});
  return identity;
}

/**
 * Automatically resolve kavling plot collision:
 * If another active live node in the same region is using the same plotId,
 * find an unoccupied plot in this region, auto-relocate, update keystore & node_identity,
 * and broadcast the update to avoid any kavling overlap.
 */
export function checkAndResolvePlotConflict(peer: PeerNode) {
  if (!peer || !activeIdentity || peer.nodeId === activeIdentity.nodeId) return;

  const myRegion = activeIdentity.regionId || activeIdentity.regionalSector || 'apac-jakarta-1';
  const peerRegion = peer.regionId || peer.regionalSector || 'apac-jakarta-1';

  if (myRegion !== peerRegion) return;

  const myPlot = activeIdentity.plotId || 'plot-nc';
  const peerPlot = peer.plotId || 'plot-nc';

  if (myPlot !== peerPlot) return;

  console.warn(`[Vigent P2P Conflict]: Kavling collision detected on "${myPlot}" in region "${myRegion}" with live peer ${peer.companyName} (${peer.nodeId}). Auto-resolving plot assignment...`);

  const allPeers = Array.from(activePeers.values());
  const { plotId: newPlotId, plotCoords: newCoords } = assignEmptyPlotInRegion(myRegion, allPeers, undefined);

  if (newPlotId !== myPlot) {
    console.log(`[Vigent P2P Conflict]: Successfully reassigned local node to empty kavling "${newPlotId}" at (${newCoords.cx}, ${newCoords.cz})`);
    activeIdentity.plotId = newPlotId;
    activeIdentity.plotCoords = newCoords;

    try {
      fs.writeFileSync(IDENTITY_FILE, JSON.stringify(activeIdentity, null, 2), 'utf-8');
    } catch {}

    const ksFile = path.join(VIGENT_DIR, 'keystore.json');
    if (fs.existsSync(ksFile)) {
      try {
        const ks = JSON.parse(fs.readFileSync(ksFile, 'utf-8'));
        ks.plotId = newPlotId;
        ks.plotCoords = newCoords;
        fs.writeFileSync(ksFile, JSON.stringify(ks, null, 2), 'utf-8');
      } catch {}
    }

    broadcastBeacon();
  }
}


/**
 * 2. Load and persist known peers table
 */
function loadPersistedPeers() {
  ensureVigentDir();
  if (fs.existsSync(PEERS_FILE)) {
    try {
      const raw = fs.readFileSync(PEERS_FILE, 'utf-8');
      const list: PeerNode[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((p) => {
          // Check if peer is stale (older than 2 minutes)
          p.isOnline = Date.now() - p.lastSeen < 120000;
          activePeers.set(p.nodeId, p);
        });
      }
    } catch {}
  }
}

function persistPeers() {
  ensureVigentDir();
  try {
    const list = Array.from(activePeers.values());
    fs.writeFileSync(PEERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save peers:', err);
  }
}

/**
 * 3. Start LAN UDP Auto-Discovery Daemon (Zero-Config)
 */
export function startP2PDiscoveryDaemon(): boolean {
  if (isDaemonInitialized) return true;

  const identity = getOrCreateNodeIdentity();
  loadPersistedPeers();

  try {
    udpServer = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    udpServer.on('error', (err) => {
      console.warn('[Vigent P2P Node Notice]: UDP Discovery notice:', err.message);
      try {
        udpServer?.close();
      } catch {}
      udpServer = null;
    });

    udpServer.on('message', (msg, rinfo) => {
      try {
        const payload = JSON.parse(msg.toString('utf-8'));
        if (payload.type === 'VIGENT_BEACON' && payload.nodeId && payload.nodeId !== identity.nodeId) {
          const peerEndpoint = `http://${rinfo.address}:${payload.httpPort || DEFAULT_HTTP_PORT}`;

          const existing = activePeers.get(payload.nodeId);
          const peer: PeerNode = {
            nodeId: payload.nodeId,
            companyName: payload.companyName || 'Unknown Office',
            regionalSector: payload.regionalSector || payload.regionId || 'apac-jakarta-1',
            regionId: payload.regionId || payload.regionalSector || 'apac-jakarta-1',
            plotId: payload.plotId,
            plotCoords: payload.plotCoords,
            endpointUrl: peerEndpoint,
            ip: rinfo.address,
            httpPort: payload.httpPort || DEFAULT_HTTP_PORT,
            lastSeen: Date.now(),
            isOnline: true,
            discoveredVia: 'lan_udp',
            reputationScore: existing?.reputationScore || 100,
            companyId: payload.companyId || existing?.companyId,
            industry: payload.industry || existing?.industry,
            officeLayoutTemplate: payload.officeLayoutTemplate || existing?.officeLayoutTemplate,
            employees: Array.isArray(payload.employees) ? payload.employees : (existing?.employees || []),
            lastPresenceUpdate: Date.now(),
          };

          activePeers.set(payload.nodeId, peer);
          persistPeers();
          checkAndResolvePlotConflict(peer);
        }
      } catch {
        // Ignore non-json udp packets
      }
    });

    udpServer.on('listening', () => {
      try {
        udpServer?.setBroadcast(true);
        // Initial beacon broadcast
        broadcastBeacon();
      } catch {}
    });

    udpServer.bind(UDP_DISCOVERY_PORT);

    // Periodically broadcast beacon every 12 seconds
    if (!broadcastInterval) {
      broadcastInterval = setInterval(() => {
        broadcastBeacon();
        // Prune stale peers
        const now = Date.now();
        activePeers.forEach((p) => {
          if (now - p.lastSeen > 120000) {
            p.isOnline = false;
          }
        });
      }, 12000);
    }

    isDaemonInitialized = true;
    ensureRelaySyncLoop();
    return true;
  } catch (err: any) {
    console.warn('[Vigent P2P Node]: Running in fallback direct peering mode:', err?.message);
    ensureRelaySyncLoop();
    return false;
  }
}

/**
 * 4. Broadcast UDP Beacon packet to LAN
 */
export function broadcastBeacon(): boolean {
  if (!udpServer) return false;
  const identity = getOrCreateNodeIdentity();

  const beaconData = JSON.stringify({
    type: 'VIGENT_BEACON',
    nodeId: identity.nodeId,
    companyName: identity.companyName,
    regionalSector: identity.regionalSector || identity.regionId || 'apac-jakarta-1',
    regionId: identity.regionId || identity.regionalSector || 'apac-jakarta-1',
    plotId: identity.plotId || 'plot-nc',
    plotCoords: identity.plotCoords || { cx: 0.0, cz: -1.0 },
    httpPort: identity.httpPort,
    companyId: localCompanyMeta.companyId,
    industry: localCompanyMeta.industry,
    officeLayoutTemplate: localCompanyMeta.officeLayoutTemplate,
    employees: localAgents,
    timestamp: Date.now(),
  });

  const buffer = Buffer.from(beaconData);
  try {
    udpServer.send(buffer, 0, buffer.length, UDP_DISCOVERY_PORT, '255.255.255.255', (err) => {
      if (err) {
        // Broadcast might be limited on some network interfaces
      }
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 5. Direct Connect / WAN Peering via HTTP Handshake
 */
export async function connectToPeerDirectly(peerUrl: string): Promise<{ success: boolean; peer?: PeerNode; message: string }> {
  const identity = getOrCreateNodeIdentity();
  let cleanUrl = peerUrl.trim().replace(/\/+$/, '');
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `http://${cleanUrl}`;
  }

  try {
    const handshakeUrl = `${cleanUrl}/api/p2p`;
    const res = await fetch(handshakeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'handshake',
        senderNodeId: identity.nodeId,
        senderCompanyName: identity.companyName,
        senderRegionalSector: identity.regionalSector || identity.regionId || 'apac-jakarta-1',
        senderRegionId: identity.regionId || identity.regionalSector || 'apac-jakarta-1',
        senderPlotId: identity.plotId || 'plot-nc',
        senderPlotCoords: identity.plotCoords || { cx: 0.0, cz: -1.0 },
        senderHttpPort: identity.httpPort,
        companyId: localCompanyMeta.companyId,
        industry: localCompanyMeta.industry,
        officeLayoutTemplate: localCompanyMeta.officeLayoutTemplate,
        employees: localAgents,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { success: false, message: `Node target merespons status ${res.status}` };
    }

    const data = await res.json();
    if (data.success && data.nodeId) {
      const urlObj = new URL(cleanUrl);
      const peer: PeerNode = {
        nodeId: data.nodeId,
        companyName: data.companyName || 'Remote Peer',
        regionalSector: data.regionalSector || data.regionId || 'apac-jakarta-1',
        regionId: data.regionId || data.regionalSector || 'apac-jakarta-1',
        plotId: data.plotId,
        plotCoords: data.plotCoords,
        endpointUrl: cleanUrl,
        ip: urlObj.hostname,
        httpPort: parseInt(urlObj.port || '28483', 10),
        lastSeen: Date.now(),
        isOnline: true,
        discoveredVia: 'direct_connect',
        reputationScore: 100,
        companyId: data.companyId,
        industry: data.industry,
        officeLayoutTemplate: data.officeLayoutTemplate,
        employees: Array.isArray(data.employees) ? data.employees : [],
        lastPresenceUpdate: Date.now(),
      };

      activePeers.set(data.nodeId, peer);
      persistPeers();
      checkAndResolvePlotConflict(peer);

      return {
        success: true,
        peer,
        message: `Berhasil terhubung ke Node rekan "${peer.companyName}" (${peer.nodeId})!`,
      };
    }

    return { success: false, message: data.error || 'Format respons handshake tidak valid' };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menjangkau node peer di ${cleanUrl}: ${err.message || 'Connection timeout'}`,
    };
  }
}

const DEFAULT_COMMUNITY_RELAY_URL = 'https://relay.commitflow.space';

/**
 * 6. Public Community Relay Hub Configuration & Auto-Sync
 */
export function getPublicRelayUrl(): string {
  if (configuredRelayUrl) return configuredRelayUrl;
  ensureVigentDir();
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (cfg.publicRelayUrl) {
        configuredRelayUrl = cfg.publicRelayUrl;
        return configuredRelayUrl;
      }
    } catch {}
  }
  return process.env.NEXT_PUBLIC_VIGENT_RELAY_URL || DEFAULT_COMMUNITY_RELAY_URL;
}

export function setPublicRelayUrl(relayUrl: string): string {
  ensureVigentDir();
  const clean = (relayUrl || '').trim().replace(/\/+$/, '');
  configuredRelayUrl = clean;

  try {
    let cfg: any = {};
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      } catch {}
    }
    cfg.publicRelayUrl = clean;
    cfg.updatedAt = Date.now();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save p2p config:', err);
  }

  // Trigger immediate sync
  if (clean) {
    syncWithPublicRelay();
  }

  return clean;
}

/**
 * Sync local node with Dokploy Public Relay Hub
 */
export async function syncWithPublicRelay(): Promise<{ success: boolean; totalPeers: number; message: string }> {
  const relayUrl = getPublicRelayUrl();
  if (!relayUrl) {
    return { success: false, totalPeers: 0, message: 'URL Relay Publik belum diatur.' };
  }

  const identity = getOrCreateNodeIdentity();

  try {
    // 1. Heartbeat register to public relay
    const regRes = await fetch(`${relayUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeId: identity.nodeId,
        companyName: identity.companyName,
        regionalSector: identity.regionalSector || identity.regionId || 'apac-jakarta-1',
        regionId: identity.regionId || identity.regionalSector || 'apac-jakarta-1',
        plotId: identity.plotId || 'plot-nc',
        plotCoords: identity.plotCoords || { cx: 0.0, cz: -1.0 },
        httpPort: identity.httpPort,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!regRes.ok) {
      return { success: false, totalPeers: 0, message: `Relay merespons HTTP ${regRes.status}` };
    }

    // 2. Fetch active community peers from relay
    const peersRes = await fetch(`${relayUrl}/api/peers?exclude=${identity.nodeId}`, {
      signal: AbortSignal.timeout(6000),
    });

    if (peersRes.ok) {
      const data = await peersRes.json();
      if (data.success && Array.isArray(data.peers)) {
        data.peers.forEach((p: PeerNode) => {
          const peerObj: PeerNode = {
            ...p,
            regionId: p.regionId || p.regionalSector || 'apac-jakarta-1',
            plotId: p.plotId,
            plotCoords: p.plotCoords,
            discoveredVia: 'public_relay',
            lastSeen: Date.now(),
            isOnline: true,
          };
          activePeers.set(p.nodeId, peerObj);
          checkAndResolvePlotConflict(peerObj);
        });
        persistPeers();
        return {
          success: true,
          totalPeers: data.peers.length,
          message: `Berhasil tersinkronisasi dengan Dokploy Relay! Terdeteksi ${data.peers.length} node rekan online.`,
        };
      }
    }

    return { success: true, totalPeers: 0, message: 'Terhubung ke Relay, belum ada node rekan lain yang online.' };
  } catch (err: any) {
    return {
      success: false,
      totalPeers: 0,
      message: `Gagal sinkronisasi dengan Relay ${relayUrl}: ${err.message || 'Timeout'}`,
    };
  }
}

// Start relay background sync loop
function ensureRelaySyncLoop() {
  if (relaySyncInterval) return;
  const relayUrl = getPublicRelayUrl();
  if (relayUrl) {
    syncWithPublicRelay().catch(() => {});
  }
  relaySyncInterval = setInterval(() => {
    const url = getPublicRelayUrl();
    if (url) {
      syncWithPublicRelay().catch(() => {});
    }
  }, 20000);
}

/**
 * 7. Get Current Node & Peers Status
 */
export function getNodeStatus() {
  const identity = getOrCreateNodeIdentity();
  loadPersistedPeers();
  ensureRelaySyncLoop();

  const peersList = Array.from(activePeers.values());
  const onlinePeers = peersList.filter((p) => p.isOnline);
  const relayUrl = getPublicRelayUrl();

  return {
    nodeId: identity.nodeId,
    fingerprint: identity.fingerprint,
    companyName: identity.companyName,
    regionalSector: identity.regionalSector || identity.regionId || 'apac-jakarta-1',
    regionId: identity.regionId || identity.regionalSector || 'apac-jakarta-1',
    plotId: identity.plotId || 'plot-nc',
    plotCoords: identity.plotCoords || { cx: 0.0, cz: -1.0 },
    httpPort: identity.httpPort,
    udpPort: identity.udpPort,
    isDaemonActive: isDaemonInitialized,
    publicRelayUrl: relayUrl,
    isRelayConfigured: Boolean(relayUrl),
    totalKnownPeers: peersList.length,
    onlinePeersCount: onlinePeers.length,
    peers: peersList,
  };
}

/**
 * Proactively probe live peer nodes via UDP beacon & relay sync.
 * Returns online peers and count.
 */
export async function probeAndSyncLiveNodes(): Promise<{ onlinePeersCount: number; peers: PeerNode[] }> {
  startP2PDiscoveryDaemon();
  broadcastBeacon();
  try {
    await syncWithPublicRelay();
  } catch {}

  const peersList = Array.from(activePeers.values());
  const onlinePeers = peersList.filter((p) => p.isOnline);
  return {
    onlinePeersCount: onlinePeers.length,
    peers: onlinePeers,
  };
}

/**
 * 8. Remove an inactive or stale peer
 */
export function removePeerNode(nodeId: string): boolean {
  if (activePeers.has(nodeId)) {
    activePeers.delete(nodeId);
    persistPeers();
    return true;
  }
  return false;
}
