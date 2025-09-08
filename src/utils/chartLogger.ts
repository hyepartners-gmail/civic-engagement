/**
 * Centralized logging system for chart hydration debugging
 */
import React from 'react';

interface LogEntry {
  timestamp: string;
  component: string;
  event: string;
  data?: any;
  error?: any;
}

class ChartLogger {
  private logs: LogEntry[] = [];
  private isEnabled = true;

  log(component: string, event: string, data?: any, error?: any) {
    if (!this.isEnabled) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      component,
      event,
      data,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };

    this.logs.push(entry);
    
    // Console log with color coding
    const color = error ? 'color: red' : 
                 event.includes('SUCCESS') ? 'color: green' : 
                 event.includes('START') ? 'color: blue' : 
                 'color: orange';
    
    console.log(
      `%c[CHART-${component}] ${event}`, 
      color, 
      data ? data : '', 
      error ? error : ''
    );

    // Keep only last 100 logs to prevent memory issues
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  getEnvironmentInfo() {
    return {
      timestamp: new Date().toISOString(),
      windowDefined: typeof window !== 'undefined',
      documentReady: typeof document !== 'undefined' ? document.readyState : 'undefined',
      reactDefined: typeof React !== 'undefined',
      hasReactRoot: typeof document !== 'undefined' ? 
        (document.querySelector('[data-reactroot]') !== null || document.querySelector('#__next') !== null) : false,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'undefined',
      location: typeof window !== 'undefined' ? window.location.href : 'undefined',
      reactVersion: typeof React !== 'undefined' && React.version ? React.version : 'unknown'
    };
  }

  logEnvironment(component: string) {
    this.log(component, 'ENVIRONMENT_CHECK', this.getEnvironmentInfo());
  }
}

export const chartLogger = new ChartLogger();

// Helper functions for common logging patterns
export const logChartStart = (component: string, props?: any) => {
  chartLogger.log(component, 'COMPONENT_START', { props });
};

export const logChartReady = (component: string, data?: any) => {
  chartLogger.log(component, 'READY_CHECK', data);
};

export const logChartRender = (component: string, data?: any) => {
  chartLogger.log(component, 'RENDER_ATTEMPT', data);
};

export const logChartSuccess = (component: string, data?: any) => {
  chartLogger.log(component, 'RENDER_SUCCESS', data);
};

export const logChartError = (component: string, error: any, context?: any) => {
  chartLogger.log(component, 'RENDER_ERROR', context, error);
};

export const logDataLoad = (component: string, data: any) => {
  chartLogger.log(component, 'DATA_LOADED', { 
    dataType: typeof data,
    isArray: Array.isArray(data),
    length: Array.isArray(data) ? data.length : undefined,
    keys: typeof data === 'object' && data ? Object.keys(data) : undefined
  });
};

export const logHydrationState = (component: string, state: any) => {
  chartLogger.log(component, 'HYDRATION_STATE', state);
};