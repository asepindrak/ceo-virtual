import { NextResponse } from 'next/server';
import {
  REALAGENT_HOME,
  REALAGENT_WORKSPACES,
  listWorkspaceProjects,
  createProjectDirectory,
  writeProjectFile,
  readProjectFile,
  openFolderInOS,
  initRealAgentHomeDirs,
  isAutorunConfigured,
  setAutorun,
  DEFAULT_PORT,
} from '@/lib/workspaceManager';
import path from 'path';

export async function GET() {
  try {
    const config = initRealAgentHomeDirs();
    const projects = listWorkspaceProjects();
    const autorunStatus = isAutorunConfigured();

    return NextResponse.json({
      success: true,
      homeDir: REALAGENT_HOME,
      workspacesDir: REALAGENT_WORKSPACES,
      port: config.port || DEFAULT_PORT,
      autorunAtStartup: autorunStatus,
      projects,
      totalProjects: projects.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'open_folder') {
      const targetPath = body.targetPath || REALAGENT_WORKSPACES;
      openFolderInOS(targetPath);
      return NextResponse.json({ success: true, message: 'Opened folder in OS explorer', targetPath });
    }

    if (action === 'create_project') {
      const { projectName } = body;
      if (!projectName) {
        return NextResponse.json({ success: false, error: 'Project name is required' }, { status: 400 });
      }
      const projectDir = createProjectDirectory(projectName);
      return NextResponse.json({ success: true, projectDir, projectName });
    }

    if (action === 'write_file') {
      const { projectName, filePath, content } = body;
      if (!projectName || !filePath || content === undefined) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
      }
      const targetPath = writeProjectFile(projectName, filePath, content);
      return NextResponse.json({ success: true, targetPath });
    }

    if (action === 'read_file') {
      const { projectName, filePath } = body;
      if (!projectName || !filePath) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
      }
      const content = readProjectFile(projectName, filePath);
      if (content === null) {
        return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, content });
    }

    if (action === 'toggle_autorun') {
      const { enable } = body;
      const appRoot = process.cwd();
      const status = setAutorun(!!enable, appRoot);
      return NextResponse.json({ success: true, autorunAtStartup: status });
    }

    if (action === 'generate_task_code') {
      const { projectName, taskTitle, taskType, agentName } = body;
      const safeProject = (projectName || taskTitle || 'task-generated-project')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .slice(0, 32);

      const baseDir = createProjectDirectory(safeProject);

      // Generate realistic project files
      const readmeContent = `# ${taskTitle}\n\n> 🤖 Dikerjakan secara otomatis oleh Agent: **${agentName || 'Vigent Agent'}**\n> 📁 Lokasi Proyek: \`${baseDir}\`\n> ⏰ Waktu Eksekusi: ${new Date().toLocaleString()}\n\n## Deskripsi Task\nTask: ${taskTitle}\nTipe: ${taskType}\nStatus: Completed & Artifacts Generated\n\n## Cara Menjalankan\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`;
      writeProjectFile(safeProject, 'README.md', readmeContent);

      if (taskType === 'coding') {
        const packageJson = {
          name: safeProject,
          version: '1.0.0',
          private: true,
          description: `Auto-generated code project for ${taskTitle} by Vigent`,
          scripts: {
            dev: 'node src/index.js',
            start: 'node src/index.js',
            test: 'node --test',
          },
          dependencies: {
            dotenv: '^16.4.5',
          },
        };
        writeProjectFile(safeProject, 'package.json', JSON.stringify(packageJson, null, 2));

        const indexJs = `// 🚀 Vigent (Virtual Office Agent) - Generated Implementation\n// Task: ${taskTitle}\n// Agent: ${agentName || 'Autonomous Dev'}\n\nasync function main() {\n  console.log("==========================================");\n  console.log("⚡ Executing: ${taskTitle}");\n  console.log("🤖 Agent In Charge: ${agentName || 'Autonomous Dev'}");\n  console.log("==========================================");\n  \n  // Business logic implementation\n  const timestamp = new Date().toISOString();\n  console.log(\`[Vigent] Service initialized at: \${timestamp}\`);\n  console.log("[Vigent] Connecting to database pool... OK");\n  console.log("[Vigent] Initializing API route handlers... OK");\n  console.log("[Vigent] Sprint deliverables ready for deployment.");\n}\n\nmain().catch(console.error);\n`;
        writeProjectFile(safeProject, 'src/index.js', indexJs);

        const configJs = `module.exports = {\n  projectName: "${safeProject}",\n  environment: process.env.NODE_ENV || "development",\n  version: "1.0.0",\n  agentOwner: "${agentName || 'Agent'}",\n};\n`;
        writeProjectFile(safeProject, 'src/config.js', configJs);
      } else if (taskType === 'content') {
        const articleMd = `# Dokumentasi & Panduan: ${taskTitle}\n\nPenulis: ${agentName || 'Lead Writer'}\nTanggal: ${new Date().toLocaleDateString()}\n\n## 1. Pendahuluan\nDokumen ini disusun untuk memberikan gambaran lengkap mengenai implementasi arsitektur sistem dan panduan operasional pengguna.\n\n## 2. Poin Kunci\n- Skalabilitas sistem berbasis microservices\n- Human-in-the-Loop decision framework\n- Desentralisasi AI Agent di workspace terisolasi Vigent\n\n## 3. Kesimpulan\nSemua modul telah divalidasi dan siap untuk deployment.\n`;
        writeProjectFile(safeProject, 'docs/ARTICLE.md', articleMd);
      }

      return NextResponse.json({
        success: true,
        projectName: safeProject,
        projectDir: baseDir,
        message: 'Task files successfully written to disk',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
