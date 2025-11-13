import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 md:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Hoppá! Valami hiba történt
              </h1>
              
              <p className="text-gray-600 mb-6">
                Ne aggódj, ez nem a te hibád. Próbáld meg újra betölteni az oldalt, vagy térj vissza a kezdőlapra.
              </p>

              {this.state.error && (
                <div className="w-full bg-gray-50 rounded-md p-4 mb-6 text-left">
                  <p className="text-sm text-gray-700 font-mono break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button 
                  onClick={this.handleReset} 
                  className="flex-1 touch-manipulation"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Újratöltés
                </Button>
                <Button 
                  onClick={this.handleHome} 
                  variant="outline"
                  className="flex-1 touch-manipulation"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Kezdőlap
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
