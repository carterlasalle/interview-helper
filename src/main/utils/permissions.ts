import { systemPreferences, shell } from "electron";

/**
 * Checks if microphone permission is granted
 * @returns Promise<boolean> - true if permission is granted
 */
export const checkMicrophonePermission = async (): Promise<boolean> => {
  if (process.platform !== "darwin") {
    // For non-macOS platforms, assume permission is granted
    console.log("Not on macOS, assuming microphone permission is granted");
    return true;
  }

  // Check current status first
  const status = systemPreferences.getMediaAccessStatus("microphone");
  console.log(`Current microphone permission status: ${status}`);
  
  if (status === "granted") {
    return true;
  }
  
  // If not granted, try to request it
  try {
    console.log("Requesting microphone permission via system dialog");
    const granted = await systemPreferences.askForMediaAccess("microphone");
    console.log(`Microphone permission request result: ${granted ? "granted" : "denied"}`);
    
    if (!granted) {
      console.log("Microphone permission denied, prompting to open System Preferences");
      // If denied, open system preferences
      shell.openExternal(
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
      );
      return false;
    }
    
    return granted;
  } catch (error) {
    console.error("Error requesting microphone permission:", error);
    return false;
  }
};

/**
 * Checks if system audio recording is possible via screen capture
 * On macOS, this requires ScreenCaptureKit permissions
 * @returns Promise<boolean>
 */
export const checkSystemAudioPermission = async (): Promise<boolean> => {
  if (process.platform !== "darwin") {
    // For non-macOS platforms, assume permission is granted
    console.log("Not on macOS, assuming system audio permission is granted");
    return true;
  }
  
  try {
    // On macOS, system audio capture requires screen recording permission
    // Check screen capture permission status
    const screenStatus = systemPreferences.getMediaAccessStatus("screen");
    console.log(`Current screen capture permission status: ${screenStatus}`);
    
    // Note: There's no official way to check window capture permission separately
    // from screen capture in the Electron API
    
    if (screenStatus === "granted") {
      console.log("Screen Recording permission is granted");
      return true;
    }
    
    // If not granted, we need to direct the user to System Preferences
    // macOS doesn't have an API to request screen capture permission programmatically
    console.log("Screen Recording permission not granted, prompting to open System Preferences");
    shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
    );
    
    // Return false as we've just directed the user to preferences
    return false;
  } catch (error) {
    console.error("Error checking system audio permission:", error);
    return false;
  }
};

/**
 * Opens system preferences for audio-related settings
 */
export const openAudioPreferences = (): void => {
  console.log("Opening system audio preferences");
  
  if (process.platform === "darwin") {
    shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.sound"
    );
  } else if (process.platform === "win32") {
    shell.openExternal("ms-settings:sound");
  }
}; 