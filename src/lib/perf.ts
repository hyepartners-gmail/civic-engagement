/**
 * Performance measurement utility
 */

/**
 * Performance measurement utility using the Performance API
 */
export const perf = {
  /**
   * Create a performance mark
   * @param name Name of the mark
   */
  mark: (name: string) => {
    if (typeof window === 'undefined') return;
    
    if (window.performance && window.performance.mark) {
      window.performance.mark(name);
    }
  },
  
  /**
   * Create a performance measure between two marks
   * @param name Name of the measure
   * @param startMark Name of the start mark
   * @param endMark Name of the end mark
   */
  measure: (name: string, startMark: string, endMark: string) => {
    if (typeof window === 'undefined') return;
    
    if (window.performance && window.performance.measure) {
      try {
        window.performance.measure(name, startMark, endMark);
        
        // Log the measure to the console in development
        if (process.env.NODE_ENV === 'development') {
          const entries = window.performance.getEntriesByName(name, 'measure');
          if (entries.length > 0) {
            console.log(`[PERF] ${name}: ${entries[0].duration.toFixed(2)}ms`);
          }
        }
      } catch (e) {
        console.error(`[PERF] Failed to measure ${name}:`, e);
      }
    }
  },
  
  /**
   * Clear all performance marks and measures
   */
  clear: () => {
    if (typeof window === 'undefined') return;
    
    if (window.performance) {
      if (window.performance.clearMarks) {
        window.performance.clearMarks();
      }
      if (window.performance.clearMeasures) {
        window.performance.clearMeasures();
      }
    }
  }
};