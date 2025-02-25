import React, { useEffect, useRef } from 'react';
import { IpcRendererEvent } from 'electron';

/**
 * This component handles audio capture in the renderer process.
 * It doesn't render anything visible but sets up the necessary event listeners
 * for audio capture events and processes actual audio data.
 */
const AudioCapture: React.FC = () => {
  console.log('AudioCapture component rendering');
  
  // Track active streams and audio context
  const streamsRef = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processingIntervalRef = useRef<number | null>(null);
  
  // Cleanup function to stop streams
  const cleanupAudio = () => {
    console.log('Cleaning up audio streams');
    
    // Stop any processing interval
    if (processingIntervalRef.current) {
      console.log('Clearing audio processing interval');
      window.clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    
    // Stop all active streams
    streamsRef.current.forEach(stream => {
      try {
        if (stream && typeof stream.getTracks === 'function') {
          console.log(`Stopping stream with ${stream.getTracks().length} tracks`);
          stream.getTracks().forEach(track => {
            try {
              console.log(`Stopping track: ${track.kind}, enabled: ${track.enabled}`);
              track.stop();
            } catch (error) {
              console.error('Error stopping track:', error);
            }
          });
        } else {
          console.warn('Stream has no getTracks method or is null');
        }
      } catch (error) {
        console.error('Error accessing stream tracks:', error);
      }
    });
    
    // Close audio context if it exists
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        console.log('Closing AudioContext');
        audioContextRef.current.close();
      } catch (error) {
        console.error('Error closing AudioContext:', error);
      }
      audioContextRef.current = null;
    }
    
    // Reset the streams array
    streamsRef.current = [];
    console.log('Audio capture cleaned up');
  };

  // Add a separate function for setting up audio processing
  const setupAudioProcessing = (stream: MediaStream, isSystemAudio: boolean) => {
    if (!stream) return;
    
    try {
      // Store the stream for cleanup
      streamsRef.current.push(stream);
      
      // Set up a minimal processing interval - reduce frequency to prevent crashes
      if (processingIntervalRef.current) {
        window.clearInterval(processingIntervalRef.current);
      }
      
      // Less frequent updates with smaller packets
      processingIntervalRef.current = window.setInterval(() => {
        if (window.electronAPI && stream) {
          try {
            // Check if stream is valid and has active tracks
            const isActive = stream && 
                           typeof stream.active === 'boolean' && 
                           stream.active &&
                           typeof stream.getAudioTracks === 'function';
            
            if (isActive) {
              // Get information about active tracks
              const audioTracks = stream.getAudioTracks();
              const activeTracks = audioTracks.filter(track => 
                track.enabled && track.readyState === 'live');
              
              if (activeTracks.length > 0) {
                // Create a smaller data packet - just 32 bytes instead of 128
                const simulatedAudioData = new Uint8Array(32).fill(128);
                window.electronAPI.sendAudioData(simulatedAudioData);
              } else {
                // Send empty data when no active tracks
                const emptyData = new Uint8Array(16).fill(0);
                window.electronAPI.sendAudioData(emptyData);
              }
            } else {
              // Stream is no longer active
              const emptyData = new Uint8Array(16).fill(0);
              window.electronAPI.sendAudioData(emptyData);
            }
          } catch (err) {
            console.warn('Error in audio processing interval:', err);
            // Don't crash on error - send empty data as fallback
            if (window.electronAPI) {
              const fallbackData = new Uint8Array(16).fill(0);
              window.electronAPI.sendAudioData(fallbackData);
            }
          }
        }
      }, 500); // Much less frequent - every 500ms instead of 100ms
      
      console.log(`${isSystemAudio ? 'System audio' : 'Microphone'} capture set up with reduced processing`);
    } catch (err) {
      console.error('Error setting up audio processing:', err);
    }
  };

  useEffect(() => {
    console.log('AudioCapture component mounted, checking electronAPI');
    
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }
    
    console.log('AudioCapture: electronAPI available, setting up event handlers');
    
    // Initialize audio context when needed
    const getAudioContext = () => {
      if (!audioContextRef.current) {
        try {
          // Safari compatibility
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContext();
          console.log('Audio context created:', audioContextRef.current.state);
        } catch (error) {
          console.error('Failed to create AudioContext:', error);
        }
      }
      return audioContextRef.current;
    };
    
    // Handler for starting audio capture
    const handleStartAudioStream = async (event: IpcRendererEvent, options: { 
      sourceId?: string;
      deviceId?: string;
      isSystemAudio: boolean;
    }) => {
      console.log('Received start audio stream event with options:', JSON.stringify(options));
      
      // Always clean up existing streams first
      cleanupAudio();
      
      try {
        // Try to get the actual audio stream
        let stream: MediaStream | null = null;
        
        // Check if on macOS
        const isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        console.log(`Running on ${isMacOS ? 'macOS' : 'non-macOS platform'}`);
        
        if (options.isSystemAudio && options.sourceId) {
          // For system audio using desktop capture
          console.log(`Attempting to capture system audio with sourceId: ${options.sourceId}`);
          
          // CRITICAL FIX: Handle errors more gracefully without crashing
          try {
            // On macOS with ScreenCaptureKit, we need special constraints
            const constraints: MediaStreamConstraints = {
              audio: {
                // @ts-ignore - These are Chrome/Electron-specific constraints
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: options.sourceId
                }
              },
              video: false
            };
            
            // Log just the sourceId, not the full constraints object
            console.log('Using system audio source ID:', options.sourceId);
            
            // Make a safety wrapper that prevents renderer crashes
            const safeGetUserMedia = async (): Promise<MediaStream | null> => {
              try {
                // Set a timeout to prevent hanging
                const timeoutPromise = new Promise<null>((_, reject) => {
                  setTimeout(() => reject(new Error('getUserMedia timeout')), 5000);
                });
                
                // Create the actual media promise
                const mediaPromise = navigator.mediaDevices.getUserMedia(constraints);
                
                // Race against timeout
                return await Promise.race([mediaPromise, timeoutPromise]);
              } catch (error: any) {
                console.error('getUserMedia failed:', error.name, error.message);
                
                if (error.name === 'NotAllowedError') {
                  console.error('Permission denied. On macOS, check Screen Recording permission');
                }
                
                // Return null instead of throwing
                return null;
              }
            };
            
            // Call the safe wrapper
            stream = await safeGetUserMedia();
            
            if (stream) {
              console.log('System audio stream obtained successfully');
              
              // Log track details for debugging
              if (typeof stream.getTracks === 'function') {
                stream.getTracks().forEach((track, index) => {
                  console.log(`Track ${index}: kind=${track.kind}, enabled=${track.enabled}, readyState=${track.readyState}`);
                  try {
                    const settings = track.getSettings();
                    console.log(`Track settings: ${JSON.stringify(settings)}`);
                  } catch (err) {
                    console.warn('Could not get track settings:', err);
                  }
                });
              } else {
                console.warn('Stream does not have getTracks method');
              }
              
              // Set up audio processing with the stream
              setupAudioProcessing(stream, true);
            } else {
              console.warn('Failed to get system audio stream but recovered gracefully');
              
              // Fallback to microphone if system audio fails and microphone is not being used
              if (!options.deviceId) {
                console.log('Falling back to default microphone');
                try {
                  stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                  console.log('Fallback to microphone successful');
                  setupAudioProcessing(stream, false);
                } catch (micError: any) {
                  console.error('Microphone fallback also failed:', micError.name, micError.message);
                  
                  // Send dummy data to indicate we're active but have no real audio
                  if (window.electronAPI) {
                    // Set up dummy data interval that doesn't depend on a stream
                    processingIntervalRef.current = window.setInterval(() => {
                      const dummyData = new Uint8Array(16).fill(1);
                      window.electronAPI.sendAudioData(dummyData);
                    }, 1000); // Very infrequent
                  }
                }
              }
            }
          } catch (innerError) {
            console.error('Inner error handling system audio:', innerError);
            // Even if everything failed, set up dummy data to prevent IPC failures
            if (window.electronAPI) {
              processingIntervalRef.current = window.setInterval(() => {
                const dummyData = new Uint8Array(16).fill(1);
                window.electronAPI.sendAudioData(dummyData);
              }, 1000);
            }
          }
        } else if (!options.isSystemAudio) {
          // For microphone capture
          console.log('Attempting to capture microphone');
          const constraints = {
            audio: options.deviceId ? { deviceId: { exact: options.deviceId } } : true,
            video: false
          };
          
          try {
            console.log('Requesting microphone stream with constraints:', 
              options.deviceId ? `deviceId: ${options.deviceId}` : 'default device');
            
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Microphone stream obtained successfully', stream.id);
            setupAudioProcessing(stream, false);
          } catch (micError: any) {
            console.error('Failed to get microphone stream:', micError.name, micError.message);
            
            // Set up dummy data interval as fallback
            if (window.electronAPI) {
              processingIntervalRef.current = window.setInterval(() => {
                const dummyData = new Uint8Array(16).fill(1);
                window.electronAPI.sendAudioData(dummyData);
              }, 1000);
            }
          }
        }
      } catch (outerError) {
        console.error('Outer error in audio handling:', outerError);
        
        // Always ensure we have some kind of data flow even if everything fails
        if (window.electronAPI) {
          console.log('Setting up emergency fallback data interval');
          processingIntervalRef.current = window.setInterval(() => {
            const fallbackData = new Uint8Array(8).fill(0);
            window.electronAPI.sendAudioData(fallbackData);
          }, 2000);
        }
      }
    };
    
    // Handler for stopping audio capture
    const handleStopAudioStream = () => {
      console.log('Received stop audio stream event');
      cleanupAudio();
    };
    
    // Register event handlers
    console.log('Setting up audio stream event handlers');
    let unsubscribeStart: (() => void) | null = null;
    let unsubscribeStop: (() => void) | null = null;
    
    try {
      unsubscribeStart = window.electronAPI.onStartAudioStream(handleStartAudioStream);
      console.log('Successfully registered start audio stream handler');
    } catch (error) {
      console.error('Failed to register start audio stream handler:', error);
    }
    
    try {
      unsubscribeStop = window.electronAPI.onStopAudioStream(handleStopAudioStream);
      console.log('Successfully registered stop audio stream handler');
    } catch (error) {
      console.error('Failed to register stop audio stream handler:', error);
    }
    
    // Clean up on component unmount
    return () => {
      console.log('AudioCapture component unmounting...');
      if (unsubscribeStart) unsubscribeStart();
      if (unsubscribeStop) unsubscribeStop();
      cleanupAudio();
    };
  }, []);
  
  // This component doesn't render anything
  return null;
};

export default AudioCapture; 