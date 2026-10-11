const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  scanDirectory: (customPath) => ipcRenderer.invoke('media:scanDirectory', customPath),
  getStreamUrl: (filePath) => ipcRenderer.invoke('media:getStreamUrl', filePath),
  saveLyrics: (filePath, content) => ipcRenderer.invoke('media:saveLyrics', { filePath, content }),
});
