/**
 * Simple logger utility for analytics tracking
 */

type EventParams = Record<string, any>;

/**
 * Logger for tracking analytics events
 */
export const logger = {
  /**
   * Log an event
   * @param eventName Name of the event
   * @param params Event parameters
   */
  event: (eventName: string, params: EventParams = {}) => {
    if (typeof window === 'undefined') return;
    
    console.log(`[EVENT] ${eventName}`, params);
    
    // In a real implementation, this would send the event to an analytics service
    // For example:
    // if (window.gtag) {
    //   window.gtag('event', eventName, params);
    // }
  },
  
  /**
   * Log an error
   * @param errorName Name of the error
   * @param params Error parameters
   */
  error: (errorName: string, params: EventParams = {}) => {
    if (typeof window === 'undefined') return;
    
    console.error(`[ERROR] ${errorName}`, params);
    
    // In a real implementation, this would send the error to an error tracking service
    // For example:
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(errorName), { extra: params });
    // }
  }
};