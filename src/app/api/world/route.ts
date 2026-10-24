import { NextRequest, NextResponse } from 'next/server';
import {
  REGIONAL_DISTRICTS,
  getDynamicRegionalDistricts,
  loadAllMissions,
  dispatchTravelMission,
  advanceMissionTick,
  cancelTravelMission,
} from '@/lib/worldMapManager';
import { getNodeStatus } from '@/lib/p2pNodeManager';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const regionId = searchParams.get('regionId');
    const companyName = searchParams.get('companyName');

    // Auto-advance all running missions on request
    const missions = loadAllMissions();
    missions.forEach((m) => {
      if (m.status !== 'completed') {
        advanceMissionTick(m.id);
      }
    });

    const updatedMissions = loadAllMissions();
    const nodeStatus = getNodeStatus();
    const dynamicDistricts = getDynamicRegionalDistricts(
      companyName ? { name: companyName } : undefined,
      nodeStatus.peers
    );

    if (regionId) {
      const district = dynamicDistricts.find((d) => d.id === regionId);
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
      districts: dynamicDistricts,
      totalDistricts: dynamicDistricts.length,
      missions: updatedMissions,
      activeMissionsCount: updatedMissions.filter((m) => m.status !== 'completed').length,
      onlinePeersCount: nodeStatus.onlinePeersCount,
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

    if (action === 'claim_bounty') {
      const { bountyId, bountyTitle, rewardXp, budgetCoins, bountyType, targetCompanyName } = body;
      return NextResponse.json({
        success: true,
        message: `Bounty "${bountyTitle}" berhasil diambil dari ${targetCompanyName || 'kantor mitra'}! Ditambahkan ke Sprint Board.`,
        bounty: {
          id: bountyId,
          title: bountyTitle,
          rewardXp: rewardXp || 300,
          budgetCoins: budgetCoins || 1000,
          type: bountyType || 'coding',
        },
      });
    }

    if (action === 'buy_offer') {
      const { offerId, offerTitle, priceCoins, category, targetCompanyName } = body;
      return NextResponse.json({
        success: true,
        message: `Berhasil membeli lisensi "${offerTitle}" (${category}) seharga ${priceCoins} Coins dari ${targetCompanyName || 'kantor mitra'}!`,
        offer: {
          id: offerId,
          title: offerTitle,
          priceCoins: priceCoins || 400,
          category: category || 'skill_template',
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling world mission action:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
