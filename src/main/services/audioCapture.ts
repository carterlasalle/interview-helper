import { BrowserWindow, ipcMain, app } from "electron";
import path from "path";
import { exec } from "child_process";
import { getSetting, setSetting } from "./database";
import { TranscriptionStatus } from "../../common/types";

// Audio buffer for storing captured audio chunks
let audioBuffer: Buffer[] = [];
let isCapturing = false;
let captureWindow: BrowserWindow | null = null;

// Set up audio capture related IPC handlers
export const setupAudioCapture = (mainWindow: BrowserWindow) => {
  captureWindow = mainWindow;

  // Handler for starting audio capture
  ipcMain.handle("start-audio-capture", async () => {
    try {
      if (isCapturing) {
        return { success: true, message: "Already capturing audio" };
      }

      // Get audio settings
      const audioSettings = await getSetting("audio", {
        captureSystemAudio: true,
        captureMicrophone: true,
        deviceId: undefined,
        noiseReduction: true,
      });

      // Reset buffer
      audioBuffer = [];

      // Start capture based on settings
      if (audioSettings.captureSystemAudio) {
        await startSystemAudioCapture(audioSettings.deviceId);
      }

      if (audioSettings.captureMicrophone) {
        await startMicrophoneCapture(audioSettings.deviceId);
      }

      isCapturing = true;

      // Notify renderer that capture has started
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

  // Handler for stopping audio capture
  ipcMain.handle("stop-audio-capture", async () => {
    try {
      if (!isCapturing) {
        return { success: true, message: "Not capturing audio" };
      }

      await stopAudioCapture();

      isCapturing = false;

      // Notify renderer that capture has stopped
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

  // Handler for getting audio devices
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

  // Ensure audio capture is stopped when app is closed
  app.on("before-quit", async () => {
    if (isCapturing) {
      await stopAudioCapture();
    }
  });
};

// Start system audio capture
const startSystemAudioCapture = async (deviceId?: string) => {
  // Note: This is a placeholder. We need to use macOS Core Audio APIs
  // to properly capture system audio. This typically requires a virtual
  // audio device or a background audio driver.
  console.log("Starting system audio capture...");

  // On macOS, we might need to use a tool like BlackHole or Soundflower
  // to create a virtual audio device for system audio capture.
  // We would then use the Audio Device API to read from this device.

  // For development/testing purposes, we can simulate audio capture
  // with a timer that creates random audio data
  startAudioSimulation();

  return true;
};

// Start microphone capture
const startMicrophoneCapture = async (deviceId?: string) => {
  // Note: Like with system audio, we would use macOS Core Audio APIs
  // to capture microphone input.
  console.log("Starting microphone capture...");

  // For development/testing purposes, we can rely on the simulation
  // that's already running

  return true;
};

// Stop all audio capture
const stopAudioCapture = async () => {
  console.log("Stopping audio capture...");

  // Stop simulation for development/testing
  stopAudioSimulation();

  return true;
};

// Get available audio devices
const getAudioDevices = async () => {
  // In a real implementation, we would use macOS Core Audio APIs
  // to enumerate available audio devices

  // For development/testing, return dummy devices
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

// Development/testing functions for simulating audio capture
let simulationInterval: NodeJS.Timeout | null = null;

const startAudioSimulation = () => {
  if (simulationInterval) return;

  // Simulate audio data every 100ms
  simulationInterval = setInterval(() => {
    // Create a small chunk of random audio data (1kb)
    const chunk = Buffer.from(
      new Array(1024).fill(0).map(() => Math.floor(Math.random() * 256)),
    );

    // Add to buffer
    audioBuffer.push(chunk);

    // If buffer gets too large, remove oldest chunks
    if (audioBuffer.length > 100) {
      // Keep ~10 seconds @ 10 chunks/second
      audioBuffer.shift();
    }

    // Send buffer to audio processing
    processAudioChunk(chunk);
  }, 100);
};

const stopAudioSimulation = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
};

// Process audio chunks (send to transcription service)
const processAudioChunk = (chunk: Buffer) => {
  // In a real implementation, we would send this audio data to our
  // transcription service for processing

  // For now, just log that we received data
  // console.log(`Processed audio chunk: ${chunk.length} bytes`);

  // Signal to the main window that we have audio data
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.webContents.send("audio-chunk-received", {
      size: chunk.length,
      timestamp: Date.now(),
    });
  }
};

// Check for audio permissions
export const checkAudioPermissions = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // On macOS, permission checks are complex and typically handled by
    // the system when first attempting to use the microphone.
    // For this implementation, we'll assume permissions are granted.

    // In a production app, would need to implement proper permission checking
    // through macOS APIs

    resolve(true);
  });
};
