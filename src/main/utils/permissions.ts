import { systemPreferences, shell } from "electron";

/**
 * Checks if microphone permission is granted
 * @returns Promise<boolean> - true if permission is granted
 */
export const checkMicrophonePermission = async (): Promise<boolean> => {
  if (process.platform !== "darwin") {
    // For non-macOS platforms, assume permission is granted
    return true;
  }

  const status = systemPreferences.getMediaAccessStatus("microphone");
  console.log(`Current microphone permission status: ${status}`);
  
  if (status === "granted") {
    return true;
  }
  
  // Request permission on macOS
  try {
    const granted = await systemPreferences.askForMediaAccess("microphone");
    console.log(`Microphone permission request result: ${granted}`);
    
    if (!granted) {
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
 * Checks if system audio recording is possible
 * Note: macOS doesn't have a direct permission API for system audio,
 * so we need to check if a virtual audio device is installed
 * @returns Promise<boolean>
 */
export const checkSystemAudioPermission = async (): Promise<boolean> => {
  if (process.platform !== "darwin") {
    // For non-macOS platforms, assume permission is granted
    return true;
  }
  
  // For macOS, system audio capture requires a virtual audio device
  // Here we're just checking microphone permissions as a proxy
  // In a real implementation, you would check for the presence of a virtual audio device
  return await checkMicrophonePermission();
};

/**
 * Opens system preferences for audio-related settings
 */
export const openAudioPreferences = (): void => {
  if (process.platform === "darwin") {
    shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.sound"
    );
  } else if (process.platform === "win32") {
    shell.openExternal("ms-settings:sound");
  }
}; 