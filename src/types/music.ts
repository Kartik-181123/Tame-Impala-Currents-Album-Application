export interface WordTiming {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface LyricLine {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  words: WordTiming[];
  isInstrumental?: boolean;
}

export interface Song {
  id: string;
  title: string;
  filePath: string;
  lyricPath: string | null;
  lyricsText: string;
  folder?: string;
  duration?: number;
}

export type RepeatMode = 'off' | 'all' | 'one';
