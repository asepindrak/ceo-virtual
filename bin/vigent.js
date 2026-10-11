#!/usr/bin/env node

/**
 * 🤖 VIGENT - Virtual Office Agent CLI
 * Repository: https://github.com/asepindrak/vigent
 * 
 * 1-Click Installation:
 *   Windows (PowerShell):
 *     irm https://raw.githubusercontent.com/asepindrak/vigent/main/install.ps1 | iex
 * 
 *   Linux / macOS / WSL:
 *     curl -fsSL https://raw.githubusercontent.com/asepindrak/vigent/main/install.sh | bash
 * 
 * Default Dedicated Port: 28483
 * Dedicated Home Directory: ~/.vigent/workspaces
 */

const { spawn, execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const VIGENT_HOME = path.join(os.homedir(), '.vigent');
const VIGENT_WORKSPACES = path.join(VIGENT_HOME, 'workspaces');
const VIGENT_CONFIG_FILE = path.join(VIGENT_HOME, 'config.json');
const VIGENT_PID_FILE = path.join(VIGENT_HOME, 'server.pid');
const DEFAULT_PORT = 28483;

// Find repository root (where package.json lives)
function findProjectRoot() {
  let curr = __dirname;
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'package.json'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return process.cwd();
}

const PROJECT_ROOT = findProjectRoot();

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function printBanner() {
  console.log(`
${colors.cyan}${colors.bold}  ██╗   ██╗██╗ ██████╗ ███████╗███╗   ██╗████████╗
  ██║   ██║██║██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
  ██║   ██║██║██║  ███╗█████╗  ██╔██╗ ██║   ██║   
  ╚██╗ ██╔╝██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   
   ╚████╔╝ ██║╚██████╔╝███████╗██║ ╚████║   ██║   
    ╚═══╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ${colors.reset}
  ${colors.magenta}★ VIGENT - Virtual Office Agent & Autonomous Codebase Generator ★${colors.reset}
  ${colors.dim}Dedicated Port: ${DEFAULT_PORT} | Home: ${VIGENT_HOME} | Repo: asepindrak/vigent${colors.reset}
`);
}

function ensureHomeDirs() {
  if (!fs.existsSync(VIGENT_HOME)) fs.mkdirSync(VIGENT_HOME, { recursive: true });
  if (!fs.existsSync(VIGENT_WORKSPACES)) fs.mkdirSync(VIGENT_WORKSPACES, { recursive: true });
  if (!fs.existsSync(VIGENT_CONFIG_FILE)) {
    fs.writeFileSync(
      VIGENT_CONFIG_FILE,
      JSON.stringify(
        {
          port: DEFAULT_PORT,
          autoOpenBrowser: true,
          autorunAtStartup: false,
          workspaceRoot: VIGENT_WORKSPACES,
          installedAt: new Date().toISOString(),
          repo: 'https://github.com/asepindrak/vigent',
        },
        null,
        2
      )
    );
  }
}

function checkPortInUse(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/workspace`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openUrl(url) {
  if (process.platform === 'win32') {
    exec(`start "" "${url}"`);
  } else if (process.platform === 'darwin') {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

function openFolder(target) {
  const folder = target || VIGENT_WORKSPACES;
  if (process.platform === 'win32') {
    exec(`explorer "${folder}"`);
  } else if (process.platform === 'darwin') {
    exec(`open "${folder}"`);
  } else {
    exec(`xdg-open "${folder}"`);
  }
}

// Windows / macOS / Linux Startup configuration
function setStartupAutorun(enable) {
  ensureHomeDirs();
  if (process.platform === 'win32') {
    const startupFolder = path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Startup'
    );
    const batPath = path.join(startupFolder, 'Vigent.bat');

    if (enable) {
      if (!fs.existsSync(startupFolder)) fs.mkdirSync(startupFolder, { recursive: true });
      const batContent = `@echo off\r\ncd /d "${PROJECT_ROOT}"\r\nstart /b npm run dev -- -p ${DEFAULT_PORT}\r\n`;
      fs.writeFileSync(batPath, batContent, 'utf-8');
      console.log(`${colors.green}✓ Autorun enabled at Windows Startup!${colors.reset}`);
      console.log(`  File shortcut: ${colors.dim}${batPath}${colors.reset}`);
    } else {
      if (fs.existsSync(batPath)) fs.unlinkSync(batPath);
      console.log(`${colors.yellow}✓ Autorun disabled from Windows Startup.${colors.reset}`);
    }
  } else if (process.platform === 'darwin') {
    const plistDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
    const plistPath = path.join(plistDir, 'com.vigent.startup.plist');
    if (enable) {
      if (!fs.existsSync(plistDir)) fs.mkdirSync(plistDir, { recursive: true });
      const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.vigent.startup</string>
  <key>ProgramArguments</key>
  <array>
    <string>npm</string>
    <string>run</string>
    <string>dev</string>
    <string>--</string>
    <string>-p</string>
    <string>${DEFAULT_PORT}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${PROJECT_ROOT}</string>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>`;
      fs.writeFileSync(plistPath, plist, 'utf-8');
      console.log(`${colors.green}✓ Autorun enabled on macOS LaunchAgents!${colors.reset}`);
    } else {
      if (fs.existsSync(plistPath)) fs.unlinkSync(plistPath);
      console.log(`${colors.yellow}✓ Autorun disabled on macOS.${colors.reset}`);
    }
  } else {
    const autostartDir = path.join(os.homedir(), '.config', 'autostart');
    const desktopPath = path.join(autostartDir, 'vigent.desktop');
    if (enable) {
      if (!fs.existsSync(autostartDir)) fs.mkdirSync(autostartDir, { recursive: true });
      const desktop = `[Desktop Entry]
Type=Application
Exec=npm run dev -- -p ${DEFAULT_PORT}
Path=${PROJECT_ROOT}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=Vigent
`;
      fs.writeFileSync(desktopPath, desktop, 'utf-8');
      console.log(`${colors.green}✓ Autorun enabled in ~/.config/autostart!${colors.reset}`);
    } else {
      if (fs.existsSync(desktopPath)) fs.unlinkSync(desktopPath);
      console.log(`${colors.yellow}✓ Autorun disabled.${colors.reset}`);
    }
  }
}

