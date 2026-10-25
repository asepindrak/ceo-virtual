import { NextResponse } from 'next/server';
import { getAvailableRegions, generateUniqueRegionId } from '@/lib/nodeIdentityManager';
import { probeAndSyncLiveNodes } from '@/lib/p2pNodeManager';

export async function GET() {
  try {
    // Proactively download peer data from live nodes (LAN UDP + Public Relay)
    let liveStatus = { onlinePeersCount: 0, peers: [] as any[] };
    try {
      liveStatus = await probeAndSyncLiveNodes();
    } catch (probeErr) {
      console.warn('Probe live nodes notice:', probeErr);
    }

    const regions = getAvailableRegions();
    const noLiveNodes = liveStatus.onlinePeersCount === 0;
    const suggestedNewRegionId = noLiveNodes ? generateUniqueRegionId('apac-shard') : undefined;

    return NextResponse.json({
      success: true,
      regions,
      livePeersCount: liveStatus.onlinePeersCount,
      noLiveNodes,
      suggestedNewRegionId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch regions' },
      { status: 500 }
    );
  }
}
