# Active Context - AI Call Assistant

## Current Status

We have successfully implemented a Minimum Viable Product (MVP) of the AI Call Assistant, with the following key components:

1. **Electron Application Structure**
   - Main process setup with IPC communication
   - Renderer process with React components
   - Service-based architecture

2. **Core Services**
   - Audio capture service with real implementation using ScreenCaptureKit
   - Transcription service (simulated with static conversation examples)
   - LLM response generation (mock responses for common queries)
   - Database service for settings and conversation storage

3. **UI Components**
   - Main application shell with responsive layout
   - TranscriptionPanel for displaying conversation text
   - ResponsePanel for showing AI responses
   - ControlPanel for managing audio capture
   - SettingsPanel for configuring application preferences
   - WelcomeScreen for first-time user onboarding
   - AudioCapture component for handling audio streams

## Development Progress

The MVP implementation is now complete with real audio capture functionality:

1. **Audio Capture Implementation**
   - ✅ Added macOS permission handling for microphone access
   - ✅ Created system audio capture with proper permission checks
   - ✅ Implemented permission request dialogs in the UI
   - ✅ Added entitlements for macOS app packaging
   - ✅ Implemented real audio capture using Electron's ScreenCaptureKit integration
   - ✅ Created AudioCapture component for handling audio streams in the renderer
   - ✅ Added audio processing using WebAudio API

## Immediate Focus

Our immediate focus is now on integrating with external APIs:

1. **Audio Capture Integration**
   - ✅ Implement permission handling for microphone and system audio
   - ✅ Complete integration with ScreenCaptureKit
   - ✅ Add microphone input processing
   - ✅ Develop audio buffering and processing
   - ✅ Ensure compatibility with various macOS versions

2. **Transcription API Integration**
   - Connect to OpenAI Whisper API
   - Implement proper error handling and retry logic
   - Add real-time chunked audio processing
   - Implement speaker identification capabilities

3. **LLM Service Integration**
   - Connect to OpenRouter for AI response generation
   - Implement robust context management
   - Add better prompt engineering
   - Ensure efficient token usage

## Current Decisions

1. **API Integration Strategy**
   - Using Electron's ScreenCaptureKit for system audio capture
   - Using WebAudio API for audio processing
   - Using OpenAI Whisper API for transcription
   - Using OpenRouter for LLM access to provide flexibility
   - Implementing secure API key storage in system keychain

2. **State Management**
   - Currently using React Context API and local state
   - Considering migration to a more robust solution (Redux, Zustand) as complexity grows

3. **Testing Approach**
   - Implementing Jest for unit tests
   - Planning to use Playwright for E2E testing

## Outstanding Questions

1. How will we handle API rate limiting and fallback strategies?
2. What is the best approach for secure API key storage?
3. Should we implement a local transcription fallback option?
4. What level of conversation context should we maintain for LLM queries?
5. How will we implement data export functionality?
6. What is the ideal UI layout for various screen sizes?
7. How should we handle errors and connection issues in production?
8. How can we optimize audio quality for better transcription results?

## Recent Changes

1. **Audio Capture Implementation**
   - Implemented real system audio capture using Electron's ScreenCaptureKit
   - Added WebAudio API for audio processing
   - Created AudioCapture component for renderer-side audio handling
   - Added proper audio data transmission between renderer and main process
   - Updated electron-builder configuration for required entitlements

2. Previous Changes:
   - Added macOS permission handling for microphone access
   - Implemented permission request UI flow
   - Created entitlements for macOS app permissions
   - Added proper permission checking
   - Updated electron-builder configuration for package building
   - Implemented WelcomeScreen with multi-step onboarding process
   - Created SettingsPanel with comprehensive configuration options
   - Added settings persistence using SQLite database
   - Implemented simulated conversation flow for development
   - Added API key configuration UI
   - Implemented light/dark theme support
   - Created comprehensive app shell with responsive layout

## Next Steps

1. Connect to OpenAI Whisper API for real-time transcription
2. Implement OpenRouter integration for LLM responses
3. Add conversation export functionality
4. Develop more robust error handling and recovery mechanisms
5. Add keyboard shortcuts for common actions
6. Implement automated testing
7. Package application for distribution

## Technical Considerations

1. **Performance Optimization**
   - Need to optimize audio processing for minimal latency
   - Consider chunking transcription requests for better performance
   - Implement proper memory management for long conversations

2. **Security**
   - Need secure storage for API keys
   - Consider encryption for stored conversations
   - Implement proper permission handling

3. **Usability**
   - Need to refine the UX for real-time transcription feedback
   - Improve error messaging for API failures
   - Add visual indicators for audio capture quality
   - Create clear permission request flows

## Resources and References

- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [OpenAI Whisper API](https://beta.openai.com/docs/api-reference/audio)
- [WebAudio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [ScreenCaptureKit Documentation](https://developer.apple.com/documentation/screencapturekit)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [macOS Permission Handling in Electron](https://www.electronjs.org/docs/latest/tutorial/security)