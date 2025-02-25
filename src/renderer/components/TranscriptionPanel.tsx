import React from "react";
import { Transcript, TranscriptionStatus } from "@common/types";

interface TranscriptionPanelProps {
  transcripts: Transcript[];
  status: TranscriptionStatus;
  onClear: () => void;
}

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  transcripts,
  status,
  onClear,
}) => {
  // Format timestamp to readable format
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Get status class based on current status
  const getStatusClass = () => {
    switch (status) {
      case TranscriptionStatus.CAPTURING:
        return "status-transcribing";
      case TranscriptionStatus.PROCESSING:
        return "status-thinking";
      case TranscriptionStatus.ERROR:
        return "status-error";
      case TranscriptionStatus.IDLE:
      default:
        return "status-idle";
    }
  };

  // Get status text based on current status
  const getStatusText = () => {
    switch (status) {
      case TranscriptionStatus.CAPTURING:
        return "Capturing Audio";
      case TranscriptionStatus.PROCESSING:
        return "Processing";
      case TranscriptionStatus.ERROR:
        return "Error";
      case TranscriptionStatus.IDLE:
      default:
        return "Idle";
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Conversation</h2>

        <div className="panel-header-actions">
          <div className={`status-indicator ${getStatusClass()}`}>
            <div className="status-dot"></div>
            <span>{getStatusText()}</span>
          </div>

          <button
            className="ghost"
            onClick={onClear}
            disabled={transcripts.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="panel-content">
        {transcripts.length === 0 ? (
          <div className="text-muted text-center p-4">
            No transcription data yet. Start capturing audio to see the
            conversation.
          </div>
        ) : (
          <div className="transcript-list">
            {transcripts.map((transcript) => (
              <div key={transcript.id} className="transcript-item">
                <div className="transcript-timestamp">
                  {transcript.speaker && <strong>{transcript.speaker}</strong>}{" "}
                  {formatTimestamp(transcript.timestamp)}
                </div>
                <div className="transcript-text">{transcript.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptionPanel;
