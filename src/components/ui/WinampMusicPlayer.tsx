'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MusicTrack, OfficeMusicState } from '@/types/office';
import {
  Music,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Search,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Radio,
  Tv,
  ListMusic,
  Sparkles,
  Loader2,
  Minus,
  Maximize2,
} from 'lucide-react';

interface WinampMusicPlayerProps {
  companyId?: string;
  companyName?: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const WinampMusicPlayer: React.FC<WinampMusicPlayerProps> = ({
  companyId = 'company-default',
  companyName = 'Office',
}) => {
  // Drawer / Window visibility
  const [isOpen, setIsOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Music state from backend / sync
  const [musicState, setMusicState] = useState<OfficeMusicState>({
    currentTrack: null,
    playlist: [],
    currentIndex: 0,
    isPlaying: false,
    volume: 70,
    lastUpdated: 0,
  });

  // Local controls
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'playlist' | 'search'>('playlist');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [needUserGesture, setNeedUserGesture] = useState(false);

  // YouTube player references & command queue
  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef(false);
  const currentLoadedVideoIdRef = useRef<string | null>(null);
  const lastProcessedCmdTimeRef = useRef<number>(0);
  const pendingCommandRef = useRef<{ action: string; videoId?: string; timestamp: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeContainerId = 'winamp-youtube-iframe-target';

  // Synchronized refs to avoid stale closures inside onReady
  const musicStateRef = useRef<OfficeMusicState>(musicState);
  useEffect(() => {
    musicStateRef.current = musicState;
  }, [musicState]);

  const volumeRef = useRef<number>(volume);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Helper to play a track safely via official YouTube Iframe API loadVideoById
  const safePlayTrack = useCallback((videoId: string) => {
    if (!isPlayerReadyRef.current || !playerRef.current) {
      pendingCommandRef.current = { action: 'play', videoId, timestamp: Date.now() };
      return;
    }
    try {
      currentLoadedVideoIdRef.current = videoId;
      if (typeof playerRef.current.unMute === 'function') {
        playerRef.current.unMute();
      }
      if (typeof playerRef.current.setVolume === 'function') {
        playerRef.current.setVolume(Math.max(50, volumeRef.current || 70));
      }
      if (typeof playerRef.current.loadVideoById === 'function') {
        try {
          playerRef.current.loadVideoById(videoId, 0);
        } catch {
          playerRef.current.loadVideoById({ videoId });
        }
      }
      if (typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      }

      // Detect if browser blocked unmuted autoplay before any user gesture on this tab
      if (typeof navigator !== 'undefined' && 'userActivation' in navigator) {
        if (!(navigator as any).userActivation?.hasBeenActive) {
          setNeedUserGesture(true);
        }
      }
    } catch (err) {
      console.warn('[safePlayTrack error]:', err);
      setNeedUserGesture(true);
    }
  }, []);

  // Centralized command executor that respects player readiness
  const executePlaybackCommand = useCallback(
    (
      cmd: { action: string; videoId?: string; timestamp: number },
      targetState?: OfficeMusicState
    ) => {
      if (!isPlayerReadyRef.current || !playerRef.current) {
        // Enqueue command until onReady fires
        pendingCommandRef.current = cmd;
        return;
      }

      lastProcessedCmdTimeRef.current = cmd.timestamp;
      const state = targetState || musicStateRef.current;

      try {
        if (cmd.action === 'play') {
          const vid = cmd.videoId || state.currentTrack?.videoId;
          if (vid) {
            safePlayTrack(vid);
          } else {
            playerRef.current.playVideo();
          }
        } else if (cmd.action === 'pause') {
          playerRef.current.pauseVideo();
        } else if (cmd.action === 'stop') {
          playerRef.current.stopVideo();
        } else if (cmd.action === 'next' || cmd.action === 'prev') {
          if (state.currentTrack) {
            safePlayTrack(state.currentTrack.videoId);
          }
        }
      } catch (cmdErr) {
        console.warn('[executePlaybackCommand error]:', cmdErr);
      }
    },
    [safePlayTrack]
  );

  // Unlock browser audio upon user interaction
  const unlockAudioGesture = useCallback(() => {
    setNeedUserGesture(false);
    if (isPlayerReadyRef.current && playerRef.current) {
      try {
        if (typeof playerRef.current.unMute === 'function') {
          playerRef.current.unMute();
        }
        if (typeof playerRef.current.setVolume === 'function') {
          playerRef.current.setVolume(volumeRef.current);
        }
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
      } catch (e) {
        console.warn('Unlock audio error:', e);
      }
    }
  }, []);

  // Global listener: first click or keypress unlocks sound if autoplay was restricted
  useEffect(() => {
    const handleDocInteraction = () => {
      if (needUserGesture) {
        unlockAudioGesture();
      }
    };
    window.addEventListener('click', handleDocInteraction, { passive: true });
    window.addEventListener('keydown', handleDocInteraction, { passive: true });
    return () => {
      window.removeEventListener('click', handleDocInteraction);
      window.removeEventListener('keydown', handleDocInteraction);
    };
  }, [needUserGesture, unlockAudioGesture]);

  // 1. Load YouTube IFrame API once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      const targetEl = document.getElementById(iframeContainerId);
      if (!targetEl || playerRef.current) return;

      const initVideoId = musicStateRef.current.currentTrack?.videoId || '1N8hOpMqvYs';
      currentLoadedVideoIdRef.current = initVideoId;

      try {
        playerRef.current = new window.YT.Player(iframeContainerId, {
          height: '100%',
          width: '100%',
          videoId: initVideoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
          },
          events: {
            onReady: (event: any) => {
              isPlayerReadyRef.current = true;
              try {
                event.target.setVolume(volumeRef.current);
              } catch {}

              // Execute pending queued command if Telegram sent one while loading
              if (pendingCommandRef.current) {
                const queued = pendingCommandRef.current;
                pendingCommandRef.current = null;
                executePlaybackCommand(queued, musicStateRef.current);
              } else if (musicStateRef.current.isPlaying && musicStateRef.current.currentTrack) {
                safePlayTrack(musicStateRef.current.currentTrack.videoId);
              }
            },
            onStateChange: (event: any) => {
              // 0: ENDED, 1: PLAYING, 2: PAUSED
              if (event.data === 0) {
                handleAutoNext();
              } else if (event.data === 1) {
                setNeedUserGesture(false);
                setMusicState((prev) => ({ ...prev, isPlaying: true }));
              } else if (event.data === 2) {
                setMusicState((prev) => ({ ...prev, isPlaying: false }));
              }
            },
            onError: (err: any) => {
              const code = err?.data;
              console.warn('[YT Player Error]:', code, err);
              if (code === 101 || code === 150) {
                setNoticeMessage('⚠️ Video owner restricted embedded playback. Skipping to next track...');
              } else if (code === 100 || code === 2) {
                setNoticeMessage('⚠️ Video not found. Skipping to next track...');
              } else {
                setNoticeMessage('⚠️ Playback issue encountered. Skipping to next track...');
              }
              setTimeout(() => setNoticeMessage(null), 4000);
              handleAutoNext();
            },
          },
        });
      } catch (err) {
        console.error('[YT Player init error]:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }
  }, [executePlaybackCommand, safePlayTrack]);

  // 2. Poll remote music state (/api/music) every 2 seconds for Telegram & War Room remote sync
  useEffect(() => {
    let isSubscribed = true;

    const pollState = async () => {
      try {
        const res = await fetch(`/api/music?companyId=${companyId}`);
        const data = await res.json();
        if (!isSubscribed || !data.success || !data.state) return;

        const remoteState: OfficeMusicState = data.state;

        // Check if current track changed or if there is a new playback command
        const isNewTrack =
          Boolean(remoteState.currentTrack?.videoId) &&
          remoteState.currentTrack?.videoId !== currentLoadedVideoIdRef.current;
        const hasNewCommand =
          Boolean(remoteState.playbackCommand) &&
          remoteState.playbackCommand!.timestamp > lastProcessedCmdTimeRef.current;

        if (hasNewCommand || (isNewTrack && remoteState.isPlaying)) {
          if (remoteState.playbackCommand?.timestamp) {
            lastProcessedCmdTimeRef.current = Math.max(
              lastProcessedCmdTimeRef.current,
              remoteState.playbackCommand.timestamp
            );
          }

          if (remoteState.isPlaying && remoteState.currentTrack) {
            setIsOpen(true);
            setNoticeMessage(`🎵 Now Playing: "${remoteState.currentTrack.title}"`);
            setTimeout(() => setNoticeMessage(null), 6000);
            safePlayTrack(remoteState.currentTrack.videoId);
          } else if (hasNewCommand) {
            executePlaybackCommand(remoteState.playbackCommand!, remoteState);
          }
        }

        setMusicState(remoteState);
      } catch (e) {
        // silent polling
      }
    };

    pollState();
    const interval = setInterval(pollState, 2000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [companyId, executePlaybackCommand]);

  // Handle auto next when track finishes
  const handleAutoNext = useCallback(async () => {
    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'next', companyId }),
      });
      const data = await res.json();
      if (data.success && data.state) {
        if (data.state.playbackCommand?.timestamp) {
          lastProcessedCmdTimeRef.current = Math.max(lastProcessedCmdTimeRef.current, data.state.playbackCommand.timestamp);
        }
        setMusicState(data.state);
        if (data.state.currentTrack) {
          safePlayTrack(data.state.currentTrack.videoId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [companyId, safePlayTrack]);

  // Local Play / Pause toggle
  const togglePlayPause = async () => {
    const action = musicState.isPlaying ? 'pause' : 'play';
    lastProcessedCmdTimeRef.current = Date.now();
    try {
      if (isPlayerReadyRef.current && playerRef.current) {
        if (action === 'play') {
          if (musicState.currentTrack) {
            safePlayTrack(musicState.currentTrack.videoId);
          } else {
            playerRef.current.playVideo();
          }
        } else {
          playerRef.current.pauseVideo();
        }
      }

      setMusicState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));

      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, companyId }),
      });
      const data = await res.json();
      if (data.success && data.state?.playbackCommand?.timestamp) {
        lastProcessedCmdTimeRef.current = Math.max(lastProcessedCmdTimeRef.current, data.state.playbackCommand.timestamp);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Local Stop
  const handleStop = async () => {
    lastProcessedCmdTimeRef.current = Date.now();
    try {
      if (isPlayerReadyRef.current && playerRef.current) {
        playerRef.current.stopVideo();
      }
      setMusicState((prev) => ({ ...prev, isPlaying: false }));
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', companyId }),
      });
      const data = await res.json();
      if (data.success && data.state?.playbackCommand?.timestamp) {
        lastProcessedCmdTimeRef.current = Math.max(lastProcessedCmdTimeRef.current, data.state.playbackCommand.timestamp);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Local Next
  const handleNext = async () => {
    lastProcessedCmdTimeRef.current = Date.now();
    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'next', companyId }),
      });
      const data = await res.json();
      if (data.success && data.state) {
        if (data.state.playbackCommand?.timestamp) {
          lastProcessedCmdTimeRef.current = Math.max(lastProcessedCmdTimeRef.current, data.state.playbackCommand.timestamp);
        }
        setMusicState(data.state);
        if (data.state.currentTrack) {
          safePlayTrack(data.state.currentTrack.videoId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Local Prev
  const handlePrev = async () => {
    lastProcessedCmdTimeRef.current = Date.now();
    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prev', companyId }),
      });
      const data = await res.json();
      if (data.success && data.state) {
        if (data.state.playbackCommand?.timestamp) {
          lastProcessedCmdTimeRef.current = Math.max(lastProcessedCmdTimeRef.current, data.state.playbackCommand.timestamp);
        }
        setMusicState(data.state);
        if (data.state.currentTrack) {
          safePlayTrack(data.state.currentTrack.videoId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Select track from playlist
  const handleSelectTrack = async (track: MusicTrack, index: number) => {
    try {
      safePlayTrack(track.videoId);
      lastProcessedCmdTimeRef.current = Date.now();

      setMusicState((prev) => ({
        ...prev,
        currentTrack: track,
        currentIndex: index,
        isPlaying: true,
      }));

      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'play', companyId, videoId: track.videoId }),
      });
      const data = await res.json();
      if (data.success && data.state?.playbackCommand?.timestamp) {
        lastProcessedCmdTimeRef.current = Math.max(lastProcessedCmdTimeRef.current, data.state.playbackCommand.timestamp);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Remove track
  const handleRemoveTrack = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_track', companyId, trackId }),
      });
      const data = await res.json();
      if (data.success && data.state) {
        setMusicState(data.state);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Clear playlist
  const handleClearPlaylist = async () => {
    if (!confirm('Clear all tracks from the office playlist?')) return;
    try {
      if (isPlayerReadyRef.current && playerRef.current) {
        playerRef.current.stopVideo();
      }
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_playlist', companyId }),
      });
      const data = await res.json();
      if (data.success && data.state) {
        setMusicState(data.state);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Volume Change
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (isPlayerReadyRef.current && playerRef.current) {
      playerRef.current.setVolume(newVol);
    }
    fetch('/api/music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_volume', companyId, volume: newVol }),
    }).catch(() => {});
  };

  // Search YouTube Music
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setActiveTab('search');

    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: searchQuery.trim(), companyId }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setSearchResults(data.results);
      }
    } catch (err) {
      console.error('[Search Error]:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Quick preset genre search & station launcher
  const handleQuickPreset = async (genreQuery: string, stationTitle: string) => {
    setActivePreset(stationTitle);
    setIsSearching(true);
    setNoticeMessage(`📻 Connecting to Station "${stationTitle}"...`);
    lastProcessedCmdTimeRef.current = Date.now();

    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_playlist',
          query: genreQuery,
          companyId,
          requestedBy: `Station ${stationTitle}`,
          broadcastToChat: true,
          replaceExisting: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.state) {
        if (data.state.playbackCommand?.timestamp) {
          lastProcessedCmdTimeRef.current = Math.max(lastProcessedCmdTimeRef.current, data.state.playbackCommand.timestamp);
        }
        setMusicState(data.state);
        setActiveTab('playlist');
        setNoticeMessage(`📻 Station ${stationTitle} active (${data.tracks?.length || 5} tracks loaded)`);
        if (data.state.currentTrack) {
          safePlayTrack(data.state.currentTrack.videoId);
        }
      } else if (data.error) {
        setNoticeMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      console.error('[Preset Error]:', err);
      setNoticeMessage('❌ Failed to load music station');
    } finally {
      setIsSearching(false);
      setTimeout(() => setNoticeMessage(null), 5000);
    }
  };

  // Add search result track to playlist
  const handleAddSearchResult = async (track: MusicTrack, playNow: boolean = false) => {
    try {
      if (playNow) {
        setNoticeMessage(`🎶 Playing: "${track.title}"`);
        safePlayTrack(track.videoId);
      } else {
        setNoticeMessage(`✅ Added to queue: "${track.title}"`);
      }
      setTimeout(() => setNoticeMessage(null), 4000);

      // Lock current timestamp so background polling doesn't restart playback
      lastProcessedCmdTimeRef.current = Date.now();

      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: playNow ? 'play_single' : 'add_track',
          track,
          companyId,
          requestedBy: 'Web Dashboard',
        }),
      });
      const data = await res.json();
      if (data.success && data.state) {
        if (data.state.playbackCommand?.timestamp) {
          lastProcessedCmdTimeRef.current = Math.max(lastProcessedCmdTimeRef.current, data.state.playbackCommand.timestamp);
        }
        setMusicState(data.state);
        setActiveTab('playlist');
      }
    } catch (err) {
      console.error(err);
      setNoticeMessage('❌ Failed to add track to queue');
      setTimeout(() => setNoticeMessage(null), 4000);
    }
  };

  const currentTrack = musicState.currentTrack;

  return (
    <>
      {/* 0. PERSISTENT YOUTUBE IFRAME (SELEKSI AKTIF DI VIEWPORT AGAR BROWSER TIDAK MEMBEKUKAN AUDIO) */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          showVideo && isOpen
            ? 'fixed top-[138px] right-2 sm:right-4 w-[386px] max-w-[calc(100vw-1.25rem)] h-36 sm:h-40 z-[55] bg-black border-b border-slate-800 rounded-none'
            : 'fixed bottom-2 right-2 w-[240px] h-[135px] opacity-[0.01] pointer-events-none z-[-1] bg-black'
        }`}
      >
        <div id={iframeContainerId} className="w-full h-full pointer-events-auto" />
      </div>

      {/* 0.1 BROWSER AUTOPLAY UNLOCK BANNER */}
      {needUserGesture && (
        <div
          onClick={unlockAudioGesture}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white font-bold text-xs shadow-2xl border-2 border-amber-300 flex items-center gap-3 cursor-pointer animate-bounce hover:scale-105 transition-transform"
        >
          <Volume2 className="w-5 h-5 text-amber-200 animate-pulse flex-shrink-0" />
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-white text-[13px]">
              🎵 Telegram track ready to play!
            </span>
            <span className="text-amber-100 text-[11px] font-normal">
              Browser policy restricts automatic audio: Click here to unmute.
            </span>
          </div>
        </div>
      )}

      {/* 1. FLOATING MINIMIZED MUSIC BUTTON (RIGHT SIDE OF SCREEN) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-4 bottom-24 z-40 group flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#181824]/95 via-[#1e293b]/95 to-[#0f172a]/95 text-white border-2 border-cyan-500/40 shadow-xl shadow-cyan-950/40 hover:border-cyan-400 hover:scale-105 active:scale-95 transition-all duration-200 backdrop-blur-md"
          title="Open Office SoundSystem (Winamp Player & Playlist)"
        >
          {/* Animated Equalizer Wave when playing */}
          <div className="flex items-end gap-0.5 h-4 w-4 justify-center">
            <span
              className={`w-1 bg-cyan-400 rounded-full transition-all duration-150 ${
                musicState.isPlaying ? 'h-4 animate-bounce' : 'h-1.5'
              }`}
            />
            <span
              className={`w-1 bg-emerald-400 rounded-full transition-all duration-200 ${
                musicState.isPlaying ? 'h-3 animate-pulse' : 'h-2'
              }`}
            />
            <span
              className={`w-1 bg-fuchsia-400 rounded-full transition-all duration-150 ${
                musicState.isPlaying ? 'h-4 animate-bounce delay-75' : 'h-1'
              }`}
            />
          </div>

          <div className="flex flex-col text-left max-w-[140px] sm:max-w-[180px]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1">
              <span>Winamp Audio</span>
              {musicState.isPlaying && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </span>
            <span className="text-xs font-semibold text-slate-200 truncate">
              {currentTrack ? `${currentTrack.title} - ${currentTrack.artist}` : 'Play Office Music'}
            </span>
          </div>

          <div
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-400/30 transition-colors ml-1"
            title={musicState.isPlaying ? 'Pause Music' : 'Play Music'}
          >
            {musicState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </div>
        </button>
      )}

      {/* 2. WINAMP FLOATING DRAWER / WINDOW (RIGHT SIDE) */}
      <div
        ref={containerRef}
        className={`fixed top-12 sm:top-14 right-2 sm:right-4 z-50 transition-all duration-300 ease-out origin-top-right flex flex-col max-h-[calc(100vh-3.5rem)] ${
          isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'
        }`}
        style={{
          width: '390px',
          maxWidth: 'calc(100vw - 1rem)',
        }}
      >
        <div className="bg-[#131722] border-2 border-[#38bdf8]/40 rounded-2xl shadow-2xl shadow-black/80 flex flex-col max-h-[calc(100vh-3.5rem)] overflow-hidden text-slate-100 font-sans backdrop-blur-xl">
          {/* WINAMP RETRO TOP BAR */}
          <div className="px-3 py-2 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] border-b border-slate-700/60 flex items-center justify-between select-none flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black text-[10px] shadow-sm">
                ⚡
              </div>
              <span className="font-mono text-xs font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300">
                WINAMP // OFFICE AUDIO
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-mono">
                YT-MUSIC
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowVideo(!showVideo)}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  showVideo
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title={showVideo ? 'Hide Video' : 'Show YouTube Video'}
              >
                <Tv className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-slate-700/80 transition-colors"
                title="Minimize to Floating Button"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/30 hover:text-rose-400 text-slate-400 border border-slate-700/80 transition-colors"
                title="Close Drawer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* REAL-TIME NOTICE / TOAST BANNER */}
          {noticeMessage && (
            <div className="px-3 py-1.5 bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border-b border-cyan-500/40 text-cyan-200 text-[10px] font-mono flex items-center justify-between flex-shrink-0 animate-fadeIn">
              <span className="truncate flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400 flex-shrink-0 animate-spin" />
                <span className="truncate">{noticeMessage}</span>
              </span>
              <button onClick={() => setNoticeMessage(null)} className="text-slate-400 hover:text-white ml-2 text-xs">
                ✕
              </button>
            </div>
          )}

          {/* MAIN RETRO LCD DISPLAY SCREEN */}
          <div className="p-2.5 bg-gradient-to-b from-[#090d16] to-[#0c121f] border-b border-slate-800 flex-shrink-0">
            <div className="p-2 rounded-xl bg-[#050811] border border-cyan-500/30 shadow-inner flex flex-col gap-1.5">
              {/* LCD Top Status Line */}
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400/80">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      musicState.isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span className="font-bold tracking-wider">
                    {musicState.isPlaying ? 'PLAYING' : 'PAUSED'}
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">192 KBPS STEREO</span>
                </div>
                <div className="text-[10px] text-cyan-300 font-bold">
                  {currentTrack ? currentTrack.durationText : '0:00'}
                </div>
              </div>

              {/* Scrolling Track Title Marquee */}
              <div className="overflow-hidden bg-[#03060c] py-1 px-2 rounded-lg border border-cyan-900/50">
                <div className="whitespace-nowrap flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-cyan-300 tracking-wide">
                    {currentTrack
                      ? `♫ ${currentTrack.title} — ${currentTrack.artist}`
                      : '♫ No track playing — Search tracks or select a radio station below'}
                  </span>
                </div>
              </div>

              {/* Retro Audio Spectrum Visualizer */}
              <div className="flex items-end justify-between h-5 px-1 gap-1">
                {Array.from({ length: 24 }).map((_, i) => {
                  const heights = [
                    'h-1',
                    'h-2.5',
                    'h-4',
                    'h-1.5',
                    'h-5',
                    'h-3',
                    'h-5',
                    'h-2.5',
                    'h-4',
                    'h-2',
                    'h-4.5',
                    'h-3',
                  ];
                  const randomHeight = heights[(i + (musicState.isPlaying ? 3 : 0)) % heights.length];
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-xs transition-all duration-100 ${
                        musicState.isPlaying
                          ? `${randomHeight} ${
                              i % 3 === 0
                                ? 'bg-cyan-400'
                                : i % 3 === 1
                                ? 'bg-emerald-400'
                                : 'bg-fuchsia-400'
                            }`
                          : 'h-1 bg-slate-800'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* YOUTUBE VIDEO VISUAL SLOT PLACEHOLDER WHEN SHOWVIDEO IS ACTIVE */}
          {showVideo && (
            <div className="h-36 sm:h-40 border-b border-slate-800 relative w-full flex-shrink-0 bg-black flex items-center justify-center text-xs text-slate-500 font-mono select-none">
              <span className="text-[11px] text-cyan-400/80 animate-pulse flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5" />
                <span>Winamp Video Screen Active</span>
              </span>
            </div>
          )}

          {/* WINAMP HARDWARE CONTROL DECK */}
          <div className="p-2.5 bg-[#111726] border-b border-slate-800 flex flex-col gap-2 flex-shrink-0">
            {/* Playback Button Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrev}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 active:scale-95 transition-all"
                  title="Previous Track"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={togglePlayPause}
                  className={`p-2 sm:p-2.5 rounded-xl font-bold flex items-center justify-center active:scale-95 transition-all shadow-md ${
                    musicState.isPlaying
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-900/30'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-900/40'
                  }`}
                  title={musicState.isPlaying ? 'Pause' : 'Play'}
                >
                  {musicState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  onClick={handleStop}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 active:scale-95 transition-all"
                  title="Stop Music"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 active:scale-95 transition-all"
                  title="Next Track"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Volume Slider & Mute Toggle */}
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/70 py-1 px-2 rounded-xl border border-slate-800">
                <button
                  onClick={() => handleVolumeChange(isMuted ? 70 : 0)}
                  className="text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-14 sm:w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-[10px] font-mono text-slate-400 w-5 text-right">
                  {isMuted ? 0 : volume}%
                </span>
              </div>
            </div>

            {/* Quick Station Presets */}
            <div className="flex flex-col gap-1 border-t border-slate-800/80 pt-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-cyan-400 font-mono font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3 text-cyan-400" />
                  <span>Music Stations (Presets)</span>
                </span>
                <span className="text-[9px] text-slate-500">Select to stream preset</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px] font-medium scrollbar-none">
                <button
                  onClick={() => handleQuickPreset('lofi chill beats', 'Lofi Chill')}
                  className={`px-2 py-0.5 rounded-lg border whitespace-nowrap transition-colors ${
                    activePreset === 'Lofi Chill'
                      ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 font-bold shadow-sm shadow-cyan-900/50'
                      : 'bg-slate-800/80 hover:bg-cyan-500/20 text-cyan-300 border-slate-700 hover:border-cyan-500/50'
                  }`}
                  title="Lofi Chill station for focus & deep work"
                >
                  ☕ Lofi Chill
                </button>
                <button
                  onClick={() => handleQuickPreset('synthwave retro chill', 'Synthwave')}
                  className={`px-2 py-0.5 rounded-lg border whitespace-nowrap transition-colors ${
                    activePreset === 'Synthwave'
                      ? 'bg-fuchsia-500/30 text-fuchsia-200 border-fuchsia-400 font-bold shadow-sm shadow-fuchsia-900/50'
                      : 'bg-slate-800/80 hover:bg-fuchsia-500/20 text-fuchsia-300 border-slate-700 hover:border-fuchsia-500/50'
                  }`}
                  title="High-energy retro Synthwave station"
                >
                  🌆 Synthwave
                </button>
                <button
                  onClick={() => handleQuickPreset('j-pop anime acoustic', 'J-Pop Anime')}
                  className={`px-2 py-0.5 rounded-lg border whitespace-nowrap transition-colors ${
                    activePreset === 'J-Pop Anime'
                      ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 font-bold shadow-sm shadow-emerald-900/50'
                      : 'bg-slate-800/80 hover:bg-emerald-500/20 text-emerald-300 border-slate-700 hover:border-emerald-500/50'
                  }`}
                  title="J-Pop & Anime Acoustic station"
                >
                  ✨ J-Pop Anime
                </button>
                <button
                  onClick={() => handleQuickPreset('classic rock legends', 'Classic Rock')}
                  className={`px-2 py-0.5 rounded-lg border whitespace-nowrap transition-colors ${
                    activePreset === 'Classic Rock'
                      ? 'bg-amber-500/30 text-amber-200 border-amber-400 font-bold shadow-sm shadow-amber-900/50'
                      : 'bg-slate-800/80 hover:bg-amber-500/20 text-amber-300 border-slate-700 hover:border-amber-500/50'
                  }`}
                  title="Legendary Classic Rock station"
                >
                  🎸 Classic Rock
                </button>
                <button
                  onClick={() => handleQuickPreset('cafe acoustic guitar chill', 'Acoustic Cafe')}
                  className={`px-2 py-0.5 rounded-lg border whitespace-nowrap transition-colors ${
                    activePreset === 'Acoustic Cafe'
                      ? 'bg-sky-500/30 text-sky-200 border-sky-400 font-bold shadow-sm shadow-sky-900/50'
                      : 'bg-slate-800/80 hover:bg-sky-500/20 text-sky-300 border-slate-700 hover:border-sky-500/50'
                  }`}
                  title="Relaxing Acoustic Cafe station"
                >
                  🌿 Acoustic Cafe
                </button>
              </div>
            </div>
          </div>

          {/* SEARCH & PLAYLIST TABS */}
          <div className="flex items-center border-b border-slate-800 bg-[#0d121e] flex-shrink-0">
            <button
              onClick={() => setActiveTab('playlist')}
              className={`flex-1 py-1.5 sm:py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'playlist'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Playlist ({musicState.playlist.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-1.5 sm:py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'search'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search YouTube Music</span>
            </button>
          </div>

          {/* TAB CONTENT (ADAPTIVE FLEX HEIGHT WITH SCROLL) */}
          <div className="flex-1 min-h-[110px] max-h-[30vh] sm:max-h-[35vh] overflow-y-auto p-2.5 flex flex-col gap-2 font-mono text-xs">
            {/* TAB 1: PLAYLIST QUEUE */}
            {activeTab === 'playlist' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pb-1">
                  <span>Office Music Queue:</span>
                  {musicState.playlist.length > 0 && (
                    <button
                      onClick={handleClearPlaylist}
                      className="text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {musicState.playlist.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs italic">
                    Playlist is empty. Search songs in &ldquo;Search&rdquo; tab or type <code className="text-cyan-400">/play</code> in office chat / Telegram!
                  </div>
                ) : (
                  musicState.playlist.map((track, idx) => {
                    const isCurrent = idx === musicState.currentIndex;
                    return (
                      <div
                        key={track.id || track.videoId || idx}
                        onClick={() => handleSelectTrack(track, idx)}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                          isCurrent
                            ? 'bg-gradient-to-r from-cyan-950/70 to-slate-900 border-cyan-400/60 shadow-sm shadow-cyan-900/30'
                            : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span
                            className={`w-5 text-center text-[10px] font-bold ${
                              isCurrent ? 'text-cyan-400' : 'text-slate-500'
                            }`}
                          >
                            {isCurrent && musicState.isPlaying ? '▶' : `${idx + 1}.`}
                          </span>

                          <div className="flex flex-col truncate">
                            <span
                              className={`font-semibold truncate text-xs ${
                                isCurrent ? 'text-cyan-200 font-bold' : 'text-slate-300'
                              }`}
                            >
                              {track.title}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              {track.artist}
                              {track.addedBy && (
                                <span className="text-slate-500 ml-1.5">• Req: {track.addedBy}</span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {track.durationText || '3:00'}
                          </span>
                          <button
                            onClick={(e) => handleRemoveTrack(track.id, e)}
                            className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove from Playlist"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: SEARCH YOUTUBE MUSIC (YTMUSIC-API) */}
            {activeTab === 'search' && (
              <div className="flex flex-col gap-2">
                <form onSubmit={handleSearch} className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Type song title / artist..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Search</span>
                  </button>
                </form>

                {/* Search Results List */}
                <div className="flex flex-col gap-1.5 mt-1">
                  {searchResults.map((track) => (
                    <div
                      key={track.videoId}
                      className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-2 transition-all"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {track.thumbnailUrl ? (
                          <img
                            src={track.thumbnailUrl}
                            alt=""
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                            🎵
                          </div>
                        )}
                        <div className="flex flex-col truncate">
                          <span className="font-semibold text-xs text-slate-200 truncate">
                            {track.title}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
                            {track.artist} ({track.durationText})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleAddSearchResult(track, true)}
                          className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 text-[10px] font-bold flex items-center gap-1 transition-colors"
                          title="Play Now"
                        >
                          <Play className="w-2.5 h-2.5" />
                          <span>Play</span>
                        </button>
                        <button
                          onClick={() => handleAddSearchResult(track, false)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] transition-colors"
                          title="Add to Queue"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {searchResults.length === 0 && !isSearching && (
                    <div className="text-center py-6 text-slate-500 text-xs italic">
                      Use the search box above to discover millions of tracks from YouTube Music.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RETRO FOOTER // REMOTE CONTROLLER BADGE */}
          <div className="p-2.5 bg-[#090d16] border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Remote Sync Active</span>
            </div>
            <span className="text-slate-500">
              Chat War Room & Telegram: <code className="text-slate-300">/play</code>, <code className="text-slate-300">/next</code>
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
