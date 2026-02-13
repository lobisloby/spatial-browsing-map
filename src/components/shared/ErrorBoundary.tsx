import React from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <p className="text-sm text-surface-500 mb-2">Something went wrong</p>
          <p className="text-xs text-surface-400">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}