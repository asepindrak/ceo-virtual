import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

// Dedicated Vigent (Virtual Office Agent) home directory: ~/.vigent
export const VIGENT_HOME = path.join(os.homedir(), '.vigent');
export const VIGENT_WORKSPACES = path.join(VIGENT_HOME, 'workspaces');
export const VIGENT_CONFIG_FILE = path.join(VIGENT_HOME, 'config.json');
export const VIGENT_LOGS_DIR = path.join(VIGENT_HOME, 'logs');
export const VIGENT_PID_FILE = path.join(VIGENT_HOME, 'server.pid');
export const DEFAULT_PORT = 28483; // Uncommon dedicated port

// Backward compatibility aliases
export const REALAGENT_HOME = VIGENT_HOME;
export const REALAGENT_WORKSPACES = VIGENT_WORKSPACES;
export const REALAGENT_CONFIG_FILE = VIGENT_CONFIG_FILE;
export const REALAGENT_LOGS_DIR = VIGENT_LOGS_DIR;
export const REALAGENT_PID_FILE = VIGENT_PID_FILE;

export interface VigentConfig {
  port: number;
  autoOpenBrowser: boolean;
  autorunAtStartup: boolean;
  workspaceRoot: string;
  createdAt: string;
}

export type RealAgentConfig = VigentConfig;

export interface WorkspaceProject {
  name: string;
  folderPath: string;
  filesCount: number;
  lastModified: number;
  files: { relativePath: string; size: number }[];
}

// Migrate from legacy ~/.realagent if it exists
function checkAndMigrateLegacy() {
  const legacyDir = path.join(os.homedir(), '.realagent');
  if (fs.existsSync(legacyDir) && !fs.existsSync(VIGENT_HOME)) {
    try {
      fs.cpSync(legacyDir, VIGENT_HOME, { recursive: true });
    } catch {
      // ignore
    }
  }
}

// Ensure required directories and config exist
export function initRealAgentHomeDirs(): VigentConfig {
  checkAndMigrateLegacy();

  if (!fs.existsSync(VIGENT_HOME)) {
    fs.mkdirSync(VIGENT_HOME, { recursive: true });
  }
  if (!fs.existsSync(VIGENT_WORKSPACES)) {
    fs.mkdirSync(VIGENT_WORKSPACES, { recursive: true });
  }
  if (!fs.existsSync(VIGENT_LOGS_DIR)) {
    fs.mkdirSync(VIGENT_LOGS_DIR, { recursive: true });
  }

  let config: VigentConfig = {
    port: DEFAULT_PORT,
    autoOpenBrowser: true,
    autorunAtStartup: false,
    workspaceRoot: VIGENT_WORKSPACES,
    createdAt: new Date().toISOString(),
  };

  if (!fs.existsSync(VIGENT_CONFIG_FILE)) {
    fs.writeFileSync(VIGENT_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } else {
    try {
      config = { ...config, ...JSON.parse(fs.readFileSync(VIGENT_CONFIG_FILE, 'utf-8')) };
    } catch {
      // Keep default if malformed
    }
  }

  // Auto-scaffold a demo starter project if workspaces folder is empty
  ensureStarterDemoProject();

  return config;
}

export const initVigentHomeDirs = initRealAgentHomeDirs;

// Update configuration
export function updateRealAgentConfig(updates: Partial<VigentConfig>): VigentConfig {
  const current = initRealAgentHomeDirs();
  const nextConfig = { ...current, ...updates };
  fs.writeFileSync(VIGENT_CONFIG_FILE, JSON.stringify(nextConfig, null, 2), 'utf-8');
  return nextConfig;
}

// Auto-seed a starter project so user immediately sees real files in ~/.vigent/workspaces
function ensureStarterDemoProject() {
  const demoDir = path.join(VIGENT_WORKSPACES, 'vigent-starter');
  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(demoDir, 'README.md'),
      `# 🤖 Vigent (Virtual Office Agent) - Starter Project\n\nDirektori ini dibuat secara otomatis oleh Vigent di: \`${VIGENT_WORKSPACES}\`.\n\nSetiap kali AI Agent menerima task koding atau content writing, file kode asli, package, dan dokumentasi akan di-generate di sini.\n\n- Port: ${DEFAULT_PORT}\n- Dibuat pada: ${new Date().toLocaleString()}\n`,
      'utf-8'
    );

    fs.writeFileSync(
      path.join(demoDir, 'package.json'),
      JSON.stringify(
        {
          name: 'vigent-starter',
          version: '1.0.0',
          description: 'Autonomous multi-agent generated project by Vigent',
          main: 'src/index.js',
          scripts: {
            start: 'node src/index.js',
          },
        },
        null,
        2
      ),
      'utf-8'
    );

    const srcDir = path.join(demoDir, 'src');
    if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'index.js'),
      `// Vigent Autonomous Worker Script\nconsole.log("🚀 Vigent (Virtual Office Agent) initialized at port ${DEFAULT_PORT}");\nconsole.log("Workspace: ${demoDir.replace(/\\/g, '\\\\')}");\n`,
      'utf-8'
    );
  }
}

