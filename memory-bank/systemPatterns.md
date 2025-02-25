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
```

## Service Architecture

### Audio Capture Service
- Handles system audio and microphone input capture
- Uses buffer management for audio processing
- Transforms audio data for transcription

### Transcription Service
- Processes audio chunks from audio capture service
- Streams audio to OpenAI Whisper API (planned)
- Returns real-time transcription results
- Maintains conversation context

### LLM Service
- Takes transcribed text and generates AI responses
- Connects to OpenRouter for model flexibility (planned)
- Manages conversation context for relevant responses
- Handles rate limiting and API error recovery

### Database Service
- Stores conversations and transcriptions
- Manages user settings and preferences
- Provides export functionality
- Uses SQLite for local storage

## Component Architecture

```mermaid
graph TD
    App[App]
    --> Header[Header]
    --> MP[MainPanel]
    
    App --> WS[WelcomeScreen]
    App --> SP[SettingsPanel]
    
    MP --> TP[TranscriptionPanel]
    MP --> RP[ResponsePanel]
    MP --> CP[ControlPanel]
    
    TP --> TI[TranscriptionItem]
    RP --> RI[ResponseItem]
    
    CP --> AC[AudioControls]
    CP --> QI[QuestionInput]
```

### Component Responsibilities

- **App**: Main container, manages routing and global state
- **Header**: App branding, navigation, settings access
- **MainPanel**: Layout container for the main UI components
- **TranscriptionPanel**: Displays conversation transcripts
- **ResponsePanel**: Shows AI responses to questions
- **ControlPanel**: Provides audio control and manual question input
- **SettingsPanel**: Configuration UI for application settings
- **WelcomeScreen**: Onboarding experience for first-time users

## Data Flow

```mermaid
sequenceDiagram
    participant A as Audio Capture
    participant T as Transcription
    participant L as LLM
    participant DB as Database
    participant UI as User Interface
    
    A->>A: Capture audio
    A->>T: Send audio chunks
    T->>T: Process audio
    T->>UI: Update transcript status
    T->>DB: Store transcript
    T->>L: Detect questions
    L->>L: Generate response
    L->>UI: Update response status
    L->>DB: Store response
    DB->>UI: Fetch conversation history
```

## State Management

The application uses a combination of:
- React Context API for global state
- Local component state for UI-specific state
- IPC communication for service-UI state synchronization

```mermaid
graph TD
    GS[Global State]
    LS[Local State]
    IPC[IPC Events]
    
    GS -->|Context| C1[Component 1]
    GS -->|Context| C2[Component 2]
    C1 -->|Props| C3[Child Component]
    C2 -->|Local State| C2
    
    IPC -->|Event| GS
    GS -->|API Request| IPC
```

## Error Handling Pattern

```mermaid
graph TD
    T[Try] -->|Success| S[Success Handler]
    T -->|Error| E[Error Handler]
    E -->|Recoverable| R[Recovery Strategy]
    E -->|Non-recoverable| U[User Notification]
    R -->|Retry| T
    R -->|Fallback| F[Fallback Strategy]
```

1. Service-level error handling for API and system errors
2. Component-level error boundaries for UI failures
3. Global error logging and reporting
4. User-friendly error messages with recovery options where possible

## Configuration Management

Settings are stored in a hierarchical structure:
- System settings (audio devices, themes)
- User preferences (UI layout, notifications)
- API configuration (keys, endpoints)
- Privacy settings (data retention, recording preferences)

## Security Patterns

- API keys are securely stored using system keychain
- Local data is stored in user-specific directories
- IPC calls are validated to prevent unauthorized access
- Content Security Policy restricts external resources

## Testing Strategy

1. **Unit Tests**: Individual service and component testing
2. **Integration Tests**: Service-to-service and component interaction testing
3. **E2E Tests**: Full application workflow testing

## Deployment

- Packaged as a macOS application (.app)
- Auto-update mechanism for version management
- Installation flow handles permissions and dependencies 