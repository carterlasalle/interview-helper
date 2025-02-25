import { BrowserWindow, ipcMain, app, dialog } from "electron";
import { getSetting } from "./database";
import { TranscriptionStatus } from "../../common/types";
import { 
  checkMicrophonePermission, 
  checkSystemAudioPermission,
  openAudioPreferences
} from "../utils/permissions";

let audioBuffer: Buffer[] = [];
let isCapturing = false;
let captureWindow: BrowserWindow | null = null;

// For actual audio capture, we would use native bindings
// This simplified implementation will focus on permission handling

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

      // Check permissions before starting capture
      let permissionsGranted = true;

      if (audioSettings.captureSystemAudio) {
        const systemAudioPermission = await checkSystemAudioPermission();
        if (!systemAudioPermission) {
          permissionsGranted = false;
          
          const result = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'System Audio Permission',
            message: 'System audio capture permission not granted',
            detail: 'To capture system audio, please grant the necessary permissions in System Preferences.',
            buttons: ['Open Settings', 'Continue without system audio', 'Cancel'],
            defaultId: 0,
            cancelId: 2
          });
          
          if (result.response === 0) {
            // Open system preferences
            openAudioPreferences();
            return { success: false, error: "Permissions required" };
          } else if (result.response === 2) {
            // User canceled
            return { success: false, error: "Canceled by user" };
          }
          // If "Continue without system audio", we'll just skip system audio capture
        } else {
          await startSystemAudioCapture(audioSettings.deviceId);
        }
      }

      if (audioSettings.captureMicrophone) {
        const micPermission = await checkMicrophonePermission();
        if (!micPermission) {
          permissionsGranted = false;
          
          const result = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Microphone Permission',
            message: 'Microphone permission not granted',
            detail: 'To capture microphone audio, please grant the necessary permissions in System Preferences.',
            buttons: ['Open Settings', 'Continue without microphone', 'Cancel'],
            defaultId: 0,
            cancelId: 2
          });
          
          if (result.response === 0) {
            // The system permission prompt should have already been shown by checkMicrophonePermission
            return { success: false, error: "Permissions required" };
          } else if (result.response === 2) {
            // User canceled
            return { success: false, error: "Canceled by user" };
          }
          // If "Continue without microphone", we'll just skip microphone capture
        } else {
          await startMicrophoneCapture(audioSettings.deviceId);
        }
      }

      if (!permissionsGranted && !isCapturing) {
        // If no permissions were granted and we're not capturing anything, return error
        return { success: false, error: "No audio sources available" };
      }

      isCapturing = true;

      if (captureWindow && !captureWindow.isDestroyed()) {
        captureWindow.webContents.send(
          "audio-capture-status",
          TranscriptionStatus.CAPTURING
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
          TranscriptionStatus.IDLE
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

  // Add a new handler to check permissions without starting capture
  ipcMain.handle("check-audio-permissions", async () => {
    try {
      const micPermission = await checkMicrophonePermission();
      const systemAudioPermission = await checkSystemAudioPermission();
      
      return { 
        success: true, 
        permissions: {
          microphone: micPermission,
          systemAudio: systemAudioPermission
        }
      };
    } catch (error) {
      console.error("Error checking audio permissions:", error);
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

const startSystemAudioCapture = async (deviceId?: string) => {
  console.log("Starting system audio capture...", deviceId);
  
  // In a real implementation, we would:
  // 1. Initialize the audio capture API (e.g., Core Audio on macOS)
  // 2. Create an audio stream with the specified device
  // 3. Set up a callback to process captured audio chunks
  
  // For now, we'll use our simulation for development
  startAudioSimulation();
  return true;
};

const startMicrophoneCapture = async (deviceId?: string) => {
  console.log("Starting microphone capture...", deviceId);
  
  // In a real implementation, we would:
  // 1. Initialize the microphone capture API
  // 2. Create an audio stream with the specified device
  // 3. Set up a callback to process captured audio chunks
  
  // For now, we don't simulate this separately
  return true;
};

const stopAudioCapture = async () => {
  console.log("Stopping audio capture...");
  
  // In a real implementation, we would:
  // 1. Stop and clean up all audio streams
  // 2. Release resources
  
  stopAudioSimulation();
  return true;
};

const getAudioDevices = async () => {
  // In a real implementation, we would query the system for available audio devices
  // For now, return mock devices
  
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

// This now uses our utility function
export const checkAudioPermissions = async (): Promise<boolean> => {
  const micPermission = await checkMicrophonePermission();
  const systemPermission = await checkSystemAudioPermission();
  
  return micPermission || systemPermission;
};
