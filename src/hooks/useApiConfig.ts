import { useState, useEffect, useCallback } from 'react';
import { ApiCredentials, ApiConfigHook } from '../types';
import { StorageManager } from '../utils/storage';
import { ERROR_MESSAGES, API_ENDPOINTS } from '../utils/constants';

/**
 * Hook for managing API credentials and validation
 */
export const useApiConfig = (): ApiConfigHook => {
  const [credentials, setCredentials] = useState<ApiCredentials | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load credentials on mount
  useEffect(() => {
    const savedCredentials = StorageManager.getCredentials();
    if (savedCredentials) {
      setCredentials(savedCredentials);
      // Validate credentials on load
      validateCredentials(savedCredentials);
    }
  }, []);

  /**
   * Validate NLS Token
   */
  const validateNLSToken = async (token: string): Promise<boolean> => {
    try {
      // Create a test WebSocket connection to NLS
      const wsUrl = `${API_ENDPOINTS.NLS_WEBSOCKET}?token=${token}`;
      const ws = new WebSocket(wsUrl);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
    } catch {
      return false;
    }
  };

  /**
   * Validate DashScope API Key
   */
  const validateDashScopeKey = async (apiKey: string): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.DASHSCOPE_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-turbo',
          input: {
            messages: [
              {
                role: 'user',
                content: 'test'
              }
            ]
          },
          parameters: {
            max_tokens: 1
          }
        })
      });

      // Even if the request fails, a 401 means invalid key, other errors mean valid key
      return response.status !== 401;
    } catch {
      // Network errors are treated as potentially valid (can't determine)
      return true;
    }
  };

  /**
   * Validate both credentials
   */
  const validateCredentials = async (creds: ApiCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check for empty or whitespace-only credentials
      if (!creds.nlsToken.trim() || !creds.dashScopeKey.trim()) {
        setError('Credentials cannot be empty or contain only whitespace');
        setIsValid(false);
        return false;
      }

      const [nlsValid, dashScopeValid] = await Promise.all([
        validateNLSToken(creds.nlsToken),
        validateDashScopeKey(creds.dashScopeKey)
      ]);

      const bothValid = nlsValid && dashScopeValid;
      setIsValid(bothValid);

      if (!bothValid) {
        setError(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      return bothValid;
    } catch (err) {
      setError('Failed to validate credentials');
      setIsValid(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save credentials to storage and validate
   */
  const saveCredentials = useCallback(async (creds: ApiCredentials): Promise<void> => {
    try {
      StorageManager.saveCredentials(creds);
      setCredentials(creds);
      await validateCredentials(creds);
    } catch (err) {
      setError('Failed to save credentials');
      throw err;
    }
  }, []);

  /**
   * Test connection with current credentials
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!credentials) {
      setError('No credentials available');
      return false;
    }

    return validateCredentials(credentials);
  }, [credentials]);

  return {
    credentials,
    saveCredentials,
    testConnection,
    isValid,
    isLoading,
    error
  };
};