import React from 'react';

interface ChartErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ChartErrorBoundary extends React.Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console with more details
    console.error('Chart rendering error:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack
    });
    
    // Update state with error info
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-platform-text/70">Chart unavailable</p>
            <p className="text-xs text-platform-text/50 mt-1">Unable to render visualization</p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-2 text-xs text-red-400">
                <p>Error: {this.state.error.message}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChartErrorBoundary;