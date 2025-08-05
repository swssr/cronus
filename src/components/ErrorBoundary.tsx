import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ArrowClockwise, Warning } from '@phosphor-icons/react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error for debugging
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-content">
                    <div className="error-icon">
          <Warning size={48} weight="fill" />
        </div>
            
            <h2 className="error-title">Something went wrong</h2>
            
            <p className="error-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            
            <div className="error-actions">
              <button 
                type="button"
                className="error-button primary"
                onClick={this.handleRetry}
              >
                <ArrowClockwise size={16} />
                Try Again
              </button>
              
              <button 
                type="button"
                className="error-button secondary"
                onClick={this.handleReload}
              >
                Reload Page
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre className="error-stack">
                  {this.state.error?.stack}
                </pre>
                {this.state.errorInfo && (
                  <pre className="error-component-stack">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}