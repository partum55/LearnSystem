import React from 'react';

interface PluginErrorBoundaryProps {
  children: React.ReactNode;
  pluginId?: string;
}

interface PluginErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class PluginErrorBoundary extends React.Component<
  PluginErrorBoundaryProps,
  PluginErrorBoundaryState
> {
  constructor(props: PluginErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PluginErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(
      `[PluginErrorBoundary] Plugin "${this.props.pluginId ?? 'unknown'}" threw an error:`,
      error,
      info.componentStack,
    );
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { pluginId } = this.props;
    const message = this.state.error?.message ?? 'An unexpected error occurred.';

    return (
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '0.5rem',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
        role="alert"
        aria-live="assertive"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{ color: 'var(--fn-error)', flexShrink: 0 }}
          >
            <path
              d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z"
              fill="currentColor"
            />
            <path
              d="M7.25 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5ZM8 10a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"
              fill="currentColor"
            />
          </svg>
          <span
            style={{
              color: 'var(--fn-error)',
              fontFamily: 'var(--font-body, Outfit, sans-serif)',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Plugin Error
            {pluginId ? ` — ${pluginId}` : ''}
          </span>
        </div>

        <p
          style={{
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-body, Outfit, sans-serif)',
            fontSize: '0.8125rem',
            margin: 0,
            wordBreak: 'break-word',
          }}
        >
          {message}
        </p>

        <div>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              marginTop: '0.25rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: '0.375rem',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body, Outfit, sans-serif)',
              fontSize: '0.8125rem',
              padding: '0.25rem 0.75rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}
