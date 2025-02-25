import React, { useEffect, useRef } from 'react';
import { IpcRendererEvent } from 'electron';

/**
 * This component handles audio capture in the renderer process.
 * It doesn't render anything visible but sets up the necessary event listeners
 * for audio capture events.
 */
const AudioCapture: React.FC = () => {
  console.log('AudioCapture component rendering');
  
  // Track active streams and audio context
  const streamsRef = useRef<MediaStream[]>([]);
  
  // Cleanup function to stop streams
  const cleanupAudio = () => {
    console.log('Cleaning up audio streams');
    
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
    
    // SIMPLIFIED VERSION: Just handle events and log, no audio processing yet
    
    // Handler for starting audio capture - just log for now
    const handleStartAudioStream = async (event: IpcRendererEvent, options: { 
      sourceId?: string;
      deviceId?: string;
      isSystemAudio: boolean;
    }) => {
      console.log('Received start audio stream event with options:', options);
      
      try {
        // Just fake success for now
        if (window.electronAPI) {
          console.log('Sending dummy audio data as proof of IPC communication');
          const dummyData = new Uint8Array(10).fill(128);
          window.electronAPI.sendAudioData(dummyData);
        }
      } catch (error) {
        console.error('Error in simplified audio handling:', error);
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