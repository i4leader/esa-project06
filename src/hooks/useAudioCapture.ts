import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioCaptureHook } from '../types';
import { PCMEncoder } from '../utils/pcm-encoder';
import { AUDIO_CONFIG, ERROR_MESSAGES } from '../utils/constants';

/**
 * Hook for capturing and processing microphone audio
 */
export const useAudioCapture = (
  onAudioData?: (pcmData: ArrayBuffer) => void
): AudioCaptureHook => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmEncoderRef = useRef<PCMEncoder | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize PCM encoder
  useEffect(() => {
    pcmEncoderRef.current = new PCMEncoder(
      AUDIO_CONFIG.SAMPLE_RATE,
      AUDIO_CONFIG.CHANNELS,
      AUDIO_CONFIG.BIT_DEPTH
    );
  }, []);

  // Update duration while recording
  useEffect(() => {
    if (isRecording) {
      startTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setDuration(0);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording]);

  /**
   * Check if Web Audio API is supported
   */
  const isWebAudioSupported = (): boolean => {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  };

  /**
   * Check if getUserMedia is supported
   */
  const isGetUserMediaSupported = (): boolean => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  /**
   * Request microphone permissions and start recording
   */
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      // Check browser support
      if (!isWebAudioSupported()) {
        throw new Error('Web Audio API is not supported in this browser');
      }

      if (!isGetUserMediaSupported()) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
          channelCount: AUDIO_CONFIG.CHANNELS,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      mediaStreamRef.current = stream;

      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({
        sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
      });
      audioContextRef.current = audioContext;

      // Create audio source from stream
      const source = audioContext.createMediaStreamSource(stream);

      // Create analyser for audio level monitoring
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Create script processor for audio data processing
      const processor = audioContext.createScriptProcessor(
        AUDIO_CONFIG.BUFFER_SIZE,
        AUDIO_CONFIG.CHANNELS,
        AUDIO_CONFIG.CHANNELS
      );
      processorRef.current = processor;

      // Connect audio nodes
      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioContext.destination);

      // Process audio data
      processor.onaudioprocess = (event) => {
        if (!isRecording || !pcmEncoderRef.current || !onAudioData) return;

        const inputBuffer = event.inputBuffer;
        const { pcmData, audioLevel: level } = pcmEncoderRef.current.processAudioBuffer(
          inputBuffer,
          audioContext.sampleRate
        );

        // Update audio level for UI
        setAudioLevel(level);

        // Send PCM data to callback
        onAudioData(pcmData);
      };

      // Start audio level monitoring
      const updateAudioLevel = () => {
        if (!analyser || !isRecording) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalizedLevel = average / 255;

        setAudioLevel(normalizedLevel);

        if (isRecording) {
          requestAnimationFrame(updateAudioLevel);
        }
      };

      setIsRecording(true);
      updateAudioLevel();

    } catch (err) {
      console.error('Failed to start recording:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError(ERROR_MESSAGES.MICROPHONE_ACCESS_DENIED);
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to start audio recording');
      }
      
      // Clean up on error
      stopRecording();
    }
  }, [isRecording, onAudioData]);

  /**
   * Stop recording and clean up resources
   */
  const stopRecording = useCallback((): void => {
    setIsRecording(false);
    setAudioLevel(0);

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    // Clean up audio context
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioLevel,
    error,
    duration,
  };
};