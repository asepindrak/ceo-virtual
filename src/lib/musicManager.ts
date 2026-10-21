import fs from 'fs';
import path from 'path';
import { MusicTrack, OfficeMusicState } from '@/types/office';
import { VIGENT_HOME } from './workspaceManager';

// Lazy-loaded or singleton YTMusic client
let ytmusicInstance: any = null;

async function getYTMusicClient() {
  if (!ytmusicInstance) {
    try {
      // Dynamic import / require to handle ESM/CJS interop safely
      const ytModule = await import('ytmusic-api');
      const YTMusicClass = (ytModule as any).default || ytModule;
      const client = new YTMusicClass();
      await client.initialize();
      ytmusicInstance = client;
    } catch (err) {
      console.error('[YTMusic] Error initializing ytmusic-api:', err);
      throw err;
    }
  }
  return ytmusicInstance;
}

// In-memory cache for ultra-responsive web & remote sync
const musicStateRegistry = new Map<string, OfficeMusicState>();

function getMusicFilePath(companyId: string): string {
  if (!fs.existsSync(VIGENT_HOME)) {
    fs.mkdirSync(VIGENT_HOME, { recursive: true });
  }
  return path.join(VIGENT_HOME, `music_${companyId}.json`);
}

function formatDurationSeconds(sec?: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function getOfficeMusicState(companyId: string = 'company-shadowmove'): OfficeMusicState {
  if (musicStateRegistry.has(companyId)) {
    return musicStateRegistry.get(companyId)!;
  }

  // Try loading from file
  try {
    const filePath = getMusicFilePath(companyId);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      musicStateRegistry.set(companyId, data);
      return data;
    }
  } catch (err) {
    console.warn(`[MusicManager] Failed to read music state for ${companyId}:`, err);
  }

  // Initial default state with curated starter playlist for virtual office vibe
  const defaultState: OfficeMusicState = {
    currentTrack: {
      id: 'default-lofi-1',
      videoId: '1N8hOpMqvYs',
      title: 'Lofi Rain Chill Beats for Focus & Code',
      artist: 'Zyra Music',
      duration: 3600,
      durationText: '60:00',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80',
      addedBy: 'Office SoundSystem',
      addedAt: Date.now(),
    },
    playlist: [
      {
        id: 'default-lofi-1',
        videoId: '1N8hOpMqvYs',
        title: 'Lofi Rain Chill Beats for Focus & Code',
        artist: 'Zyra Music',
        duration: 3600,
        durationText: '60:00',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80',
        addedBy: 'Office SoundSystem',
        addedAt: Date.now(),
      },
      {
        id: 'default-synth-2',
        videoId: '4xDzrJKXOOY',
        title: 'synthwave radio - chill beats to relax/game to',
        artist: 'Lofi Girl',
        duration: 3600,
        durationText: '60:00',
        thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80',
        addedBy: 'Office SoundSystem',
        addedAt: Date.now() + 10,
      },
    ],
    currentIndex: 0,
    isPlaying: false,
    volume: 75,
    lastUpdated: Date.now(),
  };

  saveOfficeMusicState(companyId, defaultState);
  return defaultState;
}

