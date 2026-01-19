// Local Storage Keys
export const STORAGE_KEYS = {
  CREDENTIALS: 'meetingmind.credentials',
  SESSIONS: 'meetingmind.sessions',
  SETTINGS: 'meetingmind.settings',
  CACHE: 'meetingmind.cache',
} as const;

// Audio Configuration
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  CHANNELS: 1,
  BUFFER_SIZE: 4096,
  BIT_DEPTH: 16,
} as const;

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  MAX_RECONNECT_DELAY: 30000,
  BACKOFF_MULTIPLIER: 2,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  NLS_WEBSOCKET: 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1',
  DASHSCOPE_API: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
} as const;

// UI Constants
export const UI_CONFIG = {
  TRANSCRIPT_UPDATE_INTERVAL: 100,
  SUMMARY_UPDATE_THRESHOLD: 500, // words
  AUTO_SCROLL_THRESHOLD: 50,
  THEME_TRANSITION_DURATION: 200,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  MICROPHONE_ACCESS_DENIED: 'Microphone access denied. Please enable microphone permissions in your browser settings.',
  WEBSOCKET_CONNECTION_FAILED: 'Failed to connect to the server. Please check your internet connection.',
  INVALID_CREDENTIALS: 'Invalid API credentials. Please check your NLS Token and DashScope API Key.',
  TRANSCRIPTION_FAILED: 'Speech recognition failed. Please try again.',
  SUMMARIZATION_FAILED: 'AI summarization failed. Please try again.',
  SESSION_SAVE_FAILED: 'Failed to save session data. Please try again.',
  EXPORT_FAILED: 'Failed to export data. Please try again.',
} as const;

// Supported Languages
export const SUPPORTED_LANGUAGES = {
  'zh-CN': 'Chinese (Simplified)',
  'en-US': 'English (US)',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
} as const;

// Export Formats
export const EXPORT_FORMATS = {
  JSON: 'json',
  TXT: 'txt',
  PDF: 'pdf',
} as const;

// Session Status
export const SESSION_STATUS = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

// Connection States
export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
} as const;