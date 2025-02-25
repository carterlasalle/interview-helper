import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import squirrel from "electron-squirrel-startup";
import { setupAudioCapture } from "./services/audioCapture";
import { setupTranscriptionService } from "./services/transcription";
import { setupLLMService } from "./services/llm";
import { setupDatabase } from "./services/database";

if (squirrel) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let servicesInitialized = false;

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === "development") {
    console.log("Loading app from development server on port 3001");
    try {
      await mainWindow.loadURL("http://localhost:3001/");
      // Always open dev tools in development mode
      mainWindow.webContents.openDevTools();
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