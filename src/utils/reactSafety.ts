/**
 * React Safety Utilities
 * Provides utilities to check React context health and prevent hook errors
 */
import React from 'react';

export function isReactContextHealthy(): boolean {
  try {
    // Check if React is available
    if (typeof React === 'undefined') {
      return false;
    }

    // Check React internals
    const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    if (!ReactInternals) {
      return false;
    }

    // Check current dispatcher
    const dispatcher = ReactInternals.ReactCurrentDispatcher?.current;
    if (!dispatcher) {
      return false;
    }

    // Check essential hooks
    const requiredHooks = ['useRef', 'useState', 'useEffect', 'useMemo', 'useCallback'];
    for (const hook of requiredHooks) {
      if (typeof dispatcher[hook] !== 'function') {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.warn('React context health check failed:', error);
    return false;
  }
}

export function waitForReactContext(maxWaitMs: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const check = () => {
      if (isReactContextHealthy()) {
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > maxWaitMs) {
        resolve(false);
        return;
      }
      
      setTimeout(check, 100);
    };
    
    check();
  });
}

export function createSafeReactComponent<T extends Record<string, any>>(
  componentFactory: () => Promise<React.ComponentType<T>>
): React.ComponentType<T & { fallback?: React.ReactNode }> {
  return function SafeComponent(props: T & { fallback?: React.ReactNode }) {
    const [Component, setComponent] = React.useState<React.ComponentType<T> | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
      let mounted = true;

      const loadComponent = async () => {
        try {
          // Wait for React context to be healthy
          const isHealthy = await waitForReactContext();
          if (!isHealthy) {
            throw new Error('React context not healthy');
          }

          if (!mounted) return;

          // Load the component
          const LoadedComponent = await componentFactory();
          
          if (mounted) {
            setComponent(() => LoadedComponent);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Safe component loading failed:', err);
          if (mounted) {
            setError(err instanceof Error ? err.message : 'Component loading failed');
            setIsLoading(false);
          }
        }
      };

      loadComponent();

      return () => {
        mounted = false;
      };
    }, []);

    if (error) {
      return props.fallback || React.createElement('div', {
        className: 'w-full h-full bg-red-50 border border-red-200 rounded flex items-center justify-center'
      }, React.createElement('span', {
        className: 'text-red-600 text-sm'
      }, `Component failed: ${error}`));
    }

    if (isLoading || !Component) {
      return props.fallback || React.createElement('div', {
        className: 'w-full h-full bg-gray-100 animate-pulse'
      });
    }

    return React.createElement(Component, props);
  };
}