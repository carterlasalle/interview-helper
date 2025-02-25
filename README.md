# AI Call Assistant

<p align="center">
  <img src="public/logo.svg" alt="AI Call Assistant Logo" width="180">
</p>

An Electron-based macOS application that listens to your calls, transcribes conversations in real-time, and provides AI-generated responses to questions that arise during the call.

## Current Status

✅ MVP completed with simulated services
🚧 Working towards real API integrations

## Features

- **Real-time Audio Capture** (Simulated)
  - System audio capture 
  - Microphone input

- **Live Transcription** (Simulated)
  - Converts speech to text
  - Distinguishes between speakers
  - Provides transcription history

- **AI Responses** (Simulated)
  - Detects questions in conversation
  - Generates contextual responses
  - Provides reference information

- **User-friendly Interface**
  - Clean, intuitive design
  - Light/Dark mode support
  - Welcome screen with onboarding
  - Settings panel for configuration

## Tech Stack

- **Frontend**: React, TypeScript, CSS
- **Backend**: Electron (Node.js)
- **Audio Processing**: Core Audio API (planned)
- **Transcription**: OpenAI Whisper API (planned)
- **AI Responses**: OpenRouter API (planned)
- **Database**: SQLite

## Getting Started

### Prerequisites

- Node.js 18+ 
- Yarn package manager
- macOS 12+ (Monterey or newer)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/ai-call-assistant.git
cd ai-call-assistant
```

2. Install dependencies
```bash
yarn install
```

3. Start the development server
```bash
yarn dev
```

### Production Build

To create a production build:

```bash
yarn build
```

This will create a distributable application in the `/dist` folder.

## Development Roadmap

### Completed
- ✅ Project setup and configuration
- ✅ Core application structure
- ✅ UI components implementation
- ✅ Simulated audio capture service
- ✅ Mock transcription service
- ✅ Mock LLM response service
- ✅ Settings panel implementation
- ✅ Welcome screen with onboarding
- ✅ Light/Dark theme support

### In Progress
- 🚧 Implementing actual Core Audio API integration
- 🚧 Connecting to OpenAI Whisper API
- 🚧 Integrating with OpenRouter for LLM access

### Upcoming
- ⏱️ Conversation export functionality
- ⏱️ Automated testing
- ⏱️ Error handling improvements
- ⏱️ Keyboard shortcuts
- ⏱️ Production packaging
- ⏱️ Security enhancements

## Configuration

The application provides several configuration options through the Settings panel:

- **Audio Settings**
  - Input device selection
  - Output device selection
  - Audio quality settings

- **Transcription Settings**
  - Model selection
  - Language preference
  - Speaker identification toggle

- **AI Settings**
  - API key configuration
  - Model selection
  - Response settings

- **UI Settings**
  - Theme selection
  - Font size
  - Layout options

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- OpenAI for Whisper API
- OpenRouter for LLM access
- Electron community
- React community 