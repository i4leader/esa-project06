import React, { useEffect, useRef } from 'react';
import { TranscriptEntry } from '../types';

interface TranscriptDisplayProps {
  transcript: TranscriptEntry[];
  isRecording: boolean;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ 
  transcript, 
  isRecording 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <span>🎤</span>
          <span>Real-time Transcript</span>
        </h2>
        <div className="text-sm text-gray-500">
          {transcript.length} entries
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-white"
      >
        {transcript.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p className="text-lg font-medium">No transcript yet</p>
              <p className="text-sm">Start recording to see real-time transcription</p>
            </div>
          </div>
        ) : (
          transcript.map((entry) => (
            <div
              key={entry.id}
              className={`
                flex space-x-3 p-3 rounded-lg transition-all duration-200
                ${entry.isFinal 
                  ? 'bg-white border border-gray-200' 
                  : 'bg-blue-50 border border-blue-200'
                }
              `}
            >
              <div className="flex-shrink-0">
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {formatTimestamp(entry.timestamp)}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`
                  text-sm leading-relaxed
                  ${entry.isFinal ? 'text-gray-900' : 'text-blue-800 italic'}
                `}>
                  {entry.text}
                </p>
                
                {!entry.isFinal && (
                  <div className="flex items-center space-x-1 mt-1">
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-600">Processing...</span>
                  </div>
                )}
                
                {entry.confidence && entry.isFinal && (
                  <div className="mt-1 flex items-center space-x-2">
                    <span className="text-xs text-gray-400">
                      Confidence: {Math.round(entry.confidence * 100)}%
                    </span>
                    {entry.speaker && (
                      <span className="text-xs text-gray-400">
                        Speaker: {entry.speaker}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {isRecording && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Listening...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};