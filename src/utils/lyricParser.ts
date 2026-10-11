import type { LyricLine, WordTiming } from '../types/music';

// Converts "[mm:ss.xx]" or "mm:ss.xx" to total seconds
export function parseTimestampToSeconds(ts: string): number {
  const match = ts.match(/(?:\[)?(\d+):(\d+(?:\.\d+)?)(?:\])?/);
  if (!match) return 0;
  const minutes = parseInt(match[1], 10);
  const seconds = parseFloat(match[2]);
  return minutes * 60 + seconds;
}

// Converts seconds to [mm:ss.xx]
export function formatSecondsToTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(2);
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ss = parseFloat(s) < 10 ? `0${s}` : `${s}`;
  return `[${mm}:${ss}]`;
}

// Interpolates words across a line's duration based on realistic syllable and character weights
export function interpolateWords(
  text: string,
  lineStart: number,
  lineEnd: number
): WordTiming[] {
  const rawWords = text.trim().split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];

  const lineDuration = Math.max(0.6, lineEnd - lineStart);
  
  // Clean word for weight calculation (strip quotes/punctuation)
  const weights = rawWords.map((w) => {
    const clean = w.replace(/[^a-zA-Z0-9]/g, '');
    return Math.max(2, clean.length);
  });
  const totalWeight = weights.reduce((acc, val) => acc + val, 0);

  let currentCursor = lineStart;
  const wordTimings: WordTiming[] = [];

  for (let i = 0; i < rawWords.length; i++) {
    const wordShare = (weights[i] / totalWeight) * lineDuration;
    const wStart = currentCursor;
    const wEnd = i === rawWords.length - 1 ? lineEnd : currentCursor + wordShare;
    wordTimings.push({
      word: rawWords[i],
      start: wStart,
      end: wEnd,
    });
    currentCursor = wEnd;
  }

  return wordTimings;
}

// Helper to parse YAML-structured lyrics
function parseYamlLyrics(rawText: string): LyricLine[] {
  const lines = rawText.split(/\r?\n/);
  const items: { text: string; start_ms: number; end_ms: number }[] = [];
  let curItem: { text?: string; start_ms?: number; end_ms?: number } | null = null;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('- text:') || line.startsWith('text:')) {
      if (curItem && curItem.text && curItem.start_ms !== undefined) {
        items.push({
          text: curItem.text,
          start_ms: curItem.start_ms,
          end_ms: curItem.end_ms ?? curItem.start_ms + 4000,
        });
      }
      let raw = line.replace(/^-?\s*text:\s*/, '').trim();
      if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
        raw = raw.slice(1, -1);
      }
      curItem = { text: raw };
    } else if (line.startsWith('start_ms:')) {
      if (curItem) curItem.start_ms = parseInt(line.substring(9).trim(), 10);
    } else if (line.startsWith('end_ms:')) {
      if (curItem) curItem.end_ms = parseInt(line.substring(7).trim(), 10);
    }
  }

  if (curItem && curItem.text && curItem.start_ms !== undefined) {
    items.push({
      text: curItem.text,
      start_ms: curItem.start_ms,
      end_ms: curItem.end_ms ?? curItem.start_ms + 4000,
    });
  }

  const result: LyricLine[] = [];
  const valid = items.filter((it) => it.text && it.text.trim());

  for (let i = 0; i < valid.length; i++) {
    const curr = valid[i];
    const startSec = curr.start_ms / 1000;
    const endSec = curr.end_ms / 1000;

    // Check for instrumental gap
    if (i > 0) {
      const prevEnd = result[result.length - 1].end;
      if (startSec - prevEnd > 6) {
        result.push({
          id: `break-yaml-${i}`,
          start: prevEnd + 0.5,
          end: startSec - 0.5,
          text: '• • •',
          words: [
            { word: '•', start: prevEnd + 1, end: prevEnd + (startSec - prevEnd) * 0.33 },
            { word: '•', start: prevEnd + (startSec - prevEnd) * 0.33, end: prevEnd + (startSec - prevEnd) * 0.66 },
            { word: '•', start: prevEnd + (startSec - prevEnd) * 0.66, end: startSec - 0.5 },
          ],
          isInstrumental: true,
        });
      }
    }

    const words = interpolateWords(curr.text, startSec, endSec);
    result.push({
      id: `yaml-line-${i}-${startSec}`,
      start: startSec,
      end: endSec,
      text: curr.text,
      words,
      isInstrumental: false,
    });
  }

  return result;
}

