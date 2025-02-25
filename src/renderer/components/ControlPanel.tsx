import React, { useState } from "react";
import { TranscriptionStatus } from "@common/types";

interface ControlPanelProps {
  onStartCapture: () => void;
  onStopCapture: () => void;
  onAskQuestion: (question: string) => void;
  captureStatus: TranscriptionStatus;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  onStartCapture,
  onStopCapture,
  onAskQuestion,
  captureStatus,
}) => {
  const [question, setQuestion] = useState("");

  const isCapturing = captureStatus === TranscriptionStatus.CAPTURING;

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onAskQuestion(question);
      setQuestion("");
    }
  };

  return (
    <div className="control-panel">
      <div className="control-buttons">
        {!isCapturing ? (
          <button onClick={onStartCapture} className="primary">
            Start Capture
          </button>
        ) : (
          <button onClick={onStopCapture} className="secondary">
            Stop Capture
          </button>
        )}
      </div>

      <form onSubmit={handleSubmitQuestion} className="input-field">
        <input
          type="text"
          placeholder="Ask a question directly..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={isCapturing}
        />
        <button type="submit" disabled={!question.trim() || isCapturing}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 12l7 3v7l4-5 7 2V3L4 9v8l5-2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ControlPanel;
