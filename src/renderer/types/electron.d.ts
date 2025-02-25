import { IpcRendererEvent } from "electron";

interface ElectronAPI {
  // App info
  getAppVersion: () => Promise<string>;

  // Audio capture related
  startAudioCapture: () => Promise<{ success: boolean; error?: string; message?: string }>;
  stopAudioCapture: () => Promise<{ success: boolean; error?: string; message?: string }>;
  checkAudioPermissions: () => Promise<{ 
    success: boolean; 
    error?: string; 
    permissions?: {
      microphone: boolean;
      systemAudio: boolean;
    }
  }>;
  getAudioDevices: () => Promise<{
    success: boolean;
    error?: string;
    devices?: Array<{ id: string; name: string; type: string }>;
  }>;
  onAudioCaptureStatus: (
    callback: (event: IpcRendererEvent, status: string) => void
  ) => () => void;

  // Transcription related
  getTranscription: (
    callback: (event: IpcRendererEvent, transcript: unknown) => void
  ) => () => void;

  // LLM related
  getAIResponse: (query: string) => Promise<unknown>;

  // Settings related
  getSetting: (key: string) => Promise<unknown>;
  setSetting: (key: string, value: unknown) => Promise<boolean>;

  // Conversation history related
  getConversationHistory: () => Promise<unknown>;
  saveConversation: (data: unknown) => Promise<unknown>;
  exportConversation: (id: string, format: string) => Promise<unknown>;
}

interface Window {
  electronAPI: ElectronAPI;
  electronReady: boolean;
}

// Declare global electronAPI and electronReady
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electronReady: boolean;
  }
}

export {};
