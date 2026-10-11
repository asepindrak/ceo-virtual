import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateNodeIdentity,
  startP2PDiscoveryDaemon,
  getNodeStatus,
  connectToPeerDirectly,
  broadcastBeacon,
  removePeerNode,
  setPublicRelayUrl,
  syncWithPublicRelay,
} from '@/lib/p2pNodeManager';

export async function GET(req: NextRequest) {
  try {
    // Ensure P2P daemon is running
    startP2PDiscoveryDaemon();
    const status = getNodeStatus();

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error('Error getting P2P node status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // A. Incoming Handshake from another Vigent Node
    if (action === 'handshake') {
      const { senderNodeId, senderCompanyName, senderRegionalSector, senderHttpPort } = body;
      const identity = getOrCreateNodeIdentity();

      // Return local node info to completing reciprocal handshake
      return NextResponse.json({
        success: true,
        nodeId: identity.nodeId,
        companyName: identity.companyName,
        regionalSector: identity.regionalSector,
        fingerprint: identity.fingerprint,
        message: 'Handshake accepted! Both nodes are now connected in Vigent P2P Mesh.',
      });
    }

    // B. Outgoing Manual Direct Connect to another Peer IP / URL
    if (action === 'connect_peer') {
      const { peerUrl } = body;
      if (!peerUrl) {
        return NextResponse.json({ success: false, error: 'peerUrl is required' }, { status: 400 });
      }
      const result = await connectToPeerDirectly(peerUrl);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    // C. Force broadcast UDP beacon on local network
    if (action === 'broadcast') {
      const success = broadcastBeacon();
      return NextResponse.json({ success, message: 'UDP discovery beacon sent to local network.' });
    }

    // D. Remove a peer
    if (action === 'remove_peer') {
      const { nodeId } = body;
      if (!nodeId) {
        return NextResponse.json({ success: false, error: 'nodeId is required' }, { status: 400 });
      }
      const removed = removePeerNode(nodeId);
      return NextResponse.json({ success: removed, message: 'Peer removed from node table.' });
    }

    // E. Set Public Relay Hub URL (Dokploy VPS)
    if (action === 'set_relay_url') {
      const { relayUrl } = body;
      const saved = setPublicRelayUrl(relayUrl);
      const syncResult = await syncWithPublicRelay();
      return NextResponse.json({
        success: true,
        relayUrl: saved,
        syncResult,
        message: saved ? 'URL Relay Dokploy berhasil disimpan & disinkronkan!' : 'URL Relay dinonaktifkan.',
      });
    }

    // F. Sync with Public Relay Hub manually
    if (action === 'sync_relay') {
      const result = await syncWithPublicRelay();
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling P2P request:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

