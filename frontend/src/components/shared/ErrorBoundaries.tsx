'use client';

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

class BaseErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught:", error, errorInfo);
  }
}

export class GlobalErrorBoundary extends BaseErrorBoundary {
  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center gap-6">
          <div className="relative">
            <AlertTriangle className="w-16 h-16 text-cyan animate-pulse-soft" />
            <div className="absolute inset-0 w-16 h-16 rounded-full bg-cyan/10 animate-ping" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-black text-white tracking-tight">
              System Interruption
            </h1>
            <p className="text-sm text-nexus-muted max-w-md leading-relaxed">
              An unexpected error occurred in the NEXUS Core engine. The application cache or current state might be out of sync.
            </p>
          </div>
          <div className="font-mono text-xs p-4 bg-white/[0.03] border border-glass-stroke rounded-xl text-red-400 max-w-lg overflow-x-auto">
            {this.state.error?.toString()}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-cyan hover:text-black transition-all duration-300 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Restart App</span>
            </button>
            <a
              href="/"
              className="flex items-center gap-2 px-6 py-3 rounded-full border border-glass-stroke text-nexus-muted font-semibold text-xs tracking-wider uppercase hover:text-white hover:border-white/20 transition-all duration-300 active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>Go Home</span>
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export class MovieErrorBoundary extends BaseErrorBoundary {
  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-7xl mx-auto px-6 py-20 text-center space-y-5">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="font-display text-xl font-bold text-white uppercase tracking-tight">
            Failed to Load Movie Details
          </h2>
          <p className="text-xs text-nexus-muted max-w-md mx-auto leading-relaxed">
            The metadata could not be fetched from the media server.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 rounded-full border border-glass-stroke text-nexus-muted text-xs font-semibold uppercase tracking-wider hover:text-white hover:border-white/20 transition-all duration-300"
          >
            Retry Loading
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export class PlayerErrorBoundary extends BaseErrorBoundary {
  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full aspect-video bg-nexus-surface/90 flex flex-col items-center justify-center p-8 gap-5 border border-glass-stroke rounded-2xl text-center">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <div className="space-y-1.5">
            <h3 className="font-display text-lg font-bold text-white uppercase tracking-wider">
              Player Crashed
            </h3>
            <p className="text-xs text-nexus-muted max-w-sm">
              The iframe controller threw a script violation or CORS block error.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-full bg-cyan text-black font-semibold text-xs uppercase tracking-wider hover:bg-white transition-all duration-300 active:scale-95"
          >
            Reload Player
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export class SearchErrorBoundary extends BaseErrorBoundary {
  public render() {
    if (this.state.hasError) {
      return (
        <div className="py-16 text-center space-y-3">
          <p className="text-red-500 text-sm font-semibold">Search Module Error</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs text-cyan font-bold hover:underline"
          >
            Reset Query
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export class AdminErrorBoundary extends BaseErrorBoundary {
  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-4 text-center">
          <p className="text-red-400 font-mono text-xs">Admin Module Failure: {this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full bg-white text-black text-xs font-bold uppercase hover:bg-cyan transition-all duration-300 active:scale-95"
          >
            Retry Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export class TvErrorBoundary extends BaseErrorBoundary {
  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-7xl mx-auto px-6 py-20 text-center space-y-5">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="font-display text-xl font-bold text-white uppercase tracking-tight">
            Failed to Load TV Details
          </h2>
          <p className="text-xs text-nexus-muted max-w-md mx-auto leading-relaxed">
            The metadata could not be fetched from the media server.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 rounded-full border border-glass-stroke text-nexus-muted text-xs font-semibold uppercase tracking-wider hover:text-white hover:border-white/20 transition-all duration-300"
          >
            Retry Loading
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
