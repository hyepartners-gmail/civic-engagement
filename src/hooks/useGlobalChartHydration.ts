import { useEffect, useState } from 'react';

/**
 * Global chart hydration manager to ensure all @nivo charts are properly hydrated
 * This prevents the "Cannot read properties of null (reading 'useRef')" error
 * by ensuring charts only render after the global hydration is complete
 */
let globalHydrationComplete = false;
let hydrationPromise: Promise<void> | null = null;

export function useGlobalChartHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Always wait for the hydration process, even if it was completed before
    if (!hydrationPromise) {
      hydrationPromise = new Promise<void>((resolve) => {
        // Ensure we're on the client side
        if (typeof window === 'undefined') {
          resolve();
          return;
        }

        // Simple hydration check
        const checkHydration = () => {
          // Check if document is fully loaded
          if (document.readyState === 'complete') {
            globalHydrationComplete = true;
            resolve();
          } else {
            // Wait for document to be fully loaded
            setTimeout(checkHydration, 100);
          }
        };

        // Start checking
        checkHydration();
      });
    }

    hydrationPromise.then(() => {
      setIsHydrated(true);
    });
  }, []);

  return isHydrated || globalHydrationComplete;
}

// Reset function for testing or SSR
export function resetGlobalHydration() {
  globalHydrationComplete = false;
  hydrationPromise = null;
}