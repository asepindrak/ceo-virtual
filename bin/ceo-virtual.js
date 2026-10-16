#!/usr/bin/env node

/**
 * 👑 CEO VIRTUAL - Autonomous Workplace & Virtual Office CLI
 * Repository: https://github.com/asepindrak/ceo-virtual
 * 
 * 1-Click Installation:
 *   Windows (PowerShell):
 *     irm https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/install.ps1 | iex
 * 
 *   Linux / macOS / WSL:
 *     curl -fsSL https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/install.sh | bash
 * 
 * Default Dedicated Port: 28483
 * Dedicated Home Directory: ~/.ceo-virtual/workspaces
 */

const { spawn, execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

// Support both modern ~/.ceo-virtual and legacy ~/.vigent for backward compatibility
const CEO_HOME = path.join(os.homedir(), '.ceo-virtual');
const LEGACY_VIGENT_HOME = path.join(os.homedir(), '.vigent');

// Auto-migrate from ~/.vigent if present and ~/.ceo-virtual does not exist
if (!fs.existsSync(CEO_HOME) && fs.existsSync(LEGACY_VIGENT_HOME)) {
  try {
    fs.cpSync(LEGACY_VIGENT_HOME, CEO_HOME, { recursive: true });
  } catch (err) {
    // If copy fails, fallback to legacy path
  }
}

const APP_HOME = fs.existsSync(CEO_HOME) ? CEO_HOME : (fs.existsSync(LEGACY_VIGENT_HOME) ? LEGACY_VIGENT_HOME : CEO_HOME);
const APP_WORKSPACES = path.join(APP_HOME, 'workspaces');
const APP_CONFIG_FILE = path.join(APP_HOME, 'config.json');
const APP_PID_FILE = path.join(APP_HOME, 'server.pid');
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
${colors.cyan}${colors.bold}   ██████╗███████╗ ██████╗     ██╗   ██╗██╗██████╗ ████████╗██╗   ██╗ █████╗ ██╗     
  ██╔════╝██╔════╝██╔═══██╗    ██║   ██║██║██╔══██╗╚══██╔══╝██║   ██║██╔══██╗██║     
  ██║     █████╗  ██║   ██║    ██║   ██║██║██████╔╝   ██║   ██║   ██║███████║██║     
  ██║     ██╔══╝  ██║   ██║    ╚██╗ ██╔╝██║██╔══██╗   ██║   ██║   ██║██╔══██║██║     
  ╚██████╗███████╗╚██████╔╝     ╚████╔╝ ██║██║  ██║   ██║   ╚██████╔╝██║  ██║███████╗
   ╚═════╝╚══════╝ ╚═════╝       ╚═══╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝${colors.reset}
  ${colors.magenta}★ CEO VIRTUAL - Autonomous Virtual Office & Multi-Agent Workplace ★${colors.reset}
  ${colors.dim}Dedicated Port: ${DEFAULT_PORT} | Home: ${APP_HOME} | Repo: asepindrak/ceo-virtual${colors.reset}
`);
}

function ensureHomeDirs() {
  if (!fs.existsSync(APP_HOME)) fs.mkdirSync(APP_HOME, { recursive: true });
  if (!fs.existsSync(APP_WORKSPACES)) fs.mkdirSync(APP_WORKSPACES, { recursive: true });
  if (!fs.existsSync(APP_CONFIG_FILE)) {
    fs.writeFileSync(
      APP_CONFIG_FILE,
      JSON.stringify(
        {
          port: DEFAULT_PORT,
          autoOpenBrowser: true,
          autorunAtStartup: false,
          workspaceRoot: APP_WORKSPACES,
          installedAt: new Date().toISOString(),
          repo: 'https://github.com/asepindrak/ceo-virtual',
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
  const folder = target || APP_WORKSPACES;
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
    const batPath = path.join(startupFolder, 'CEOVirtual.bat');
    const legacyBat = path.join(startupFolder, 'Vigent.bat');

    if (enable) {
      if (!fs.existsSync(startupFolder)) fs.mkdirSync(startupFolder, { recursive: true });
      const batContent = `@echo off\r\ncd /d "${PROJECT_ROOT}"\r\nnode "${PROJECT_ROOT}\\bin\\ceo-virtual.js" start --daemon\r\n`;
      fs.writeFileSync(batPath, batContent, 'utf-8');
      console.log(`${colors.green}✓ Autorun enabled at Windows Startup!${colors.reset}`);
      console.log(`  File shortcut: ${colors.dim}${batPath}${colors.reset}`);
    } else {
      if (fs.existsSync(batPath)) fs.unlinkSync(batPath);
      if (fs.existsSync(legacyBat)) fs.unlinkSync(legacyBat);
      console.log(`${colors.yellow}✓ Autorun disabled from Windows Startup.${colors.reset}`);
    }
  } else if (process.platform === 'darwin') {
    const plistDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
    const plistPath = path.join(plistDir, 'com.ceovirtual.startup.plist');
    if (enable) {
      if (!fs.existsSync(plistDir)) fs.mkdirSync(plistDir, { recursive: true });
      const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.ceovirtual.startup</string>
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
    const desktopPath = path.join(autostartDir, 'ceo-virtual.desktop');
    if (enable) {
      if (!fs.existsSync(autostartDir)) fs.mkdirSync(autostartDir, { recursive: true });
      const desktop = `[Desktop Entry]
Type=Application
Exec=npm run dev -- -p ${DEFAULT_PORT}
Path=${PROJECT_ROOT}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=CEO Virtual
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

  if (cmd === 'start' || cmd === 'daemon') {
    const isDaemon = args.includes('--daemon') || args.includes('-d') || cmd === 'daemon';
    printBanner();
    const port = DEFAULT_PORT;
    const url = `http://localhost:${port}`;

    const isRunning = await checkPortInUse(port);
    if (isRunning) {
      console.log(`${colors.green}● CEO Virtual is ALREADY RUNNING on ${url}${colors.reset}`);
      console.log(`Opening browser...`);
      openUrl(url);
      return;
    }

    console.log(`${colors.cyan}► Starting CEO Virtual on port ${colors.bold}${port}${colors.reset}...`);
    console.log(`  Workspace folder: ${colors.yellow}${APP_WORKSPACES}${colors.reset}`);
    console.log(`  Project root:     ${colors.dim}${PROJECT_ROOT}${colors.reset}\n`);

    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

    if (isDaemon) {
      console.log(`${colors.cyan}► Starting CEO Virtual in BACKGROUND (Daemon Mode)...${colors.reset}`);
      const logFile = path.join(APP_HOME, 'logs', 'server.log');
      const logDir = path.dirname(logFile);
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      const out = fs.openSync(logFile, 'a');
      const child = spawn(npmCmd, ['run', 'dev', '--', '-p', String(port)], {
        cwd: PROJECT_ROOT,
        detached: true,
        stdio: ['ignore', out, out],
        shell: true,
        windowsHide: true,
      });
      child.unref();
      fs.writeFileSync(APP_PID_FILE, String(child.pid), 'utf-8');
      console.log(`${colors.green}✓ CEO Virtual started in background! (PID: ${child.pid})${colors.reset}`);
      console.log(`  Access URL:  ${colors.cyan}${url}${colors.reset}`);
      console.log(`  Server Log:  ${colors.dim}${logFile}${colors.reset}`);
      console.log(`${colors.yellow}Opening browser in 2.5s...${colors.reset}\n`);
      setTimeout(() => openUrl(url), 2500);
      return;
    }

    const child = spawn(npmCmd, ['run', 'dev', '--', '-p', String(port)], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true,
    });

    fs.writeFileSync(APP_PID_FILE, String(child.pid), 'utf-8');

    setTimeout(() => {
      console.log(`\n${colors.green}✓ CEO Virtual ready! Opening ${url} in your browser...${colors.reset}\n`);
      openUrl(url);
    }, 2500);

    child.on('exit', () => {
      if (fs.existsSync(APP_PID_FILE)) {
        try { fs.unlinkSync(APP_PID_FILE); } catch {}
      }
    });

  } else if (cmd === 'status') {
    printBanner();
    const isRunning = await checkPortInUse(DEFAULT_PORT);
    let pid = 'Unknown';
    if (fs.existsSync(APP_PID_FILE)) {
      pid = fs.readFileSync(APP_PID_FILE, 'utf-8').trim();
    }

    const projects = fs.existsSync(APP_WORKSPACES)
      ? fs.readdirSync(APP_WORKSPACES, { withFileTypes: true }).filter((e) => e.isDirectory()).length
      : 0;

    console.log(`${colors.bold}CEO Virtual System Status:${colors.reset}`);
    console.log(`  Status:         ${isRunning ? colors.green + '● RUNNING' : colors.red + '○ STOPPED'}${colors.reset}`);
    console.log(`  URL:            ${colors.cyan}http://localhost:${DEFAULT_PORT}${colors.reset}`);
    console.log(`  PID:            ${pid}`);
    console.log(`  Home Directory: ${APP_HOME}`);
    console.log(`  Workspaces:     ${APP_WORKSPACES} (${projects} projects)`);
    console.log(`  Autorun:        ${isAutorunConfigured() ? colors.green + 'Enabled' : colors.yellow + 'Disabled'}${colors.reset}\n`);

  } else if (cmd === 'stop') {
    printBanner();
    console.log(`${colors.yellow}Stopping CEO Virtual process on port ${DEFAULT_PORT}...${colors.reset}`);
    try {
      if (process.platform === 'win32') {
        execSync(`powershell -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort ${DEFAULT_PORT}).OwningProcess | Stop-Process -Force"`, { stdio: 'ignore' });
      } else {
        execSync(`lsof -ti:${DEFAULT_PORT} | xargs kill -9`, { stdio: 'ignore' });
      }
      console.log(`${colors.green}✓ CEO Virtual stopped successfully.${colors.reset}`);
    } catch {
      console.log(`${colors.dim}No active process found on port ${DEFAULT_PORT}.${colors.reset}`);
    }
    if (fs.existsSync(APP_PID_FILE)) {
      try { fs.unlinkSync(APP_PID_FILE); } catch {}
    }

  } else if (cmd === 'workspace' || cmd === 'open') {
    console.log(`${colors.cyan}Opening workspace folder in File Explorer:${colors.reset} ${APP_WORKSPACES}`);
    openFolder(APP_WORKSPACES);

  } else if (cmd === 'uninstall') {
    const uninstaller = process.platform === 'win32'
      ? path.join(PROJECT_ROOT, 'uninstall.ps1')
      : path.join(PROJECT_ROOT, 'uninstall.sh');
    if (process.platform === 'win32') {
      try {
        execSync(`powershell -ExecutionPolicy Bypass -File "${uninstaller}"`, { stdio: 'inherit' });
      } catch {}
    } else {
      try {
        execSync(`bash "${uninstaller}"`, { stdio: 'inherit' });
      } catch {}
    }
    return;

  } else if (cmd === 'autorun') {
    const subCmd = args[1];
    if (subCmd === 'enable' || subCmd === 'on') {
      setStartupAutorun(true);
    } else if (subCmd === 'disable' || subCmd === 'off') {
      setStartupAutorun(false);
    } else {
      console.log(`Usage: ceo-virtual autorun [enable|disable]`);
      console.log(`Current status: ${isAutorunConfigured() ? 'Enabled' : 'Disabled'}`);
    }

  } else if (cmd === 'create') {
    const projName = args[1];
    if (!projName) {
      console.log(`${colors.red}Please provide a project name: ceo-virtual create <name>${colors.reset}`);
      return;
    }
    const safe = projName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const target = path.join(APP_WORKSPACES, safe);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    fs.writeFileSync(path.join(target, 'README.md'), `# ${projName}\nCreated via CEO Virtual CLI\n`, 'utf-8');
    console.log(`${colors.green}✓ Created project directory: ${target}${colors.reset}`);
    openFolder(target);

  } else if (cmd === 'clone') {
    const repoUrl = args[1];
    const customFolder = args[2];
    if (!repoUrl) {
      console.log(`${colors.red}Please provide a repository URL: ceo-virtual clone <github-url> [folder-name]${colors.reset}`);
      return;
    }
    const match = repoUrl.match(/(?:https?:\/\/(?:www\.)?github\.com\/|git@github\.com:)([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git|\/|\b|$)/i);
    let folder = customFolder;
    if (!folder) {
      if (match) {
        let repo = match[2].replace(/\.git$/i, '');
        if (repo.endsWith('/')) repo = repo.slice(0, -1);
        folder = repo;
      } else {
        const parts = repoUrl.replace(/\.git$/, '').split(/[/:]/);
        folder = parts[parts.length - 1] || 'github-repo';
      }
    }
    const safe = folder.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'github-repo';
    const target = path.join(APP_WORKSPACES, safe);
    console.log(`${colors.cyan}Cloning ${repoUrl} into ${target}...${colors.reset}`);
    try {
      execSync(`git clone --depth 1 "${repoUrl}" "${target}"`, { stdio: 'inherit' });
      console.log(`${colors.green}✓ Cloned repository successfully to: ${target}${colors.reset}`);
      openFolder(target);
    } catch (err) {
      console.log(`${colors.red}Failed to clone repository: ${err.message}${colors.reset}`);
    }

  } else if (cmd === 'mcp') {
    const sub = args[1] || 'list';
    const mcpConfigFile = path.join(APP_HOME, 'mcp_config.json');
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
        console.log(`${colors.red}MCP server '${targetId}' not found. Run 'ceo-virtual mcp list' to see servers.${colors.reset}`);
        return;
      }
      mcpConfig.mcpServers[targetId].enabled = true;
      fs.writeFileSync(mcpConfigFile, JSON.stringify(mcpConfig, null, 2), 'utf-8');
      console.log(`${colors.green}✓ Enabled MCP Server: ${targetId}${colors.reset}`);
    } else if (sub === 'disable' || sub === 'off') {
      const targetId = args[2];
      if (!targetId || !mcpConfig.mcpServers[targetId]) {
        console.log(`${colors.red}MCP server '${targetId}' not found. Run 'ceo-virtual mcp list' to see servers.${colors.reset}`);
        return;
      }
      mcpConfig.mcpServers[targetId].enabled = false;
      fs.writeFileSync(mcpConfigFile, JSON.stringify(mcpConfig, null, 2), 'utf-8');
      console.log(`${colors.yellow}✓ Disabled MCP Server: ${targetId}${colors.reset}`);
    } else {
      console.log(`Usage: ceo-virtual mcp [list | enable <id> | disable <id>]`);
    }

  } else if (cmd === 'skill' || cmd === 'skills') {
    const sub = args[1] || 'list';
    const skillsDir = path.join(APP_HOME, 'skills');

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
      console.log(`Usage: ceo-virtual skill [list]`);
    }

  } else if (cmd === 'memory' || cmd === 'memories') {
    const sub = args[1] || 'list';
    printBanner();
    console.log(`${colors.bold}🧠 CEO Virtual Company Memory Engine & Vector DB:${colors.reset}\n`);

    if (sub === 'list' || sub === 'stats') {
      const files = fs.readdirSync(APP_HOME).filter((f) => f.startsWith('memories_') && f.endsWith('.json'));
      console.log(`  Vector Engine:  ${colors.green}● Active (Dual-Mode: Zero-Setup Local Vector + Remote LLM /v1/embeddings)${colors.reset}`);
      console.log(`  Dimension:      ${colors.cyan}64D Semantic Trigram Hash (Local) / Custom Provider (Remote)${colors.reset}`);
      console.log(`  Storage Root:   ${colors.dim}${APP_HOME}${colors.reset}\n`);

      if (files.length === 0) {
        console.log(`  ${colors.yellow}Belum ada file memori tersimpan. Inisialisasi sekarang dengan: ceo-virtual memory init${colors.reset}\n`);
      } else {
        files.forEach((f) => {
          const compId = f.replace('memories_', '').replace('.json', '');
          try {
            const data = JSON.parse(fs.readFileSync(path.join(APP_HOME, f), 'utf-8'));
            const progFile = path.join(APP_HOME, `progression_${compId}.json`);
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
        const memFile = path.join(APP_HOME, `memories_${id}.json`);
        const progFile = path.join(APP_HOME, `progression_${id}.json`);
        if (!fs.existsSync(memFile)) {
          fs.writeFileSync(
            memFile,
            JSON.stringify(
              [
                {
                  id: `mem-${id}-seed-1`,
                  companyId: id,
                  category: 'architecture',
                  title: 'Standar Arsitektur Clean Code & Modularitas',
                  content: 'Seluruh agent diwajibkan menyusun deliverable dalam modul terpisah, menyertakan unit test, dan mendokumentasikan API.',
                  importance: 'high',
                  tags: ['architecture', 'standard', 'clean-code'],
                  createdAt: Date.now(),
                  accessCount: 1,
                  lastAccessedAt: Date.now(),
                  vector: [0.12, 0.45, 0.78, 0.23],
                },
                {
                  id: `mem-${id}-seed-2`,
                  companyId: id,
                  category: 'culture',
                  title: 'Prinsip Kerja & Otonomi Karyawan AI',
                  content: 'Setiap karyawan memiliki hak untuk mengambil keputusan teknis sesuai spesialisasi masing-masing dan berkoordinasi langsung dengan Leader.',
                  importance: 'medium',
                  tags: ['culture', 'values', 'autonomy'],
                  createdAt: Date.now(),
                  accessCount: 1,
                  lastAccessedAt: Date.now(),
                  vector: [0.33, 0.11, 0.94, 0.52],
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
      console.log(`Usage: ceo-virtual memory [list | stats | init]`);
    }

  } else {
    printBanner();
    console.log(`${colors.bold}Commands:${colors.reset}
  ${colors.cyan}ceo-virtual start${colors.reset}              Start CEO Virtual on port ${DEFAULT_PORT} & open browser
  ${colors.cyan}ceo-virtual status${colors.reset}             Check if server is active, PID, and project stats
  ${colors.cyan}ceo-virtual stop${colors.reset}               Stop running server
  ${colors.cyan}ceo-virtual workspace${colors.reset}          Open ~/.ceo-virtual/workspaces in OS File Explorer
  ${colors.cyan}ceo-virtual memory list${colors.reset}        Lihat arsip memori, level perusahaan, dan status Vector DB
  ${colors.cyan}ceo-virtual memory init${colors.reset}        Inisialisasi memori seed & progression default
  ${colors.cyan}ceo-virtual mcp list${colors.reset}           List Model Context Protocol (MCP) servers
  ${colors.cyan}ceo-virtual mcp enable <id>${colors.reset}    Enable an MCP server (e.g. postgres, github, brave-search)
  ${colors.cyan}ceo-virtual mcp disable <id>${colors.reset}   Disable an MCP server
  ${colors.cyan}ceo-virtual skill list${colors.reset}         List installed Role Skills & SOPs
  ${colors.cyan}ceo-virtual autorun enable${colors.reset}     Enable auto-start on Windows/macOS/Linux startup
  ${colors.cyan}ceo-virtual autorun disable${colors.reset}    Disable startup autorun
  ${colors.cyan}ceo-virtual uninstall${colors.reset}          Uninstall CEO Virtual & opsi pembersihan data
  ${colors.cyan}ceo-virtual create <name>${colors.reset}      Scaffold a new project in ~/.ceo-virtual/workspaces/
  ${colors.cyan}ceo-virtual clone <url> [name]${colors.reset} Clone a GitHub repository directly into workspaces
  ${colors.cyan}ceo-virtual help${colors.reset}               Show this help message
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
    return fs.existsSync(path.join(startupFolder, 'CEOVirtual.bat')) || fs.existsSync(path.join(startupFolder, 'Vigent.bat'));
  }
  return false;
}

handleCommand().catch((err) => {
  console.error(err);
  process.exit(1);
});
