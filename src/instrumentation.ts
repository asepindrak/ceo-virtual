export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startP2PDiscoveryDaemon } = await import('@/lib/p2pNodeManager');
      startP2PDiscoveryDaemon();
      console.log('📡 [CEO Virtual Daemon]: P2P Discovery & Global Community Swarm auto-started on server boot.');
    } catch (err: any) {
      console.warn('⚠️ [CEO Virtual Daemon]: Could not auto-start P2P on server boot:', err.message);
    }
  }
}
