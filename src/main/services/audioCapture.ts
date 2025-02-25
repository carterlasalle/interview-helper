import { BrowserWindow, ipcMain, app, dialog, desktopCapturer } from "electron";
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
let audioStream: any | null = null;

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
          const success = await startSystemAudioCapture(audioSettings.deviceId);
          if (!success) {
            return { success: false, error: "Failed to start system audio capture" };
          }
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
          const success = await startMicrophoneCapture(audioSettings.deviceId);
          if (!success) {
            return { success: false, error: "Failed to start microphone capture" };
          }
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

const startSystemAudioCapture = async (deviceId?: string): Promise<boolean> => {
  console.log("Starting real system audio capture...");
  
  try {
    // Get available screen sources which can include audio
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    
    // Find the system audio source (usually named "System Audio" on macOS)
    const systemAudioSource = sources.find(source => 
      source.name.toLowerCase().includes('system') || 
      source.name.toLowerCase().includes('audio'));
    
    if (!systemAudioSource) {
      console.error("No system audio source found");
      return false;
    }
    
    console.log("Found system audio source:", systemAudioSource.name);
    
    // Pass the source ID to the renderer to create the audio stream
    // The actual audio capture will happen in the renderer process
    // We'll send a message to the renderer to start the capture
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.webContents.send('start-audio-stream', {
        sourceId: systemAudioSource.id,
        isSystemAudio: true
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error starting system audio capture:", error);
    return false;
  }
};

const startMicrophoneCapture = async (deviceId?: string): Promise<boolean> => {
  console.log("Starting real microphone capture...");
  
  try {
    // For microphone capture, we'll use the navigator.getUserMedia API in the renderer
    // Send a message to the renderer to start microphone capture
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.webContents.send('start-audio-stream', {
        deviceId: deviceId,
        isSystemAudio: false
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error starting microphone capture:", error);
    return false;
  }
};

const stopAudioCapture = async (): Promise<boolean> => {
  console.log("Stopping audio capture...");
  
  try {
    // Send a message to the renderer to stop all audio streams
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.webContents.send('stop-audio-stream');
    }
    
    // Clean up any resources in the main process
    audioBuffer = [];
    
    return true;
  } catch (error) {
    console.error("Error stopping audio capture:", error);
    return false;
  }
};

const getAudioDevices = async () => {
  // For now, return mock devices
  // In a real implementation, we'd query the system
  
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

const processAudioChunk = (chunk: Buffer) => {
  // Store the audio chunk for later processing
  audioBuffer.push(chunk);
  
  // Notify the transcription service about the new audio data
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.webContents.send("audio-data", chunk);
  }
};

// This is a utility function that can be exported if needed elsewhere
export const checkAudioPermissions = async (): Promise<boolean> => {
  const micPermission = await checkMicrophonePermission();
  const systemAudioPermission = await checkSystemAudioPermission();
  return micPermission && systemAudioPermission;
};
