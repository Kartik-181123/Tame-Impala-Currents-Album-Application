import React from 'react';
import type { Song, RepeatMode } from '../types/music';
import { Play, Pause, Shuffle, Repeat, Repeat1, Clock, Music } from 'lucide-react';
import currentsCover from '../assets/currents-cover.jpg';

interface TracklistProps {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  onSelectSong: (song: Song) => void;
  onPlayPause: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
}

export const Tracklist: React.FC<TracklistProps> = ({
  songs,
  currentSong,
  isPlaying,
  isShuffle,
  repeatMode,
  onSelectSong,
  onPlayPause,
  onToggleShuffle,
  onCycleRepeat,
}) => {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 select-none">
      {/* Currents Album Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end gap-8 pb-8 border-b border-purple-900/20">
        {/* Album Cover Art */}
        <div className="relative group w-52 h-52 md:w-60 md:h-60 rounded-xl overflow-hidden shadow-2xl shadow-purple-950/60 border border-purple-500/20 flex-shrink-0">
          <img
            src={currentsCover}
            alt="Tame Impala - Currents"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Album Meta */}
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-fuchsia-400 font-mono font-semibold">
            Album
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-md">
            Currents
          </h1>
          <div className="flex items-center gap-2 text-sm text-zinc-300 font-medium">
            <span className="text-white font-semibold hover:underline cursor-pointer">
              Tame Impala
            </span>
            <span>•</span>
            <span>2015</span>
            <span>•</span>
            <span className="text-zinc-400 font-mono">{songs.length} songs</span>
          </div>

          <p className="text-xs text-zinc-400 max-w-lg mt-1 leading-relaxed">
            Kevin Parker's psychedelic synth-pop masterpiece exploring transformation, romance, and fluid transition.
          </p>
        </div>
      </div>

      {/* Action Header: Large Play Button + Shuffle + Repeat */}
      <div className="flex items-center gap-6 py-6">
        <button
          onClick={onPlayPause}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-[#10b981] via-[#06b6d4] to-[#a855f7] hover:brightness-110 text-white flex items-center justify-center shadow-xl shadow-cyan-500/20 transform hover:scale-105 active:scale-95 transition-all"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-current text-white" />
          ) : (
            <Play className="w-6 h-6 fill-current text-white ml-1" />
          )}
        </button>

        <button
          onClick={onToggleShuffle}
          className={`p-3 rounded-full hover:bg-white/5 transition ${
            isShuffle ? 'text-fuchsia-400' : 'text-zinc-400 hover:text-white'
          }`}
          title="Shuffle Album"
        >
          <Shuffle className="w-5 h-5" />
        </button>

        <button
          onClick={onCycleRepeat}
          className={`p-3 rounded-full hover:bg-white/5 transition ${
            repeatMode !== 'off' ? 'text-fuchsia-400' : 'text-zinc-400 hover:text-white'
          }`}
          title="Repeat"
        >
          {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
        </button>
      </div>

      {/* Tracks Table Header */}
      <div className="grid grid-cols-12 text-xs font-mono uppercase text-zinc-400 px-4 py-2 border-b border-white/5">
        <div className="col-span-1">#</div>
        <div className="col-span-8">Title</div>
        <div className="col-span-2 text-center">Lyrics</div>
        <div className="col-span-1 text-right flex justify-end">
          <Clock className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Track List Items */}
      <div className="divide-y divide-white/5 pt-1">
        {songs.map((song, index) => {
          const isSelected = currentSong?.id === song.id;

          return (
            <div
              key={song.id}
              onClick={() => onSelectSong(song)}
              className={`group grid grid-cols-12 items-center px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-purple-900/30 text-fuchsia-300'
                  : 'hover:bg-white/5 text-zinc-300'
              }`}
            >
              {/* Index or Sound Playing Wave */}
              <div className="col-span-1 text-sm font-mono flex items-center">
                {isSelected && isPlaying ? (
                  <div className="flex items-center gap-0.5 h-3.5">
                    <span className="w-1 bg-fuchsia-400 h-full animate-[bounce_0.8s_infinite]" />
                    <span className="w-1 bg-purple-400 h-2/3 animate-[bounce_0.6s_infinite]" />
                    <span className="w-1 bg-cyan-400 h-full animate-[bounce_1s_infinite]" />
                  </div>
                ) : (
                  <span className="group-hover:hidden text-zinc-400">{index + 1}</span>
                )}
                <Play className="w-3.5 h-3.5 fill-current hidden group-hover:block text-white" />
              </div>

              {/* Title & Artist */}
              <div className="col-span-8 flex flex-col min-w-0 pr-4">
                <span
                  className={`text-sm font-semibold truncate ${
                    isSelected ? 'text-fuchsia-300' : 'text-white'
                  }`}
                >
                  {song.title}
                </span>
                <span className="text-xs text-zinc-400 truncate">Tame Impala</span>
              </div>

              {/* Lyrics Availability Badge */}
              <div className="col-span-2 flex justify-center">
                {song.lyricPath ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Synced
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-600 font-mono">None</span>
                )}
              </div>

              {/* Action / Fallback Track Icon */}
              <div className="col-span-1 text-right text-xs font-mono text-zinc-400">
                <Music className="w-3.5 h-3.5 inline text-zinc-500 group-hover:text-fuchsia-400 transition" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
