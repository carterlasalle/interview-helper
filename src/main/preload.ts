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
    sendAudioData: (data: Uint8Array) => 
      ipcRenderer.send("audio-data", Buffer.from(data)),
    
    // Audio status subscription
    onAudioCaptureStatus: (callback: (event: IpcRendererEvent, status: string) => void) => {
      const subscription = (_event: IpcRendererEvent, status: string) =>
        callback(_event, status);
      ipcRenderer.on("audio-capture-status", subscription);
      return () => {
        ipcRenderer.removeListener("audio-capture-status", subscription);
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
