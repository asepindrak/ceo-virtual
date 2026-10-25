import { NextResponse } from 'next/server';
import { relocateNodeRegion, generateUniqueRegionId, getNodeIdentity } from '@/lib/nodeIdentityManager';
import { updateNodePresence, broadcastBeacon, syncWithPublicRelay } from '@/lib/p2pNodeManager';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let targetRegionId = body.targetRegionId;
    const isNewRegion = Boolean(body.isNewRegion);
    const preferredPlotId = body.preferredPlotId;

    if (isNewRegion || !targetRegionId) {
      targetRegionId = generateUniqueRegionId(body.prefix || 'apac-shard');
    }

    const result = relocateNodeRegion(targetRegionId, preferredPlotId);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Gagal memindahkan region kantor' }, { status: 400 });
    }

    // Update P2P network presence with new region & plot coordinates
    try {
      updateNodePresence(
        result.identity.companyName,
        result.identity.regionId,
        result.identity.plotId,
        result.identity.plotCoords
      );
      broadcastBeacon();
      syncWithPublicRelay().catch(() => {});
    } catch (p2pErr) {
      console.warn('P2P presence update notice:', p2pErr);
    }

    // Safe identity (strip mnemonic)
    const safeIdentity = { ...result.identity };
    delete safeIdentity.mnemonic;

    return NextResponse.json({
      success: true,
      identity: safeIdentity,
      regionId: safeIdentity.regionId,
      plotId: safeIdentity.plotId,
      plotCoords: safeIdentity.plotCoords,
      message: `Kantor berhasil dipindahkan ke Region "${safeIdentity.regionId}" pada Kavling "${safeIdentity.plotId}"!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memproses pemindahan kantor' },
      { status: 500 }
    );
  }
}
