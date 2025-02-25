import React, { useState } from "react";
import "../styles/WelcomeScreen.css";
import { AppSettings } from "@common/types";

interface WelcomeScreenProps {
  isFirstLaunch: boolean;
  onComplete: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  isFirstLaunch,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [apiKey, setApiKey] = useState("");

  const steps = [
    {
      title: "Welcome to AI Call Assistant",
      content: (
        <>
          <p>
            AI Call Assistant helps you get more from your calls and meetings by
            providing real-time transcription and AI-powered insights.
          </p>

          <div className="welcome-features">
            <div className="feature-item">
              <div className="feature-icon">🎙️</div>
              <div className="feature-text">
                <h4>Audio Capture</h4>
                <p>Records your calls and meetings in real-time</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">📝</div>
              <div className="feature-text">
                <h4>Transcription</h4>
                <p>Converts speech to text as you talk</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">🤖</div>
              <div className="feature-text">
                <h4>AI Insights</h4>
                <p>Provides answers and information during your calls</p>
              </div>
            </div>
          </div>
        </>
      ),
    },
    {
      title: "Configure API Access",
      content: (
        <>
          <p>
            To use AI Call Assistant, you&apos;ll need an API key from OpenAI or
            OpenRouter. This key will be stored securely on your device.
          </p>

          <div className="api-setup">
            <div className="input-group">
              <label htmlFor="api-key">API Key</label>
              <input
                type="password"
                id="api-key"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="input-help">
                You can find this in your OpenAI or OpenRouter dashboard
              </p>
            </div>

            <div className="api-options">
              <p>Don&apos;t have an API key yet?</p>
              <div className="option-buttons">
                <a
                  href="https://platform.openai.com/account/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="option-button"
                >
                  Get an OpenAI Key
                </a>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="option-button"
                >
                  Get an OpenRouter Key
                </a>
              </div>
            </div>
          </div>
        </>
      ),
    },
    {
      title: "Audio Access",
      content: (
        <>
          <p>
            AI Call Assistant needs permission to capture audio from your system
            and microphone.
          </p>

          <div className="permissions-info">
            <div className="permission-item">
              <h4>System Audio</h4>
              <p>
                To capture audio from your calls, you&apos;ll need to install a
                virtual audio device like BlackHole or Soundflower.
              </p>
              <a
                href="https://github.com/ExistentialAudio/BlackHole"
                target="_blank"
                rel="noopener noreferrer"
                className="permission-link"
              >
                Download BlackHole (recommended)
              </a>
            </div>

            <div className="permission-item">
              <h4>Microphone Access</h4>
              <p>
                The app will request microphone access when you start your first
                recording. You can change this in System Preferences anytime.
              </p>
            </div>
          </div>
        </>
      ),
    },
    {
      title: "You&apos;re All Set!",
      content: (
        <>
          <p>
            You&apos;re ready to start using AI Call Assistant. Here&apos;s how to get
            started:
          </p>

          <div className="getting-started">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-text">
                <h4>Start Capturing</h4>
                <p>Click the &quot;Start Capture&quot; button before your call begins</p>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-text">
                <h4>View Transcription</h4>
                <p>Watch as your conversation appears in real-time</p>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-text">
                <h4>Get AI Help</h4>
                <p>The AI will automatically respond to questions it detects</p>
              </div>
            </div>
          </div>

          <div className="final-note">
            <p>
              You can access all settings and options by clicking the gear icon
              in the top right.
            </p>
          </div>
        </>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      if (apiKey && window.electronAPI) {
        window.electronAPI
          .getSetting("app_settings")
          .then((settings) => {
            const typedSettings = settings as AppSettings | null;
            if (typedSettings) {
              typedSettings.llm = {
                ...typedSettings.llm,
                apiKey,
              };
              return window.electronAPI.setSetting("app_settings", typedSettings);
            }
          })
          .catch(console.error);
      }
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isFirstLaunch) {
    return null;
  }

  const currentStepData = steps[currentStep];

  return (
    <div className="welcome-overlay">
      <div className="welcome-container">
        <div className="welcome-header">
          <h2>{currentStepData.title}</h2>
          <div className="step-indicator">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>

        <div className="welcome-content">{currentStepData.content}</div>

        <div className="welcome-footer">
          {currentStep > 0 && (
            <button className="secondary" onClick={handleBack}>
              Back
            </button>
          )}

          <button className="primary" onClick={handleNext}>
            {currentStep === steps.length - 1 ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
