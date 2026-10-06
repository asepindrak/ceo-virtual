import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, execSync } from 'child_process';

// Dedicated Real Agent home directory: ~/.realagent
export const REALAGENT_HOME = path.join(os.homedir(), '.realagent');
export const REALAGENT_WORKSPACES = path.join(REALAGENT_HOME, 'workspaces');
export const REALAGENT_CONFIG_FILE = path.join(REALAGENT_HOME, 'config.json');
export const REALAGENT_LOGS_DIR = path.join(REALAGENT_HOME, 'logs');
export const REALAGENT_PID_FILE = path.join(REALAGENT_HOME, 'server.pid');
export const DEFAULT_PORT = 28483; // Uncommon dedicated port

export interface RealAgentConfig {
  port: number;
  autoOpenBrowser: boolean;
  autorunAtStartup: boolean;
  workspaceRoot: string;
  createdAt: string;
}

export interface WorkspaceProject {
  name: string;
  folderPath: string;
  filesCount: number;
  lastModified: number;
  files: { relativePath: string; size: number }[];
}

// Ensure required directories and config exist
export function initRealAgentHomeDirs(): RealAgentConfig {
  if (!fs.existsSync(REALAGENT_HOME)) {
    fs.mkdirSync(REALAGENT_HOME, { recursive: true });
  }
  if (!fs.existsSync(REALAGENT_WORKSPACES)) {
    fs.mkdirSync(REALAGENT_WORKSPACES, { recursive: true });
  }
  if (!fs.existsSync(REALAGENT_LOGS_DIR)) {
    fs.mkdirSync(REALAGENT_LOGS_DIR, { recursive: true });
  }

  let config: RealAgentConfig = {
    port: DEFAULT_PORT,
    autoOpenBrowser: true,
    autorunAtStartup: false,
    workspaceRoot: REALAGENT_WORKSPACES,
    createdAt: new Date().toISOString(),
  };

  if (!fs.existsSync(REALAGENT_CONFIG_FILE)) {
    fs.writeFileSync(REALAGENT_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } else {
    try {
      config = { ...config, ...JSON.parse(fs.readFileSync(REALAGENT_CONFIG_FILE, 'utf-8')) };
    } catch {
      // Keep default if malformed
    }
  }

  // Auto-scaffold a demo starter project if workspaces folder is empty
  ensureStarterDemoProject();

  return config;
}

// Update configuration
export function updateRealAgentConfig(updates: Partial<RealAgentConfig>): RealAgentConfig {
  const current = initRealAgentHomeDirs();
  const nextConfig = { ...current, ...updates };
  fs.writeFileSync(REALAGENT_CONFIG_FILE, JSON.stringify(nextConfig, null, 2), 'utf-8');
  return nextConfig;
}

// Auto-seed a starter project so user immediately sees real files in ~/.realagent/workspaces
function ensureStarterDemoProject() {
  const demoDir = path.join(REALAGENT_WORKSPACES, 'real-agent-starter');
  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(demoDir, 'README.md'),
      `# 🤖 Real Agent 3D - Workspace Project\n\nDirektori ini dibuat secara otomatis oleh Real Agent di: \`${REALAGENT_WORKSPACES}\`.\n\nSetiap kali AI Agent menerima task koding, file kode asli, package, dan dokumentasi akan di-generate di sini.\n\n- Port: ${DEFAULT_PORT}\n- Dibuat pada: ${new Date().toLocaleString()}\n`,
      'utf-8'
    );

    fs.writeFileSync(
      path.join(demoDir, 'package.json'),
      JSON.stringify(
        {
          name: 'real-agent-starter',
          version: '1.0.0',
          description: 'Autonomous multi-agent generated project',
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
      `// Real Agent Autonomous Worker Script\nconsole.log("🚀 Real Agent 3D Worker initialized at port ${DEFAULT_PORT}");\nconsole.log("Folder: ${demoDir.replace(/\\/g, '\\\\')}");\n`,
      'utf-8'
    );
  }
}

// List all projects created by coding agents in ~/.realagent/workspaces
export function listWorkspaceProjects(): WorkspaceProject[] {
  initRealAgentHomeDirs();
  try {
    const entries = fs.readdirSync(REALAGENT_WORKSPACES, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((dir) => {
        const projectDir = path.join(REALAGENT_WORKSPACES, dir.name);
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
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'agent-project';
  const projectDir = path.join(REALAGENT_WORKSPACES, safeName);
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
  const targetFile = path.join(REALAGENT_WORKSPACES, safeName, relativeFilePath);
  if (!fs.existsSync(targetFile)) return null;
  return fs.readFileSync(targetFile, 'utf-8');
}

// Open folder in OS File Explorer (Windows explorer / macOS open / Linux xdg-open)
export function openFolderInOS(targetPath?: string) {
  const target = targetPath && fs.existsSync(targetPath) ? targetPath : REALAGENT_WORKSPACES;
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
      const batPath = path.join(startupFolder, 'RealAgent3D.bat');
      return fs.existsSync(batPath);
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
    const batPath = path.join(startupFolder, 'RealAgent3D.bat');

    if (enable) {
      if (!fs.existsSync(startupFolder)) {
        fs.mkdirSync(startupFolder, { recursive: true });
      }
      // Write silent startup batch file running the node CLI or next server
      const scriptContent = `@echo off\r\ncd /d "${targetAppPath}"\r\nstart /b npm run dev -- -p ${DEFAULT_PORT}\r\n`;
      fs.writeFileSync(batPath, scriptContent, 'utf-8');
      updateRealAgentConfig({ autorunAtStartup: true });
      return true;
    } else {
      if (fs.existsSync(batPath)) {
        fs.unlinkSync(batPath);
      }
      updateRealAgentConfig({ autorunAtStartup: false });
      return false;
    }
  } else if (process.platform === 'darwin') {
    // macOS LaunchAgent plist
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
    // Linux systemd user service or ~/.config/autostart
    const autostartDir = path.join(os.homedir(), '.config', 'autostart');
    const desktopPath = path.join(autostartDir, 'realagent.desktop');
    if (enable) {
      if (!fs.existsSync(autostartDir)) fs.mkdirSync(autostartDir, { recursive: true });
      const desktopEntry = `[Desktop Entry]
Type=Application
Exec=npm run dev -- -p ${DEFAULT_PORT}
Path=${targetAppPath}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=RealAgent 3D
Comment=Start RealAgent 3D on login
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
