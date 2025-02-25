const { contextBridge, ipcRenderer } = require('electron');

// Add this safety wrapper for all IPC operations
function safeIpcInvoke(channel, ...args) {
  try {
    return ipcRenderer.invoke(channel, ...args);
  } catch (error) {
    console.error(`IPC invoke error (${channel}):`, error);
    return Promise.reject(error);
  }
}

// Add this safety wrapper for all IPC sends
function safeIpcSend(channel, ...args) {
  try {
    ipcRenderer.send(channel, ...args);
  } catch (error) {
    console.error(`IPC send error (${channel}):`, error);
  }
}

contextBridge.exposeInMainWorld('audioCaptureFix', {
  // Get sources from main process
  receiveSources: (callback) => {
    const safeCallback = (event, sources) => {
      try {
        callback(sources);
      } catch (error) {
        console.error('Error in sources callback:', error);
      }
    };
    
    ipcRenderer.on('capture-sources', safeCallback);
    
    return () => {
      ipcRenderer.removeListener('capture-sources', safeCallback);
    };
  },
  
  // Request fresh sources
  refreshSources: async () => {
    console.log('Requesting fresh capture sources...');
    return await safeIpcInvoke('refresh-sources');
  },
  
  // Function to test microphone capture only - MUCH more defensive
  testMicrophoneCapture: async () => {
    console.log('Testing microphone capture...');
    
    try {
      // Simple microphone request - this should work
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      // Create a more stable return value
      const tracks = stream.getAudioTracks();
      const trackInfo = tracks.map(track => ({
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        state: track.readyState
      }));
      
      console.log('Microphone capture successful!');
      console.log(`Got ${tracks.length} audio tracks:`);
      tracks.forEach((track, i) => {
        console.log(`Track ${i}: ${track.kind} "${track.label}" (${track.readyState})`);
      });
      
      // Return a cleaner object
      return { 
        success: true, 
        trackCount: tracks.length,
        trackInfo: trackInfo,
        // Important: Store the stream for stopping later
        _stream: stream
      };
    } catch (error) {
      console.error('Microphone capture failed:', error);
      return { 
        success: false, 
        error: {
          name: error.name || 'Unknown',
          message: error.message || 'No error message'
        } 
      };
    }
  },
  
  // Safer test for system audio that avoids the crash
  testCaptureSource: async (sourceId) => {
    if (!sourceId) {
      return { success: false, error: { name: 'InvalidInput', message: 'No source ID provided' }};
    }
    
    console.log(`Testing system audio capture for source: ${sourceId}`);
    
    // Log important diagnostic info for debugging
    console.log('Platform:', navigator.platform);
    console.log('User agent:', navigator.userAgent);
    
    try {
      // IMPORTANT: On macOS, we need to handle system audio differently to avoid IPC crashes
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      if (isMac) {
        console.log('On macOS, using alternate testing approach for system audio');
        
        // On macOS, first check if we can just get info about the audio capabilities
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioDevices = devices.filter(device => device.kind === 'audioinput');
          console.log(`Found ${audioDevices.length} audio input devices`);
          
          // Don't try to actually capture, just check our constraints
          console.log('Validating constraints for desktop capture');
          console.log('Source ID:', sourceId);
          
          // Report success but don't actually capture to avoid crash
          return { 
            success: false, 
            error: {
              name: 'MacOSLimitation',
              message: 'On macOS, system audio testing is limited to prevent renderer crashes.'
            },
            diagnostic: {
              platform: navigator.platform,
              sourceId,
              audioDevices: audioDevices.length,
              recommendedAction: 'Use the main app with enhanced error handling instead.'
            }
          };
        } catch (enumError) {
          console.error('Error enumerating devices:', enumError);
          return { 
            success: false, 
            error: {
              name: enumError.name || 'EnumerationError',
              message: enumError.message || 'Failed to enumerate audio devices'
            }
          };
        }
      }
      
      // If not on macOS, proceed with normal approach
      const constraints = {
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId
          }
        },
        video: false
      };
      
      console.log('Requesting system audio with constraints');
      
      // Very defensive approach with timeouts
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getUserMedia timeout after 3 seconds')), 3000)
      );
      
      const mediaPromise = (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          // Log success details for debugging
          const tracks = stream.getAudioTracks();
          const trackInfo = tracks.map(track => ({
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            state: track.readyState
          }));
          
          console.log(`✅ System audio capture successful for ${sourceId}`);
          console.log(`Got ${tracks.length} audio tracks`);
          
          return { 
            success: true, 
            trackCount: tracks.length,
            trackInfo: trackInfo,
            _stream: stream
          };
        } catch (mediaError) {
          throw mediaError;
        }
      })();
      
      return await Promise.race([mediaPromise, timeoutPromise]);
    } catch (outerError) {
      console.error('Outer error in system audio capture:', outerError);
      return { 
        success: false, 
        error: {
          name: outerError.name || 'UnknownError',
          message: outerError.message || 'Unknown error in system audio capture'
        } 
      };
    }
  },
  
  // Properly stop a stream
  stopStream: (resultObject) => {
    try {
      if (!resultObject) {
        console.log('No stream result to stop');
        return false;
      }
      
      // Get the stream from our _stream property
      const stream = resultObject._stream;
      
      if (!stream) {
        console.log('No stream found to stop');
        return false;
      }
      
      // Get and stop all tracks
      if (typeof stream.getTracks !== 'function') {
        console.log('Stream does not have getTracks method');
        return false;
      }
      
      const tracks = stream.getTracks();
      if (tracks && tracks.length > 0) {
        console.log(`Stopping ${tracks.length} tracks`);
        tracks.forEach(track => {
          track.stop();
          console.log(`Stopped ${track.kind} track: ${track.label}`);
        });
        return true;
      } else {
        console.log('No tracks found to stop');
        return false;
      }
    } catch (error) {
      console.error('Error stopping tracks:', error);
      return false;
    }
  }
}); 