export function saveOfficeMusicState(companyId: string, state: OfficeMusicState): void {
  state.lastUpdated = Date.now();
  musicStateRegistry.set(companyId, state);

  try {
    const filePath = getMusicFilePath(companyId);
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[MusicManager] Failed to persist music state for ${companyId}:`, err);
  }
}

/**
 * Search songs on YouTube Music using `ytmusic-api`
 */
export async function searchYTMusic(query: string, limit: number = 8): Promise<MusicTrack[]> {
  try {
    const client = await getYTMusicClient();
    
    // 1. Search videos first (Official MVs, Lyric Videos, Audio visualizers)
    // Videos on YouTube have public iframe embed permissions enabled by default.
    let videos: any[] = [];
    try {
      videos = await client.searchVideos(query);
    } catch (vErr) {
      console.warn('[MusicManager] searchVideos error:', vErr);
    }

    // 2. Search songs as secondary fallback
    let songs: any[] = [];
    try {
      songs = await client.searchSongs(query);
    } catch (sErr) {
      console.warn('[MusicManager] searchSongs error:', sErr);
    }

    // Combine: prioritize videos for iframe reliability, deduplicate videoId
    const combined: any[] = [];
    const seenVideoIds = new Set<string>();

    if (Array.isArray(videos)) {
      for (const v of videos) {
        if (v?.videoId && !seenVideoIds.has(v.videoId)) {
          seenVideoIds.add(v.videoId);
          combined.push(v);
        }
      }
    }

    if (Array.isArray(songs)) {
      for (const s of songs) {
        if (s?.videoId && !seenVideoIds.has(s.videoId)) {
          seenVideoIds.add(s.videoId);
          combined.push(s);
        }
      }
    }

    if (combined.length === 0) {
      return [];
    }

    return combined.slice(0, limit).map((s: any, idx: number) => {
      const bestThumbnail =
        s.thumbnails && s.thumbnails.length > 0
          ? s.thumbnails[s.thumbnails.length - 1].url
          : undefined;

      const artistName =
        typeof s.artist === 'object' && s.artist?.name
          ? s.artist.name
          : typeof s.artist === 'string'
          ? s.artist
          : typeof s.author === 'string'
          ? s.author
          : typeof s.author === 'object' && s.author?.name
          ? s.author.name
          : 'YouTube Music';

      const durationSec = typeof s.duration === 'number' ? s.duration : 0;

      return {
        id: `track-${s.videoId}-${Date.now()}-${idx}`,
        videoId: s.videoId,
        title: s.name || s.title || 'Untitled Song',
        artist: artistName,
        duration: durationSec,
        durationText: formatDurationSeconds(durationSec),
        thumbnailUrl: bestThumbnail,
        addedAt: Date.now(),
      };
    });
  } catch (err) {
    console.error('[MusicManager] Search error:', err);
    return [];
  }
}

/**
 * Play a single track immediately (interrupts current song if any, switches to this track immediately)
 */
export async function playSingleTrack(
  companyId: string,
  query: string,
  requestedBy: string = 'User'
): Promise<{ track: MusicTrack | null; state: OfficeMusicState; error?: string }> {
  const state = getOfficeMusicState(companyId);
  const results = await searchYTMusic(query, 1);

  if (results.length === 0) {
    return { track: null, state, error: `Tidak ditemukan lagu untuk pencarian "${query}".` };
  }

  const track = { ...results[0], addedBy: requestedBy };

  // Check if track already exists in playlist
  const existingIdx = state.playlist.findIndex((t) => t.videoId === track.videoId);
  if (existingIdx !== -1) {
    state.currentIndex = existingIdx;
    state.currentTrack = state.playlist[existingIdx];
  } else {
    // Insert immediately after current track (or at beginning if none)
    const insertIdx =
      state.currentIndex >= 0 && state.currentIndex < state.playlist.length
        ? state.currentIndex + 1
        : state.playlist.length;
    state.playlist.splice(insertIdx, 0, track);
    state.currentIndex = insertIdx;
    state.currentTrack = track;
  }

  state.isPlaying = true;
  state.playbackCommand = {
    action: 'play',
    videoId: track.videoId,
    timestamp: Date.now(),
  };

  saveOfficeMusicState(companyId, state);
  return { track, state };
}

/**
 * Add a track to the end of playlist queue WITHOUT interrupting the currently playing song
 */
export async function queueTrack(
  companyId: string,
  query: string,
  requestedBy: string = 'User'
): Promise<{ track: MusicTrack | null; state: OfficeMusicState; position: number; error?: string }> {
  const state = getOfficeMusicState(companyId);
  const results = await searchYTMusic(query, 1);

  if (results.length === 0) {
    return { track: null, state, position: -1, error: `Tidak ditemukan lagu untuk pencarian "${query}".` };
  }

  const track = { ...results[0], addedBy: requestedBy };
  const existingIdx = state.playlist.findIndex((t) => t.videoId === track.videoId);

  let targetPos: number;
  if (existingIdx !== -1) {
    targetPos = existingIdx + 1;
  } else {
    state.playlist.push(track);
    targetPos = state.playlist.length;
  }

  // If nothing is playing, start playing this track immediately
  if (!state.currentTrack || !state.isPlaying) {
    state.currentIndex = existingIdx !== -1 ? existingIdx : state.playlist.length - 1;
    state.currentTrack = state.playlist[state.currentIndex];
    state.isPlaying = true;
    state.playbackCommand = {
      action: 'play',
      videoId: state.currentTrack.videoId,
      timestamp: Date.now(),
    };
  }

  saveOfficeMusicState(companyId, state);
  return { track, state, position: targetPos };
}

/**
 * Generate a playlist of 3-5 songs from a search query / theme
 */
export async function createPlaylist(
  companyId: string,
  query: string,
  requestedBy: string = 'User',
  replaceExisting: boolean = false
): Promise<{ tracks: MusicTrack[]; state: OfficeMusicState; error?: string }> {
  const state = getOfficeMusicState(companyId);
  const results = await searchYTMusic(query, 5);

  if (results.length === 0) {
    return { tracks: [], state, error: `Tidak ada lagu yang ditemukan untuk playlist "${query}".` };
  }

  const tracksWithUser = results.map((t) => ({ ...t, addedBy: requestedBy }));

  if (replaceExisting) {
    state.playlist = tracksWithUser;
    state.currentIndex = 0;
    state.currentTrack = tracksWithUser[0];
  } else {
    // Append to existing playlist
    const initialLength = state.playlist.length;
    tracksWithUser.forEach((t) => {
      if (!state.playlist.some((p) => p.videoId === t.videoId)) {
        state.playlist.push(t);
      }
    });
    if (!state.currentTrack || !state.isPlaying) {
      state.currentIndex = initialLength;
      state.currentTrack = state.playlist[initialLength] || state.playlist[0];
    }
  }

  state.isPlaying = true;
  state.playbackCommand = {
    action: 'play',
    videoId: state.currentTrack?.videoId,
    timestamp: Date.now(),
  };

  saveOfficeMusicState(companyId, state);
  return { tracks: tracksWithUser, state };
}

/**
 * Send playback command: play, pause, stop, next, prev, seek
 */
export function sendPlaybackCommand(
  companyId: string,
  action: 'play' | 'pause' | 'stop' | 'next' | 'prev',
  videoId?: string
): OfficeMusicState {
  const state = getOfficeMusicState(companyId);

  if (action === 'play') {
    state.isPlaying = true;
    if (videoId) {
      const idx = state.playlist.findIndex((t) => t.videoId === videoId);
      if (idx !== -1) {
        state.currentIndex = idx;
        state.currentTrack = state.playlist[idx];
      }
    } else if (!state.currentTrack && state.playlist.length > 0) {
      state.currentIndex = 0;
      state.currentTrack = state.playlist[0];
    }
  } else if (action === 'pause') {
    state.isPlaying = false;
  } else if (action === 'stop') {
    state.isPlaying = false;
  } else if (action === 'next') {
    if (state.playlist.length > 0) {
      state.currentIndex = (state.currentIndex + 1) % state.playlist.length;
      state.currentTrack = state.playlist[state.currentIndex];
      state.isPlaying = true;
    }
  } else if (action === 'prev') {
    if (state.playlist.length > 0) {
      state.currentIndex = (state.currentIndex - 1 + state.playlist.length) % state.playlist.length;
      state.currentTrack = state.playlist[state.currentIndex];
      state.isPlaying = true;
    }
  }

  state.playbackCommand = {
    action,
    videoId: state.currentTrack?.videoId,
    timestamp: Date.now(),
  };

  saveOfficeMusicState(companyId, state);
  return state;
}

/**
 * Add an already searched track to the playlist
 */
export function addTrackToPlaylist(
  companyId: string,
  track: MusicTrack,
  playImmediately: boolean = false
): OfficeMusicState {
  const state = getOfficeMusicState(companyId);
  const existingIdx = state.playlist.findIndex((t) => t.videoId === track.videoId);

  if (existingIdx !== -1) {
    if (playImmediately) {
      state.currentIndex = existingIdx;
      state.currentTrack = state.playlist[existingIdx];
      state.isPlaying = true;
      state.playbackCommand = {
        action: 'play',
        videoId: track.videoId,
        timestamp: Date.now(),
      };
    }
  } else {
    state.playlist.push(track);
    if (playImmediately || state.playlist.length === 1) {
      state.currentIndex = state.playlist.length - 1;
      state.currentTrack = track;
      state.isPlaying = true;
      state.playbackCommand = {
        action: 'play',
        videoId: track.videoId,
        timestamp: Date.now(),
      };
    }
  }

  saveOfficeMusicState(companyId, state);
  return state;
}

/**
 * Remove track from playlist
 */
export function removeTrackFromPlaylist(companyId: string, trackId: string): OfficeMusicState {
  const state = getOfficeMusicState(companyId);
  const removeIdx = state.playlist.findIndex((t) => t.id === trackId || t.videoId === trackId);

  if (removeIdx !== -1) {
    state.playlist.splice(removeIdx, 1);
    if (state.currentIndex >= state.playlist.length) {
      state.currentIndex = Math.max(0, state.playlist.length - 1);
    }
    state.currentTrack = state.playlist[state.currentIndex] || null;
    if (state.playlist.length === 0) {
      state.isPlaying = false;
    }
  }

  saveOfficeMusicState(companyId, state);
  return state;
}

/**
 * Clear all tracks
 */
export function clearPlaylist(companyId: string): OfficeMusicState {
  const state = getOfficeMusicState(companyId);
  state.playlist = [];
  state.currentTrack = null;
  state.currentIndex = 0;
  state.isPlaying = false;
  state.playbackCommand = {
    action: 'stop',
    timestamp: Date.now(),
  };
  saveOfficeMusicState(companyId, state);
  return state;
}

/**
 * Set Volume (0 to 100)
 */
export function setMusicVolume(companyId: string, volume: number): OfficeMusicState {
  const state = getOfficeMusicState(companyId);
  state.volume = Math.max(0, Math.min(100, volume));
  saveOfficeMusicState(companyId, state);
  return state;
}
