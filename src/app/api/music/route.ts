import { NextResponse } from 'next/server';
import {
  getOfficeMusicState,
  searchYTMusic,
  playSingleTrack,
  createPlaylist,
  sendPlaybackCommand,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  clearPlaylist,
  setMusicVolume,
} from '@/lib/musicManager';
import { appendCompanyChatMessage } from '@/lib/telegramManager';
import { OfficeGroupChatMessage } from '@/types/office';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId') || 'company-shadowmove';
    const state = getOfficeMusicState(companyId);

    return NextResponse.json({
      success: true,
      state,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to get music state' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      companyId = 'company-shadowmove',
      query,
      track,
      trackId,
      volume,
      requestedBy = 'User',
      broadcastToChat = false,
    } = body;

    // 1. Search tracks
    if (action === 'search') {
      if (!query) {
        return NextResponse.json({ success: false, error: 'Query is required for search' }, { status: 400 });
      }
      const results = await searchYTMusic(query, 10);
      return NextResponse.json({ success: true, results });
    }

    // 2. Play Single Track
    if (action === 'play_single') {
      if (!query && !track) {
        return NextResponse.json({ success: false, error: 'Query or track is required' }, { status: 400 });
      }
      if (track) {
        const state = addTrackToPlaylist(companyId, track, true);
        return NextResponse.json({ success: true, state, track });
      }

      const res = await playSingleTrack(companyId, query, requestedBy);
      if (res.error) {
        return NextResponse.json({ success: false, error: res.error, state: res.state }, { status: 404 });
      }

      if (broadcastToChat && res.track) {
        const chatMsg: OfficeGroupChatMessage = {
          id: `music-msg-${Date.now()}`,
          senderType: 'system',
          senderName: 'Office SoundSystem 🎵',
          message: `🎶 Memutar lagu: **"${res.track.title}"** oleh **${res.track.artist}** (Durasi: ${res.track.durationText}) atas permintaan ${requestedBy}.`,
          timestamp: Date.now(),
          source: 'web',
        };
        appendCompanyChatMessage(companyId, chatMsg);
      }

      return NextResponse.json({ success: true, state: res.state, track: res.track });
    }

    // 3. Create / Append Playlist
    if (action === 'create_playlist') {
      if (!query) {
        return NextResponse.json({ success: false, error: 'Query is required for playlist creation' }, { status: 400 });
      }
      const replace = Boolean(body.replaceExisting);
      const res = await createPlaylist(companyId, query, requestedBy, replace);
      if (res.error) {
        return NextResponse.json({ success: false, error: res.error, state: res.state }, { status: 404 });
      }

      if (broadcastToChat && res.tracks.length > 0) {
        const trackNames = res.tracks.map((t, idx) => `${idx + 1}. ${t.title} - ${t.artist}`).join('\n');
        const chatMsg: OfficeGroupChatMessage = {
          id: `music-pl-${Date.now()}`,
          senderType: 'system',
          senderName: 'Office SoundSystem 🎵',
          message: `📻 Playlist **"${query}"** berhasil dibuat dengan ${res.tracks.length} lagu!\n${trackNames}`,
          timestamp: Date.now(),
          source: 'web',
        };
        appendCompanyChatMessage(companyId, chatMsg);
      }

      return NextResponse.json({ success: true, state: res.state, tracks: res.tracks });
    }

    // 4. Playback Commands: play, pause, stop, next, prev
    if (['play', 'pause', 'stop', 'next', 'prev'].includes(action)) {
      const state = sendPlaybackCommand(companyId, action, body.videoId);
      return NextResponse.json({ success: true, state });
    }

    // 5. Add track to playlist without immediate play
    if (action === 'add_track') {
      if (!track) {
        return NextResponse.json({ success: false, error: 'Track data required' }, { status: 400 });
      }
      const state = addTrackToPlaylist(companyId, track, false);
      return NextResponse.json({ success: true, state });
    }

    // 6. Remove track
    if (action === 'remove_track') {
      if (!trackId) {
        return NextResponse.json({ success: false, error: 'TrackId is required' }, { status: 400 });
      }
      const state = removeTrackFromPlaylist(companyId, trackId);
      return NextResponse.json({ success: true, state });
    }

    // 7. Clear playlist
    if (action === 'clear_playlist') {
      const state = clearPlaylist(companyId);
      return NextResponse.json({ success: true, state });
    }

    // 8. Set Volume
    if (action === 'set_volume') {
      const state = setMusicVolume(companyId, Number(volume) || 50);
      return NextResponse.json({ success: true, state });
    }

    return NextResponse.json({ success: false, error: `Aksi "${action}" tidak dikenali.` }, { status: 400 });
  } catch (err: any) {
    console.error('[API /api/music Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
