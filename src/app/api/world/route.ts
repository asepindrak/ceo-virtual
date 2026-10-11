import { NextRequest, NextResponse } from 'next/server';
import {
  REGIONAL_DISTRICTS,
  loadAllMissions,
  dispatchTravelMission,
  advanceMissionTick,
  cancelTravelMission,
} from '@/lib/worldMapManager';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const regionId = searchParams.get('regionId');

    // Auto-advance all running missions on request
    const missions = loadAllMissions();
    missions.forEach((m) => {
      if (m.status !== 'completed') {
        advanceMissionTick(m.id);
      }
    });

    const updatedMissions = loadAllMissions();

    if (regionId) {
      const district = REGIONAL_DISTRICTS.find((d) => d.id === regionId);
      if (!district) {
        return NextResponse.json({ success: false, error: 'District not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        district,
        missions: updatedMissions.filter(
          (m) => m.originRegionId === regionId || m.targetRegionId === regionId
        ),
      });
    }

    return NextResponse.json({
      success: true,
      districts: REGIONAL_DISTRICTS,
      totalDistricts: REGIONAL_DISTRICTS.length,
      missions: updatedMissions,
      activeMissionsCount: updatedMissions.filter((m) => m.status !== 'completed').length,
    });
  } catch (error: any) {
    console.error('Error fetching world map:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'dispatch') {
      const {
        agentId,
        agentName,
        agentRole,
        originRegionId,
        originCompanyName,
        targetRegionId,
        targetCompanyId,
        targetCompanyName,
        commuteMode = 'bullet_train',
        missionType = 'b2b_pitch',
      } = body;

      if (!agentId || !agentName || !targetRegionId || !targetCompanyId) {
        return NextResponse.json(
          { success: false, error: 'Missing required dispatch parameters' },
          { status: 400 }
        );
      }

      const mission = dispatchTravelMission({
        agentId,
        agentName,
        agentRole: agentRole || 'Specialist',
        originRegionId,
        originCompanyName,
        targetRegionId,
        targetCompanyId,
        targetCompanyName,
        commuteMode,
        missionType,
      });

      return NextResponse.json({
        success: true,
        mission,
        message: `Karyawan ${agentName} berhasil ditugaskan bepergian ke ${targetCompanyName} naik ${
          commuteMode === 'bullet_train' ? 'Express Bullet Train' : 'Cyber-Car'
        }!`,
      });
    }

    if (action === 'tick_mission') {
      const { missionId } = body;
      if (!missionId) {
        return NextResponse.json({ success: false, error: 'missionId is required' }, { status: 400 });
      }
      const updated = advanceMissionTick(missionId);
      return NextResponse.json({ success: true, mission: updated });
    }

    if (action === 'cancel') {
      const { missionId } = body;
      if (!missionId) {
        return NextResponse.json({ success: false, error: 'missionId is required' }, { status: 400 });
      }
      const success = cancelTravelMission(missionId);
      return NextResponse.json({ success, message: 'Misi berhasil dibatalkan.' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling world mission action:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
