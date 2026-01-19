// Core API Configuration Types
export interface ApiCredentials {
  nlsToken: string;
  dashScopeKey: string;
}

// Audio Processing Types
export interface AudioCaptureConfig {
  sampleRate: number;
  channels: number;
  bufferSize: number;
}

// Transcript Types
export interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  confidence: number;
  speaker?: string;
  language: string;
}

// Session Types
export interface MeetingSession {
  id: string;
  title: string;
  startTime: number;
  endTime?: number;
  transcript: TranscriptEntry[];
  summary: string;
  keyPoints?: string[]; // Optional for backward compatibility or if summary fails
  language: string;
  participants: string[];
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  duration: number;
  wordCount: number;
  averageConfidence: number;
  exportFormats: string[];
}

// WebSocket Message Types
export type WebSocketMessage = 
  | AudioMessage
  | TranscriptMessage
  | SummaryMessage
  | ErrorMessage
  | StatusMessage;

export interface AudioMessage {
  type: 'audio';
  data: ArrayBuffer;
  sessionId: string;
  timestamp: number;
}

export interface TranscriptMessage {
  type: 'transcript';
  entry: TranscriptEntry;
  sessionId: string;
}

export interface SummaryMessage {
  type: 'summary';
  summary: string;
  keyPoints: string[];
  sessionId: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
  sessionId?: string;
}

export interface StatusMessage {
  type: 'status';
  status: 'connected' | 'disconnected' | 'reconnecting';
  sessionId?: string;
}

// User Settings Types
export interface UserSettings {
  theme: 'light' | 'dark';
  language: string;
  autoSummary: boolean;
  exportFormat: 'json' | 'txt' | 'pdf';
  audioQuality: 'low' | 'medium' | 'high';
}

// Local Storage Schema
export interface LocalStorageSchema {
  'meetingmind.credentials': ApiCredentials;
  'meetingmind.sessions': string[]; // Session IDs
  'meetingmind.settings': UserSettings;
  'meetingmind.cache': CacheData;
}

export interface CacheData {
  lastSessionId?: string;
  recentSessions: string[];
  offlineTranscripts: TranscriptEntry[];
}

// Hook Return Types
export interface ApiConfigHook {
  credentials: ApiCredentials | null;
  saveCredentials: (creds: ApiCredentials) => void;
  testConnection: () => Promise<boolean>;
  isValid: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AudioCaptureHook {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  isRecording: boolean;
  audioLevel: number;
  error: string | null;
  duration: number;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectAttempts: number;
  reconnectDelay: number;
}

export interface WebSocketHook {
  connect: () => void;
  disconnect: () => void;
  sendAudio: (pcmData: ArrayBuffer) => void;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastMessage: WebSocketMessage | null;
  error: string | null;
}

// Component Props Types
export interface MeetingPanelProps {
  sessionId: string;
  onSessionChange: (sessionId: string) => void;
}

export interface MeetingPanelState {
  isRecording: boolean;
  transcript: TranscriptEntry[];
  summary: string;
  recordingDuration: number;
}

// API Response Types
export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  confidence: number;
  processingTime: number;
}