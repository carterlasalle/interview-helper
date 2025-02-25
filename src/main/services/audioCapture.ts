import { BrowserWindow, ipcMain, app } from "electron";
import { getSetting } from "./database";
import { TranscriptionStatus } from "../../common/types";

let audioBuffer: Buffer[] = [];
let isCapturing = false;
let captureWindow: BrowserWindow | null = null;

export const setupAudioCapture = (mainWindow: BrowserWindow) => {
  captureWindow = mainWindow;

  ipcMain.handle("start-audio-capture", async () => {
    try {
      if (isCapturing) {
        return { success: true, message: "Already capturing audio" };
      }

      const audioSettings = await getSetting("audio", {
        captureSystemAudio: true,
        captureMicrophone: true,
        deviceId: undefined,
        noiseReduction: true,
      });

      audioBuffer = [];

      if (audioSettings.captureSystemAudio) {
        await startSystemAudioCapture(audioSettings.deviceId);
      }

      if (audioSettings.captureMicrophone) {
        await startMicrophoneCapture(audioSettings.deviceId);
      }

      isCapturing = true;

      if (captureWindow && !captureWindow.isDestroyed()) {
        captureWindow.webContents.send(
          "audio-capture-status",
          TranscriptionStatus.CAPTURING,
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Error starting audio capture:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  ipcMain.handle("stop-audio-capture", async () => {
    try {
      if (!isCapturing) {
        return { success: true, message: "Not capturing audio" };
      }

      await stopAudioCapture();

      isCapturing = false;

      if (captureWindow && !captureWindow.isDestroyed()) {
        captureWindow.webContents.send(
          "audio-capture-status",
          TranscriptionStatus.IDLE,
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Error stopping audio capture:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  ipcMain.handle("get-audio-devices", async () => {
    try {
      const devices = await getAudioDevices();
      return { success: true, devices };
    } catch (error) {
      console.error("Error getting audio devices:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  app.on("before-quit", async () => {
    if (isCapturing) {
      await stopAudioCapture();
    }
  });
};

const startSystemAudioCapture = async (_deviceId?: string) => {
  console.log("Starting system audio capture...");
  startAudioSimulation();
  return true;
};

const startMicrophoneCapture = async (_deviceId?: string) => {
  console.log("Starting microphone capture...");
  return true;
};

const stopAudioCapture = async () => {
  console.log("Stopping audio capture...");
  stopAudioSimulation();
  return true;
};

const getAudioDevices = async () => {
  return [
    {
      id: "system",
      name: "System Audio",
      type: "output",
    },
    {
      id: "microphone",
      name: "Built-in Microphone",
      type: "input",
    },
  ];
};

let simulationInterval: NodeJS.Timeout | null = null;

const startAudioSimulation = () => {
  if (simulationInterval) return;

  simulationInterval = setInterval(() => {
    const chunk = Buffer.from(
      new Array(1024).fill(0).map(() => Math.floor(Math.random() * 256)),
    );

    audioBuffer.push(chunk);

    if (audioBuffer.length > 100) {
      audioBuffer.shift();
    }

    processAudioChunk(chunk);
  }, 100);
};

const stopAudioSimulation = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
};

const processAudioChunk = (chunk: Buffer) => {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.webContents.send("audio-chunk-received", {
      size: chunk.length,
      timestamp: Date.now(),
    });
  }
};

export const checkAudioPermissions = (): Promise<boolean> => {
  return new Promise((resolve) => {
    resolve(true);
  });
};
