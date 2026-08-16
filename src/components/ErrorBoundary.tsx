import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  /** Used in the console log and as a hint in the fallback heading. */
  name?: string;
  children: ReactNode;
  /** Optional custom fallback UI. Defaults to the built-in fallback. */
  fallback?: ReactNode;
  /** Optional callback for reporting the error (console.error is always used). */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryKey: number;
}

/**
 * Error boundary that isolates failures to a single subtree. On retry it bumps
 * a key so the children fully remount (re-attempting the render), rather than
 * just clearing state and re-rendering the same broken tree.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name ?? "unknown"}]`, error, info);
    this.props.onError?.(error, info);
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryKey: prev.retryKey + 1,
    }));
  };

  render() {
    const { hasError, error, retryKey } = this.state;

    if (hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="font-medium">
              Something went wrong loading this section.
            </p>
            {import.meta.env.DEV && error && (
              <pre className="max-w-full overflow-auto rounded bg-muted p-2 text-left text-xs text-muted-foreground">
                {error.message}
              </pre>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return <Fragment key={retryKey}>{this.props.children}</Fragment>;
  }
}
