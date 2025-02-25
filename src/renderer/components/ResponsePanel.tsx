import React from "react";
import { AIResponse, AIResponseStatus } from "@common/types";

interface ResponsePanelProps {
  responses: AIResponse[];
  status: AIResponseStatus;
  onClear: () => void;
}

const ResponsePanel: React.FC<ResponsePanelProps> = ({
  responses,
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
      case AIResponseStatus.GENERATING:
        return "status-thinking";
      case AIResponseStatus.COMPLETE:
        return "status-speaking";
      case AIResponseStatus.ERROR:
        return "status-error";
      case AIResponseStatus.IDLE:
      default:
        return "status-idle";
    }
  };

  // Get status text based on current status
  const getStatusText = () => {
    switch (status) {
      case AIResponseStatus.GENERATING:
        return "Generating";
      case AIResponseStatus.COMPLETE:
        return "Complete";
      case AIResponseStatus.ERROR:
        return "Error";
      case AIResponseStatus.IDLE:
      default:
        return "Idle";
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>AI Responses</h2>

        <div className="panel-header-actions">
          <div className={`status-indicator ${getStatusClass()}`}>
            <div className="status-dot"></div>
            <span>{getStatusText()}</span>
          </div>

          <button
            className="ghost"
            onClick={onClear}
            disabled={responses.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="panel-content">
        {responses.length === 0 ? (
          <div className="text-muted text-center p-4">
            No responses yet. Ask a question or wait for AI to detect a question
            in the conversation.
          </div>
        ) : (
          <div className="response-list">
            {responses.map((response) => (
              <div key={response.id} className="response-item">
                <div className="response-timestamp">
                  {formatTimestamp(response.timestamp)}
                </div>
                <div className="response-question">{response.question}</div>
                <div className="response-answer">{response.answer}</div>
                <div className="response-confidence">
                  Confidence: {Math.round(response.confidence * 100)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponsePanel;
