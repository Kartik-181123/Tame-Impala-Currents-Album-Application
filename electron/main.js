import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let mediaServer = null;
let mediaServerPort = 49152;

// Lightweight HTTP media server supporting full Range requests for audio streaming
function startMediaServer() {
  mediaServer = http.createServer((req, res) => {
    try {
      // Decode URL path
      const urlObj = new URL(req.url, `http://127.0.0.1:${mediaServerPort}`);
      let rawPath = decodeURIComponent(urlObj.searchParams.get('file') || '');

      if (!rawPath || !fs.existsSync(rawPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File Not Found');
        return;
      }

      const stat = fs.statSync(rawPath);
      const total = stat.size;
      const range = req.headers.range;

      // Determine content type
      const ext = path.extname(rawPath).toLowerCase();
      const mimeTypes = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.m4a': 'audio/mp4',
        '.ogg': 'audio/ogg',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const partialstart = parts[0];
        const partialend = parts[1];

        const start = parseInt(partialstart, 10);
        const end = partialend ? parseInt(partialend, 10) : total - 1;
        const chunksize = end - start + 1;

        const file = fs.createReadStream(rawPath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        });
        file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': total,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(rawPath).pipe(res);
      }
    } catch (e) {
      console.error('Error serving audio:', e);
      res.writeHead(500);
      res.end('Server Error');
    }
  });

  mediaServer.listen(0, '127.0.0.1', () => {
    mediaServerPort = mediaServer.address().port;
    console.log(`Media stream server active on http://127.0.0.1:${mediaServerPort}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#07070a',
    frame: true,
    title: 'Tame Impala - Currents',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#07070a',
      symbolColor: '#c084fc',
      height: 38,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  startMediaServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (mediaServer) {
    mediaServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: Open folder dialog
ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Songs & Lyrics Folder',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// Helper to recursively scan audio & lyrics
function scanDirectory(dirPath) {
  const songs = [];
  const supportedAudioExts = ['.mp3', '.wav', '.flac', '.m4a', '.ogg'];
  
  if (!fs.existsSync(dirPath)) return songs;

  function traverse(currentDir) {
    try {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });

      const audioFiles = [];
      const lyricFiles = [];

      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);
        if (item.isDirectory()) {
          traverse(fullPath);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (supportedAudioExts.includes(ext)) {
            audioFiles.push({ name: item.name, fullPath, ext });
          } else if (ext === '.txt' || ext === '.lrc') {
            lyricFiles.push({ name: item.name, fullPath, ext });
          }
        }
      }

      for (const audio of audioFiles) {
        const baseName = path.basename(audio.name, audio.ext).trim().toLowerCase();
        
        let matchedLyricPath = null;
        let matchedLyricContent = '';

        // Find best matching lyric file:
        // 1. Check for YAML file (has exact start_ms and end_ms)
        // 2. Exact match e.g. "Let It Happen.txt"
        // 3. Populated "Lyrics (LRC).txt" (> 10 bytes)
        // 4. Any non-empty lyric file in folder
        const yamlMatch = lyricFiles.find(
          (l) => l.name.toLowerCase().includes('yaml') && fs.statSync(l.fullPath).size > 20
        );

        const exactMatch = lyricFiles.find(
          (l) => path.basename(l.name, l.ext).trim().toLowerCase() === baseName && fs.statSync(l.fullPath).size > 10
        );

        const lrcMatch = lyricFiles.find(
          (l) => (l.name.toLowerCase().includes('lrc') || l.ext === '.lrc') && fs.statSync(l.fullPath).size > 10
        );

        const anyNonEmpty = lyricFiles.find((l) => fs.statSync(l.fullPath).size > 10);

        const chosenLyric = yamlMatch || exactMatch || lrcMatch || anyNonEmpty || lyricFiles[0];

        if (chosenLyric) {
          matchedLyricPath = chosenLyric.fullPath;
          try {
            matchedLyricContent = fs.readFileSync(chosenLyric.fullPath, 'utf-8');
          } catch (e) {
            console.error('Error reading lyric file', e);
          }
        }

        const title = path.basename(audio.name, audio.ext);

        songs.push({
          id: audio.fullPath,
          title: title,
          filePath: audio.fullPath,
          lyricPath: matchedLyricPath,
          lyricsText: matchedLyricContent,
          folder: path.basename(currentDir),
        });
      }
    } catch (err) {
      console.error(`Error traversing ${currentDir}:`, err);
    }
  }

  traverse(dirPath);
  return songs;
}

// IPC Handler: Scan local media folder
ipcMain.handle('media:scanDirectory', async (_event, customPath) => {
  let targetDir = customPath;
  if (!targetDir) {
    const candidates = [
      path.resolve(process.cwd(), 'Songs & Lyrics'),
      path.resolve(process.resourcesPath || '', 'Songs & Lyrics'),
      path.resolve(__dirname, '..', 'Songs & Lyrics'),
      path.resolve(process.cwd(), '..', 'Songs & Lyrics'),
      'D:\\Coding\\Music Player\\currents-player\\Songs & Lyrics',
    ];
    for (const c of candidates) {
      if (c && fs.existsSync(c)) {
        targetDir = c;
        break;
      }
    }
  }

  const results = targetDir ? scanDirectory(targetDir) : [];
  return {
    directory: targetDir,
    songs: results,
  };
});

// IPC Handler: Convert filePath to stream URL
ipcMain.handle('media:getStreamUrl', async (_event, filePath) => {
  if (!filePath) return '';
  return `http://127.0.0.1:${mediaServerPort}/?file=${encodeURIComponent(filePath)}`;
});

// IPC Handler: Save updated lyrics back to file
ipcMain.handle('media:saveLyrics', async (_event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
