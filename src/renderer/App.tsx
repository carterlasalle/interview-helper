import React, { useEffect, useState } from "react";
import TranscriptionPanel from "./components/TranscriptionPanel";
import ResponsePanel from "./components/ResponsePanel";
import ControlPanel from "./components/ControlPanel";
import Header from "./components/Header";
import SettingsPanel from "./components/SettingsPanel";
import WelcomeScreen from "./components/WelcomeScreen";
import {
  Transcript,
  AIResponse,
  TranscriptionStatus,
  AIResponseStatus,
  AppSettings,
} from "../common/types";
import "./styles/App.css";
import "./styles/SettingsPanel.css";
import "./styles/WelcomeScreen.css";

interface AudioPermissions {
  microphone: boolean;
  systemAudio: boolean;
}

const App: React.FC = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [transcriptionStatus, setTranscriptionStatus] =
    useState<TranscriptionStatus>(TranscriptionStatus.IDLE);
  const [responseStatus, setResponseStatus] = useState<AIResponseStatus>(
    AIResponseStatus.IDLE,
  );
  const [appVersion, setAppVersion] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [appSettings, setAppSettings] = useState<AppSettings | undefined>(
    undefined,
  );
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean>(false);
  const [audioPermissions, setAudioPermissions] = useState<AudioPermissions>({
    microphone: false,
    systemAudio: false,
  });
  const [isPermissionDialogShown, setIsPermissionDialogShown] = useState<boolean>(false);

  useEffect(() => {
    // Setup Electron IPC listeners if we're in Electron
    if (window.electronAPI) {
      // Get app version
      window.electronAPI
        .getAppVersion()
        .then((version) => {
          setAppVersion(version);
        })
        .catch(console.error);

      // Get initial settings
      window.electronAPI
        .getSetting("app_settings")
        .then((settings) => {
          if (settings) {
            setAppSettings(settings);
            // If there are no settings, this is probably a first launch
            // We'll also check if the onboarding has been completed
            window.electronAPI
              .getSetting("onboarding_completed")
              .then((completed) => {
                setIsFirstLaunch(!completed);
              })
              .catch(console.error);
          } else {
            // No settings found, it's definitely first launch
            setIsFirstLaunch(true);
          }
        })
        .catch(console.error);

      // Check audio permissions on startup
      window.electronAPI
        .checkAudioPermissions()
        .then((result) => {
          if (result.success) {
            setAudioPermissions(result.permissions);
          }
        })
        .catch(console.error);

      // Listen for transcription updates
      const unsubscribeTranscription = window.electronAPI.getTranscription(
        (event, transcript) => {
          setTranscripts((prev) => [...prev, transcript]);
        },
      );

      // Subscribe to audio capture status updates
      const unsubscribeAudioStatus = window.electronAPI.onAudioCaptureStatus(
        (event, status: string) => {
          setTranscriptionStatus(status as TranscriptionStatus);
        }
      );

      // Listen for transcription status changes (legacy event-based approach)
      const handleTranscriptionStatus = (
        event: any,
        status: TranscriptionStatus,
      ) => {
        setTranscriptionStatus(status);
      };
      window.addEventListener(
        "transcription-status",
        handleTranscriptionStatus as EventListener,
      );

      // Listen for AI responses
      const handleAIResponse = (event: any, response: AIResponse) => {
        setResponses((prev) => [...prev, response]);
      };
      window.addEventListener(
        "llm-response",
        handleAIResponse as EventListener,
      );

      // Listen for AI status changes
      const handleAIStatus = (event: any, status: AIResponseStatus) => {
        setResponseStatus(status);
      };
      window.addEventListener("llm-status", handleAIStatus as EventListener);

      return () => {
        // Clean up listeners
        unsubscribeTranscription();
        unsubscribeAudioStatus();
        window.removeEventListener(
          "transcription-status",
          handleTranscriptionStatus as EventListener,
        );
        window.removeEventListener(
          "llm-response",
          handleAIResponse as EventListener,
        );
        window.removeEventListener(
          "llm-status",
          handleAIStatus as EventListener,
        );
      };
    }
  }, []);

  const handleStartCapture = async () => {
    if (window.electronAPI) {
      try {
        // Check permissions before starting capture
        const permissionResult = await window.electronAPI.checkAudioPermissions();
        if (permissionResult.success) {
          setAudioPermissions(permissionResult.permissions);
          
          // If we don't have any permissions and haven't shown the dialog yet
          if (!permissionResult.permissions.microphone && 
              !permissionResult.permissions.systemAudio && 
              !isPermissionDialogShown) {
            setIsPermissionDialogShown(true);
            // The dialog will be shown by the main process as part of startAudioCapture
          }
        }
        
        // Attempt to start capture (this will show permission dialogs if needed)
        await window.electronAPI.startAudioCapture();
      } catch (error) {
        console.error("Failed to start audio capture:", error);
      }
    }
  };

  const handleStopCapture = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.stopAudioCapture();
      } catch (error) {
        console.error("Failed to stop audio capture:", error);
      }
    }
  };

  const handleAskQuestion = async (question: string) => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.getAIResponse(question);
      } catch (error) {
        console.error("Failed to get AI response:", error);
      }
    }
  };

  const handleClearTranscripts = () => {
    setTranscripts([]);
  };

  const handleClearResponses = () => {
    setResponses([]);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    // Apply any immediate UI settings changes
    if (newSettings.ui) {
      document.documentElement.style.setProperty(
        "--font-size",
        `${newSettings.ui.fontSize}px`,
      );

      // Apply theme if it's not system
      if (newSettings.ui.theme !== "system") {
        document.documentElement.setAttribute(
          "data-theme",
          newSettings.ui.theme,
        );
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    }
  };

  const handleCompleteOnboarding = () => {
    setIsFirstLaunch(false);
    if (window.electronAPI) {
      window.electronAPI
        .setSetting("onboarding_completed", true)
        .catch(console.error);
    }
  };

  return (
    <div className="app">
      <Header appVersion={appVersion} onOpenSettings={handleOpenSettings} />

      <main className="main-content">
        <div className="panel-container">
          <TranscriptionPanel
            transcripts={transcripts}
            status={transcriptionStatus}
            onClear={handleClearTranscripts}
          />

          <ResponsePanel
            responses={responses}
            status={responseStatus}
            onClear={handleClearResponses}
          />
        </div>
      </main>

      <ControlPanel
        onStartCapture={handleStartCapture}
        onStopCapture={handleStopCapture}
        onAskQuestion={handleAskQuestion}
        captureStatus={transcriptionStatus}
      />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        initialSettings={appSettings}
        onSave={handleSaveSettings}
      />

      <WelcomeScreen
        isFirstLaunch={isFirstLaunch}
        onComplete={handleCompleteOnboarding}
      />
    </div>
  );
};

export default App;
