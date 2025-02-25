import { BrowserWindow, ipcMain, app, dialog, desktopCapturer } from "electron";
import { getSetting } from "./database";
import { TranscriptionStatus } from "../../common/types";
import { 
  checkMicrophonePermission, 
  checkSystemAudioPermission,
  openAudioPreferences
} from "../utils/permissions";

// Define an interface for audio devices since MediaDeviceInfo is not available in main process
interface AudioDevice {
  deviceId: string;
  kind: string;
  label: string;
  groupId: string;
}

let audioBuffer: Buffer[] = [];
let isCapturing = false;
let captureWindow: BrowserWindow | null = null;
let audioStream: any | null = null;
let audioDataInterval: NodeJS.Timeout | null = null;
let lastActivity = 0;
let audioLevels: number[] = [];

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
      lastActivity = Date.now();
      audioLevels = [];

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

      // Set up an interval to check audio activity and update UI
      if (audioDataInterval === null) {
        audioDataInterval = setInterval(() => {
          // Check if we've received audio data recently
          const now = Date.now();
          const timeSinceLastData = now - lastActivity;
          
          if (captureWindow && !captureWindow.isDestroyed()) {
            // Calculate average audio level for display
            const avgLevel = audioLevels.length > 0 
              ? audioLevels.reduce((sum, level) => sum + level, 0) / audioLevels.length 
              : 0;
            
            captureWindow.webContents.send(
              "audio-level-update",
              { level: avgLevel, active: timeSinceLastData < 1000 }
            );
            
            // Reset levels for next update
            audioLevels = [];
          }
        }, 200); // Update UI 5 times per second
      }

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

  // Listen for audio data from the renderer process
  ipcMain.on("audio-data", (event, data) => {
    if (!isCapturing) return;
    
    lastActivity = Date.now();
    
    if (Buffer.isBuffer(data)) {
      console.log(`Received audio data: ${data.length} bytes`);
      
      // Calculate audio level (simple average of absolute values)
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        // Normalize to -128 to 127 range and take absolute value
        sum += Math.abs(data[i] - 128);
      }
      // Normalize to 0-1 range
      const avgLevel = sum / (data.length * 128);
      audioLevels.push(avgLevel);
      
      // Store the audio data for processing
      audioBuffer.push(data);
      
      // In a real implementation, we'd send this data to a transcription service
      // For now, just log it
      if (audioBuffer.length > 50) {
        // Keep buffer size manageable by removing oldest data
        audioBuffer.shift();
      }
    } else {
      console.warn('Received non-buffer audio data', typeof data);
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
    const sources = await desktopCapturer.getSources({ 
      types: ['screen', 'window'],
      fetchWindowIcons: true,
      thumbnailSize: { width: 0, height: 0 } // Skip thumbnails to improve performance
    });
    
    // Log all available sources for debugging
    console.log(`Found ${sources.length} potential sources:`, 
      sources.map(s => `${s.name} (${s.id})`).join(', '));
    
    // For macOS, try different strategies to find the appropriate screen source
    let systemAudioSource = null;
    
    // First strategy: look for specific names typical for system audio sources
    systemAudioSource = sources.find(source => 
      source.name.toLowerCase().includes('system audio') || 
      source.name.toLowerCase() === 'entire screen' ||
      source.name.toLowerCase().includes('display') ||
      source.name.toLowerCase().includes('screen') ||
      source.id.includes('screen:'));
    
    // Second strategy: on macOS, take the first 'screen' source if available
    if (!systemAudioSource) {
      systemAudioSource = sources.find(source => 
        source.id.includes('screen:'));
    }
    
    // Last resort: just take the first available source
    if (!systemAudioSource && sources.length > 0) {
      console.log("Using first available source as fallback");
      systemAudioSource = sources[0];
    }
    
    if (!systemAudioSource) {
      console.error("No system audio source found. Available sources:", 
        sources.map(s => `${s.name} (${s.id})`).join(', '));
      
      // Add more diagnostic info
      if (process.platform === 'darwin') {
        console.log("On macOS, make sure Screen Recording permission is granted in System Preferences > Security & Privacy > Privacy > Screen Recording");
      }
      
      return false;
    }
    
    console.log("Using source for system audio:", systemAudioSource.name, systemAudioSource.id);
    
    // Pass the source ID to the renderer to create the audio stream
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.webContents.send('start-audio-stream', {
        sourceId: systemAudioSource.id,
        isSystemAudio: true
      });
      console.log("Sent start-audio-stream message to renderer with sourceId:", systemAudioSource.id);
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

const stopAudioCapture = async (): Promise<void> => {
  console.log("Stopping audio capture...");
  
  // Clear the audio processing interval
  if (audioDataInterval) {
    clearInterval(audioDataInterval);
    audioDataInterval = null;
  }
  
  // Send message to the renderer to stop all audio streams
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.webContents.send('stop-audio-stream');
  }
  
  // Reset the audio buffer
  audioBuffer = [];
  audioLevels = [];
};

const getAudioDevices = async (): Promise<AudioDevice[]> => {
  try {
    // We would normally query for audio devices here
    // But for simplicity, we'll just return a placeholder
    return [
      {
        deviceId: 'default',
        kind: 'audioinput',
        label: 'Default Microphone',
        groupId: 'default'
      }
    ];
  } catch (error) {
    console.error("Error getting audio devices:", error);
    return [];
  }
};

// This is a utility function that can be exported if needed elsewhere
export const checkAudioPermissions = async (): Promise<boolean> => {
  const micPermission = await checkMicrophonePermission();
  const systemAudioPermission = await checkSystemAudioPermission();
  return micPermission && systemAudioPermission;
};
