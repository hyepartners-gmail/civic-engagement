"use client";
import { useEffect, useState } from 'react';
import { chartLogger } from '@/utils/chartLogger';

export default function ChartLoggingDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(chartLogger.getLogs());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const recentLogs = logs.slice(-20); // Show last 20 logs

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700"
      >
        Chart Logs ({logs.length})
      </button>
      
      {isExpanded && (
        <div className="absolute bottom-12 right-0 w-96 max-h-96 bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b flex justify-between items-center">
            <span className="font-semibold">Chart Debug Logs</span>
            <button
              onClick={() => chartLogger.clearLogs()}
              className="text-xs bg-red-500 text-white px-2 py-1 rounded"
            >
              Clear
            </button>
          </div>
          <div className="overflow-y-auto max-h-80 p-2">
            {recentLogs.map((log, index) => (
              <div
                key={index}
                className={`text-xs mb-2 p-2 rounded ${
                  log.error ? 'bg-red-50 border-l-4 border-red-500' :
                  log.event.includes('SUCCESS') ? 'bg-green-50 border-l-4 border-green-500' :
                  log.event.includes('ERROR') ? 'bg-red-50 border-l-4 border-red-500' :
                  log.event.includes('START') ? 'bg-blue-50 border-l-4 border-blue-500' :
                  'bg-gray-50 border-l-4 border-gray-300'
                }`}
              >
                <div className="font-mono text-xs text-gray-500">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
                <div className="font-semibold">
                  [{log.component}] {log.event}
                </div>
                {log.data && (
                  <div className="text-gray-600 mt-1">
                    {JSON.stringify(log.data, null, 2)}
                  </div>
                )}
                {log.error && (
                  <div className="text-red-600 mt-1 font-mono">
                    {log.error.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}