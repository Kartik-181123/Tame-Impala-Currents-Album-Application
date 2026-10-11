import React, { useEffect, useState, useRef } from 'react';
import type { Song, LyricLine, RepeatMode } from './types/music';
import { parseLyrics } from './utils/lyricParser';
import { AmbientBackground } from './components/AmbientBackground';
import { PlayerBar } from './components/PlayerBar';
import { Tracklist } from './components/Tracklist';
import { LyricsView } from './components/LyricsView';

// Default Tame Impala Currents tracks in album order
const CURRENTS_ALBUM_ORDER = [
  'Let It Happen',
  'Nangs',
  'The Moment',
  "Yes I'm Changing",
  'Eventually',
  'Gossip',
  'The Less I Know The Better',
  'Past Life',
  'Disciples',
  "'Cause I'm A Man",
  'Reality In Motion',
  'Love/Paranoia',
  'New Person, Same Old Mistakes',
];

export const App: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [showLyrics, setShowLyrics] = useState<boolean>(false);
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Keep state refs for event listeners
  const repeatModeRef = useRef(repeatMode);
  const isShuffleRef = useRef(isShuffle);
  const currentSongIndexRef = useRef(currentSongIndex);
  const songsRef = useRef(songs);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  useEffect(() => {
    currentSongIndexRef.current = currentSongIndex;
  }, [currentSongIndex]);

  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  // Current song reference
  const currentSong = songs[currentSongIndex] || null;

  // Next Track logic
  const playNextTrack = () => {
    const songList = songsRef.current;
    if (songList.length === 0) return;

    if (repeatModeRef.current === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
      return;
    }

    if (isShuffleRef.current) {
      let nextIdx = Math.floor(Math.random() * songList.length);
      if (songList.length > 1 && nextIdx === currentSongIndexRef.current) {
        nextIdx = (nextIdx + 1) % songList.length;
      }
      setCurrentSongIndex(nextIdx);
    } else {
      const nextIndex = (currentSongIndexRef.current + 1) % songList.length;
      setCurrentSongIndex(nextIndex);
    }

    setIsPlaying(true);
  };

  // Prev Track logic
  const playPrevTrack = () => {
    const songList = songsRef.current;
    if (!audioRef.current || songList.length === 0) return;

    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const prevIndex = (currentSongIndexRef.current - 1 + songList.length) % songList.length;
    setCurrentSongIndex(prevIndex);
    setIsPlaying(true);
  };

  // Track end handler
  const handleTrackEnded = () => {
    const songList = songsRef.current;
    if (repeatModeRef.current === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }
    } else if (repeatModeRef.current === 'all' || currentSongIndexRef.current < songList.length - 1) {
      playNextTrack();
    } else {
      setIsPlaying(false);
    }
  };

  // 60FPS High-Precision Audio Clock for Apple Music fluid lyric animation
  useEffect(() => {
    let active = true;

    const updateSmoothTime = () => {
      if (audioRef.current && !audioRef.current.paused) {
        setCurrentTime(audioRef.current.currentTime);
      }
      if (active) {
        animFrameRef.current = requestAnimationFrame(updateSmoothTime);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateSmoothTime);

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Initialize Audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onDurationChange = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      handleTrackEnded();
    };

    const onError = (e: any) => {
      console.error('Audio playback error:', e);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    // Initial folder scan
    scanMediaDirectory();

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Whenever current song changes, update audio src and lyrics
  useEffect(() => {
    if (!currentSong) return;

    let isMounted = true;

    async function loadAudioSrc() {
      if (!audioRef.current || !currentSong) return;
      const windowObj = window as any;
      let mediaUrl = currentSong.filePath;

      if (windowObj.electronAPI?.getStreamUrl) {
        mediaUrl = await windowObj.electronAPI.getStreamUrl(currentSong.filePath);
      }

      if (!isMounted || !audioRef.current) return;

      audioRef.current.src = mediaUrl;
      audioRef.current.load();

      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => console.log('Autoplay request:', e));
        }
      }
    }

    loadAudioSrc();

    // Parse lyrics
    const parsed = parseLyrics(currentSong.lyricsText, duration || 300);
    setParsedLyrics(parsed);

    return () => {
      isMounted = false;
    };
  }, [currentSong]);

  // Folder scanning
  const scanMediaDirectory = async (customPath?: string) => {
    const windowObj = window as any;
    if (windowObj.electronAPI?.scanDirectory) {
      const res = await windowObj.electronAPI.scanDirectory(customPath);
      if (res && res.songs && res.songs.length > 0) {
        // Sort songs according to canonical album order
        const sorted = [...res.songs].sort((a: Song, b: Song) => {
          const idxA = CURRENTS_ALBUM_ORDER.findIndex((title) =>
            a.title.toLowerCase().includes(title.toLowerCase().replace("'", ''))
          );
          const idxB = CURRENTS_ALBUM_ORDER.findIndex((title) =>
            b.title.toLowerCase().includes(title.toLowerCase().replace("'", ''))
          );
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.title.localeCompare(b.title);
        });

        setSongs(sorted);
        setCurrentSongIndex(0);
      }
    }
  };

  const handleSelectFolder = async () => {
    const windowObj = window as any;
    if (windowObj.electronAPI?.openDirectoryDialog) {
      const selected = await windowObj.electronAPI.openDirectoryDialog();
      if (selected) {
        scanMediaDirectory(selected);
      }
    }
  };

  // Play / Pause
  const handlePlayPause = () => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.error('Play failed:', err);
            setIsPlaying(false);
          });
      }
    }
  };

  // Seek
  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Cycle repeat modes: off -> all -> one
  const handleCycleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  // Save synced lyrics handler
  const handleSaveSyncedLyrics = async (newContent: string) => {
    if (!currentSong) return;
    const windowObj = window as any;
    const targetPath =
      currentSong.lyricPath ||
      currentSong.filePath.replace(/\.[^/.]+$/, '') + '.txt';

    if (windowObj.electronAPI?.saveLyrics) {
      await windowObj.electronAPI.saveLyrics(targetPath, newContent);
      setSongs((prev) =>
        prev.map((s) =>
          s.id === currentSong.id
            ? { ...s, lyricPath: targetPath, lyricsText: newContent }
            : s
        )
      );
      setParsedLyrics(parseLyrics(newContent, duration));
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#07070a] text-white font-sans antialiased">
      {/* Background Ambience */}
      <AmbientBackground isPlaying={isPlaying} />

      {/* Main Content Area: Tracklist or Lyrics View */}
      <div className="flex-1 relative flex overflow-hidden">
        {showLyrics ? (
          <LyricsView
            lines={parsedLyrics}
            currentTime={currentTime}
            duration={duration}
            songTitle={currentSong ? currentSong.title : 'Currents'}
            onSeek={handleSeek}
            onCloseLyrics={() => setShowLyrics(false)}
            onSaveSyncedLyrics={handleSaveSyncedLyrics}
          />
        ) : (
          <Tracklist
            songs={songs}
            currentSong={currentSong}
            isPlaying={isPlaying}
            isShuffle={isShuffle}
            repeatMode={repeatMode}
            onSelectSong={(song) => {
              const idx = songs.findIndex((s) => s.id === song.id);
              if (idx !== -1) {
                setCurrentSongIndex(idx);
                setIsPlaying(true);
              }
            }}
            onPlayPause={handlePlayPause}
            onToggleShuffle={() => setIsShuffle(!isShuffle)}
            onCycleRepeat={handleCycleRepeat}
          />
        )}
      </div>

      {/* Spotify-Style Playback Control Bar */}
      <PlayerBar
        currentSong={currentSong}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        showLyrics={showLyrics}
        onPlayPause={handlePlayPause}
        onNext={playNextTrack}
        onPrev={playPrevTrack}
        onSeek={handleSeek}
        onVolumeChange={(val) => {
          setVolume(val);
          if (isMuted) setIsMuted(false);
        }}
        onToggleMute={() => setIsMuted(!isMuted)}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        onCycleRepeat={handleCycleRepeat}
        onToggleLyrics={() => setShowLyrics(!showLyrics)}
        onSelectFolder={handleSelectFolder}
      />
    </div>
  );
};

export default App;