async function handleCommand() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'start';

  ensureHomeDirs();

  if (cmd === 'start') {
    printBanner();
    const port = DEFAULT_PORT;
    const url = `http://localhost:${port}`;

    const isRunning = await checkPortInUse(port);
    if (isRunning) {
      console.log(`${colors.green}● Vigent is ALREADY RUNNING on ${url}${colors.reset}`);
      console.log(`Opening browser...`);
      openUrl(url);
      return;
    }

    console.log(`${colors.cyan}► Starting Vigent (Virtual Office Agent) on port ${colors.bold}${port}${colors.reset}...`);
    console.log(`  Workspace folder: ${colors.yellow}${VIGENT_WORKSPACES}${colors.reset}`);
    console.log(`  Project root:     ${colors.dim}${PROJECT_ROOT}${colors.reset}\n`);

    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCmd, ['run', 'dev', '--', '-p', String(port)], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true,
    });

    fs.writeFileSync(VIGENT_PID_FILE, String(child.pid), 'utf-8');

    setTimeout(() => {
      console.log(`\n${colors.green}✓ Vigent ready! Opening ${url} in your browser...${colors.reset}\n`);
      openUrl(url);
    }, 2500);

    child.on('exit', () => {
      if (fs.existsSync(VIGENT_PID_FILE)) {
        try { fs.unlinkSync(VIGENT_PID_FILE); } catch {}
      }
    });

  } else if (cmd === 'status') {
    printBanner();
    const isRunning = await checkPortInUse(DEFAULT_PORT);
    let pid = 'Unknown';
    if (fs.existsSync(VIGENT_PID_FILE)) {
      pid = fs.readFileSync(VIGENT_PID_FILE, 'utf-8').trim();
    }

    const projects = fs.existsSync(VIGENT_WORKSPACES)
      ? fs.readdirSync(VIGENT_WORKSPACES, { withFileTypes: true }).filter((e) => e.isDirectory()).length
      : 0;

    console.log(`${colors.bold}Vigent System Status:${colors.reset}`);
    console.log(`  Status:         ${isRunning ? colors.green + '● RUNNING' : colors.red + '○ STOPPED'}${colors.reset}`);
    console.log(`  URL:            ${colors.cyan}http://localhost:${DEFAULT_PORT}${colors.reset}`);
    console.log(`  PID:            ${pid}`);
    console.log(`  Home Directory: ${VIGENT_HOME}`);
    console.log(`  Workspaces:     ${VIGENT_WORKSPACES} (${projects} projects)`);
    console.log(`  Autorun:        ${isAutorunConfigured() ? colors.green + 'Enabled' : colors.yellow + 'Disabled'}${colors.reset}\n`);

  } else if (cmd === 'stop') {
    printBanner();
    console.log(`${colors.yellow}Stopping Vigent process on port ${DEFAULT_PORT}...${colors.reset}`);
    try {
      if (process.platform === 'win32') {
        execSync(`powershell -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort ${DEFAULT_PORT}).OwningProcess | Stop-Process -Force"`, { stdio: 'ignore' });
      } else {
        execSync(`lsof -ti:${DEFAULT_PORT} | xargs kill -9`, { stdio: 'ignore' });
      }
      console.log(`${colors.green}✓ Vigent stopped successfully.${colors.reset}`);
    } catch {
      console.log(`${colors.dim}No active process found on port ${DEFAULT_PORT}.${colors.reset}`);
    }
    if (fs.existsSync(VIGENT_PID_FILE)) {
      try { fs.unlinkSync(VIGENT_PID_FILE); } catch {}
    }

  } else if (cmd === 'workspace' || cmd === 'open') {
    console.log(`${colors.cyan}Opening workspace folder in File Explorer:${colors.reset} ${VIGENT_WORKSPACES}`);
    openFolder(VIGENT_WORKSPACES);

  } else if (cmd === 'autorun') {
    const subCmd = args[1];
    if (subCmd === 'enable' || subCmd === 'on') {
      setStartupAutorun(true);
    } else if (subCmd === 'disable' || subCmd === 'off') {
      setStartupAutorun(false);
    } else {
      console.log(`Usage: vigent autorun [enable|disable]`);
      console.log(`Current status: ${isAutorunConfigured() ? 'Enabled' : 'Disabled'}`);
    }

  } else if (cmd === 'create') {
    const projName = args[1];
    if (!projName) {
      console.log(`${colors.red}Please provide a project name: vigent create <name>${colors.reset}`);
      return;
    }
    const safe = projName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const target = path.join(VIGENT_WORKSPACES, safe);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    fs.writeFileSync(path.join(target, 'README.md'), `# ${projName}\nCreated via Vigent CLI\n`, 'utf-8');
    console.log(`${colors.green}✓ Created project directory: ${target}${colors.reset}`);
    openFolder(target);

  } else if (cmd === 'mcp') {
    const sub = args[1] || 'list';
    const mcpConfigFile = path.join(VIGENT_HOME, 'mcp_config.json');
    let mcpConfig = { mcpServers: {} };
    if (fs.existsSync(mcpConfigFile)) {
      try { mcpConfig = JSON.parse(fs.readFileSync(mcpConfigFile, 'utf-8')); } catch {}
    }

    if (sub === 'list') {
      printBanner();
      console.log(`${colors.bold}Model Context Protocol (MCP) Servers (${mcpConfigFile}):${colors.reset}\n`);
      const servers = Object.values(mcpConfig.mcpServers || {});
      if (servers.length === 0) {
        console.log(`  ${colors.dim}No MCP servers configured.${colors.reset}`);
      } else {
        servers.forEach((s) => {
          const status = s.enabled ? `${colors.green}● ENABLED${colors.reset}` : `${colors.dim}○ DISABLED${colors.reset}`;
          console.log(`  ${colors.bold}${s.name}${colors.reset} [${s.id}] - ${status}`);
          console.log(`    Command: ${colors.cyan}${s.command} ${(s.args || []).join(' ')}${colors.reset}`);
          console.log(`    Roles:   ${colors.yellow}${Array.isArray(s.assignedRoles) ? s.assignedRoles.join(', ') : s.assignedRoles}${colors.reset}`);
          console.log(`    Desc:    ${s.description}\n`);
        });
      }
    } else if (sub === 'enable' || sub === 'on') {
      const targetId = args[2];
      if (!targetId || !mcpConfig.mcpServers[targetId]) {
        console.log(`${colors.red}MCP server '${targetId}' not found. Run 'vigent mcp list' to see servers.${colors.reset}`);
        return;
      }
      mcpConfig.mcpServers[targetId].enabled = true;
      fs.writeFileSync(mcpConfigFile, JSON.stringify(mcpConfig, null, 2), 'utf-8');
      console.log(`${colors.green}✓ Enabled MCP Server: ${targetId}${colors.reset}`);
    } else if (sub === 'disable' || sub === 'off') {
      const targetId = args[2];
      if (!targetId || !mcpConfig.mcpServers[targetId]) {
        console.log(`${colors.red}MCP server '${targetId}' not found. Run 'vigent mcp list' to see servers.${colors.reset}`);
        return;
      }
      mcpConfig.mcpServers[targetId].enabled = false;
      fs.writeFileSync(mcpConfigFile, JSON.stringify(mcpConfig, null, 2), 'utf-8');
      console.log(`${colors.yellow}✓ Disabled MCP Server: ${targetId}${colors.reset}`);
    } else {
      console.log(`Usage: vigent mcp [list | enable <id> | disable <id>]`);
    }

  } else if (cmd === 'skill' || cmd === 'skills') {
    const sub = args[1] || 'list';
    const skillsDir = path.join(VIGENT_HOME, 'skills');

    if (sub === 'list') {
      printBanner();
      console.log(`${colors.bold}Installed Role Skills & SOPs (${skillsDir}):${colors.reset}\n`);
      if (!fs.existsSync(skillsDir)) {
        console.log(`  ${colors.dim}No skills installed yet.${colors.reset}`);
      } else {
        const folders = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
        folders.forEach((f) => {
          const skillFile = path.join(skillsDir, f.name, 'SKILL.md');
          if (fs.existsSync(skillFile)) {
            console.log(`  📚 ${colors.bold}${f.name}${colors.reset}`);
            console.log(`     Path: ${colors.dim}${skillFile}${colors.reset}`);
          }
        });
      }
      console.log('');
    } else {
      console.log(`Usage: vigent skill [list]`);
    }

  } else if (cmd === 'memory' || cmd === 'memories') {
    const sub = args[1] || 'list';
    printBanner();
    console.log(`${colors.bold}🧠 Vigent Company Memory Engine & Vector DB:${colors.reset}\n`);

    if (sub === 'list' || sub === 'stats') {
      const files = fs.readdirSync(VIGENT_HOME).filter((f) => f.startsWith('memories_') && f.endsWith('.json'));
      console.log(`  Vector Engine:  ${colors.green}● Active (Dual-Mode: Zero-Setup Local Vector + Remote LLM /v1/embeddings)${colors.reset}`);
      console.log(`  Dimension:      ${colors.cyan}64D Semantic Trigram Hash (Local) / Custom Provider (Remote)${colors.reset}`);
      console.log(`  Storage Root:   ${colors.dim}${VIGENT_HOME}${colors.reset}\n`);

      if (files.length === 0) {
        console.log(`  ${colors.yellow}Belum ada file memori tersimpan. Inisialisasi sekarang dengan: vigent memory init${colors.reset}\n`);
      } else {
        files.forEach((f) => {
          const compId = f.replace('memories_', '').replace('.json', '');
          try {
            const data = JSON.parse(fs.readFileSync(path.join(VIGENT_HOME, f), 'utf-8'));
            const progFile = path.join(VIGENT_HOME, `progression_${compId}.json`);
            let levelInfo = 'Level 1 (0 XP)';
            if (fs.existsSync(progFile)) {
              const prog = JSON.parse(fs.readFileSync(progFile, 'utf-8'));
              levelInfo = `Level ${prog.level || 1} (${prog.xp || 0} XP, "${prog.title || 'Startup'}")`;
            }
            console.log(`  🏢 Perusahaan: ${colors.bold}${compId}${colors.reset}`);
            console.log(`     Tingkat:    ${colors.yellow}${levelInfo}${colors.reset}`);
            console.log(`     Total Item: ${colors.green}${data.length} memori terindeks${colors.reset}`);
            console.log(`     File:       ${colors.dim}${f}${colors.reset}\n`);
          } catch {}
        });
      }
    } else if (sub === 'init') {
      console.log(`${colors.green}► Inisialisasi memori bawaan & level untuk seluruh perusahaan...${colors.reset}`);
      const defaultPresetIds = ['shadowmove-hq', 'nexus-flow', 'aether-labs'];
      defaultPresetIds.forEach((id) => {
        const memFile = path.join(VIGENT_HOME, `memories_${id}.json`);
        const progFile = path.join(VIGENT_HOME, `progression_${id}.json`);
        if (!fs.existsSync(memFile)) {
          fs.writeFileSync(
            memFile,
            JSON.stringify(
              [
                {
                  id: `mem-${id}-init-1`,
                  companyId: id,
                  type: 'lore',
                  title: 'Prinsip Budaya & Visi Kantor',
                  content: 'Fokus pada eksekusi cepat, arsitektur modular, kualitas visual tinggi, dan iterasi sprint otonom.',
                  tags: ['culture', 'vision', 'autonomous'],
                  createdAt: Date.now(),
                  authorAgent: 'Founder',
                  importance: 10,
                },
                {
                  id: `mem-${id}-init-2`,
                  companyId: id,
                  type: 'rule',
                  title: 'Standar Kualitas Sprint & Kode',
                  content: 'Setiap file harus bersih dari syntax error, responsif di mobile/desktop, dan deliverable terdokumentasi rapi.',
                  tags: ['standard', 'quality', 'sop'],
                  createdAt: Date.now(),
                  authorAgent: 'Founder',
                  importance: 9,
                },
              ],
              null,
              2
            ),
            'utf-8'
          );
        }
        if (!fs.existsSync(progFile)) {
          fs.writeFileSync(
            progFile,
            JSON.stringify(
              {
                companyId: id,
                level: 1,
                xp: 300,
                nextLevelXp: 1000,
                title: 'Startup Visioner',
                tasksCompletedCount: 2,
                totalMemoriesCount: 2,
                achievements: ['Kantor Berdiri', 'Memori Pertama Diindeks'],
              },
              null,
              2
            ),
            'utf-8'
          );
        }
      });
      console.log(`${colors.green}✓ Memory Engine berhasil diinisialisasi untuk development & pengguna baru!${colors.reset}\n`);
    } else {
      console.log(`Usage: vigent memory [list | stats | init]`);
    }

  } else {
    printBanner();
    console.log(`${colors.bold}Commands:${colors.reset}
  ${colors.cyan}vigent start${colors.reset}              Start Vigent on port ${DEFAULT_PORT} & open browser
  ${colors.cyan}vigent status${colors.reset}             Check if server is active, PID, and project stats
  ${colors.cyan}vigent stop${colors.reset}               Stop running server
  ${colors.cyan}vigent workspace${colors.reset}          Open ~/.vigent/workspaces in OS File Explorer
  ${colors.cyan}vigent memory list${colors.reset}        Lihat arsip memori, level perusahaan, dan status Vector DB
  ${colors.cyan}vigent memory init${colors.reset}        Inisialisasi memori seed & progression default
  ${colors.cyan}vigent mcp list${colors.reset}           List Model Context Protocol (MCP) servers
  ${colors.cyan}vigent mcp enable <id>${colors.reset}    Enable an MCP server (e.g. postgres, github, brave-search)
  ${colors.cyan}vigent mcp disable <id>${colors.reset}   Disable an MCP server
  ${colors.cyan}vigent skill list${colors.reset}         List installed Role Skills & SOPs
  ${colors.cyan}vigent autorun enable${colors.reset}     Enable auto-start on Windows/macOS/Linux startup
  ${colors.cyan}vigent autorun disable${colors.reset}    Disable startup autorun
  ${colors.cyan}vigent create <name>${colors.reset}      Scaffold a new project in ~/.vigent/workspaces/
  ${colors.cyan}vigent help${colors.reset}               Show this help message
`);
  }
}

function isAutorunConfigured() {
  if (process.platform === 'win32') {
    const startupFolder = path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Startup'
    );
    return fs.existsSync(path.join(startupFolder, 'Vigent.bat')) || fs.existsSync(path.join(startupFolder, 'RealAgent3D.bat'));
  }
  return false;
}

handleCommand().catch((err) => {
  console.error(err);
  process.exit(1);
});
