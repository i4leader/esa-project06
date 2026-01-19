import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { useApiConfig } from '../useApiConfig';
import { ApiCredentials } from '../../types';

// Feature: meetingmind, Property 2: Credential Validation Consistency

// Mock WebSocket and fetch for testing
const mockWebSocket = vi.fn();
const mockFetch = vi.fn();

global.WebSocket = mockWebSocket as any;
global.fetch = mockFetch as any;

describe('useApiConfig Property Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Reset WebSocket mock
    mockWebSocket.mockClear();
    mockFetch.mockClear();
  });

  describe('Property 2: Credential Validation Consistency', () => {
    it('should return consistent validation results for the same credentials', async () => {
      // **Validates: Requirements 1.3, 1.4**
      
      const credentialsArbitrary = fc.record({
        nlsToken: fc.string({ minLength: 10, maxLength: 50 }),
        dashScopeKey: fc.string({ minLength: 10, maxLength: 50 })
      });

      await fc.assert(
        fc.asyncProperty(credentialsArbitrary, async (credentials: ApiCredentials) => {
          // Mock consistent responses for the same credentials
          const nlsValid = credentials.nlsToken.includes('valid');
          const dashScopeValid = credentials.dashScopeKey.includes('valid');
          
          // Mock WebSocket for NLS validation
          mockWebSocket.mockImplementation((url: string) => {
            const mockWs = {
              close: vi.fn(),
              onopen: null as any,
              onerror: null as any,
            };
            
            // Simulate connection result based on token
            setTimeout(() => {
              if (nlsValid && mockWs.onopen) {
                mockWs.onopen();
              } else if (mockWs.onerror) {
                mockWs.onerror();
              }
            }, 10);
            
            return mockWs;
          });

          // Mock fetch for DashScope validation
          mockFetch.mockResolvedValue({
            status: dashScopeValid ? 200 : 401
          });

          const { result } = renderHook(() => useApiConfig());

          // First validation
          await act(async () => {
            await result.current.saveCredentials(credentials);
          });
          
          const firstResult = result.current.isValid;
          const firstError = result.current.error;

          // Second validation with same credentials
          await act(async () => {
            await result.current.testConnection();
          });
          
          const secondResult = result.current.isValid;
          const secondError = result.current.error;

          // Results should be consistent
          expect(secondResult).toBe(firstResult);
          
          // Error states should be consistent
          if (firstError && secondError) {
            expect(secondError).toBe(firstError);
          } else {
            expect(secondError).toBe(firstError);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should handle validation state transitions correctly', async () => {
      const credentialsPairArbitrary = fc.tuple(
        fc.record({
          nlsToken: fc.string({ minLength: 10, maxLength: 50 }),
          dashScopeKey: fc.string({ minLength: 10, maxLength: 50 })
        }),
        fc.record({
          nlsToken: fc.string({ minLength: 10, maxLength: 50 }),
          dashScopeKey: fc.string({ minLength: 10, maxLength: 50 })
        })
      );

      await fc.assert(
        fc.asyncProperty(credentialsPairArbitrary, async ([creds1, creds2]) => {
          // Mock different validation results for different credentials
          let currentCreds: ApiCredentials = creds1;
          
          mockWebSocket.mockImplementation(() => {
            const mockWs = {
              close: vi.fn(),
              onopen: null as any,
              onerror: null as any,
            };
            
            setTimeout(() => {
              const isValid = currentCreds.nlsToken.length > 20;
              if (isValid && mockWs.onopen) {
                mockWs.onopen();
              } else if (mockWs.onerror) {
                mockWs.onerror();
              }
            }, 10);
            
            return mockWs;
          });

          mockFetch.mockImplementation(() => {
            const isValid = currentCreds.dashScopeKey.length > 20;
            return Promise.resolve({
              status: isValid ? 200 : 401
            });
          });

          const { result } = renderHook(() => useApiConfig());

          // Validate first credentials
          currentCreds = creds1;
          await act(async () => {
            await result.current.saveCredentials(creds1);
          });
          
          const firstValidation = result.current.isValid;

          // Validate second credentials
          currentCreds = creds2;
          await act(async () => {
            await result.current.saveCredentials(creds2);
          });
          
          const secondValidation = result.current.isValid;

          // If credentials are different, validation results may differ
          // But the validation logic should be consistent
          const expectedFirst = creds1.nlsToken.length > 20 && creds1.dashScopeKey.length > 20;
          const expectedSecond = creds2.nlsToken.length > 20 && creds2.dashScopeKey.length > 20;
          
          expect(firstValidation).toBe(expectedFirst);
          expect(secondValidation).toBe(expectedSecond);
        }),
        { numRuns: 30 }
      );
    });

    it('should maintain validation state integrity during loading', async () => {
      const credentialsArbitrary = fc.record({
        nlsToken: fc.string({ minLength: 10, maxLength: 50 }),
        dashScopeKey: fc.string({ minLength: 10, maxLength: 50 })
      });

      await fc.assert(
        fc.asyncProperty(credentialsArbitrary, async (credentials: ApiCredentials) => {
          // Mock delayed validation responses
          mockWebSocket.mockImplementation(() => {
            const mockWs = {
              close: vi.fn(),
              onopen: null as any,
              onerror: null as any,
            };
            
            // Delayed response
            setTimeout(() => {
              if (mockWs.onopen) {
                mockWs.onopen();
              }
            }, 100);
            
            return mockWs;
          });

          mockFetch.mockImplementation(() => {
            return new Promise(resolve => {
              setTimeout(() => {
                resolve({ status: 200 });
              }, 100);
            });
          });

          const { result } = renderHook(() => useApiConfig());

          // Start validation
          act(() => {
            result.current.saveCredentials(credentials);
          });

          // During loading, isLoading should be true
          expect(result.current.isLoading).toBe(true);
          
          // Wait for validation to complete
          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 150));
          });

          // After completion, isLoading should be false
          expect(result.current.isLoading).toBe(false);
          
          // Validation result should be stable
          const finalResult = result.current.isValid;
          
          // Test again to ensure consistency
          await act(async () => {
            await result.current.testConnection();
          });
          
          expect(result.current.isValid).toBe(finalResult);
        }),
        { numRuns: 20 }
      );
    });

    it('should handle network errors consistently', async () => {
      const credentialsArbitrary = fc.record({
        nlsToken: fc.string({ minLength: 10, maxLength: 50 }),
        dashScopeKey: fc.string({ minLength: 10, maxLength: 50 })
      });

      await fc.assert(
        fc.asyncProperty(credentialsArbitrary, async (credentials: ApiCredentials) => {
          // Mock network errors
          mockWebSocket.mockImplementation(() => {
            const mockWs = {
              close: vi.fn(),
              onopen: null as any,
              onerror: null as any,
            };
            
            setTimeout(() => {
              if (mockWs.onerror) {
                mockWs.onerror();
              }
            }, 10);
            
            return mockWs;
          });

          mockFetch.mockRejectedValue(new Error('Network error'));

          const { result } = renderHook(() => useApiConfig());

          // First validation attempt
          await act(async () => {
            await result.current.saveCredentials(credentials);
          });
          
          const firstError = result.current.error;
          const firstValid = result.current.isValid;

          // Second validation attempt
          await act(async () => {
            await result.current.testConnection();
          });
          
          const secondError = result.current.error;
          const secondValid = result.current.isValid;

          // Error handling should be consistent
          expect(secondValid).toBe(firstValid);
          
          // Both should indicate validation failure due to network error
          expect(firstValid).toBe(false);
          expect(secondValid).toBe(false);
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Validation Logic Properties', () => {
    it('should validate credentials independently', async () => {
      const mixedCredentialsArbitrary = fc.record({
        nlsToken: fc.oneof(
          fc.constant('valid_nls_token_12345'),
          fc.constant('invalid_token')
        ),
        dashScopeKey: fc.oneof(
          fc.constant('valid_dashscope_key_12345'),
          fc.constant('invalid_key')
        )
      });

      await fc.assert(
        fc.asyncProperty(mixedCredentialsArbitrary, async (credentials: ApiCredentials) => {
          const nlsValid = credentials.nlsToken.includes('valid');
          const dashScopeValid = credentials.dashScopeKey.includes('valid');
          
          mockWebSocket.mockImplementation(() => {
            const mockWs = {
              close: vi.fn(),
              onopen: null as any,
              onerror: null as any,
            };
            
            setTimeout(() => {
              if (nlsValid && mockWs.onopen) {
                mockWs.onopen();
              } else if (mockWs.onerror) {
                mockWs.onerror();
              }
            }, 10);
            
            return mockWs;
          });

          mockFetch.mockResolvedValue({
            status: dashScopeValid ? 200 : 401
          });

          const { result } = renderHook(() => useApiConfig());

          await act(async () => {
            await result.current.saveCredentials(credentials);
          });

          // Overall validation should require both to be valid
          const expectedOverallValid = nlsValid && dashScopeValid;
          expect(result.current.isValid).toBe(expectedOverallValid);
          
          // Error should be present if either validation fails
          if (!expectedOverallValid) {
            expect(result.current.error).toBeTruthy();
          }
        }),
        { numRuns: 40 }
      );
    });
  });
});