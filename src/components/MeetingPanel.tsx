import React, { useState, useCallback, useEffect } from 'react';
import { TranscriptEntry, MeetingPanelProps, ApiCredentials } from '../types';
import { useApiConfig } from '../hooks/useApiConfig';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { useWebSocket } from '../hooks/useWebSocket';
import { SettingsModal } from './SettingsModal';
import { TranscriptDisplay } from './TranscriptDisplay';
import { SummaryDisplay } from './SummaryDisplay';
import { ControlPanel } from './ControlPanel';
import { AudioLevelIndicator } from './AudioLevelIndicator';

export const MeetingPanel: React.FC<MeetingPanelProps> = ({
  sessionId,
  onSessionChange
}) => {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [summary, setSummary] = useState('');
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState('zh-CN');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // API configuration
  const { credentials, isValid: credentialsValid } = useApiConfig();

  // WebSocket connection
  const webSocket = useWebSocket({
    url: 'ws://localhost:8080/ws', // This would be your EdgeRoutine endpoint
    reconnectAttempts: 5,
    reconnectDelay: 1000
  });

  // Audio capture with WebSocket integration
  const audioCapture = useAudioCapture(
    useCallback((pcmData: ArrayBuffer) => {
      if (webSocket.connectionState === 'connected') {
        webSocket.sendAudio(pcmData);
      }
    }, [webSocket])
  );

  // Handle WebSocket messages
  useEffect(() => {
    if (webSocket.lastMessage) {
      const message = webSocket.lastMessage;
      
      switch (message.type) {
        case 'transcript':
          setTranscript(prev => {
            const existing = prev.find(entry => entry.id === message.entry.id);
            if (existing) {
              // Update existing entry
              return prev.map(entry => 
                entry.id === message.entry.id ? message.entry : entry
              );
            } else {
              // Add new entry
              return [...prev, message.entry];
            }
          });
          break;
          
        case 'summary':
          setSummary(message.summary);
          setKeyPoints(message.keyPoints);
          setIsGeneratingSummary(false);
          break;
          
        case 'error':
          console.error('WebSocket error:', message.message);
          break;
      }
    }
  }, [webSocket.lastMessage]);

  // Auto-connect WebSocket when credentials are valid
  useEffect(() => {
    if (credentialsValid && webSocket.connectionState === 'disconnected') {
      webSocket.connect();
    }
  }, [credentialsValid, webSocket]);

  const handleClearTranscript = useCallback(() => {
    setTranscript([]);
    setSummary('');
    setKeyPoints([]);
  }, []);

  const handleRefreshSummary = useCallback(() => {
    if (transcript.length === 0) return;
    
    setIsGeneratingSummary(true);
    
    // Send summary request through WebSocket
    const summaryRequest = {
      type: 'summary_request' as const,
      transcript: transcript.map(entry => entry.text).join(' '),
      sessionId
    };
    
    if (webSocket.connectionState === 'connected') {
      (webSocket as any).sendMessage(summaryRequest);
    }
  }, [transcript, sessionId, webSocket]);

  const handleExport = useCallback(() => {
    // TODO: Implement export functionality
    console.log('Export functionality to be implemented');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // Show settings modal if credentials are not configured
  useEffect(() => {
    if (!credentials) {
      setShowSettings(true);
    }
  }, [credentials]);

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              MeetingMind - Real-time Meeting Assistant
            </h1>
            
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                webSocket.connectionState === 'connected' ? 'bg-green-500' :
                webSocket.connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                {webSocket.connectionState}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Audio Level Indicator */}
            <AudioLevelIndicator 
              level={audioCapture.audioLevel} 
              isRecording={audioCapture.isRecording} 
            />
            
            {/* Action Buttons */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Settings"
            >
              ⚙️
            </button>
            
            <button
              onClick={() => {/* TODO: Implement history */}}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="History"
            >
              📋
            </button>
            
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Toggle Theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript Panel */}
        <div className="flex-1 border-r border-gray-200 dark:border-gray-700">
          <TranscriptDisplay 
            transcript={transcript}
            isRecording={audioCapture.isRecording}
          />
        </div>

        {/* Summary Panel */}
        <div className="w-96 bg-gray-50 dark:bg-gray-800">
          <SummaryDisplay
            summary={summary}
            keyPoints={keyPoints}
            isGenerating={isGeneratingSummary}
            onRefresh={handleRefreshSummary}
            onExport={handleExport}
          />
        </div>
      </div>

      {/* Control Panel */}
      <ControlPanel
        audioCapture={audioCapture}
        onClearTranscript={handleClearTranscript}
        language={language}
        onLanguageChange={setLanguage}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Error Display */}
      {(audioCapture.error || webSocket.error) && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              {audioCapture.error || webSocket.error}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};