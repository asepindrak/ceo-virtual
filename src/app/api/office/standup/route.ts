import { NextResponse } from 'next/server';
import {
  getStandupState,
  prepareStandupMeeting,
  advanceStandupSpeaker,
  finishStandupMeeting,
  resetStandupState,
} from '@/lib/standupManager';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId') || 'company-shadowmove';
    const state = getStandupState(companyId);

    return NextResponse.json({
      success: true,
      state,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to get standup state' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, companyId = 'company-shadowmove', triggeredBy = 'web' } = body;

    // 1. Start / Prepare Standup
    if (action === 'start') {
      const state = await prepareStandupMeeting(companyId, triggeredBy);
      return NextResponse.json({ success: true, state });
    }

    // 2. Advance to next speaker
    if (action === 'next_speaker') {
      const result = await advanceStandupSpeaker(companyId);
      return NextResponse.json({ success: true, ...result });
    }

    // 3. Complete Standup early / manually
    if (action === 'finish') {
      const state = await finishStandupMeeting(companyId);
      return NextResponse.json({ success: true, state });
    }

    // 4. Reset Standup
    if (action === 'reset') {
      const state = resetStandupState(companyId);
      return NextResponse.json({ success: true, state });
    }

    return NextResponse.json(
      { success: false, error: `Aksi standup "${action}" tidak dikenali.` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error executing standup action' },
      { status: 500 }
    );
  }
}
