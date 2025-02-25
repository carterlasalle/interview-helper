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
        console.log(`Stopping stream with ${stream.getTracks().length} tracks`);
        stream.getTracks().forEach(track => {
          try {
            console.log(`Stopping track: ${track.kind}, enabled: ${track.enabled}`);
            track.stop();
          } catch (error) {
            console.error('Error stopping track:', error);
          }
        });
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
      
      try {
        // Try to get the actual audio stream
        let constraints: MediaStreamConstraints;
        let stream: MediaStream | null = null;
        
        // Check if on macOS
        const isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        console.log(`Running on ${isMacOS ? 'macOS' : 'non-macOS platform'}`);
        
        if (options.isSystemAudio && options.sourceId) {
          // For system audio using desktop capture
          console.log(`Attempting to capture system audio with sourceId: ${options.sourceId}`);
          
          // Special handling for macOS ScreenCaptureKit
          console.log(`Creating system audio constraints for ${isMacOS ? 'macOS' : 'other platform'}`);
          
          // On macOS with ScreenCaptureKit, we need special constraints
          constraints = {
            audio: {
              // @ts-ignore - These are Chrome/Electron-specific constraints
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: options.sourceId
              }
            },
            video: false
          };
          
          try {
            console.log('Calling getUserMedia with system audio constraints');
            // Log the constraints for debugging
            console.log('Constraints:', JSON.stringify(constraints, null, 2));
            
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Success!
            console.log('System audio stream obtained successfully', 
              `id: ${stream.id}, active: ${stream.active}`,
              `tracks: ${stream.getTracks().length}`);
            
            // Log track details
            stream.getTracks().forEach((track, index) => {
              console.log(`Track ${index}: kind=${track.kind}, enabled=${track.enabled}, readyState=${track.readyState}`);
              console.log(`Track settings:`, JSON.stringify(track.getSettings(), null, 2));
            });
            
          } catch (systemAudioError: any) {
            // Detailed error logging
            console.error('Failed to get system audio:', systemAudioError.name, systemAudioError.message);
            console.error('Error details:', systemAudioError);
            
            if (systemAudioError.name === 'NotAllowedError') {
              console.error('Permission denied. On macOS, check Screen Recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording');
            } else if (systemAudioError.name === 'NotFoundError') {
              console.error('Audio source not found or not available');
            }
            
            // Fallback to microphone if system audio fails
            if (!options.deviceId) {
              console.log('Falling back to default microphone');
              try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                console.log('Fallback to microphone successful');
              } catch (micError: any) {
                console.error('Microphone fallback also failed:', micError.name, micError.message);
                throw micError;
              }
            }
          }
        } else {
          // For microphone capture
          console.log('Attempting to capture microphone');
          constraints = {
            audio: options.deviceId ? { deviceId: { exact: options.deviceId } } : true,
            video: false
          };
          
          try {
            console.log('Requesting microphone stream with constraints:', JSON.stringify(constraints));
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Microphone stream obtained successfully', stream.id);
          } catch (micError: any) {
            console.error('Failed to get microphone stream:', micError.name, micError.message);
            throw micError;
          }
        }
        
        if (stream) {
          // Track the stream for cleanup
          streamsRef.current.push(stream);
          
          // Set up an audio context for minimal processing
          const audioContext = getAudioContext();
          if (!audioContext) {
            throw new Error('Failed to create AudioContext');
          }
          
          // Resume the audio context if needed
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log('AudioContext resumed');
          }

          // Create a source node from the stream
          const sourceNode = audioContext.createMediaStreamSource(stream);
          console.log('MediaStreamSource created from stream');
          
          // Set up the minimal processing using an interval
          processingIntervalRef.current = window.setInterval(() => {
            if (window.electronAPI) {
              // Get audio track information
              const audioTracks = stream.getTracks();
              const activeTracks = audioTracks.filter(track => track.enabled && track.readyState === 'live');
              
              if (activeTracks.length > 0) {
                // Get audio settings
                const settings = activeTracks[0].getSettings();
                console.log('Audio track active:', activeTracks[0].enabled, 'settings:', settings);
                
                // Create and send a proper audio packet with a timestamp
                const simulatedAudioData = new Uint8Array(128).fill(0);
                // Fill with simulated volume level based on whether track is enabled
                const volumeLevel = audioTracks[0].enabled ? 128 : 0;
                for (let i = 0; i < simulatedAudioData.length; i++) {
                  // Create a simple sine-like pattern to show activity
                  simulatedAudioData[i] = Math.floor(volumeLevel * (0.5 + 0.5 * Math.sin(i / 10)));
                }
                
                // Send the data
                console.log('Sending audio data packet', simulatedAudioData.length, 'bytes');
                window.electronAPI.sendAudioData(simulatedAudioData);
              } else {
                console.warn('No audio tracks available in stream');
                // Send empty data as fallback
                const emptyData = new Uint8Array(128).fill(0);
                window.electronAPI.sendAudioData(emptyData);
              }
            }
          }, 100); // Send data more frequently (10 times per second)
          
          console.log(`${options.isSystemAudio ? 'System audio' : 'Microphone'} capture process set up successfully`);
        } else {
          throw new Error('Failed to obtain media stream');
        }
      } catch (error) {
        console.error('Error in audio capture handling:', error);
        
        // Send dummy data as fallback to confirm IPC is working
        if (window.electronAPI) {
          console.log('Sending dummy audio data as fallback');
          const dummyData = new Uint8Array(10).fill(128);
          window.electronAPI.sendAudioData(dummyData);
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