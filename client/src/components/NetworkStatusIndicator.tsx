/**
 * Network Status Indicator Component
 * Displays connectivity status and pending operations count
 */

import React from 'react';
import { useNetworkStatus } from '@/lib';

const NetworkStatusIndicator: React.FC = () => {
  const { isOnline, pendingOperations } = useNetworkStatus();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg 
        transition-all duration-300
        ${isOnline 
          ? pendingOperations > 0 
            ? 'bg-amber-500 text-white' 
            : 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
        }
      `}>
        {/* Status Dot */}
        <div className={`
          w-2 h-2 rounded-full 
          ${isOnline ? 'bg-white animate-pulse' : 'bg-white'}
        `} />
        
        {/* Status Text */}
        <span className="text-sm font-medium">
          {!isOnline && 'Offline'}
          {isOnline && pendingOperations === 0 && 'Online'}
          {isOnline && pendingOperations > 0 && `Syncing ${pendingOperations}`}
        </span>

        {/* Spinner when syncing */}
        {isOnline && pendingOperations > 0 && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </div>
    </div>
  );
};

export default NetworkStatusIndicator;