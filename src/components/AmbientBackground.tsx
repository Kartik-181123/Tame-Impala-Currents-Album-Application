import React from 'react';

interface AmbientBackgroundProps {
  isPlaying: boolean;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ isPlaying }) => {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
      {/* Deep Obsidian Canvas */}
      <div className="absolute inset-0 bg-[#07070a]" />

      {/* GPU Accelerated Lightweight Ambient Glow */}
      <div
        className={`absolute -top-24 -left-24 h-[550px] w-[550px] rounded-full bg-gradient-to-br from-fuchsia-600/30 via-purple-700/20 to-transparent blur-[80px] transition-all duration-1000 transform-gpu ${
          isPlaying ? 'opacity-80 scale-105' : 'opacity-40 scale-100'
        }`}
      />

      <div
        className={`absolute top-1/3 -right-20 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-cyan-600/20 via-indigo-600/15 to-transparent blur-[85px] transition-all duration-1000 transform-gpu ${
          isPlaying ? 'opacity-70 scale-105' : 'opacity-35 scale-100'
        }`}
      />

      <div
        className={`absolute -bottom-20 left-1/4 h-[450px] w-[450px] rounded-full bg-gradient-to-t from-fuchsia-900/25 via-purple-950/20 to-transparent blur-[90px] transition-all duration-1000 transform-gpu ${
          isPlaying ? 'opacity-75 scale-100' : 'opacity-30 scale-95'
        }`}
      />

      {/* Subtle Currents Wave Line Texture */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 10px)',
        }}
      />
    </div>
  );
};
