import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import squirrel from "electron-squirrel-startup";
import { setupAudioCapture } from "./services/audioCapture";
import { setupTranscriptionService } from "./services/transcription";
import { setupLLMService } from "./services/llm";
import { setupDatabase } from "./services/database";

// Enable more detailed logging
process.env.ELECTRON_ENABLE_LOGGING = 'true';
process.env.ELECTRON_DEBUG_LEVEL = 'info';

// Enable ScreenCaptureKit for audio capture on macOS
if (process.platform === 'darwin') {
  // Add flags needed for audio capture on macOS
  app.commandLine.appendSwitch('enable-features', 'ScreenCaptureKitPickerScreen,ScreenCaptureKitStreamPickerSonoma,ScreenCaptureKitAudio,MacAudioCapture');
  
  // Enable proper audio capture for newer macOS versions
  app.commandLine.appendSwitch('use-screen-capture-kit');
  app.commandLine.appendSwitch('use-screen-capture-kit-for-window');
  app.commandLine.appendSwitch('use-screen-capture-kit-for-software-composition');
  
  // Use system defaults for permissions, which respect user choices
  app.commandLine.appendSwitch('use-system-default-media-permissions');
  
  // Allow audio capture without user gesture
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  
  // Disable browser security restrictions that might affect audio capture
  app.commandLine.appendSwitch('disable-web-security');
  app.commandLine.appendSwitch('allow-running-insecure-content');
  
  console.log('Enabled ScreenCaptureKit features on macOS');
  
  // On macOS, try to detect screen capture permission at startup
  try {
    const { systemPreferences } = require('electron');
    const screenStatus = systemPreferences.getMediaAccessStatus("screen");
    console.log(`Initial screen capture permission status: ${screenStatus}`);
    
    const micStatus = systemPreferences.getMediaAccessStatus("microphone");
    console.log(`Initial microphone permission status: ${micStatus}`);
  } catch (error) {
    console.error('Error checking permissions:', error);
  }
}

// Listen for unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

// Listen for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

if (squirrel) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let servicesInitialized = false;

const createWindow = async () => {
  console.log('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      // Enable debugging
      devTools: true,
      // Disable web security and sandbox to fix audio permissions
      webSecurity: false,
      allowRunningInsecureContent: true,
      // Needed for mediaDevices in newer Electron
      sandbox: false
    },
  });

  // Open DevTools in both production and development
  mainWindow.webContents.openDevTools();

  // Log renderer process crashes
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details.reason, details);
  });

  // Log renderer error messages
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['debug', 'info', 'warning', 'error'];
    console.log(`Renderer ${levels[level]}:`, message, `(${sourceId}:${line})`);
  });

  if (process.env.NODE_ENV === "development") {
    console.log("Loading app from development server on port 3001");
    try {
      await mainWindow.loadURL("http://localhost:3001/");
      console.log("Development URL loaded successfully");
    } catch (error) {
      console.error("Failed to load development URL:", error);
      // Fallback to production build if development server is not available
      await mainWindow.loadFile(path.join(__dirname, "../renderer/public/index.html"));
    }
  } else {
    // In production, load the built index.html
    console.log("Loading app from production build");
    await mainWindow.loadFile(path.join(__dirname, "../renderer/public/index.html"));
  }

  if (!servicesInitialized && mainWindow) {
    console.log('Initializing services...');
    setupAudioCapture(mainWindow);
    setupTranscriptionService(mainWindow);
    setupLLMService(mainWindow);
    setupDatabase();
    servicesInitialized = true;
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
};

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// Add the missing IPC handlers for settings
ipcMain.handle("get-setting", async (event, key) => {
  const { getSetting } = require("./services/database");
  try {
    return await getSetting(key, null);
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return null;
  }
});

ipcMain.handle("set-setting", async (event, key, value) => {
  const { setSetting } = require("./services/database");
  try {
    await setSetting(key, value);
    return true;
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    return false;
  }
});

// Debug IPC messages
ipcMain.on('audio-data', (event, data) => {
  // Log only length to avoid flooding console
  console.log(`Received audio data: ${data.length} bytes`);
});

if (process.env.NODE_ENV === "development") {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}