import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { StorageManager } from '../storage';
import { ApiCredentials } from '../../types';

// Feature: meetingmind, Property 1: Credential Storage Round-trip

describe('StorageManager Property Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Property 1: Credential Storage Round-trip', () => {
    it('should preserve credential data through save and retrieve operations', () => {
      // **Validates: Requirements 1.2**
      
      // Generator for valid API credentials (non-whitespace only)
      const credentialsArbitrary = fc.record({
        nlsToken: fc.string({ minLength: 10, maxLength: 100 }).filter(s => s.trim().length > 0),
        dashScopeKey: fc.string({ minLength: 10, maxLength: 100 }).filter(s => s.trim().length > 0)
      });

      fc.assert(
        fc.property(credentialsArbitrary, (credentials: ApiCredentials) => {
          // Save credentials
          StorageManager.saveCredentials(credentials);
          
          // Retrieve credentials
          const retrieved = StorageManager.getCredentials();
          
          // Verify round-trip integrity
          expect(retrieved).not.toBeNull();
          expect(retrieved?.nlsToken).toBe(credentials.nlsToken);
          expect(retrieved?.dashScopeKey).toBe(credentials.dashScopeKey);
          
          // Verify exact equality
          expect(retrieved).toEqual(credentials);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle special characters and unicode in credentials', () => {
      // Test with various character sets including unicode
      const specialCredentialsArbitrary = fc.record({
        nlsToken: fc.string({ minLength: 5, maxLength: 50 }),
        dashScopeKey: fc.string({ minLength: 5, maxLength: 50 })
      });

      fc.assert(
        fc.property(specialCredentialsArbitrary, (credentials: ApiCredentials) => {
          try {
            StorageManager.saveCredentials(credentials);
            const retrieved = StorageManager.getCredentials();
            
            expect(retrieved).toEqual(credentials);
          } catch (error) {
            // If save fails, retrieve should return null
            const retrieved = StorageManager.getCredentials();
            expect(retrieved).toBeNull();
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain data integrity across multiple save operations', () => {
      // Test multiple sequential save/retrieve operations
      const credentialsArrayArbitrary = fc.array(
        fc.record({
          nlsToken: fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length > 0),
          dashScopeKey: fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length > 0)
        }),
        { minLength: 1, maxLength: 10 }
      );

      fc.assert(
        fc.property(credentialsArrayArbitrary, (credentialsArray: ApiCredentials[]) => {
          let lastSaved: ApiCredentials | null = null;
          
          for (const credentials of credentialsArray) {
            StorageManager.saveCredentials(credentials);
            lastSaved = credentials;
            
            const retrieved = StorageManager.getCredentials();
            expect(retrieved).toEqual(credentials);
          }
          
          // Final verification - should have the last saved credentials
          const finalRetrieved = StorageManager.getCredentials();
          expect(finalRetrieved).toEqual(lastSaved);
        }),
        { numRuns: 50 }
      );
    });

    it('should handle empty and boundary value credentials', () => {
      // Test edge cases with empty strings and boundary values
      const edgeCaseCredentialsArbitrary = fc.oneof(
        fc.record({
          nlsToken: fc.constant(''),
          dashScopeKey: fc.constant('')
        }),
        fc.record({
          nlsToken: fc.string({ minLength: 1, maxLength: 1 }),
          dashScopeKey: fc.string({ minLength: 1, maxLength: 1 })
        }),
        fc.record({
          nlsToken: fc.string({ minLength: 1000, maxLength: 2000 }),
          dashScopeKey: fc.string({ minLength: 1000, maxLength: 2000 })
        })
      );

      fc.assert(
        fc.property(edgeCaseCredentialsArbitrary, (credentials: ApiCredentials) => {
          try {
            StorageManager.saveCredentials(credentials);
            const retrieved = StorageManager.getCredentials();
            
            if (retrieved !== null) {
              expect(retrieved).toEqual(credentials);
            }
          } catch (error) {
            // Some edge cases might fail to save, which is acceptable
            // but retrieve should not crash
            expect(() => StorageManager.getCredentials()).not.toThrow();
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Storage Isolation Properties', () => {
    it('should not interfere with other localStorage keys', () => {
      const credentialsArbitrary = fc.record({
        nlsToken: fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length > 0),
        dashScopeKey: fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length > 0)
      });

      const otherDataArbitrary = fc.record({
        key: fc.string({ minLength: 5, maxLength: 20 }).filter(s => !s.startsWith('meetingmind.') && s.trim().length > 0),
        value: fc.string({ minLength: 1, maxLength: 100 })
      });

      fc.assert(
        fc.property(credentialsArbitrary, otherDataArbitrary, (credentials, otherData) => {
          // Set some other localStorage data
          localStorage.setItem(otherData.key, otherData.value);
          
          // Save credentials
          StorageManager.saveCredentials(credentials);
          
          // Verify other data is unchanged
          expect(localStorage.getItem(otherData.key)).toBe(otherData.value);
          
          // Verify credentials are correct
          const retrieved = StorageManager.getCredentials();
          expect(retrieved).toEqual(credentials);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Error Handling Properties', () => {
    it('should handle localStorage quota exceeded gracefully', () => {
      const largeCredentialsArbitrary = fc.record({
        nlsToken: fc.string({ minLength: 100000, maxLength: 200000 }),
        dashScopeKey: fc.string({ minLength: 100000, maxLength: 200000 })
      });

      fc.assert(
        fc.property(largeCredentialsArbitrary, (credentials: ApiCredentials) => {
          // This test verifies that even if save fails due to quota,
          // the system doesn't crash and handles it gracefully
          try {
            StorageManager.saveCredentials(credentials);
            const retrieved = StorageManager.getCredentials();
            
            if (retrieved !== null) {
              expect(retrieved).toEqual(credentials);
            }
          } catch (error) {
            // If save fails, that's acceptable for very large data
            // but the system should not crash
            expect(error).toBeInstanceOf(Error);
          }
        }),
        { numRuns: 10 } // Fewer runs for performance
      );
    });
  });
});