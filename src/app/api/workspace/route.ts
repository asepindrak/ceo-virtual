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
import fs from 'fs';

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

      // If task is about ShadowMove Landing Page or UI/framework, sync and ensure public preview is updated
      const isLandingRelated =
        (projectName && projectName.toLowerCase().includes('shadowmove')) ||
        (taskTitle && /landing|shadowmove|framework|ui|website/i.test(taskTitle));

      if (isLandingRelated) {
        const previewDir = path.join(process.cwd(), 'public', 'preview', 'shadowmove');
        const previewHtml = path.join(previewDir, 'index.html');
        if (fs.existsSync(previewHtml)) {
          // Sync preview to user workspace as well
          const wsDir = path.join(REALAGENT_WORKSPACES, 'shadowmove-landing-page');
          if (!fs.existsSync(wsDir)) fs.mkdirSync(wsDir, { recursive: true });
          fs.copyFileSync(previewHtml, path.join(wsDir, 'index.html'));
          const updateNotice = `\n<!-- Updated by Agent ${agentName || 'Rei Kasumi'} for Task: ${taskTitle} at ${new Date().toISOString()} -->\n`;
          fs.appendFileSync(path.join(wsDir, 'index.html'), updateNotice, 'utf-8');
        }
      }

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

    if (action === 'save_tasks') {
      const { tasks, companyId } = body;
      const tasksFile = path.join(REALAGENT_HOME, `tasks_${companyId || 'company-shadowmove'}.json`);
      fs.writeFileSync(tasksFile, JSON.stringify(tasks || [], null, 2), 'utf-8');
      return NextResponse.json({ success: true, count: (tasks || []).length });
    }

    if (action === 'delete_task') {
      const { taskId, companyId } = body;
      const tasksFile = path.join(REALAGENT_HOME, `tasks_${companyId || 'company-shadowmove'}.json`);
      if (fs.existsSync(tasksFile)) {
        try {
          const content = fs.readFileSync(tasksFile, 'utf-8');
          const currentTasks: any[] = JSON.parse(content);
          const updated = currentTasks.filter((t) => t.id !== taskId);
          fs.writeFileSync(tasksFile, JSON.stringify(updated, null, 2), 'utf-8');
          return NextResponse.json({ success: true, remainingCount: updated.length });
        } catch (e: any) {
          return NextResponse.json({ success: false, error: e.message }, { status: 500 });
        }
      }
      return NextResponse.json({ success: true, remainingCount: 0 });
    }

    if (action === 'edit_task') {
      const { updatedTask, companyId } = body;
      if (!updatedTask || !updatedTask.id) {
        return NextResponse.json({ success: false, error: 'Task data is required' }, { status: 400 });
      }
      const tasksFile = path.join(REALAGENT_HOME, `tasks_${companyId || 'company-shadowmove'}.json`);
      if (fs.existsSync(tasksFile)) {
        try {
          const content = fs.readFileSync(tasksFile, 'utf-8');
          const currentTasks: any[] = JSON.parse(content);
          const updated = currentTasks.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
          fs.writeFileSync(tasksFile, JSON.stringify(updated, null, 2), 'utf-8');
          return NextResponse.json({ success: true, task: updatedTask });
        } catch (e: any) {
          return NextResponse.json({ success: false, error: e.message }, { status: 500 });
        }
      }
      return NextResponse.json({ success: false, error: 'Tasks file not found' }, { status: 404 });
    }

    if (action === 'create_task') {
      const { newTask, companyId } = body;
      if (!newTask || !newTask.title) {
        return NextResponse.json({ success: false, error: 'Task title is required' }, { status: 400 });
      }
      const tasksFile = path.join(REALAGENT_HOME, `tasks_${companyId || 'company-shadowmove'}.json`);
      let currentTasks: any[] = [];
      if (fs.existsSync(tasksFile)) {
        try {
          currentTasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
        } catch {
          currentTasks = [];
        }
      }
      const taskTicket = {
        id: newTask.id || `task-${Date.now()}`,
        title: newTask.title,
        projectName: newTask.projectName || 'ShadowMove Landing Page',
        description: newTask.description || '',
        type: newTask.type || 'coding',
        departmentId: newTask.departmentId || 'dept-eng',
        assignedAgentId: newTask.assignedAgentId || undefined,
        status: newTask.status || (newTask.assignedAgentId ? 'in_progress' : 'backlog'),
        progress: newTask.progress || 0,
        artifacts: newTask.artifacts || [],
        logs: newTask.logs || [`Task created on ${new Date().toLocaleString()}`],
        createdAt: newTask.createdAt || Date.now(),
      };
      currentTasks.unshift(taskTicket);
      fs.writeFileSync(tasksFile, JSON.stringify(currentTasks, null, 2), 'utf-8');
      return NextResponse.json({ success: true, task: taskTicket });
    }

    if (action === 'get_tasks') {
      const { companyId } = body;
      const tasksFile = path.join(REALAGENT_HOME, `tasks_${companyId || 'company-shadowmove'}.json`);
      if (fs.existsSync(tasksFile)) {
        try {
          const content = fs.readFileSync(tasksFile, 'utf-8');
          const parsed = JSON.parse(content);
          return NextResponse.json({ success: true, tasks: parsed });
        } catch {
          return NextResponse.json({ success: true, tasks: [] });
        }
      }
      return NextResponse.json({ success: true, tasks: [] });
    }

    if (action === 'save_events') {
      const { events, companyId } = body;
      const eventsFile = path.join(REALAGENT_HOME, `events_${companyId || 'company-shadowmove'}.json`);
      fs.writeFileSync(eventsFile, JSON.stringify(events || [], null, 2), 'utf-8');
      return NextResponse.json({ success: true, count: (events || []).length });
    }

    if (action === 'get_events') {
      const { companyId } = body;
      const eventsFile = path.join(REALAGENT_HOME, `events_${companyId || 'company-shadowmove'}.json`);
      if (fs.existsSync(eventsFile)) {
        try {
          const content = fs.readFileSync(eventsFile, 'utf-8');
          const parsed = JSON.parse(content);
          return NextResponse.json({ success: true, events: parsed });
        } catch {
          return NextResponse.json({ success: true, events: [] });
        }
      }
      return NextResponse.json({ success: true, events: [] });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
