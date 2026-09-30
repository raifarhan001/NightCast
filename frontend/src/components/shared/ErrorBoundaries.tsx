'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Link from 'next/link';
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
        <div role="alert" className="min-h-screen bg-[#0B131B] flex flex-col items-center justify-center p-8 text-center gap-6">
          <div className="relative">
            <AlertTriangle className="w-16 h-16 text-[#39AEA9] animate-pulse" />
            <div className="absolute inset-0 w-16 h-16 rounded-full bg-[#39AEA9]/10 animate-ping" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-black text-[#F0F0F0] tracking-tight">
              System Interruption
            </h1>
            <p className="text-sm text-[#8FA8AD] max-w-md leading-relaxed">
              An unexpected error occurred in the NightCast Core engine. The application cache or current state might be out of sync.
            </p>
          </div>
          <div className="font-mono text-xs p-4 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.12] rounded-2xl text-rose-400 max-w-lg overflow-x-auto shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
            {this.state.error?.toString()}
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#F0F0F0] text-[#0B131B] font-semibold text-xs tracking-wider uppercase hover:bg-white backdrop-blur-xl border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_20px_rgba(255,255,255,0.2)] transition-all duration-300 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Restart App</span>
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-[#F0F0F0] font-semibold text-xs tracking-wider uppercase backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all duration-300 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
            >
              <Home className="w-4 h-4" />
              <span>Go Home</span>
            </Link>
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
        <div role="alert" className="max-w-7xl mx-auto px-6 py-20 text-center space-y-5">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="font-display text-xl font-bold text-[#F0F0F0] uppercase tracking-tight">
            Failed to Load Movie Details
          </h2>
          <p className="text-xs text-[#8FA8AD] max-w-md mx-auto leading-relaxed">
            The metadata could not be fetched from the media server.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-[#F0F0F0] text-xs font-semibold uppercase tracking-wider backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all duration-300 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
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
        <div role="alert" className="w-full aspect-video bg-[#0B131B]/80 backdrop-blur-3xl flex flex-col items-center justify-center p-8 gap-5 border border-white/[0.12] rounded-3xl text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_20px_50px_rgba(0,0,0,0.8)]">
          <AlertTriangle className="w-12 h-12 text-rose-500" />
          <div className="space-y-1.5">
            <h3 className="font-display text-lg font-bold text-[#F0F0F0] uppercase tracking-wider">
              Player Crashed
            </h3>
            <p className="text-xs text-[#8FA8AD] max-w-sm">
              The player controller encountered an interruption.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-full bg-[#F0F0F0] hover:bg-white text-[#0B131B] font-semibold text-xs uppercase tracking-wider backdrop-blur-xl border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_20px_rgba(255,255,255,0.2)] transition-all duration-300 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
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
        <div role="alert" className="py-16 text-center space-y-3">
          <p className="text-rose-400 text-sm font-semibold">Search Module Error</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs text-[#39AEA9] font-bold hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
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
        <div role="alert" className="p-8 bg-rose-500/10 border border-rose-500/20 backdrop-blur-2xl rounded-3xl space-y-4 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
          <p className="text-rose-400 font-mono text-xs">Admin Module Failure: {this.state.error?.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full bg-[#F0F0F0] hover:bg-white text-[#0B131B] text-xs font-bold uppercase backdrop-blur-xl border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_20px_rgba(255,255,255,0.2)] transition-all duration-300 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
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
        <div role="alert" className="max-w-7xl mx-auto px-6 py-20 text-center space-y-5">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="font-display text-xl font-bold text-[#F0F0F0] uppercase tracking-tight">
            Failed to Load TV Details
          </h2>
          <p className="text-xs text-[#8FA8AD] max-w-md mx-auto leading-relaxed">
            The metadata could not be fetched from the media server.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-[#F0F0F0] text-xs font-semibold uppercase tracking-wider backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all duration-300 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
          >
            Retry Loading
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
