import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { LyricLine } from '../types/music';
import { Edit3, Save, X, Sparkles } from 'lucide-react';

interface LyricsViewProps {
  lines: LyricLine[];
  currentTime: number;
  duration: number;
  songTitle: string;
  onSeek: (time: number) => void;
  onCloseLyrics: () => void;
  onSaveSyncedLyrics?: (newContent: string) => void;
}

export const LyricsView: React.FC<LyricsViewProps> = ({
  lines,
  currentTime,
  songTitle,
  onSeek,
  onCloseLyrics,
  onSaveSyncedLyrics,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Tap-to-sync state
  const [isTapMode, setIsTapMode] = useState(false);
  const [tapIndex, setTapIndex] = useState(0);
  const [stampedLines, setStampedLines] = useState<{ text: string; time: number }[]>([]);

  // Find active line index
  const activeIndex = useMemo(() => {
    let index = -1;
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].start && currentTime <= lines[i].end) {
        return i;
      } else if (
        currentTime > lines[i].end &&
        (i === lines.length - 1 || currentTime < lines[i + 1].start)
      ) {
        index = i;
      }
    }
    return index;
  }, [lines, currentTime]);

  // Smooth auto-scroll to center active line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current && !isTapMode) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isTapMode]);

  // Tap-to-sync keyboard listener
  useEffect(() => {
    if (!isTapMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (tapIndex < lines.length) {
          const currentText = lines[tapIndex].text;
          setStampedLines((prev) => [...prev, { text: currentText, time: currentTime }]);
          setTapIndex((prev) => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTapMode, tapIndex, lines, currentTime]);

  const saveTapSync = () => {
    if (!onSaveSyncedLyrics) return;
    const content = stampedLines
      .map((item) => {
        const m = Math.floor(item.time / 60);
        const s = (item.time % 60).toFixed(2);
        const mm = m < 10 ? `0${m}` : `${m}`;
        const ss = parseFloat(s) < 10 ? `0${s}` : `${s}`;
        return `[${mm}:${ss}] ${item.text}`;
      })
      .join('\n');

    onSaveSyncedLyrics(content);
    setIsTapMode(false);
  };

  return (
    <div className="relative flex-1 h-full flex flex-col justify-between overflow-hidden bg-[#07070a]/60 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-8 md:px-12 pt-6 pb-2 z-20">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {songTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {isTapMode ? (
            <div className="flex items-center gap-2 bg-purple-950/80 border border-purple-500/40 rounded-xl px-3 py-1.5">
              <span className="text-xs text-fuchsia-300 font-mono">
                [Space] Stamp line {tapIndex + 1}/{lines.length}
              </span>
              <button
                onClick={saveTapSync}
                className="flex items-center gap-1 px-2.5 py-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-xs font-semibold shadow transition"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
              <button
                onClick={() => setIsTapMode(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setStampedLines([]);
                setTapIndex(0);
                setIsTapMode(true);
              }}
              title="Tap Spacebar to sync lyrics to audio"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs border border-white/10 transition"
            >
              <Edit3 className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Tap-to-Sync</span>
            </button>
          )}

          <button
            onClick={onCloseLyrics}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
            title="Close Lyrics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Lyrics Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-8 md:px-16 lg:px-28 py-16 scrollbar-none space-y-10 mask-gradient"
      >
        {lines.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 gap-3">
            <Sparkles className="w-8 h-8 text-fuchsia-500/40" />
            <p className="text-base">No lyrics available for this track.</p>
          </div>
        ) : (
          lines.map((line, index) => {
            const isActive = index === activeIndex;
            const isPast = activeIndex !== -1 && index < activeIndex;

            // Instrumental Break Indicator
            if (line.isInstrumental) {
              return (
                <div
                  key={line.id}
                  ref={isActive ? activeLineRef : null}
                  className={`flex items-center py-4 transition-opacity duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-20'
                  }`}
                >
                  <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-500/30 px-4 py-2 rounded-full">
                    <span className="text-xs uppercase font-mono tracking-wider text-purple-300">
                      Instrumental
                    </span>
                    <div className="flex items-center gap-1.5 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse delay-75" />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-150" />
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={line.id}
                ref={isActive ? activeLineRef : null}
                onClick={() => line.start >= 0 && onSeek(line.start)}
                className={`cursor-pointer group flex flex-wrap items-baseline gap-x-3.5 gap-y-2 select-text transition-all duration-300 ${
                  isActive
                    ? 'opacity-100 scale-[1.03] origin-left'
                    : isPast
                    ? 'opacity-30 blur-[0.4px]'
                    : 'opacity-35 blur-[0.4px] hover:opacity-60'
                }`}
              >
                {line.words.map((wordItem, wIndex) => {
                  const isWordActive =
                    currentTime >= wordItem.start && currentTime <= wordItem.end;

                  // Clean precision percentage
                  let fillRatio = 0;
                  if (currentTime > wordItem.end) {
                    fillRatio = 100;
                  } else if (isWordActive) {
                    const elapsed = currentTime - wordItem.start;
                    const duration = Math.max(0.1, wordItem.end - wordItem.start);
                    fillRatio = Math.min(100, Math.max(0, (elapsed / duration) * 100));
                  }

                  return (
                    <span
                      key={`${wordItem.word}-${wIndex}`}
                      className={`relative inline-block text-3xl md:text-4xl lg:text-5xl tracking-tight transition-transform duration-200 ${
                        isActive && isWordActive ? '-translate-y-0.5' : ''
                      } ${isActive ? 'font-extrabold' : 'font-bold text-zinc-500'}`}
                    >
                      {/* Crisp Dimmed Background Text (Ensures identical metrics) */}
                      <span className="text-zinc-500/70 select-none">
                        {wordItem.word}
                      </span>

                      {/* Precise Clipped Highlight Layer - STRICTLY CLIPPED TO GLYPH BOUNDS */}
                      <span
                        className="absolute inset-0 select-none pointer-events-none text-white transition-none"
                        style={{
                          clipPath: `inset(0 ${100 - fillRatio}% 0 0)`,
                        }}
                      >
                        {wordItem.word}
                      </span>
                    </span>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Subtle Footer Bar */}
      <div className="px-8 md:px-12 py-3 flex items-center justify-between text-[11px] text-zinc-500 font-mono border-t border-purple-950/20">
        <span>Currents</span>
        <span>Click line to seek</span>
      </div>
    </div>
  );
};