// List all projects created by coding agents in ~/.vigent/workspaces
export function listWorkspaceProjects(): WorkspaceProject[] {
  initRealAgentHomeDirs();
  try {
    const entries = fs.readdirSync(VIGENT_WORKSPACES, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((dir) => {
        const projectDir = path.join(VIGENT_WORKSPACES, dir.name);
        const allFiles = getFilesRecursively(projectDir);
        const stats = fs.statSync(projectDir);
        return {
          name: dir.name,
          folderPath: projectDir,
          filesCount: allFiles.length,
          lastModified: stats.mtimeMs,
          files: allFiles.map((fp) => ({
            relativePath: path.relative(projectDir, fp).replace(/\\/g, '/'),
            size: fs.statSync(fp).size,
          })),
        };
      })
      .sort((a, b) => b.lastModified - a.lastModified);
  } catch {
    return [];
  }
}

// Create a real new project directory
export function createProjectDirectory(projectName: string): string {
  initRealAgentHomeDirs();
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'vigent-project';
  const projectDir = path.join(VIGENT_WORKSPACES, safeName);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  return projectDir;
}

// Write real code / document file inside a project
export function writeProjectFile(projectName: string, relativeFilePath: string, content: string): string {
  const projectDir = createProjectDirectory(projectName);
  const targetFile = path.join(projectDir, relativeFilePath);
  const parentDir = path.dirname(targetFile);

  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  fs.writeFileSync(targetFile, content, 'utf-8');
  return targetFile;
}

// Read file content
export function readProjectFile(projectName: string, relativeFilePath: string): string | null {
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const targetFile = path.join(VIGENT_WORKSPACES, safeName, relativeFilePath);
  if (!fs.existsSync(targetFile)) return null;
  return fs.readFileSync(targetFile, 'utf-8');
}

// Open folder in OS File Explorer (Windows explorer / macOS open / Linux xdg-open)
export function openFolderInOS(targetPath?: string) {
  const target = targetPath && fs.existsSync(targetPath) ? targetPath : VIGENT_WORKSPACES;
  if (process.platform === 'win32') {
    exec(`explorer "${target}"`);
  } else if (process.platform === 'darwin') {
    exec(`open "${target}"`);
  } else {
    exec(`xdg-open "${target}"`);
  }
}

// Windows & Cross-platform Autorun at Startup
export function isAutorunConfigured(): boolean {
  if (process.platform === 'win32') {
    try {
      const startupFolder = path.join(
        process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
        'Microsoft',
        'Windows',
        'Start Menu',
        'Programs',
        'Startup'
      );
      const batPath = path.join(startupFolder, 'Vigent.bat');
      const oldBat = path.join(startupFolder, 'RealAgent3D.bat');
      return fs.existsSync(batPath) || fs.existsSync(oldBat);
    } catch {
      return false;
    }
  }
  return false;
}

export function setAutorun(enable: boolean, appPath?: string): boolean {
  const targetAppPath = appPath || process.cwd();
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
    const oldBat = path.join(startupFolder, 'RealAgent3D.bat');

    if (enable) {
      if (!fs.existsSync(startupFolder)) {
        fs.mkdirSync(startupFolder, { recursive: true });
      }
      if (fs.existsSync(oldBat)) {
        try { fs.unlinkSync(oldBat); } catch {}
      }
      const scriptContent = `@echo off\r\ncd /d "${targetAppPath}"\r\nstart /b npm run dev -- -p ${DEFAULT_PORT}\r\n`;
      fs.writeFileSync(batPath, scriptContent, 'utf-8');
      updateRealAgentConfig({ autorunAtStartup: true });
      return true;
    } else {
      if (fs.existsSync(batPath)) fs.unlinkSync(batPath);
      if (fs.existsSync(oldBat)) fs.unlinkSync(oldBat);
      updateRealAgentConfig({ autorunAtStartup: false });
      return false;
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
  <string>${targetAppPath}</string>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>`;
      fs.writeFileSync(plistPath, plist, 'utf-8');
      updateRealAgentConfig({ autorunAtStartup: true });
      return true;
    } else {
      if (fs.existsSync(plistPath)) fs.unlinkSync(plistPath);
      updateRealAgentConfig({ autorunAtStartup: false });
      return false;
    }
  } else {
    const autostartDir = path.join(os.homedir(), '.config', 'autostart');
    const desktopPath = path.join(autostartDir, 'vigent.desktop');
    if (enable) {
      if (!fs.existsSync(autostartDir)) fs.mkdirSync(autostartDir, { recursive: true });
      const desktopEntry = `[Desktop Entry]
Type=Application
Exec=npm run dev -- -p ${DEFAULT_PORT}
Path=${targetAppPath}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=Vigent
Comment=Start Vigent Virtual Office Agent on login
`;
      fs.writeFileSync(desktopPath, desktopEntry, 'utf-8');
      updateRealAgentConfig({ autorunAtStartup: true });
      return true;
    } else {
      if (fs.existsSync(desktopPath)) fs.unlinkSync(desktopPath);
      updateRealAgentConfig({ autorunAtStartup: false });
      return false;
    }
  }
}

function getFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git') {
          results = results.concat(getFilesRecursively(fullPath));
        }
      } else {
        results.push(fullPath);
      }
    });
  } catch {
    // ignore unreadable dirs
  }
  return results;
}
