import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('EcoTwin ErrorBoundary caught an uncaught error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="tab-view-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem 1rem',
          }}
        >
          <div
            className="empty-state-large"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2.5rem 2rem',
              textAlign: 'center',
            }}
          >
            <div
              className="empty-state-icon"
              style={{ color: 'var(--color-error)', marginBottom: '1.25rem' }}
            >
              <AlertTriangle size={52} />
            </div>

            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                marginBottom: '0.75rem',
              }}
            >
              Application Runtime Error
            </h2>

            <p
              style={{
                fontSize: '0.95rem',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.6',
                marginBottom: '1.5rem',
              }}
            >
              An unexpected runtime error occurred while rendering this component. Click retry below
              to reset the boundary and attempt rendering again.
            </p>

            {this.state.error?.message && (
              <div
                style={{
                  background: 'var(--color-surface-sunken)',
                  border: 'var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: 'var(--color-error)',
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                  overflowX: 'auto',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button type="button" className="btn btn-primary" onClick={this.handleRetry}>
                <RefreshCw size={16} />
                <span>Retry</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
              >
                <Home size={16} />
                <span>Return Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
