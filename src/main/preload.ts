import { contextBridge, ipcRenderer } from "electron";

// Define the API exposed to the renderer process
// This creates a secure bridge that prevents direct access to Node.js from the renderer
contextBridge.exposeInMainWorld("electronAPI", {
  // App info
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Audio capture related
  startAudioCapture: () => ipcRenderer.invoke("start-audio-capture"),
  stopAudioCapture: () => ipcRenderer.invoke("stop-audio-capture"),

  // Transcription related
  getTranscription: (callback: (event: any, transcript: string) => void) => {
    const subscription = (_event: any, transcript: string) =>
      callback(_event, transcript);
    ipcRenderer.on("transcription-update", subscription);

    return () => {
      ipcRenderer.removeListener("transcription-update", subscription);
    };
  },

  // LLM related
  getAIResponse: (query: string) =>
    ipcRenderer.invoke("get-ai-response", query),

  // Settings related
  getSetting: (key: string) => ipcRenderer.invoke("get-setting", key),
  setSetting: (key: string, value: any) =>
    ipcRenderer.invoke("set-setting", key, value),

  // Conversation history related
  getConversationHistory: () => ipcRenderer.invoke("get-conversation-history"),
  saveConversation: (data: any) =>
    ipcRenderer.invoke("save-conversation", data),
  exportConversation: (id: string, format: string) =>
    ipcRenderer.invoke("export-conversation", id, format),
});

// Tell the renderer process that the preload script has loaded
contextBridge.exposeInMainWorld("electronReady", true);
