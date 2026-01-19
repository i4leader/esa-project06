import React from 'react';

interface AudioLevelIndicatorProps {
  level: number; // 0-1 range
  isRecording: boolean;
}

export const AudioLevelIndicator: React.FC<AudioLevelIndicatorProps> = ({ 
  level, 
  isRecording 
}) => {
  // Convert level to percentage
  const percentage = Math.min(100, Math.max(0, level * 100));
  
  // Determine color based on level
  const getColor = (level: number): string => {
    if (level < 0.3) return 'bg-green-500';
    if (level < 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Create level bars (10 bars total)
  const bars = Array.from({ length: 10 }, (_, index) => {
    const barThreshold = (index + 1) * 10; // 10%, 20%, 30%, etc.
    const isActive = percentage >= barThreshold;
    
    return (
      <div
        key={index}
        className={`
          w-2 h-6 rounded-sm transition-all duration-100
          ${isActive && isRecording 
            ? getColor(level) 
            : 'bg-gray-300'
          }
          ${isRecording && isActive ? 'opacity-100' : 'opacity-50'}
        `}
      />
    );
  });

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-end space-x-1">
        {bars}
      </div>
      
      <div className="text-xs text-gray-500 min-w-[3rem]">
        {isRecording ? `${Math.round(percentage)}%` : '--'}
      </div>
      
      {isRecording && (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span>LIVE</span>
        </div>
      )}
    </div>
  );
};