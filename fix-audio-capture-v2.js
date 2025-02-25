const { app, BrowserWindow, desktopCapturer, systemPreferences, ipcMain } = require('electron');
const path = require('path');

// Track window state
let mainWindow = null;

// Check permissions
async function checkPermissions() {
  const screenStatus = systemPreferences.getMediaAccessStatus('screen');
  const micStatus = systemPreferences.getMediaAccessStatus('microphone');
  
  console.log(`Screen capture permission: ${screenStatus}`);
  console.log(`Microphone permission: ${micStatus}`);
  
  return {
    screen: screenStatus === 'granted',
    microphone: micStatus === 'granted'
  };
}

// List all available capture sources
async function listCaptureSourcesAndWindows() {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen', 'window'],
      thumbnailSize: { width: 0, height: 0 }
    });
    
    console.log('Available sources:');
    sources.forEach(source => {
      console.log(`- ${source.name} (${source.id})`);
    });
    
    return sources;
  } catch (err) {
    console.error('Error listing sources:', err);
    return [];
  }
}

// Create a minimal window with crash recovery
async function createTestWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'fix-preload-v2.js'),
      // Critical security settings
      webSecurity: true,
      sandbox: false
    }
  });
  
  win.loadFile('fix-test-v2.html');
  win.webContents.openDevTools();
  
  // Handle crashes with recovery
  win.webContents.on('render-process-gone', (e, details) => {
    console.log('Renderer crashed:', details.reason);
    
    // Attempt to recover
    setTimeout(() => {
      if (win.isDestroyed()) {
        createTestWindow();
      } else {
        win.reload();
      }
    }, 1000);
  });
  
  // Set up IPC handlers
  ipcMain.handle('refresh-sources', async () => {
    const sources = await listCaptureSourcesAndWindows();
    return sources;
  });
  
  return win;
}

// Main execution
app.whenReady().then(async () => {
  // Enable ScreenCaptureKit features on macOS
  if (process.platform === 'darwin') {
    app.commandLine.appendSwitch('enable-features', 'ScreenCaptureKitPickerScreen,ScreenCaptureKitStreamPickerSonoma,ScreenCaptureKitAudio,MacAudioCapture');
    app.commandLine.appendSwitch('use-screen-capture-kit');
    app.commandLine.appendSwitch('use-system-default-media-permissions');
    app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
    app.commandLine.appendSwitch('allow-file-access-from-files');
    
    console.log('Enabled ScreenCaptureKit features on macOS');
  }

  // Check permissions first
  const permissions = await checkPermissions();
  console.log('Permissions check:', permissions);
  
  // Create test window
  mainWindow = await createTestWindow();
  
  // List initial sources for diagnostic purposes
  const sources = await listCaptureSourcesAndWindows();
  
  // Send sources to renderer after a delay to ensure it's ready
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('capture-sources', sources);
    }
  }, 1000);
});

app.on('window-all-closed', () => {
  app.quit();
}); 