import { useState, useRef, useCallback, useEffect } from 'react';
import { WebSocketHook, WebSocketConfig, WebSocketMessage } from '../types';
import { WEBSOCKET_CONFIG, CONNECTION_STATES, ERROR_MESSAGES } from '../utils/constants';

/**
 * Hook for managing WebSocket connections with automatic reconnection
 */
export const useWebSocket = (config: WebSocketConfig): WebSocketHook => {
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectDelayRef = useRef(config.reconnectDelay || WEBSOCKET_CONFIG.RECONNECT_DELAY);
  const isManuallyClosedRef = useRef(false);

  /**
   * Calculate exponential backoff delay
   */
  const calculateBackoffDelay = (attempt: number): number => {
    const baseDelay = config.reconnectDelay || WEBSOCKET_CONFIG.RECONNECT_DELAY;
    const maxDelay = WEBSOCKET_CONFIG.MAX_RECONNECT_DELAY;
    const multiplier = WEBSOCKET_CONFIG.BACKOFF_MULTIPLIER;
    
    const delay = baseDelay * Math.pow(multiplier, attempt);
    return Math.min(delay, maxDelay);
  };

  /**
   * Handle WebSocket connection
   */
  const handleConnect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionState('connecting');
    setError(null);
    isManuallyClosedRef.current = false;

    try {
      const ws = new WebSocket(config.url, config.protocols);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
        reconnectDelayRef.current = config.reconnectDelay || WEBSOCKET_CONFIG.RECONNECT_DELAY;
      };

      ws.onmessage = (event) => {
        try {
          let message: WebSocketMessage;
          
          if (typeof event.data === 'string') {
            // Parse JSON messages
            message = JSON.parse(event.data);
          } else {
            // Handle binary data (shouldn't happen for incoming messages in our case)
            console.warn('Received unexpected binary data');
            return;
          }
          
          setLastMessage(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        wsRef.current = null;
        
        if (!isManuallyClosedRef.current) {
          setConnectionState('disconnected');
          
          // Attempt reconnection if not manually closed
          const maxAttempts = config.reconnectAttempts || WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS;
          
          if (reconnectAttemptsRef.current < maxAttempts) {
            const delay = calculateBackoffDelay(reconnectAttemptsRef.current);
            reconnectDelayRef.current = delay;
            
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              handleConnect();
            }, delay);
          } else {
            setConnectionState('error');
            setError('Maximum reconnection attempts exceeded');
          }
        } else {
          setConnectionState('disconnected');
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(ERROR_MESSAGES.WEBSOCKET_CONNECTION_FAILED);
        
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          setConnectionState('error');
        }
      };

    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setConnectionState('error');
      setError('Failed to create WebSocket connection');
    }
  }, [config]);

  /**
   * Handle WebSocket disconnection
   */
  const handleDisconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setConnectionState('disconnected');
    setError(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  /**
   * Send audio data through WebSocket
   */
  const sendAudio = useCallback((pcmData: ArrayBuffer): void => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send audio data');
      return;
    }

    try {
      // Send binary PCM data
      wsRef.current.send(pcmData);
    } catch (err) {
      console.error('Failed to send audio data:', err);
      setError('Failed to send audio data');
    }
  }, []);

  /**
   * Send text message through WebSocket
   */
  const sendMessage = useCallback((message: WebSocketMessage): void => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }

    try {
      wsRef.current.send(JSON.stringify(message));
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    }
  }, []);

  /**
   * Get current connection status
   */
  const getConnectionStatus = useCallback((): string => {
    if (!wsRef.current) return 'disconnected';
    
    switch (wsRef.current.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'disconnected';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleDisconnect();
    };
  }, [handleDisconnect]);

  // Auto-connect on mount if URL is provided
  useEffect(() => {
    if (config.url && connectionState === 'disconnected' && !isManuallyClosedRef.current) {
      handleConnect();
    }
  }, [config.url, handleConnect]);

  return {
    connect: handleConnect,
    disconnect: handleDisconnect,
    sendAudio,
    connectionState,
    lastMessage,
    error,
    // Additional utility methods
    sendMessage,
    getConnectionStatus,
  } as WebSocketHook & {
    sendMessage: (message: WebSocketMessage) => void;
    getConnectionStatus: () => string;
  };
};