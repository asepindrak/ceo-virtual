import { NextResponse } from 'next/server';
import {
  initSkillsDirectory,
  listInstalledSkills,
  saveSkill,
  VIGENT_SKILLS_DIR,
} from '@/lib/skillManager';
import {
  initMcpConfigFile,
  listMcpServers,
  toggleMcpServer,
  saveMcpServer,
  MCP_CATALOG_PRESETS,
  VIGENT_MCP_CONFIG_FILE,
} from '@/lib/mcpClient';

export async function GET() {
  try {
    const skills = initSkillsDirectory();
    initMcpConfigFile();
    const mcpServers = listMcpServers();

    return NextResponse.json({
      success: true,
      skills,
      mcpServers,
      catalogPresets: MCP_CATALOG_PRESETS,
      skillsDir: VIGENT_SKILLS_DIR,
      mcpConfigFile: VIGENT_MCP_CONFIG_FILE,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'toggle_mcp') {
      const { serverId, enabled } = body;
      const updated = toggleMcpServer(serverId, !!enabled);
      return NextResponse.json({ success: true, server: updated });
    }

    if (action === 'save_mcp') {
      const { server } = body;
      const saved = saveMcpServer(server);
      return NextResponse.json({ success: true, server: saved });
    }

    if (action === 'create_skill') {
      const { skillId, title, description, assignedRoles, instructions, tags } = body;
      const filePath = saveSkill(skillId, title, description, assignedRoles, instructions, tags || []);
      const allSkills = listInstalledSkills();
      return NextResponse.json({ success: true, filePath, skills: allSkills });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
