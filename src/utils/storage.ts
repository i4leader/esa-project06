import { ApiCredentials, UserSettings, CacheData } from '../types';
import { STORAGE_KEYS } from './constants';

/**
 * Secure storage utility for managing localStorage operations
 */
export class StorageManager {
  /**
   * Save API credentials to localStorage
   */
  static saveCredentials(credentials: ApiCredentials): void {
    try {
      const encrypted = btoa(JSON.stringify(credentials));
      localStorage.setItem(STORAGE_KEYS.CREDENTIALS, encrypted);
    } catch (error) {
      console.error('Failed to save credentials:', error);
      throw new Error('Failed to save API credentials');
    }
  }

  /**
   * Retrieve API credentials from localStorage
   */
  static getCredentials(): ApiCredentials | null {
    try {
      const encrypted = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
      if (!encrypted) return null;
      
      const decrypted = atob(encrypted);
      return JSON.parse(decrypted) as ApiCredentials;
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      return null;
    }
  }

  /**
   * Clear API credentials from localStorage
   */
  static clearCredentials(): void {
    localStorage.removeItem(STORAGE_KEYS.CREDENTIALS);
  }

  /**
   * Save user settings to localStorage
   */
  static saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Failed to save user settings');
    }
  }

  /**
   * Retrieve user settings from localStorage
   */
  static getSettings(): UserSettings | null {
    try {
      const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Failed to retrieve settings:', error);
      return null;
    }
  }

  /**
   * Save session IDs list to localStorage
   */
  static saveSessions(sessionIds: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessionIds));
    } catch (error) {
      console.error('Failed to save sessions:', error);
      throw new Error('Failed to save session list');
    }
  }

  /**
   * Retrieve session IDs list from localStorage
   */
  static getSessions(): string[] {
    try {
      const sessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return sessions ? JSON.parse(sessions) : [];
    } catch (error) {
      console.error('Failed to retrieve sessions:', error);
      return [];
    }
  }

  /**
   * Add a new session ID to the list
   */
  static addSession(sessionId: string): void {
    const sessions = this.getSessions();
    if (!sessions.includes(sessionId)) {
      sessions.unshift(sessionId); // Add to beginning
      // Keep only last 50 sessions
      if (sessions.length > 50) {
        sessions.splice(50);
      }
      this.saveSessions(sessions);
    }
  }

  /**
   * Remove a session ID from the list
   */
  static removeSession(sessionId: string): void {
    const sessions = this.getSessions();
    const filtered = sessions.filter(id => id !== sessionId);
    this.saveSessions(filtered);
  }

  /**
   * Save cache data to localStorage
   */
  static saveCache(cache: CacheData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to save cache:', error);
      throw new Error('Failed to save cache data');
    }
  }

  /**
   * Retrieve cache data from localStorage
   */
  static getCache(): CacheData | null {
    try {
      const cache = localStorage.getItem(STORAGE_KEYS.CACHE);
      return cache ? JSON.parse(cache) : null;
    } catch (error) {
      console.error('Failed to retrieve cache:', error);
      return null;
    }
  }

  /**
   * Clear all stored data
   */
  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Check if localStorage is available
   */
  static isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage information
   */
  static getStorageInfo(): { used: number; available: number } {
    let used = 0;
    
    // Calculate used space
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }

    // Estimate available space (most browsers have ~5-10MB limit)
    const estimated = 5 * 1024 * 1024; // 5MB in bytes
    
    return {
      used,
      available: Math.max(0, estimated - used)
    };
  }
}