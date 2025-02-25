export interface Transcript {
  id: string;
  text: string;
  timestamp: number;
  speaker?: string;
  confidence: number;
}

export interface AIResponse {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
  source?: string[];
  confidence: number;
}

export interface Conversation {
  id: string;
  title: string;
  date: number;
  transcripts: Transcript[];
  responses: AIResponse[];
  metadata: {
    duration: number;
    participants?: string[];
    tags?: string[];
  };
}

export interface AppSettings {
  audio: {
    captureSystemAudio: boolean;
    captureMicrophone: boolean;
    deviceId?: string;
    noiseReduction: boolean;
  };
  transcription: {
    model: string;
    useLocalModel: boolean;
    speakerIdentification: boolean;
  };
  llm: {
    model: string;
    temperature: number;
    apiKey?: string;
  };
  ui: {
    theme: "light" | "dark" | "system";
    fontSize: number;
    position: {
      x: number;
      y: number;
    };
    size: {
      width: number;
      height: number;
    };
  };
  privacy: {
    storeConversationsLocally: boolean;
    anonymizeTranscripts: boolean;
    autoDeleteAfterDays: number;
  };
}

export enum TranscriptionStatus {
  IDLE = "idle",
  CAPTURING = "capturing",
  PROCESSING = "processing",
  ERROR = "error",
}

export enum AIResponseStatus {
  IDLE = "idle",
  GENERATING = "generating",
  COMPLETE = "complete",
  ERROR = "error",
}

export interface User {
  id: string;
  name: string;
  email?: string;
  preferences: Partial<AppSettings>;
  createdAt: number;
  lastLoginAt: number;
}
