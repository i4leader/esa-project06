import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from './src/utils/storage.js';

describe('Debug Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should handle the failing case', () => {
    const testCreds = { nlsToken: '         !', dashScopeKey: '         !' };
    console.log('Input:', JSON.stringify(testCreds));
    console.log('nlsToken trim length:', testCreds.nlsToken.trim().length);
    console.log('dashScopeKey trim length:', testCreds.dashScopeKey.trim().length);
    
    try {
      StorageManager.saveCredentials(testCreds);
      console.log('Save successful');
      
      const retrieved = StorageManager.getCredentials();
      console.log('Retrieved:', JSON.stringify(retrieved));
      
      expect(retrieved).not.toBeNull();
      expect(retrieved).toEqual(testCreds);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  });
});