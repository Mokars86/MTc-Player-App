import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icons } from './Icon';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <Icons.Activity className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-slate-400 max-w-md mb-8">We encountered an unexpected issue. The player has stopped to prevent further errors.</p>
            <div className="bg-slate-800 p-4 rounded-lg text-left text-xs font-mono text-red-300 w-full max-w-lg overflow-auto mb-8 border border-slate-700">
                {this.state.error?.message}
            </div>
            <button 
                onClick={() => window.location.reload()} 
                className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-full font-bold transition-all"
            >
                Reload Application
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;