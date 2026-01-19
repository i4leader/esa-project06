import React from 'react';
import { AudioCaptureHook } from '../types';

interface ControlPanelProps {
  audioCapture: AudioCaptureHook;
  onClearTranscript?: () => void;
  language?: string;
  onLanguageChange?: (language: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  audioCapture,
  onClearTranscript,
  language = 'zh-CN',
  onLanguageChange
}) => {
  const { isRecording, startRecording, stopRecording, duration, error } = audioCapture;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecordingToggle = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {/* Main Control Buttons */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        <button
          onClick={handleRecordingToggle}
          disabled={!!error}
          className={`
            flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
            ${isRecording 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
            ${error ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}
          `}
        >
          {isRecording ? (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              <span>⏹️ Stop Recording</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              <span>🎙️ Start Recording</span>
            </>
          )}
        </button>

        {onClearTranscript && (
          <button
            onClick={onClearTranscript}
            disabled={isRecording}
            className="flex items-center space-x-2 px-4 py-3 rounded-lg font-medium bg-gray-600 hover:bg-gray-700 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>🗑️ Clear</span>
          </button>
        )}
      </div>

      {/* Status Information */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <span>Recording Duration:</span>
            <span className="font-mono font-medium">{formatDuration(duration)}</span>
          </span>
          
          <span className="text-gray-400">|</span>
          
          <span className="flex items-center space-x-1">
            <span>Language:</span>
            <select
              value={language}
              onChange={(e) => onLanguageChange?.(e.target.value)}
              disabled={isRecording}
              className="bg-transparent border-none text-gray-600 font-medium focus:outline-none disabled:opacity-50"
            >
              <option value="zh-CN">Chinese</option>
              <option value="en-US">English</option>
              <option value="ja-JP">Japanese</option>
              <option value="ko-KR">Korean</option>
            </select>
          </span>
          
          <span className="text-gray-400">|</span>
          
          <span>Real-time Transcription</span>
        </div>

        {/* Recording Status Indicator */}
        <div className="flex items-center space-x-2">
          {isRecording && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-600 font-medium">RECORDING</span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center space-x-2 text-red-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">Error: {error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};