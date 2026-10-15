import { NextRequest, NextResponse } from 'next/server';
import {
  getCompanyMemories,
  addCompanyMemory,
  deleteCompanyMemory,
  searchCompanyMemories,
  getCompanyProgress,
  recordTaskCompletionExperience,
} from '@/lib/memoryManager';
import { CompanyMemoryItem } from '@/types/office';

// GET /api/company/memory?companyId=...&query=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const progress = getCompanyProgress(companyId);

    if (query && query.trim()) {
      const results = await searchCompanyMemories(companyId, query.trim(), limit);
      return NextResponse.json({
        success: true,
        companyId,
        progress,
        memories: results,
      });
    }

    const memories = getCompanyMemories(companyId);
    return NextResponse.json({
      success: true,
      companyId,
      progress,
      memories,
    });
  } catch (error: any) {
    console.error('Error fetching company memories:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/company/memory
// Body: { companyId, action: 'add' | 'experience' | 'search', memory?: Partial<CompanyMemoryItem>, taskData?: any, query?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, action = 'add' } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    if (action === 'experience') {
      const mockTask: any = {
        id: `task-${Date.now()}`,
        title: body.taskTitle || 'Tugas Selesai',
        type: body.taskType || 'coding',
        status: 'done',
        progress: 100,
        artifacts: [],
        logs: [body.summary || 'Tugas selesai.'],
      };
      const result = await recordTaskCompletionExperience(
        companyId,
        mockTask,
        body.agentName || 'Tim CEO Virtual'
      );
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    if (action === 'search') {
      const { query, limit = 5 } = body;
      if (!query) {
        return NextResponse.json({ error: 'query is required for search' }, { status: 400 });
      }
      const results = await searchCompanyMemories(companyId, query, limit);
      return NextResponse.json({
        success: true,
        results,
      });
    }

    // Default: Add manual memory / lore
    const { memory } = body;
    if (!memory || !memory.content) {
      return NextResponse.json({ error: 'memory.content is required' }, { status: 400 });
    }

    const newItem = await addCompanyMemory({
      companyId,
      type: memory.type || 'lore',
      title: memory.title || 'Catatan Kantor',
      content: memory.content,
      tags: memory.tags || ['manual'],
      authorAgent: memory.authorAgent || 'Founder',
      importance: memory.importance ?? 4,
    });

    const progress = getCompanyProgress(companyId);

    return NextResponse.json({
      success: true,
      memory: newItem,
      progress,
    });
  } catch (error: any) {
    console.error('Error saving company memory:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/company/memory?companyId=...&memoryId=...
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const memoryId = searchParams.get('memoryId');

    if (!companyId || !memoryId) {
      return NextResponse.json({ error: 'companyId and memoryId are required' }, { status: 400 });
    }

    const deleted = deleteCompanyMemory(companyId, memoryId);
    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Memory deleted successfully' : 'Memory not found',
    });
  } catch (error: any) {
    console.error('Error deleting company memory:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
