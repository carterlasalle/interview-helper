import React, { useState, useEffect } from "react";
import { AppSettings } from "@common/types";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings?: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  initialSettings,
  onSave,
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeTab, setActiveTab] = useState<
    "audio" | "transcription" | "ai" | "privacy" | "ui"
  >("audio");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load settings when panel is opened
    if (isOpen) {
      if (initialSettings) {
        setSettings(initialSettings);
        setIsLoading(false);
      } else if (window.electronAPI) {
        // If no settings provided, try to load from electron store
        setIsLoading(true);
        window.electronAPI
          .getSetting("app_settings")
          .then((savedSettings) => {
            const typedSettings = savedSettings as AppSettings | null;
            if (typedSettings) {
              setSettings(typedSettings);
            } else {
              // Set defaults if no settings found
              setSettings({
                audio: {
                  captureSystemAudio: true,
                  captureMicrophone: true,
                  noiseReduction: true,
                },
                transcription: {
                  model: "whisper-1",
                  useLocalModel: false,
                  speakerIdentification: true,
                },
                llm: {
                  model: "gpt-4",
                  temperature: 0.7,
                },
                ui: {
                  theme: "system",
                  fontSize: 14,
                  position: {
                    x: 0,
                    y: 0,
                  },
                  size: {
                    width: 400,
                    height: 600,
                  },
                },
                privacy: {
                  storeConversationsLocally: true,
                  anonymizeTranscripts: false,
                  autoDeleteAfterDays: 30,
                },
              });
            }
            setIsLoading(false);
          })
          .catch((error) => {
            console.error("Error loading settings:", error);
            setIsLoading(false);
          });
      }
    }
  }, [isOpen, initialSettings]);

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.setSetting("app_settings", settings);
      }
      onSave(settings);
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
      // Show error notification
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = <K extends keyof AppSettings>(
    section: K,
    value: Partial<AppSettings[K]>,
  ) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        ...value,
      },
    });
  };

  if (!isOpen || !settings) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button ghost" onClick={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-tabs">
            <button
              className={`tab-button ${activeTab === "audio" ? "active" : ""}`}
              onClick={() => setActiveTab("audio")}
            >
              Audio
            </button>
            <button
              className={`tab-button ${activeTab === "transcription" ? "active" : ""}`}
              onClick={() => setActiveTab("transcription")}
            >
              Transcription
            </button>
            <button
              className={`tab-button ${activeTab === "ai" ? "active" : ""}`}
              onClick={() => setActiveTab("ai")}
            >
              AI Models
            </button>
            <button
              className={`tab-button ${activeTab === "privacy" ? "active" : ""}`}
              onClick={() => setActiveTab("privacy")}
            >
              Privacy
            </button>
            <button
              className={`tab-button ${activeTab === "ui" ? "active" : ""}`}
              onClick={() => setActiveTab("ui")}
            >
              Appearance
            </button>
          </div>

          <div className="settings-tab-content">
            {isLoading ? (
              <div className="loading-indicator">Loading settings...</div>
            ) : (
              <>
                {activeTab === "audio" && (
                  <div className="settings-section">
                    <h3>Audio Capture</h3>

                    <div className="settings-option">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.audio.captureSystemAudio}
                          onChange={(e) =>
                            updateSettings("audio", {
                              captureSystemAudio: e.target.checked,
                            })
                          }
                        />
                        Capture System Audio
                      </label>
                      <p className="settings-help">
                        Capture audio from other applications
                      </p>
                    </div>

                    <div className="settings-option">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.audio.captureMicrophone}
                          onChange={(e) =>
                            updateSettings("audio", {
                              captureMicrophone: e.target.checked,
                            })
                          }
                        />
                        Capture Microphone
                      </label>
                      <p className="settings-help">
                        Capture your microphone input
                      </p>
                    </div>

                    <div className="settings-option">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.audio.noiseReduction}
                          onChange={(e) =>
                            updateSettings("audio", {
                              noiseReduction: e.target.checked,
                            })
                          }
                        />
                        Noise Reduction
                      </label>
                      <p className="settings-help">
                        Apply noise reduction to audio
                      </p>
                    </div>

                    <div className="settings-option">
                      <label>Audio Device</label>
                      <select
                        value={settings.audio.deviceId ?? ""}
                        onChange={(e) =>
                          updateSettings("audio", {
                            deviceId: e.target.value || undefined,
                          })
                        }
                      >
                        <option value="">System Default</option>
                        {/* Device options would be populated from system */}
                        <option value="device1">Built-in Microphone</option>
                        <option value="device2">External Microphone</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeTab === "transcription" && (
                  <div className="settings-section">
                    <h3>Transcription</h3>

                    <div className="settings-option">
                      <label>Transcription Model</label>
                      <select
                        value={settings.transcription.model}
                        onChange={(e) =>
                          updateSettings("transcription", {
                            model: e.target.value,
                          })
                        }
                      >
                        <option value="whisper-1">Whisper v1 (Standard)</option>
                        <option value="whisper-large">
                          Whisper Large (Accurate)
                        </option>
                        <option value="whisper-small">
                          Whisper Small (Fast)
                        </option>
                      </select>
                    </div>

                    <div className="settings-option">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.transcription.useLocalModel}
                          onChange={(e) =>
                            updateSettings("transcription", {
                              useLocalModel: e.target.checked,
                            })
                          }
                        />
                        Use Local Model
                      </label>
                      <p className="settings-help">
                        Process transcription locally (requires download)
                      </p>
                    </div>

                    <div className="settings-option">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.transcription.speakerIdentification}
                          onChange={(e) =>
                            updateSettings("transcription", {
                              speakerIdentification: e.target.checked,
                            })
                          }
                        />
                        Speaker Identification
                      </label>
                      <p className="settings-help">
                        Attempt to identify different speakers
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "ai" && (
                  <div className="settings-section">
                    <h3>AI Models</h3>

                    <div className="settings-option">
                      <label>AI Model</label>
                      <select
                        value={settings.llm.model}
                        onChange={(e) =>
                          updateSettings("llm", { model: e.target.value })
                        }
                      >
                        <option value="gpt-4">GPT-4 (Most Capable)</option>
                        <option value="gpt-3.5-turbo">
                          GPT-3.5 Turbo (Faster)
                        </option>
                        <option value="claude-3">Claude 3</option>
                        <option value="mistral">Mistral</option>
                      </select>
                    </div>

                    <div className="settings-option">
                      <label>Temperature</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.llm.temperature}
                        onChange={(e) =>
                          updateSettings("llm", {
                            temperature: parseFloat(e.target.value),
                          })
                        }
                      />
                      <div className="range-values">
                        <span>Precise</span>
                        <span>{settings.llm.temperature.toFixed(1)}</span>
                        <span>Creative</span>
                      </div>
                    </div>

                    <div className="settings-option">
                      <label>API Key</label>
                      <input
                        type="password"
                        value={settings.llm.apiKey ?? ""}
                        onChange={(e) =>
                          updateSettings("llm", {
                            apiKey: e.target.value || undefined,
                          })
                        }
                        placeholder="Enter your API key"
                      />
                      <p className="settings-help">
                        Required for OpenAI/OpenRouter services
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "privacy" && (
                  <div className="settings-section">
                    <h3>Privacy</h3>

                    <div className="settings-option">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.privacy.storeConversationsLocally}
                          onChange={(e) =>
                            updateSettings("privacy", {
                              storeConversationsLocally: e.target.checked,
                            })
                          }
                        />
                        Store Conversations Locally
                      </label>
                      <p className="settings-help">
                        Save conversations to your device
                      </p>
                    </div>

                    <div className="settings-option">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.privacy.anonymizeTranscripts}
                          onChange={(e) =>
                            updateSettings("privacy", {
                              anonymizeTranscripts: e.target.checked,
                            })
                          }
                        />
                        Anonymize Transcripts
                      </label>
                      <p className="settings-help">
                        Remove potentially identifying information
                      </p>
                    </div>

                    <div className="settings-option">
                      <label>Auto-Delete After (Days)</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.privacy.autoDeleteAfterDays}
                        onChange={(e) =>
                          updateSettings("privacy", {
                            autoDeleteAfterDays: parseInt(e.target.value),
                          })
                        }
                      />
                      <p className="settings-help">
                        Automatically delete old conversations
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "ui" && (
                  <div className="settings-section">
                    <h3>Appearance</h3>

                    <div className="settings-option">
                      <label>Theme</label>
                      <select
                        value={settings.ui.theme}
                        onChange={(e) =>
                          updateSettings("ui", {
                            theme: e.target.value as
                              | "light"
                              | "dark"
                              | "system",
                          })
                        }
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System Default</option>
                      </select>
                    </div>

                    <div className="settings-option">
                      <label>Font Size</label>
                      <input
                        type="range"
                        min="12"
                        max="20"
                        step="1"
                        value={settings.ui.fontSize}
                        onChange={(e) =>
                          updateSettings("ui", {
                            fontSize: parseInt(e.target.value),
                          })
                        }
                      />
                      <div className="range-values">
                        <span>Small</span>
                        <span>{settings.ui.fontSize}px</span>
                        <span>Large</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="settings-footer">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            onClick={handleSave}
            disabled={isLoading || isSaving}
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
