import { NextResponse } from 'next/server';
import { isNodeInitialized, getNodeIdentity, getAvailableRegions } from '@/lib/nodeIdentityManager';
import { VIGENT_HOME } from '@/lib/workspaceManager';

export async function GET() {
  try {
    const initialized = isNodeInitialized();
    const identity = getNodeIdentity(false); // safe, without mnemonic
    const regions = getAvailableRegions();

    return NextResponse.json({
      isInitialized: initialized,
      identity,
      homePath: VIGENT_HOME,
      regions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to get node status' },
      { status: 500 }
    );
  }
}
