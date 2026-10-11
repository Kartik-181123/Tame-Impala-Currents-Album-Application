import React, { useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Mic2,
  FolderOpen,
} from 'lucide-react';
import type { Song, RepeatMode } from '../types/music';
import currentsCover from '../assets/currents-cover.jpg';

interface PlayerBarProps {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  showLyrics: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleLyrics: () => void;
  onSelectFolder: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  showLyrics,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onToggleLyrics,
  onSelectFolder,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer className="h-24 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-purple-900/30 px-6 flex items-center justify-between select-none relative z-40 transition-colors shadow-2xl">
      {/* Left: Track Information */}
      <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
        <div className="relative group w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-lg border border-purple-500/20">
          <img
            src={currentsCover}
            alt="Currents Album Art"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-lg pointer-events-none" />
        </div>

        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-white text-sm font-semibold truncate hover:underline cursor-pointer">
            {currentSong ? currentSong.title : 'No track selected'}
          </span>
          <span className="text-zinc-400 text-xs font-medium truncate hover:text-zinc-200 cursor-pointer">
            Tame Impala
          </span>
          {currentSong?.lyricPath && (
            <span className="text-[10px] text-fuchsia-400/80 font-mono flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
              Synced Lyrics
            </span>
          )}
        </div>
      </div>

      {/* Center: Controls & Interactive Seek Bar */}
      <div className="flex flex-col items-center gap-2 max-w-xl w-2/4">
        {/* Buttons Bar */}
        <div className="flex items-center gap-6">
          {/* Shuffle Button */}
          <button
            onClick={onToggleShuffle}
            title={isShuffle ? 'Disable Shuffle' : 'Enable Shuffle'}
            className={`p-1.5 rounded-full transition-all duration-200 ${
              isShuffle
                ? 'text-fuchsia-400 hover:text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.6)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous Track */}
          <button
            onClick={onPrev}
            title="Previous Track"
            className="text-zinc-300 hover:text-white transition transform active:scale-95"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={onPlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-fuchsia-600 to-purple-500 hover:from-fuchsia-500 hover:to-purple-400 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 transform hover:scale-105 active:scale-95 transition-all duration-200"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={onNext}
            title="Next Track"
            className="text-zinc-300 hover:text-white transition transform active:scale-95"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Repeat Mode */}
          <button
            onClick={onCycleRepeat}
            title={
              repeatMode === 'off'
                ? 'Repeat Off'
                : repeatMode === 'all'
                ? 'Repeat All'
                : 'Repeat One'
            }
            className={`p-1.5 rounded-full transition-all duration-200 relative ${
              repeatMode !== 'off'
                ? 'text-fuchsia-400 hover:text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.6)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Seek Bar */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[11px] font-mono text-zinc-400 w-10 text-right select-none">
            {formatTime(currentTime)}
          </span>

          <div
            ref={progressBarRef}
            onClick={handleProgressBarClick}
            className="group relative flex-1 h-1.5 bg-zinc-800 rounded-full cursor-pointer overflow-hidden py-1"
          >
            <div className="absolute inset-0 bg-zinc-800 rounded-full" />
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400 rounded-full group-hover:brightness-125 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Scrubber Knob indicator on hover */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -ml-1.5"
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          <span className="text-[11px] font-mono text-zinc-400 w-10 text-left select-none">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Lyrics Toggle, Volume, Settings */}
      <div className="flex items-center justify-end gap-4 w-1/4 min-w-[200px]">
        {/* Toggle Apple Music Lyrics View */}
        <button
          onClick={onToggleLyrics}
          title={showLyrics ? 'Close Lyrics' : 'Open Apple Music Synced Lyrics'}
          className={`p-2 rounded-xl transition-all duration-300 flex items-center gap-1.5 ${
            showLyrics
              ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40 shadow-lg shadow-fuchsia-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Mic2 className="w-4 h-4" />
          <span className="text-xs font-medium">Lyrics</span>
        </button>

        {/* Change Folder */}
        <button
          onClick={onSelectFolder}
          title="Select Local Songs & Lyrics Folder"
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition"
        >
          <FolderOpen className="w-4 h-4" />
        </button>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="text-zinc-400 hover:text-white transition"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 focus:outline-none"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>
      </div>
    </footer>
  );
};
