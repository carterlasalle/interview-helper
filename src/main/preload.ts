import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

console.log("Preload script starting");

// Define the API exposed to the renderer process
// This creates a secure bridge that prevents direct access to Node.js from the renderer
try {
  console.log("Setting up contextBridge");
  contextBridge.exposeInMainWorld("electronAPI", {
    // App info
    getAppVersion: () => ipcRenderer.invoke("get-app-version"),

    // Audio capture related
    startAudioCapture: () => ipcRenderer.invoke("start-audio-capture"),
    stopAudioCapture: () => ipcRenderer.invoke("stop-audio-capture"),
    checkAudioPermissions: () => ipcRenderer.invoke("check-audio-permissions"),
    getAudioDevices: () => ipcRenderer.invoke("get-audio-devices"),
    
    // Audio stream event handlers
    onStartAudioStream: (callback: (event: IpcRendererEvent, options: any) => void) => {
      const subscription = (_event: IpcRendererEvent, options: any) =>
        callback(_event, options);
      ipcRenderer.on("start-audio-stream", subscription);
      return () => {
        ipcRenderer.removeListener("start-audio-stream", subscription);
      };
    },
    
    onStopAudioStream: (callback: (event: IpcRendererEvent) => void) => {
      const subscription = (_event: IpcRendererEvent) =>
        callback(_event);
      ipcRenderer.on("stop-audio-stream", subscription);
      return () => {
        ipcRenderer.removeListener("stop-audio-stream", subscription);
      };
    },
    
    // Method to send audio data back to the main process
    sendAudioData: (data: Uint8Array) => {
      try {
        // Safety checks
        if (!data || !(data instanceof Uint8Array)) {
          console.warn('Invalid audio data received:', typeof data);
          return;
        }
        
        // Size limit for safety
        const maxSize = 1024; // 1KB max
        let safeData: Uint8Array;
        
        if (data.length > maxSize) {
          console.warn(`Audio data too large (${data.length} bytes), truncating to ${maxSize}`);
          safeData = data.slice(0, maxSize);
        } else {
          safeData = data;
        }
        
        // Send as a plain array rather than a buffer for better IPC
        ipcRenderer.send("audio-data", Array.from(safeData));
      } catch (error) {
        console.error('Error sending audio data:', error);
        // Send empty data as fallback
        try {
          const fallbackData = new Uint8Array(16).fill(0);
          ipcRenderer.send("audio-data", Array.from(fallbackData));
        } catch (fallbackError) {
          console.error('Failed to send fallback data:', fallbackError);
        }
      }
    },
    
    // Audio status subscription
    onAudioCaptureStatus: (callback: (event: IpcRendererEvent, status: string) => void) => {
      const subscription = (_event: IpcRendererEvent, status: string) =>
        callback(_event, status);
      ipcRenderer.on("audio-capture-status", subscription);
      return () => {
        ipcRenderer.removeListener("audio-capture-status", subscription);
      };
    },

    // Audio level updates
    onAudioLevelUpdate: (callback: (event: IpcRendererEvent, data: { level: number, active: boolean }) => void) => {
      const subscription = (_event: IpcRendererEvent, data: { level: number, active: boolean }) =>
        callback(_event, data);
      ipcRenderer.on("audio-level-update", subscription);
      return () => {
        ipcRenderer.removeListener("audio-level-update", subscription);
      };
    },

    // Transcription related
    getTranscription: (callback: (event: IpcRendererEvent, transcript: string) => void) => {
      const subscription = (_event: IpcRendererEvent, transcript: string) =>
        callback(_event, transcript);
      ipcRenderer.on("transcription-update", subscription);
      return () => {
        ipcRenderer.removeListener("transcription-update", subscription);
      };
    },

    // LLM related
    getAIResponse: (query: string) => ipcRenderer.invoke("get-ai-response", query),

    // Settings related
    getSetting: (key: string) => ipcRenderer.invoke("get-setting", key),
    setSetting: (key: string, value: unknown) => ipcRenderer.invoke("set-setting", key, value),

    // Conversation history related
    getConversationHistory: () => ipcRenderer.invoke("get-conversation-history"),
    saveConversation: (data: unknown) => ipcRenderer.invoke("save-conversation", data),
    exportConversation: (id: string, format: string) =>
      ipcRenderer.invoke("export-conversation", id, format),
  });

  // Tell the renderer process that the preload script has loaded
  console.log("Exposing electronReady flag");
  contextBridge.exposeInMainWorld("electronReady", true);
  console.log("Preload script finished");
} catch (error) {
  console.error("Error in preload script:", error);
}
