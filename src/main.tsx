import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import "./global.css";

// Lazy load the router provider for better initial performance
const LazyRouterProvider = lazy(() => import('./LazyRouterProvider'));

// Error boundary for better error handling
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
            <p className="text-muted-foreground">Please refresh the page to try again</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading fallback for the main app
const AppLoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <h1 className="text-2xl font-bold">Cronus</h1>
      <p className="text-muted-foreground">Loading your development workspace...</p>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<AppLoadingFallback />}>
        <LazyRouterProvider />
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>,
);
