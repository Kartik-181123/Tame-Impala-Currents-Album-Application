const fs = require('fs');
const path = require('path');

function parseYamlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const items = [];
  let curItem = null;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('- text:')) {
      if (curItem && curItem.text && curItem.start_ms !== undefined) {
        items.push(curItem);
      }
      let rawText = line.substring(7).trim();
      if ((rawText.startsWith('"') && rawText.endsWith('"')) || (rawText.startsWith("'") && rawText.endsWith("'"))) {
        rawText = rawText.slice(1, -1);
      }
      curItem = { text: rawText };
    } else if (line.startsWith('text:')) {
      if (!curItem) curItem = {};
      let rawText = line.substring(5).trim();
      if ((rawText.startsWith('"') && rawText.endsWith('"')) || (rawText.startsWith("'") && rawText.endsWith("'"))) {
        rawText = rawText.slice(1, -1);
      }
      curItem.text = rawText;
    } else if (line.startsWith('start_ms:')) {
      if (curItem) curItem.start_ms = parseInt(line.substring(9).trim(), 10);
    } else if (line.startsWith('end_ms:')) {
      if (curItem) curItem.end_ms = parseInt(line.substring(7).trim(), 10);
    }
  }

  if (curItem && curItem.text && curItem.start_ms !== undefined) {
    items.push(curItem);
  }

  return items;
}

const baseDir = path.join(__dirname, 'Songs & Lyrics');
const folders = fs.readdirSync(baseDir);

for (const folder of folders) {
  const folderPath = path.join(baseDir, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  const yamlPath = path.join(folderPath, 'Lyrics (YAML).txt');
  const lrcPath = path.join(folderPath, 'Lyrics (LRC).txt');

  if (fs.existsSync(yamlPath)) {
    const items = parseYamlFile(yamlPath);
    if (items.length > 0) {
      // Build LRC format with both start and end timestamps where useful
      const lrcLines = items
        .filter(item => item.text && item.text.trim())
        .map(item => {
          const sec = item.start_ms / 1000;
          const endSec = item.end_ms ? item.end_ms / 1000 : sec + 4;
          const m = Math.floor(sec / 60);
          const s = (sec % 60).toFixed(2);
          const mm = m < 10 ? `0${m}` : `${m}`;
          const ss = parseFloat(s) < 10 ? `0${s}` : `${s}`;
          return `[${mm}:${ss}] ${item.text.trim()}`;
        });

      if (lrcLines.length > 0) {
        fs.writeFileSync(lrcPath, lrcLines.join('\n') + '\n', 'utf8');
        console.log(`Synced ${folder}: ${lrcLines.length} lines`);
      }
    }
  }
}
