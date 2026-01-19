/**
 * ESA EdgeRoutine WebSocket Handler
 * Handles real-time audio streaming and transcription
 */

export default {
  async fetch(request, env) {
    const upgradeHeader = request.headers.get('Upgrade');
    
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket connection
    server.accept();

    // Store session state for this connection
    const sessionState = {
      nlsToken: null,
      dashScopeKey: null,
      nlsWebSocket: null,
      isAuthenticated: false
    };

    // Handle WebSocket messages
    server.addEventListener('message', async (event) => {
      try {
        if (event.data instanceof ArrayBuffer) {
          // Handle binary audio data
          await handleAudioData(event.data, server, sessionState);
        } else {
          // Handle text messages (JSON commands)
          const message = JSON.parse(event.data);
          await handleTextMessage(message, server, sessionState);
        }
      } catch (error) {
        console.error('WebSocket message handling error:', error);
        server.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
          code: 'PROCESSING_ERROR'
        }));
      }
    });

    server.addEventListener('close', () => {
      console.log('WebSocket connection closed');
      // Clean up NLS WebSocket connection if exists
      if (sessionState.nlsWebSocket) {
        sessionState.nlsWebSocket.close();
      }
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  },
};

/**
 * Handle binary audio data from client
 */
async function handleAudioData(audioData, websocket, sessionState) {
  try {
    // Check if authenticated
    if (!sessionState.isAuthenticated) {
      websocket.send(JSON.stringify({
        type: 'error',
        message: 'Authentication required. Please send credentials first.',
        code: 'AUTH_REQUIRED'
      }));
      return;
    }

    // Forward audio to Alibaba Cloud NLS for transcription
    const transcriptionResult = await forwardToNLS(audioData, sessionState);
    
    if (transcriptionResult) {
      // Send transcription back to client
      websocket.send(JSON.stringify({
        type: 'transcript',
        entry: {
          id: generateId(),
          text: transcriptionResult.text,
          timestamp: Date.now(),
          isFinal: transcriptionResult.isFinal,
          confidence: transcriptionResult.confidence,
          language: transcriptionResult.language || 'zh-CN'
        }
      }));
    }
  } catch (error) {
    console.error('Audio processing error:', error);
    websocket.send(JSON.stringify({
      type: 'error',
      message: 'Audio processing failed',
      code: 'AUDIO_ERROR'
    }));
  }
}

/**
 * Handle text messages (commands) from client
 */
async function handleTextMessage(message, websocket, sessionState) {
  switch (message.type) {
    case 'auth':
      await handleAuthentication(message, websocket, sessionState);
      break;

    case 'summary_request':
      await handleSummaryRequest(message, websocket, sessionState);
      break;
    
    case 'ping':
      websocket.send(JSON.stringify({ type: 'pong' }));
      break;
      
    default:
      websocket.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${message.type}`,
        code: 'UNKNOWN_MESSAGE_TYPE'
      }));
  }
}

/**
 * Handle authentication with API keys from frontend
 */
async function handleAuthentication(message, websocket, sessionState) {
  try {
    const { nlsToken, dashScopeKey } = message.credentials;
    
    if (!nlsToken || !dashScopeKey) {
      websocket.send(JSON.stringify({
        type: 'auth_error',
        message: 'Missing API credentials',
        code: 'MISSING_CREDENTIALS'
      }));
      return;
    }

    // Validate NLS Token by creating a test WebSocket connection
    const nlsValid = await validateNLSToken(nlsToken);
    if (!nlsValid) {
      websocket.send(JSON.stringify({
        type: 'auth_error',
        message: 'Invalid NLS Token',
        code: 'INVALID_NLS_TOKEN'
      }));
      return;
    }

    // Validate DashScope Key by making a test API call
    const dashScopeValid = await validateDashScopeKey(dashScopeKey);
    if (!dashScopeValid) {
      websocket.send(JSON.stringify({
        type: 'auth_error',
        message: 'Invalid DashScope API Key',
        code: 'INVALID_DASHSCOPE_KEY'
      }));
      return;
    }

    // Store credentials in session state
    sessionState.nlsToken = nlsToken;
    sessionState.dashScopeKey = dashScopeKey;
    sessionState.isAuthenticated = true;

    // Initialize NLS WebSocket connection
    await initializeNLSConnection(sessionState);

    websocket.send(JSON.stringify({
      type: 'auth_success',
      message: 'Authentication successful'
    }));

  } catch (error) {
    console.error('Authentication error:', error);
    websocket.send(JSON.stringify({
      type: 'auth_error',
      message: 'Authentication failed',
      code: 'AUTH_FAILED'
    }));
  }
}

/**
 * Handle AI summarization requests
 */
async function handleSummaryRequest(message, websocket, sessionState) {
  try {
    if (!sessionState.isAuthenticated) {
      websocket.send(JSON.stringify({
        type: 'error',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }));
      return;
    }

    const summary = await generateSummary(message.transcript, sessionState.dashScopeKey);
    
    websocket.send(JSON.stringify({
      type: 'summary',
      summary: summary.text,
      keyPoints: summary.keyPoints,
      sessionId: message.sessionId
    }));
  } catch (error) {
    console.error('Summary generation error:', error);
    websocket.send(JSON.stringify({
      type: 'error',
      message: 'Summary generation failed',
      code: 'SUMMARY_ERROR'
    }));
  }
}

/**
 * Validate NLS Token
 */
async function validateNLSToken(token) {
  try {
    const wsUrl = `wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1?token=${token}`;
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
}

/**
 * Validate DashScope API Key
 */
async function validateDashScopeKey(apiKey) {
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
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
}

/**
 * Initialize NLS WebSocket connection
 */
async function initializeNLSConnection(sessionState) {
  const wsUrl = `wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1?token=${sessionState.nlsToken}`;
  
  sessionState.nlsWebSocket = new WebSocket(wsUrl);
  
  return new Promise((resolve, reject) => {
    sessionState.nlsWebSocket.onopen = () => {
      console.log('NLS WebSocket connected');
      resolve();
    };

    sessionState.nlsWebSocket.onerror = (error) => {
      console.error('NLS WebSocket error:', error);
      reject(error);
    };

    sessionState.nlsWebSocket.onmessage = (event) => {
      // Handle NLS responses - this would be forwarded back to the client
      console.log('NLS response:', event.data);
    };
  });
}

/**
 * Forward audio to Alibaba Cloud NLS
 */
async function forwardToNLS(audioData, env) {
  // This would integrate with Alibaba Cloud NLS API
  // For now, return a mock response
  return {
    text: "这是一个模拟的转录结果",
    isFinal: Math.random() > 0.7,
    confidence: 0.95
  };
}

/**
 * Generate AI summary using DashScope
 */
async function generateSummary(transcript, env) {
  // This would integrate with DashScope API
  // For now, return a mock response
  return {
    text: "这是一个AI生成的会议总结示例。",
    keyPoints: [
      "讨论了项目进展",
      "确定了下一步计划", 
      "分配了任务责任"
    ]
  };
}

/**
 * Generate unique ID
 */
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}