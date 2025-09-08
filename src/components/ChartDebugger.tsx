"use client";
import React, { useEffect, useState } from 'react';

export default function ChartDebugger() {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const checkEnvironment = () => {
      const info = {
        timestamp: new Date().toISOString(),
        windowDefined: typeof window !== 'undefined',
        documentReady: typeof document !== 'undefined' ? document.readyState : 'undefined',
        reactDefined: typeof React !== 'undefined',
        hasReactRoot: typeof document !== 'undefined' ? 
          (document.querySelector('[data-reactroot]') !== null || document.querySelector('#__next') !== null) : false,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'undefined',
        location: typeof window !== 'undefined' ? window.location.href : 'undefined'
      };
      
      setDebugInfo(info);
    };

    checkEnvironment();
    
    // Check periodically
    const interval = setInterval(checkEnvironment, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-100 p-4 rounded text-xs font-mono">
      <h3 className="font-bold mb-2">Chart Environment Debug</h3>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  );
}