import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

// Wait for the electron bridge to be available
const renderApp = () => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
};

// Check if we're running in Electron
if (window.electronReady !== undefined) {
  // If we are, we need to wait for the electronReady flag
  if (window.electronReady) {
    renderApp();
  } else {
    const checkReady = setInterval(() => {
      if (window.electronReady) {
        clearInterval(checkReady);
        renderApp();
      }
    }, 100);
  }
} else {
  // Not running in Electron, render immediately
  renderApp();
}
