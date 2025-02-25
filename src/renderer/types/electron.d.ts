interface ElectronAPI {
  // App info
  getAppVersion: () => Promise<string>;

  // Audio capture related
  startAudioCapture: () => Promise<void>;
  stopAudioCapture: () => Promise<void>;

  // Transcription related
  getTranscription: (
    callback: (event: any, transcript: string) => void,
  ) => () => void;

  // LLM related
  getAIResponse: (query: string) => Promise<string>;

  // Settings related
  getSetting: (key: string) => Promise<any>;
  setSetting: (key: string, value: any) => Promise<void>;

  // Conversation history related
  getConversationHistory: () => Promise<any[]>;
  saveConversation: (data: any) => Promise<string>;
  exportConversation: (id: string, format: string) => Promise<string>;
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
