import { AUDIO_CONFIG } from './constants';

/**
 * PCM Audio Encoder for converting Web Audio API data to PCM format
 */
export class PCMEncoder {
  private sampleRate: number;
  private channels: number;
  private bitDepth: number;

  constructor(
    sampleRate: number = AUDIO_CONFIG.SAMPLE_RATE,
    channels: number = AUDIO_CONFIG.CHANNELS,
    bitDepth: number = AUDIO_CONFIG.BIT_DEPTH
  ) {
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.bitDepth = bitDepth;
  }

  /**
   * Convert Float32Array audio data to PCM ArrayBuffer
   */
  encode(audioData: Float32Array): ArrayBuffer {
    const length = audioData.length;
    const arrayBuffer = new ArrayBuffer(length * 2); // 16-bit = 2 bytes per sample
    const dataView = new DataView(arrayBuffer);

    // Convert float32 samples to 16-bit PCM
    for (let i = 0; i < length; i++) {
      // Clamp the sample to [-1, 1] range
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      
      // Convert to 16-bit signed integer
      const pcmSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      
      // Write as little-endian 16-bit integer
      dataView.setInt16(i * 2, pcmSample, true);
    }

    return arrayBuffer;
  }

  /**
   * Resample audio data to target sample rate
   */
  resample(audioData: Float32Array, sourceSampleRate: number): Float32Array {
    if (sourceSampleRate === this.sampleRate) {
      return audioData;
    }

    const ratio = sourceSampleRate / this.sampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const resampled = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const sourceIndex = i * ratio;
      const index = Math.floor(sourceIndex);
      const fraction = sourceIndex - index;

      if (index + 1 < audioData.length) {
        // Linear interpolation
        resampled[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction;
      } else {
        resampled[i] = audioData[index] || 0;
      }
    }

    return resampled;
  }

  /**
   * Convert stereo to mono by averaging channels
   */
  stereoToMono(leftChannel: Float32Array, rightChannel: Float32Array): Float32Array {
    const length = Math.min(leftChannel.length, rightChannel.length);
    const mono = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      mono[i] = (leftChannel[i] + rightChannel[i]) / 2;
    }

    return mono;
  }

  /**
   * Apply a simple high-pass filter to reduce low-frequency noise
   */
  highPassFilter(audioData: Float32Array, cutoffFreq: number = 80): Float32Array {
    const filtered = new Float32Array(audioData.length);
    const rc = 1.0 / (cutoffFreq * 2 * Math.PI);
    const dt = 1.0 / this.sampleRate;
    const alpha = rc / (rc + dt);

    let prevInput = 0;
    let prevOutput = 0;

    for (let i = 0; i < audioData.length; i++) {
      const currentInput = audioData[i];
      const currentOutput = alpha * (prevOutput + currentInput - prevInput);
      
      filtered[i] = currentOutput;
      
      prevInput = currentInput;
      prevOutput = currentOutput;
    }

    return filtered;
  }

  /**
   * Calculate RMS (Root Mean Square) for audio level monitoring
   */
  calculateRMS(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  /**
   * Calculate audio level in decibels
   */
  calculateDecibels(rms: number): number {
    if (rms === 0) return -Infinity;
    return 20 * Math.log10(rms);
  }

  /**
   * Normalize audio level to 0-1 range for UI display
   */
  normalizeAudioLevel(rms: number): number {
    const db = this.calculateDecibels(rms);
    // Map -60dB to 0dB to 0-1 range
    const minDb = -60;
    const maxDb = 0;
    
    if (db <= minDb) return 0;
    if (db >= maxDb) return 1;
    
    return (db - minDb) / (maxDb - minDb);
  }

  /**
   * Process audio buffer from Web Audio API
   */
  processAudioBuffer(
    audioBuffer: AudioBuffer,
    sourceSampleRate: number
  ): { pcmData: ArrayBuffer; audioLevel: number } {
    let audioData: Float32Array;

    // Handle mono/stereo conversion
    if (audioBuffer.numberOfChannels === 1) {
      audioData = audioBuffer.getChannelData(0);
    } else {
      // Convert stereo to mono
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.getChannelData(1);
      audioData = this.stereoToMono(leftChannel, rightChannel);
    }

    // Resample if necessary
    if (sourceSampleRate !== this.sampleRate) {
      audioData = this.resample(audioData, sourceSampleRate);
    }

    // Apply high-pass filter to reduce noise
    audioData = this.highPassFilter(audioData);

    // Calculate audio level for UI feedback
    const rms = this.calculateRMS(audioData);
    const audioLevel = this.normalizeAudioLevel(rms);

    // Encode to PCM
    const pcmData = this.encode(audioData);

    return { pcmData, audioLevel };
  }

  /**
   * Create WAV header for debugging/testing purposes
   */
  createWAVHeader(dataLength: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, this.channels, true);
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * this.channels * (this.bitDepth / 8), true);
    view.setUint16(32, this.channels * (this.bitDepth / 8), true);
    view.setUint16(34, this.bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    return buffer;
  }
}