# System Patterns - AI Call Assistant

## Overall Architecture

The AI Call Assistant follows an Electron-based architecture with a clear separation between backend services (main process) and frontend UI (renderer process).

```mermaid
graph TD
    subgraph "Main Process"
        A[Audio Capture Service]
        T[Transcription Service]
        L[LLM Service]
        DB[Database Service]
    end
    
    subgraph "Renderer Process"
        UI[React UI]
        subgraph "Components"
            TP[TranscriptionPanel]
            RP[ResponsePanel]
            CP[ControlPanel]
            SP[SettingsPanel]
            WS[WelcomeScreen]
        end
    end
    
    A -->|Audio Data| T
    T -->|Transcription| L
    L -->|AI Response| DB
    T -->|Transcript| DB
    
    DB <-->|IPC| UI
    A <-->|IPC| UI
    T <-->|IPC| UI
    L <-->|IPC| UI