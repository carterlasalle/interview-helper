import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { setupAudioCapture } from "./services/audioCapture";
import { setupTranscriptionService } from "./services/transcription";
import { setupLLMService } from "./services/llm";
import { setupDatabase } from "./services/database";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  if (require("electron-squirrel-startup")) {
    app.quit();
  }
} catch (error) {
  console.log("electron-squirrel-startup not available, skipping...");
}

let mainWindow: BrowserWindow | null = null;
let servicesInitialized = false;

const createWindow = async () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // In development mode, load from the Vite dev server
  if (process.env.NODE_ENV === "development") {
    await mainWindow.loadURL("http://localhost:3001/");
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // Initialize services only once
  if (!servicesInitialized && mainWindow) {
    setupAudioCapture(mainWindow);
    setupTranscriptionService(mainWindow);
    setupLLMService(mainWindow);
    setupDatabase();
    servicesInitialized = true;
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      require("electron").shell.openExternal(url);
    }
    return { action: "deny" };
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle IPC messages from the renderer process
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// Exit cleanly on request from parent process in development mode.
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
