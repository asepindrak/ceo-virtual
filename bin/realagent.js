#!/usr/bin/env node

/**
 * 🤖 REALAGENT 3D - Autonomous AI Agent Workplace CLI
 * 
 * Install & run with single command:
 *   curl -fsSL https://antigravity.google/cli/install.sh | bash
 *   irm https://antigravity.google/cli/install.ps1 | iex
 * 
 * Default Dedicated Port: 28483
 * Workspace Home: ~/.realagent/workspaces
 */

const { spawn, execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const REALAGENT_HOME = path.join(os.homedir(), '.realagent');
const REALAGENT_WORKSPACES = path.join(REALAGENT_HOME, 'workspaces');
const REALAGENT_CONFIG_FILE = path.join(REALAGENT_HOME, 'config.json');
const REALAGENT_PID_FILE = path.join(REALAGENT_HOME, 'server.pid');
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
${colors.cyan}${colors.bold}  ██████╗ ███████╗ █████╗ ██╗         █████╗  ██████╗ ███████╗███╗   ██╗████████╗
  ██╔══██╗██╔════╝██╔══██╗██║        ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
  ██████╔╝█████╗  ███████║██║  █████╗███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   
  ██╔══██╗██╔══╝  ██╔══██║██║  ╚════╝██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   
  ██║  ██║███████╗██║  ██║███████╗   ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   
  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ${colors.reset}
  ${colors.magenta}★ 3D & 2.5D Autonomous Multi-Agent Office & Real Codebase Generator ★${colors.reset}
  ${colors.dim}Dedicated Port: ${DEFAULT_PORT} | Home: ${REALAGENT_HOME}${colors.reset}
`);
}

function ensureHomeDirs() {
  if (!fs.existsSync(REALAGENT_HOME)) fs.mkdirSync(REALAGENT_HOME, { recursive: true });
  if (!fs.existsSync(REALAGENT_WORKSPACES)) fs.mkdirSync(REALAGENT_WORKSPACES, { recursive: true });
  if (!fs.existsSync(REALAGENT_CONFIG_FILE)) {
    fs.writeFileSync(
      REALAGENT_CONFIG_FILE,
      JSON.stringify(
        {
          port: DEFAULT_PORT,
          autoOpenBrowser: true,
          autorunAtStartup: false,
          workspaceRoot: REALAGENT_WORKSPACES,
          installedAt: new Date().toISOString(),
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
  const folder = target || REALAGENT_WORKSPACES;
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
    const batPath = path.join(startupFolder, 'RealAgent3D.bat');

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
    const plistPath = path.join(plistDir, 'com.realagent.startup.plist');
    if (enable) {
      if (!fs.existsSync(plistDir)) fs.mkdirSync(plistDir, { recursive: true });
      const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.realagent.startup</string>
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
    const desktopPath = path.join(autostartDir, 'realagent.desktop');
    if (enable) {
      if (!fs.existsSync(autostartDir)) fs.mkdirSync(autostartDir, { recursive: true });
      const desktop = `[Desktop Entry]
Type=Application
Exec=npm run dev -- -p ${DEFAULT_PORT}
Path=${PROJECT_ROOT}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=RealAgent 3D
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
      console.log(`${colors.green}● RealAgent 3D is ALREADY RUNNING on ${url}${colors.reset}`);
      console.log(`Opening browser...`);
      openUrl(url);
      return;
    }

    console.log(`${colors.cyan}► Starting RealAgent 3D on port ${colors.bold}${port}${colors.reset}...`);
    console.log(`  Workspace folder: ${colors.yellow}${REALAGENT_WORKSPACES}${colors.reset}`);
    console.log(`  Project root:     ${colors.dim}${PROJECT_ROOT}${colors.reset}\n`);

    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCmd, ['run', 'dev', '--', '-p', String(port)], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true,
    });

    // Save PID
    fs.writeFileSync(REALAGENT_PID_FILE, String(child.pid), 'utf-8');

    // Automatically open browser after 2 seconds
    setTimeout(() => {
      console.log(`\n${colors.green}✓ Server ready! Opening ${url} in your browser...${colors.reset}\n`);
      openUrl(url);
    }, 2500);

    child.on('exit', () => {
      if (fs.existsSync(REALAGENT_PID_FILE)) {
        try { fs.unlinkSync(REALAGENT_PID_FILE); } catch {}
      }
    });

  } else if (cmd === 'status') {
    printBanner();
    const isRunning = await checkPortInUse(DEFAULT_PORT);
    let pid = 'Unknown';
    if (fs.existsSync(REALAGENT_PID_FILE)) {
      pid = fs.readFileSync(REALAGENT_PID_FILE, 'utf-8').trim();
    }

    const projects = fs.existsSync(REALAGENT_WORKSPACES)
      ? fs.readdirSync(REALAGENT_WORKSPACES, { withFileTypes: true }).filter((e) => e.isDirectory()).length
      : 0;

    console.log(`${colors.bold}RealAgent System Status:${colors.reset}`);
    console.log(`  Status:         ${isRunning ? colors.green + '● RUNNING' : colors.red + '○ STOPPED'}${colors.reset}`);
    console.log(`  URL:            ${colors.cyan}http://localhost:${DEFAULT_PORT}${colors.reset}`);
    console.log(`  PID:            ${pid}`);
    console.log(`  Home Directory: ${REALAGENT_HOME}`);
    console.log(`  Workspaces:     ${REALAGENT_WORKSPACES} (${projects} projects)`);
    console.log(`  Autorun:        ${isAutorunConfigured() ? colors.green + 'Enabled' : colors.yellow + 'Disabled'}${colors.reset}\n`);

  } else if (cmd === 'stop') {
    printBanner();
    console.log(`${colors.yellow}Stopping RealAgent 3D process on port ${DEFAULT_PORT}...${colors.reset}`);
    try {
      if (process.platform === 'win32') {
        execSync(`powershell -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort ${DEFAULT_PORT}).OwningProcess | Stop-Process -Force"`, { stdio: 'ignore' });
      } else {
        execSync(`lsof -ti:${DEFAULT_PORT} | xargs kill -9`, { stdio: 'ignore' });
      }
      console.log(`${colors.green}✓ RealAgent 3D stopped successfully.${colors.reset}`);
    } catch {
      console.log(`${colors.dim}No active process found on port ${DEFAULT_PORT}.${colors.reset}`);
    }
    if (fs.existsSync(REALAGENT_PID_FILE)) {
      try { fs.unlinkSync(REALAGENT_PID_FILE); } catch {}
    }

  } else if (cmd === 'workspace' || cmd === 'open') {
    console.log(`${colors.cyan}Opening workspace folder in File Explorer:${colors.reset} ${REALAGENT_WORKSPACES}`);
    openFolder(REALAGENT_WORKSPACES);

  } else if (cmd === 'autorun') {
    const subCmd = args[1];
    if (subCmd === 'enable' || subCmd === 'on') {
      setStartupAutorun(true);
    } else if (subCmd === 'disable' || subCmd === 'off') {
      setStartupAutorun(false);
    } else {
      console.log(`Usage: realagent autorun [enable|disable]`);
      console.log(`Current status: ${isAutorunConfigured() ? 'Enabled' : 'Disabled'}`);
    }

  } else if (cmd === 'create') {
    const projName = args[1];
    if (!projName) {
      console.log(`${colors.red}Please provide a project name: realagent create <name>${colors.reset}`);
      return;
    }
    const safe = projName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const target = path.join(REALAGENT_WORKSPACES, safe);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    fs.writeFileSync(path.join(target, 'README.md'), `# ${projName}\nCreated via RealAgent CLI\n`, 'utf-8');
    console.log(`${colors.green}✓ Created project directory: ${target}${colors.reset}`);
    openFolder(target);

  } else {
    printBanner();
    console.log(`${colors.bold}Commands:${colors.reset}
  ${colors.cyan}realagent start${colors.reset}              Start RealAgent 3D on port ${DEFAULT_PORT} & open browser
  ${colors.cyan}realagent status${colors.reset}             Check if server is active, PID, and project stats
  ${colors.cyan}realagent stop${colors.reset}               Stop running server
  ${colors.cyan}realagent workspace${colors.reset}          Open ~/.realagent/workspaces in OS File Explorer
  ${colors.cyan}realagent autorun enable${colors.reset}     Enable auto-start on Windows/macOS/Linux startup
  ${colors.cyan}realagent autorun disable${colors.reset}    Disable startup autorun
  ${colors.cyan}realagent create <name>${colors.reset}      Scaffold a new project in ~/.realagent/workspaces/
  ${colors.cyan}realagent help${colors.reset}               Show this help message
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
    return fs.existsSync(path.join(startupFolder, 'RealAgent3D.bat'));
  }
  return false;
}

handleCommand().catch((err) => {
  console.error(err);
  process.exit(1);
});
