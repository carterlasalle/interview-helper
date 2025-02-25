import { IpcRendererEvent } from "electron";

// Add WebAudioContext interface for compatibility
interface Window {
  webkitAudioContext: typeof AudioContext;
}

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
  
  // Audio stream handlers
  onStartAudioStream: (
    callback: (event: IpcRendererEvent, options: { 
      sourceId?: string;
      deviceId?: string;
      isSystemAudio: boolean;
    }) => void
  ) => () => void;
  onStopAudioStream: (
    callback: (event: IpcRendererEvent) => void
  ) => () => void;
  sendAudioData: (data: Uint8Array) => void;

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

// Define the window interface
interface Window {
  electronAPI: ElectronAPI;
  electronReady: boolean;
  webkitAudioContext: typeof AudioContext;
}

// Declare global electronAPI and electronReady
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electronReady: boolean;
    webkitAudioContext: typeof AudioContext;
  }
}

export {};