// Parses raw lyric text into structured LyricLine objects (YAML or LRC supported)
export function parseLyrics(rawText: string, _songDuration: number = 300): LyricLine[] {
  if (!rawText || !rawText.trim()) return [];

  // Check if text is YAML format
  if (rawText.includes('lines:') && (rawText.includes('start_ms:') || rawText.includes('end_ms:'))) {
    const yamlResult = parseYamlLyrics(rawText);
    if (yamlResult.length > 0) return yamlResult;
  }

  const rawLines = rawText.split(/\r?\n/);
  const parsedRaw: { time: number; text: string; rawWords?: WordTiming[] }[] = [];

  // Regex for line timestamps: [mm:ss.xx]
  const lineTimeRegex = /^\[(\d{1,2}:\d{2}(?:\.\d{1,3})?)\](.*)$/;
  // Regex for word timestamps: <mm:ss.xx> word
  const wordTimeRegex = /<(\d{1,2}:\d{2}(?:\.\d{1,3})?)>\s*([^<]+)/g;

  let hasTimestamps = false;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip metadata lines like [ar: Tame Impala], [ti: ...], [al: ...]
    if (/^\[(ti|ar|al|length|by|offset|id):/i.test(trimmed)) {
      continue;
    }

    const lineMatch = trimmed.match(lineTimeRegex);
    if (lineMatch) {
      hasTimestamps = true;
      const time = parseTimestampToSeconds(lineMatch[1]);
      const content = lineMatch[2].trim();

      const wordMatches = [...content.matchAll(wordTimeRegex)];
      if (wordMatches.length > 0) {
        const words: WordTiming[] = [];
        for (let j = 0; j < wordMatches.length; j++) {
          const wStart = parseTimestampToSeconds(wordMatches[j][1]);
          const wText = wordMatches[j][2].trim();
          let wEnd = wStart + 0.5;
          if (j + 1 < wordMatches.length) {
            wEnd = parseTimestampToSeconds(wordMatches[j + 1][1]);
          }
          words.push({ word: wText, start: wStart, end: wEnd });
        }
        parsedRaw.push({
          time,
          text: words.map((w) => w.word).join(' '),
          rawWords: words,
        });
      } else {
        parsedRaw.push({
          time,
          text: content,
        });
      }
    } else {
      // Line without timestamp (Mode B raw text)
      parsedRaw.push({
        time: -1,
        text: trimmed,
      });
    }
  }

  // If plain text (no timestamps detected), return plain text lines
  if (!hasTimestamps) {
    return parsedRaw.map((p, index) => ({
      id: `plain-${index}`,
      start: -1,
      end: -1,
      text: p.text,
      words: p.text.split(/\s+/).map((w) => ({ word: w, start: -1, end: -1 })),
      isInstrumental: false,
    }));
  }

  // Sort by time
  const timestamped = parsedRaw
    .filter((p) => p.time >= 0)
    .sort((a, b) => a.time - b.time);

  const result: LyricLine[] = [];

  for (let i = 0; i < timestamped.length; i++) {
    const curr = timestamped[i];
    let nextTime = i + 1 < timestamped.length ? timestamped[i + 1].time : (curr.time + 6);
    
    // Natural human line singing duration
    const gap = nextTime - curr.time;
    const lineEnd = gap > 7 ? curr.time + 4.2 : Math.max(curr.time + 1, nextTime - 0.2);

    // If instrumental gap > 6s, add rhythm break
    if (i > 0) {
      const prevEnd = result[result.length - 1].end;
      if (curr.time - prevEnd > 6) {
        result.push({
          id: `break-${i}`,
          start: prevEnd + 0.5,
          end: curr.time - 0.5,
          text: '• • •',
          words: [
            { word: '•', start: prevEnd + 1, end: prevEnd + (curr.time - prevEnd) * 0.33 },
            { word: '•', start: prevEnd + (curr.time - prevEnd) * 0.33, end: prevEnd + (curr.time - prevEnd) * 0.66 },
            { word: '•', start: prevEnd + (curr.time - prevEnd) * 0.66, end: curr.time - 0.5 },
          ],
          isInstrumental: true,
        });
      }
    }

    if (!curr.text) continue;

    let words: WordTiming[];
    if (curr.rawWords && curr.rawWords.length > 0) {
      words = curr.rawWords;
    } else {
      words = interpolateWords(curr.text, curr.time, lineEnd);
    }

    result.push({
      id: `line-${i}-${curr.time}`,
      start: curr.time,
      end: lineEnd,
      text: curr.text,
      words,
      isInstrumental: false,
    });
  }

  return result;
}
