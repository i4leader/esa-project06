import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PCMEncoder } from '../pcm-encoder';
import { AUDIO_CONFIG } from '../constants';

// Feature: meetingmind, Property 3: Audio PCM Encoding Preservation

describe('PCMEncoder Property Tests', () => {
  let encoder: PCMEncoder;

  beforeEach(() => {
    encoder = new PCMEncoder(
      AUDIO_CONFIG.SAMPLE_RATE,
      AUDIO_CONFIG.CHANNELS,
      AUDIO_CONFIG.BIT_DEPTH
    );
  });

  describe('Property 3: Audio PCM Encoding Preservation', () => {
    it('should preserve essential audio characteristics during PCM encoding', () => {
      // **Validates: Requirements 2.3**
      
      // Generator for valid audio data
      const audioDataArbitrary = fc.array(
        fc.float({ min: -1, max: 1, noNaN: true }),
        { minLength: 1, maxLength: 4096 }
      ).map(arr => new Float32Array(arr));

      fc.assert(
        fc.property(audioDataArbitrary, (audioData: Float32Array) => {
          // Encode to PCM
          const pcmBuffer = encoder.encode(audioData);
          
          // Verify buffer properties
          expect(pcmBuffer).toBeInstanceOf(ArrayBuffer);
          expect(pcmBuffer.byteLength).toBe(audioData.length * 2); // 16-bit = 2 bytes per sample
          
          // Verify data integrity by decoding back
          const dataView = new DataView(pcmBuffer);
          const decodedSamples: number[] = [];
          
          for (let i = 0; i < audioData.length; i++) {
            const pcmSample = dataView.getInt16(i * 2, true); // little-endian
            const floatSample = pcmSample < 0 ? pcmSample / 0x8000 : pcmSample / 0x7FFF;
            decodedSamples.push(floatSample);
          }
          
          // Verify that decoded samples are close to original (within quantization error)
          for (let i = 0; i < audioData.length; i++) {
            const original = audioData[i];
            const decoded = decodedSamples[i];
            const error = Math.abs(original - decoded);
            
            // Allow for 16-bit quantization error (approximately 1/32768)
            expect(error).toBeLessThan(1 / 16384);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle boundary values correctly', () => {
      const boundaryValuesArbitrary = fc.oneof(
        // Silence
        fc.constant(new Float32Array([0, 0, 0, 0])),
        // Maximum positive
        fc.constant(new Float32Array([1, 1, 1, 1])),
        // Maximum negative
        fc.constant(new Float32Array([-1, -1, -1, -1])),
        // Mixed boundaries
        fc.constant(new Float32Array([-1, 0, 1, 0.5, -0.5]))
      );

      fc.assert(
        fc.property(boundaryValuesArbitrary, (audioData: Float32Array) => {
          const pcmBuffer = encoder.encode(audioData);
          
          expect(pcmBuffer.byteLength).toBe(audioData.length * 2);
          
          const dataView = new DataView(pcmBuffer);
          
          for (let i = 0; i < audioData.length; i++) {
            const pcmSample = dataView.getInt16(i * 2, true);
            
            // Verify PCM sample is within valid 16-bit range
            expect(pcmSample).toBeGreaterThanOrEqual(-32768);
            expect(pcmSample).toBeLessThanOrEqual(32767);
            
            // Verify correct mapping of boundary values
            if (audioData[i] === 1) {
              expect(pcmSample).toBe(32767);
            } else if (audioData[i] === -1) {
              expect(pcmSample).toBe(-32768);
            } else if (audioData[i] === 0) {
              expect(pcmSample).toBe(0);
            }
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should maintain sample count during encoding', () => {
      const variableLengthAudioArbitrary = fc.array(
        fc.float({ min: -1, max: 1, noNaN: true }),
        { minLength: 1, maxLength: 8192 }
      ).map(arr => new Float32Array(arr));

      fc.assert(
        fc.property(variableLengthAudioArbitrary, (audioData: Float32Array) => {
          const pcmBuffer = encoder.encode(audioData);
          
          // Sample count should be preserved
          const expectedByteLength = audioData.length * 2;
          expect(pcmBuffer.byteLength).toBe(expectedByteLength);
          
          // Should be able to extract exactly the same number of samples
          const sampleCount = pcmBuffer.byteLength / 2;
          expect(sampleCount).toBe(audioData.length);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Resampling Properties', () => {
    it('should preserve audio characteristics during resampling', () => {
      const resamplingTestArbitrary = fc.record({
        audioData: fc.array(
          fc.float({ min: -1, max: 1, noNaN: true }),
          { minLength: 100, maxLength: 1000 }
        ).map(arr => new Float32Array(arr)),
        sourceSampleRate: fc.oneof(
          fc.constant(8000),
          fc.constant(16000),
          fc.constant(22050),
          fc.constant(44100),
          fc.constant(48000)
        )
      });

      fc.assert(
        fc.property(resamplingTestArbitrary, ({ audioData, sourceSampleRate }) => {
          const resampled = encoder.resample(audioData, sourceSampleRate);
          
          // Verify output is valid
          expect(resampled).toBeInstanceOf(Float32Array);
          expect(resampled.length).toBeGreaterThan(0);
          
          // Calculate expected length based on resampling ratio
          const ratio = sourceSampleRate / AUDIO_CONFIG.SAMPLE_RATE;
          const expectedLength = Math.round(audioData.length / ratio);
          
          // Allow for small rounding differences
          expect(Math.abs(resampled.length - expectedLength)).toBeLessThanOrEqual(1);
          
          // Verify all samples are within valid range
          for (let i = 0; i < resampled.length; i++) {
            expect(resampled[i]).toBeGreaterThanOrEqual(-1);
            expect(resampled[i]).toBeLessThanOrEqual(1);
            expect(isNaN(resampled[i])).toBe(false);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should be identity function when source and target sample rates match', () => {
      const audioDataArbitrary = fc.array(
        fc.float({ min: -1, max: 1, noNaN: true }),
        { minLength: 10, maxLength: 1000 }
      ).map(arr => new Float32Array(arr));

      fc.assert(
        fc.property(audioDataArbitrary, (audioData: Float32Array) => {
          const resampled = encoder.resample(audioData, AUDIO_CONFIG.SAMPLE_RATE);
          
          // Should return the same data when sample rates match
          expect(resampled.length).toBe(audioData.length);
          
          for (let i = 0; i < audioData.length; i++) {
            expect(resampled[i]).toBe(audioData[i]);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Stereo to Mono Conversion Properties', () => {
    it('should correctly average stereo channels to mono', () => {
      const stereoAudioArbitrary = fc.record({
        leftChannel: fc.array(
          fc.float({ min: -1, max: 1, noNaN: true }),
          { minLength: 10, maxLength: 1000 }
        ).map(arr => new Float32Array(arr)),
        rightChannel: fc.array(
          fc.float({ min: -1, max: 1, noNaN: true }),
          { minLength: 10, maxLength: 1000 }
        ).map(arr => new Float32Array(arr))
      });

      fc.assert(
        fc.property(stereoAudioArbitrary, ({ leftChannel, rightChannel }) => {
          const mono = encoder.stereoToMono(leftChannel, rightChannel);
          
          const minLength = Math.min(leftChannel.length, rightChannel.length);
          expect(mono.length).toBe(minLength);
          
          for (let i = 0; i < minLength; i++) {
            const expectedValue = (leftChannel[i] + rightChannel[i]) / 2;
            expect(mono[i]).toBeCloseTo(expectedValue, 5); // Reduced precision to handle floating-point errors
            
            // Verify output is within valid range
            expect(mono[i]).toBeGreaterThanOrEqual(-1);
            expect(mono[i]).toBeLessThanOrEqual(1);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Audio Level Calculation Properties', () => {
    it('should calculate consistent RMS values', () => {
      const audioDataArbitrary = fc.array(
        fc.float({ min: -1, max: 1, noNaN: true }),
        { minLength: 10, maxLength: 1000 }
      ).map(arr => new Float32Array(arr));

      fc.assert(
        fc.property(audioDataArbitrary, (audioData: Float32Array) => {
          const rms1 = encoder.calculateRMS(audioData);
          const rms2 = encoder.calculateRMS(audioData);
          
          // RMS calculation should be deterministic
          expect(rms1).toBe(rms2);
          
          // RMS should be non-negative
          expect(rms1).toBeGreaterThanOrEqual(0);
          
          // RMS should be <= 1 for normalized audio
          expect(rms1).toBeLessThanOrEqual(1);
          
          // For silence, RMS should be 0
          const silence = new Float32Array(audioData.length);
          const silenceRMS = encoder.calculateRMS(silence);
          expect(silenceRMS).toBe(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should normalize audio levels consistently', () => {
      const rmsArbitrary = fc.float({ min: 0, max: 1, noNaN: true });

      fc.assert(
        fc.property(rmsArbitrary, (rms: number) => {
          const normalized1 = encoder.normalizeAudioLevel(rms);
          const normalized2 = encoder.normalizeAudioLevel(rms);
          
          // Normalization should be deterministic
          expect(normalized1).toBe(normalized2);
          
          // Normalized level should be in [0, 1] range
          expect(normalized1).toBeGreaterThanOrEqual(0);
          expect(normalized1).toBeLessThanOrEqual(1);
          
          // Zero RMS should give zero normalized level
          expect(encoder.normalizeAudioLevel(0)).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('High-Pass Filter Properties', () => {
    it('should preserve signal characteristics while filtering', () => {
      const filterTestArbitrary = fc.record({
        audioData: fc.array(
          fc.float({ min: -1, max: 1, noNaN: true }),
          { minLength: 100, maxLength: 1000 }
        ).map(arr => new Float32Array(arr)),
        cutoffFreq: fc.float({ min: 20, max: 200, noNaN: true })
      });

      fc.assert(
        fc.property(filterTestArbitrary, ({ audioData, cutoffFreq }) => {
          const filtered = encoder.highPassFilter(audioData, cutoffFreq);
          
          // Output should have same length
          expect(filtered.length).toBe(audioData.length);
          
          // All samples should be valid numbers within reasonable range
          for (let i = 0; i < filtered.length; i++) {
            expect(isNaN(filtered[i])).toBe(false);
            expect(isFinite(filtered[i])).toBe(true);
            // Filter may amplify or attenuate, but shouldn't create extreme values
            expect(Math.abs(filtered[i])).toBeLessThan(10);
          }
        }),
        { numRuns: 50 }
      );
    });
  });
});