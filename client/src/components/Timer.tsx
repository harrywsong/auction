import React from 'react';
import { formatTime } from '../utils/format';

interface TimerProps {
  remainingSeconds: number;
  timerLength: number;
  isRunning?: boolean;
}

export function Timer({ remainingSeconds, timerLength, isRunning = true }: TimerProps) {
  const percentage = (remainingSeconds / timerLength) * 100;
  const isLowTime = isRunning && remainingSeconds < 10;
  const isWaiting = !isRunning;

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`
          relative w-48 h-48 rounded-full flex items-center justify-center
          ${isWaiting ? 'bg-gray-600' : isLowTime ? 'bg-red-600' : 'bg-blue-600'}
          transition-colors duration-300
        `}
      >
        <div className="absolute inset-1 bg-gray-900 rounded-full" />
        <div className="relative z-10 text-center">
          <div className={`text-6xl font-bold ${isWaiting ? 'text-gray-400' : 'text-white'}`}>
            {formatTime(remainingSeconds)}
          </div>
          <div className="text-sm text-gray-300 mt-2">
            {isWaiting ? 'Waiting to start' : 'Time Remaining'}
          </div>
        </div>
      </div>
      <div className="mt-6 w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-full rounded-full transition-all duration-100 ${
            isWaiting ? 'bg-gray-500' : isLowTime ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${isWaiting ? 100 : Math.max(0, percentage)}%` }}
        />
      </div>
    </div>
  );
}
