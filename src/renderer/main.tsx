import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

// Add debug logs
console.log("Renderer process starting");
console.log("electronReady:", window.electronReady);
console.log("electronAPI:", window.electronAPI);

// Wait for the electron bridge to be available
const renderApp = () => {
  console.log("Rendering app now");
  const rootElement = document.getElementById("root");
  console.log("Root element:", rootElement);
  
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    console.log("App rendered");
  } else {
    console.error("Root element not found!");
  }
};

// Check if we're running in Electron
if (window.electronReady !== undefined) {
  // If we are, we need to wait for the electronReady flag
  if (window.electronReady) {
    console.log("Electron is ready, rendering immediately");
    renderApp();
  } else {
    console.log("Waiting for Electron to be ready");
    const checkReady = setInterval(() => {
      console.log("Checking if Electron is ready...");
      if (window.electronReady) {
        console.log("Electron is now ready");
        clearInterval(checkReady);
        renderApp();
      }
    }, 100);
  }
} else {
  // Not running in Electron, render immediately
  console.log("Not running in Electron, rendering immediately");
  renderApp();
}
