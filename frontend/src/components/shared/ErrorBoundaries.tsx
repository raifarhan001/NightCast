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
        <div className="min-h-screen bg-[#0B131B] flex flex-col items-center justify-center p-8 text-center gap-6">
          <div className="relative">
            <AlertTriangle className="w-16 h-16 text-[#A4C8E1] animate-pulse" />
            <div className="absolute inset-0 w-16 h-16 rounded-full bg-[#A4C8E1]/10 animate-ping" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-black text-[#F0F0F0] tracking-tight">
              System Interruption
            </h1>
            <p className="text-sm text-[#4A6E8D] max-w-md leading-relaxed">
              An unexpected error occurred in the NightCast Core engine. The application cache or current state might be out of sync.
            </p>
          </div>
          <div className="font-mono text-xs p-4 bg-white/[0.03] border border-[#4A6E8D]/30 rounded-xl text-rose-400 max-w-lg overflow-x-auto">
            {this.state.error?.toString()}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#F0F0F0] text-[#0B131B] font-semibold text-xs tracking-wider uppercase hover:bg-[#A4C8E1] transition-all duration-300 active:scale-95 cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Restart App</span>
            </button>
            <a
              href="/"
              className="flex items-center gap-2 px-6 py-3 rounded-full border border-[#4A6E8D]/40 text-[#4A6E8D] font-semibold text-xs tracking-wider uppercase hover:text-white hover:border-[#A4C8E1]/60 transition-all duration-300 active:scale-95 cursor-pointer"
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
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="font-display text-xl font-bold text-[#F0F0F0] uppercase tracking-tight">
            Failed to Load Movie Details
          </h2>
          <p className="text-xs text-[#4A6E8D] max-w-md mx-auto leading-relaxed">
            The metadata could not be fetched from the media server.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 rounded-full border border-[#4A6E8D]/40 text-[#4A6E8D] text-xs font-semibold uppercase tracking-wider hover:text-white hover:border-[#A4C8E1]/60 transition-all duration-300 cursor-pointer"
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
        <div className="w-full aspect-video bg-[#0B131B] flex flex-col items-center justify-center p-8 gap-5 border border-[#4A6E8D]/30 rounded-2xl text-center shadow-xl">
          <AlertTriangle className="w-12 h-12 text-rose-500" />
          <div className="space-y-1.5">
            <h3 className="font-display text-lg font-bold text-[#F0F0F0] uppercase tracking-wider">
              Player Crashed
            </h3>
            <p className="text-xs text-[#4A6E8D] max-w-sm">
              The player controller encountered an interruption.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-full bg-[#F0F0F0] text-[#0B131B] font-semibold text-xs uppercase tracking-wider hover:bg-[#A4C8E1] transition-all duration-300 active:scale-95 cursor-pointer shadow-lg"
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
          <p className="text-rose-400 text-sm font-semibold">Search Module Error</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs text-[#A4C8E1] font-bold hover:underline cursor-pointer"
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
        <div className="p-8 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-4 text-center">
          <p className="text-rose-400 font-mono text-xs">Admin Module Failure: {this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full bg-[#F0F0F0] text-[#0B131B] text-xs font-bold uppercase hover:bg-[#A4C8E1] transition-all duration-300 active:scale-95 cursor-pointer"
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
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="font-display text-xl font-bold text-[#F0F0F0] uppercase tracking-tight">
            Failed to Load TV Details
          </h2>
          <p className="text-xs text-[#4A6E8D] max-w-md mx-auto leading-relaxed">
            The metadata could not be fetched from the media server.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 rounded-full border border-[#4A6E8D]/40 text-[#4A6E8D] text-xs font-semibold uppercase tracking-wider hover:text-white hover:border-[#A4C8E1]/60 transition-all duration-300 cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
