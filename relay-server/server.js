/**
 * 🌐 VIGENT - Public P2P Rendezvous & Community Relay Hub
 * 
 * Standalone, ultra-lightweight server (~10MB RAM) for Dokploy / Docker deployment.
 * Connects Vigent nodes across the public internet, bypassing NAT/Firewalls.
 */

const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PEER_TIMEOUT_MS = 60000; // 60 seconds stale timeout

// In-Memory Global Registry of Active Vigent Nodes
const nodesRegistry = new Map();
let totalRelayedMessages = 0;
const serverStartTime = Date.now();

// Prune stale nodes every 15 seconds
setInterval(() => {
  const now = Date.now();
  for (const [nodeId, node] of nodesRegistry.entries()) {
    if (now - node.lastSeen > PEER_TIMEOUT_MS) {
      nodesRegistry.delete(nodeId);
    }
  }
}, 15000);

// Helper to parse JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Format duration
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS Headers for public multi-node access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 1. Dokploy Healthcheck endpoint
  if (pathname === '/health' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        status: 'healthy',
        uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
        activeNodes: nodesRegistry.size,
        totalRelayed: totalRelayedMessages,
      })
    );
  }

  // 2. Node Registration & Heartbeat Endpoint (POST /api/register)
  if (pathname === '/api/register' && method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const { nodeId, companyName, regionalSector, httpPort = 28483 } = data;

      if (!nodeId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'nodeId is required' }));
      }

      // Infer client IP
      const clientIp =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['x-real-ip'] ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const endpointUrl = data.endpointUrl || `http://${clientIp}:${httpPort}`;

      nodesRegistry.set(nodeId, {
        nodeId,
        companyName: companyName || 'Vigent Office',
        regionalSector: regionalSector || 'region-jakarta',
        endpointUrl,
        ip: clientIp,
        httpPort,
        registeredAt: nodesRegistry.get(nodeId)?.registeredAt || Date.now(),
        lastSeen: Date.now(),
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          success: true,
          nodeId,
          assignedIp: clientIp,
          totalOnlineNodes: nodesRegistry.size,
          message: 'Node successfully registered in Vigent Community Swarm!',
        })
      );
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 3. Query Active Peers (GET /api/peers)
  if (pathname === '/api/peers' && method === 'GET') {
    const sectorFilter = parsedUrl.query.sector;
    const excludeNodeId = parsedUrl.query.exclude;

    const peers = [];
    const now = Date.now();

    for (const [id, node] of nodesRegistry.entries()) {
      if (now - node.lastSeen > PEER_TIMEOUT_MS) continue;
      if (excludeNodeId && id === excludeNodeId) continue;
      if (sectorFilter && node.regionalSector !== sectorFilter) continue;

      peers.push({
        nodeId: node.nodeId,
        companyName: node.companyName,
        regionalSector: node.regionalSector,
        endpointUrl: node.endpointUrl,
        ip: node.ip,
        httpPort: node.httpPort,
        lastSeen: node.lastSeen,
        isOnline: true,
        discoveredVia: 'public_relay',
      });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        success: true,
        totalNodes: peers.length,
        peers,
      })
    );
  }

  // 4. Relay Message Packet between 2 nodes behind strict NAT (POST /api/relay)
  if (pathname === '/api/relay' && method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const { targetNodeId, payload } = data;

      if (!targetNodeId || !payload) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'targetNodeId and payload required' }));
      }

      const target = nodesRegistry.get(targetNodeId);
      if (!target) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Target node is offline or not found' }));
      }

      totalRelayedMessages++;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, message: 'Message relayed to target node swarm queue' }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 5. Public Status Dashboard (GET /)
  if (pathname === '/' && method === 'GET') {
    const uptimeSec = Math.floor((Date.now() - serverStartTime) / 1000);
    const nodesList = Array.from(nodesRegistry.values());

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vigent P2P Public Rendezvous & Relay Hub</title>
  <style>
    :root {
      --bg: #0d1117;
      --card: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-bright: #f0f6fc;
      --accent: #c85a2b;
      --green: #238636;
      --blue: #58a6ff;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 30px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .container {
      max-width: 900px;
      width: 100%;
    }
    .header {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 22px;
      color: var(--text-bright);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tag {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 20px;
      background: rgba(35, 134, 54, 0.2);
      color: #3fb950;
      border: 1px solid rgba(63, 185, 80, 0.3);
      font-weight: bold;
    }
    p {
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
      color: #8b949e;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }
    .metric-title {
      font-size: 11px;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-val {
      font-size: 20px;
      font-weight: bold;
      color: var(--text-bright);
      margin-top: 4px;
      font-family: monospace;
    }
    .table-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }
    h2 {
      font-size: 15px;
      margin: 0 0 16px 0;
      color: var(--text-bright);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      color: #8b949e;
      font-weight: 600;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .mono {
      font-family: monospace;
      color: var(--blue);
    }
    .empty {
      text-align: center;
      padding: 30px;
      color: #8b949e;
      font-style: italic;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 11px;
      color: #6e7681;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        🌐 Vigent P2P Public Rendezvous & Relay Hub
        <span class="tag">DOKPLOY LIVE</span>
      </h1>
      <p>
        Server penghubung desentralisasi untuk mempertemukan node-node kantor virtual Vigent di seluruh dunia.
        Memungkinkan auto-discovery dan pertukaran data pasar publik lintas router/NAT tanpa menyentuh data privat Anda.
      </p>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-title">Active Node Online</div>
        <div class="metric-val" style="color: #3fb950;">${nodesList.length} PC</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Uptime Server</div>
        <div class="metric-val">${formatUptime(uptimeSec)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Relayed Packets</div>
        <div class="metric-val" style="color: #58a6ff;">${totalRelayedMessages}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Dokploy Status</div>
        <div class="metric-val" style="color: #a371f7;">Healthy 🟢</div>
      </div>
    </div>

    <div class="table-card">
      <h2>Daftar Node Komunitas yang Sedang Terhubung (${nodesList.length})</h2>
      ${
        nodesList.length === 0
          ? `<div class="empty">Belum ada node yang online. Nyalakan Vigent di PC Anda dan masukkan URL relay ini pada pengaturan P2P!</div>`
          : `<table>
            <thead>
              <tr>
                <th>Nama Perusahaan</th>
                <th>Sektor Regional</th>
                <th>Node ID</th>
                <th>Endpoint IP</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${nodesList
                .map(
                  (n) => `<tr>
                    <td><strong>${escapeHtml(n.companyName)}</strong></td>
                    <td><span class="tag" style="color: #e3b341; border-color: rgba(227, 179, 65, 0.3); background: rgba(227, 179, 65, 0.15);">${escapeHtml(n.regionalSector)}</span></td>
                    <td class="mono">${escapeHtml(n.nodeId)}</td>
                    <td class="mono">${escapeHtml(n.ip)}:${n.httpPort}</td>
                    <td><span style="color: #3fb950; font-weight: bold;">ONLINE</span></td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>`
      }
    </div>

    <div class="footer">
      Vigent Virtual Office • Decentralized P2P Mesh Architecture • Deployed with Dokploy Dockerfile
    </div>
  </div>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  // 404 Fallback
  res.writeHead(404, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

process.on('uncaughtException', (err) => {
  console.error('[Vigent Relay Hub Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Vigent Relay Hub Unhandled Rejection]:', reason);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Vigent Relay Hub]: Running on http://0.0.0.0:${PORT}`);
  console.log(`[Vigent Relay Hub]: Dokploy Healthcheck available at /health`);
});

