'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '../../store/userStore';
import { apiFetch, setStoredToken } from '../../lib/api';
import { syncUserDataWithCloud } from '../../lib/sync';
import MovieCard from '../../components/shared/MovieCard';
import AmbientGlow from '../../components/shared/AmbientGlow';
import { getContinueWatchingList, removeWatchProgress, getCleanMediaId, LocalProgressItem } from '../../lib/progress';
import { User, Settings as SettingsIcon, LogOut, Trash2, Plus, Bookmark, Clock, Eye, Mail, Lock, PlayCircle, LogIn } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ProfilePageContent() {
  const queryClient = useQueryClient();
  const { user, activeProfile, profiles, settings, fetchProfiles, setActiveProfile, updateSettings, logout, setUser } = useUserStore();
  const searchParams = useSearchParams();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  // Auto-open login form if ?signin=1 is in URL
  const [showAuthCard, setShowAuthCard] = useState(() => searchParams.get('signin') === '1');
  const [newProfileName, setNewProfileName] = useState('');
  const [profileCreateError, setProfileCreateError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [localContinueWatching, setLocalContinueWatching] = useState<LocalProgressItem[]>([]);
  const [localWatchlist, setLocalWatchlist] = useState<Record<string, any>>({});

  // If user gets logged in while ?signin=1 was in URL, close the auth card
  useEffect(() => {
    if (user && showAuthCard) {
      setShowAuthCard(false);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const refreshList = () => {
      setLocalContinueWatching(getContinueWatchingList());
      try {
        const stored = localStorage.getItem('nightcast_watchlist');
        if (stored) setLocalWatchlist(JSON.parse(stored));
        else setLocalWatchlist({});
      } catch {
        setLocalWatchlist({});
      }
    };
    refreshList();

    const handleWatchlistUpdate = () => {
      refreshList();
      queryClient.invalidateQueries({ queryKey: ['profile-favorites'] });
    };

    window.addEventListener("focus", refreshList);
    window.addEventListener("storage", refreshList);
    window.addEventListener("nightcast:progress-update", refreshList);
    window.addEventListener("nightcast:watchlist-update", handleWatchlistUpdate);

    return () => {
      window.removeEventListener("focus", refreshList);
      window.removeEventListener("storage", refreshList);
      window.removeEventListener("nightcast:progress-update", refreshList);
      window.removeEventListener("nightcast:watchlist-update", handleWatchlistUpdate);
    };
  }, [queryClient]);

  const { data: favorites = [] } = useQuery<any[]>({
    queryKey: ['profile-favorites', activeProfile?.id],
    queryFn: () => apiFetch('/api/user/favorites', {
      headers: activeProfile ? { 'X-Profile-ID': activeProfile.id } : {}
    }),
    enabled: !!activeProfile
  });

  const { data: backendContinueWatching = [], refetch: refetchContinueWatching } = useQuery<any[]>({
    queryKey: ['profile-continue-watching', activeProfile?.id],
    queryFn: () => apiFetch('/api/progress/continue', {
      headers: activeProfile ? { 'X-Profile-ID': activeProfile.id } : {}
    }),
    enabled: !!activeProfile
  });

  const mergedContinueWatching = useMemo(() => {
    const map = new Map<string, any>();

    const processItem = (c: any) => {
      const cleanId = getCleanMediaId(c.media_id || c.id);
      if (!cleanId) return;

      const percent = Number(c.progress_percent ?? 0);
      const seconds = Number(c.timestamp_seconds ?? 0);
      const duration = Number(c.duration_seconds ?? 0);

      // Filter out completed (>= 92%)
      if (percent >= 92.0 || (duration > 60 && seconds >= duration - 30)) return;
      
      const isUpNextMarker = (c.media_type === 'tv' || c.season) && c.episode !== undefined && percent >= 1;
      const hasWatchedContent = seconds >= 5 || percent >= 1.5;
      if (!isUpNextMarker && !hasWatchedContent) return;

      const existing = map.get(cleanId);
      const cTime = c.updated_at ? new Date(c.updated_at).getTime() : 0;
      const exTime = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;

      const cEpScore = ((c.season || 1) * 1000) + (c.episode || 1);
      const exEpScore = existing ? (((existing.season || 1) * 1000) + (existing.episode || 1)) : 0;

      if (!existing || cTime > exTime || (cEpScore > exEpScore && cTime >= exTime - 60000)) {
        map.set(cleanId, {
          id: cleanId,
          media_type: c.media_type || (c.season ? 'tv' : 'movie'),
          title: c.title || existing?.title || 'Untitled',
          poster_path: c.poster_path || existing?.poster_path || null,
          backdrop_path: c.backdrop_path || (c as any).backdrop_path || existing?.backdrop_path || null,
          season: c.season,
          episode: c.episode,
          progress_percent: percent,
          timestamp_seconds: seconds,
          duration_seconds: duration,
          updated_at: c.updated_at || new Date().toISOString(),
        });
      }
    };

    for (const item of localContinueWatching) {
      processItem(item);
    }
    for (const c of backendContinueWatching) {
      processItem(c);
    }

    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [localContinueWatching, backendContinueWatching]);

  const mergedWatchlist = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Add local watchlist items
    Object.entries(localWatchlist).forEach(([key, val]) => {
      if (val && typeof val === "object") {
        map.set(String(key), {
          id: val.id || key,
          media_id: String(val.media_id || val.id || key),
          media_type: val.media_type || "movie",
          title: val.title || "Untitled",
          poster_path: val.poster_path || null,
          backdrop_path: val.backdrop_path || null,
          vote_average: val.vote_average || 0,
        });
      } else if (val) {
        map.set(String(key), {
          id: key,
          media_id: String(key),
          media_type: "movie",
          title: "Saved Title",
          poster_path: null,
        });
      }
    });

    // 2. Add backend favorites
    for (const fav of favorites) {
      const cleanId = String(fav.media_id || fav.id);
      map.set(cleanId, {
        id: fav.media_id || fav.id,
        media_id: cleanId,
        media_type: fav.media_type || "movie",
        title: fav.title || "Untitled",
        poster_path: fav.poster_path || null,
      });
    }

    return Array.from(map.values());
  }, [localWatchlist, favorites]);

  const handleRemoveContinueWatching = async (item: any) => {
    const cleanId = getCleanMediaId(item.id);
    removeWatchProgress(cleanId, item.season, item.episode);
    setLocalContinueWatching(getContinueWatchingList());

    if (activeProfile) {
      try {
        // Record as completed/skipped in backend Watch History
        await apiFetch('/api/v1/progress/update', {
          method: 'POST',
          headers: { 'X-Profile-ID': activeProfile.id },
          body: JSON.stringify({
            mediaType: item.media_type || (item.season ? 'tv' : 'movie'),
            id: cleanId,
            currentTime: item.duration_seconds || item.timestamp_seconds || 100,
            duration: item.duration_seconds || 100,
            progress: 100.0,
            season: item.season,
            episode: item.episode,
            event: 'skipped',
            title: item.title,
            posterPath: item.poster_path,
            backdropPath: item.backdrop_path,
          })
        }).catch(() => {});

        const queryParams = new URLSearchParams();
        if (item.season) queryParams.set("season", item.season.toString());
        if (item.episode) queryParams.set("episode", item.episode.toString());
        const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";
        await apiFetch(`/api/progress/continue/${cleanId}${qs}`, {
          method: "DELETE",
          headers: { "X-Profile-ID": activeProfile.id },
        });
        refetchContinueWatching();
        refetchHistory();
      } catch (err) {
        console.error("Failed to delete continue watching", err);
      }
    }
  };

  const { data: history = [], refetch: refetchHistory } = useQuery<any[]>({
    queryKey: ['profile-history', activeProfile?.id],
    queryFn: () => apiFetch('/api/progress/history', {
      headers: activeProfile ? { 'X-Profile-ID': activeProfile.id } : {}
    }),
    enabled: !!activeProfile
  });

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (authMode === 'register' && cleanPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    if (!cleanPassword) {
      setAuthError('Password cannot be empty.');
      return;
    }

    setIsSubmittingAuth(true);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const authRes = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      });

      if (!authRes?.access_token) {
        throw new Error('Authentication failed. No access token received.');
      }

      setStoredToken(authRes.access_token);

      // Fetch current user details
      const me = authRes.user && authRes.user.id ? authRes.user : await apiFetch('/api/auth/me');
      if (!me || !me.id) throw new Error('Failed to load user profile');
      setUser(me);

      queryClient.invalidateQueries({ queryKey: ['trending'] });

      // Fetch profiles directly and prevent race conditions
      const freshProfiles = await fetchProfiles();
      if (freshProfiles.length > 0) {
        setActiveProfile(freshProfiles[0]);
        await syncUserDataWithCloud(freshProfiles[0].id);
      }

      setShowAuthCard(false);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileCreateError('');
    if (!newProfileName.trim()) return;
    try {
      await apiFetch('/api/auth/profiles', {
        method: 'POST',
        body: JSON.stringify({
          name: newProfileName,
          avatar_url: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 100000)}?auto=format&fit=crop&q=80&w=256&h=256`
        })
      });
      setNewProfileName('');
      setShowCreateForm(false);
      await fetchProfiles();
    } catch (err: any) {
      setProfileCreateError(err.message || 'Failed to create profile');
    }
  };

  const handleDeleteProfile = async (pId: string) => {
    if (confirm("Delete this profile and all its watch history?")) {
      try {
        await apiFetch(`/api/auth/profiles/${pId}`, { method: 'DELETE' });
        if (activeProfile?.id === pId) setActiveProfile(null);
        await fetchProfiles();
        const freshProfiles = useUserStore.getState().profiles;
        if (freshProfiles.length > 0) setActiveProfile(freshProfiles[0]);
      } catch (err) {
        console.error("Profile deletion failed:", err);
      }
    }
  };

  const clearHistoryMutation = useMutation({
    mutationFn: () => apiFetch('/api/progress/history', {
      method: 'DELETE',
      headers: activeProfile ? { 'X-Profile-ID': activeProfile.id } : {}
    }),
    onSuccess: () => refetchHistory()
  });

  const deleteHistoryItemMutation = useMutation({
    mutationFn: (historyId: string) => apiFetch(`/api/progress/history/${historyId}`, {
      method: 'DELETE',
      headers: activeProfile ? { 'X-Profile-ID': activeProfile.id } : {}
    }),
    onSuccess: () => refetchHistory()
  });

  const dedupedHistory = useMemo(() => {
    const seen = new Set<string>();
    const list: any[] = [];
    for (const h of history) {
      const rawId = String(h.media_id || h.id);
      const cleanId = rawId.split('_s')[0].split('-s')[0].split('_')[0].trim();
      if (Number(h.progress_percent || 0) < 1.0) continue;
      if (!seen.has(cleanId)) {
        seen.add(cleanId);
        list.push(h);
      }
    }
    return list;
  }, [history]);

  return (
    <div className="w-full min-h-screen bg-[#0B131B] text-[#F0F0F0] relative overflow-hidden pb-28 pt-24 sm:pt-28">
      {/* Dynamic Ambient Background Glow */}
      <AmbientGlow />

      <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-14 relative z-10 space-y-8">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-[#F0F0F0] tracking-tight">
                {user ? 'My Library & Profile' : 'My List & Watchlist'}
              </h1>
              {user && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#39AEA9]/20 border border-[#39AEA9]/35 text-[#39AEA9] text-[11px] font-semibold">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#8FA8AD] mt-1">
              {user
                ? `Logged in as ${user.email}`
                : 'Your saved watchlist and continue watching progress on this device'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!user ? (
              <button
                type="button"
                onClick={() => setShowAuthCard((prev) => !prev)}
                className="px-5 py-2.5 rounded-full bg-[#F0F0F0] text-[#0B131B] font-semibold text-xs tracking-wide flex items-center gap-2 hover:bg-white active:scale-95 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_16px_rgba(240,240,240,0.3)] cursor-pointer w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
              >
                <LogIn className="w-4 h-4" />
                <span>{showAuthCard ? 'Close Sign In' : 'Sign In / Register'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => logout()}
                className="px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 border border-white/[0.12] text-[#F0F0F0]/80 font-medium text-xs tracking-wide flex items-center gap-2 backdrop-blur-xl transition cursor-pointer w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline Auth Form Dropdown for Guest Users */}
        {!user && showAuthCard && (
          <div className="max-w-md mx-auto p-6 rounded-3xl bg-[#0B131B]/90 backdrop-blur-3xl backdrop-saturate-150 border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_25px_60px_rgba(0,0,0,0.95)] space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-[#F0F0F0] uppercase tracking-wider">
                {authMode === 'login' ? 'Sign In to Nightcast' : 'Create an Account'}
              </h3>
              <p className="text-xs text-[#8FA8AD]">
                Sync your watchlist across devices and unlock customized profiles.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label htmlFor="auth-email-field" className="text-[11px] uppercase tracking-wider font-semibold text-[#8FA8AD]">Email</label>
                <div className="relative">
                  <input
                    id="auth-email-field"
                    type="email"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmail((prev) => prev.trim().toLowerCase())}
                    placeholder="name@domain.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B131B]/70 rounded-xl border border-white/[0.12] text-[#F0F0F0] placeholder-[#8FA8AD]/60 text-xs focus:outline-none focus:border-[#39AEA9] transition shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8FA8AD]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-password-field" className="text-[11px] uppercase tracking-wider font-semibold text-[#8FA8AD]">Password</label>
                  {authMode === 'register' && (
                    <span className="text-[10px] text-[#8FA8AD]/80">Min 6 characters</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password-field"
                    type="password"
                    required
                    minLength={authMode === 'register' ? 6 : 1}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B131B]/70 rounded-xl border border-white/[0.12] text-[#F0F0F0] placeholder-[#8FA8AD]/60 text-xs focus:outline-none focus:border-[#39AEA9] transition shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]"
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8FA8AD]" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-3 rounded-full bg-[#F0F0F0] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B131B] font-semibold text-xs uppercase tracking-wider hover:bg-white transition shadow-lg cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] flex items-center justify-center gap-2"
              >
                {isSubmittingAuth && (
                  <div className="w-3.5 h-3.5 border-2 border-[#0B131B]/30 border-t-[#0B131B] animate-spin rounded-full" />
                )}
                <span>
                  {isSubmittingAuth
                    ? 'Please wait...'
                    : authMode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
                </span>
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthError('');
                }}
                className="text-xs text-[#8FA8AD] hover:text-[#F0F0F0] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] rounded px-2 py-1"
              >
                {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>
          </div>
        )}

        {/* Continue Watching Section */}
        <div id="continue-watching" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-[#A4C8E1]" />
              <h2 className="text-lg font-bold text-[#F0F0F0] tracking-wide">Continue Watching</h2>
            </div>
            {mergedContinueWatching.length > 0 && (
              <span className="text-xs text-[#8FA8AD] font-medium">
                {mergedContinueWatching.length} {mergedContinueWatching.length === 1 ? 'title' : 'titles'}
              </span>
            )}
          </div>

          {mergedContinueWatching.length > 0 ? (
            <div className="flex flex-wrap gap-4 sm:gap-6 items-start">
              {mergedContinueWatching.map((cw, idx) => (
                <MovieCard
                  key={`cw-${cw.id}-${cw.season || 0}-${cw.episode || 0}-${idx}`}
                  item={cw}
                  onRemove={() => handleRemoveContinueWatching(cw)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] text-center space-y-1.5">
              <p className="text-sm font-semibold text-[#F0F0F0]">No in-progress titles</p>
              <p className="text-xs text-[#8FA8AD] max-w-sm mx-auto">
                Titles you begin watching will automatically remember your exact resume spot right here.
              </p>
            </div>
          )}
        </div>

        {/* Watchlist Section */}
        <div id="watchlist" className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Bookmark className="w-5 h-5 text-[#A4C8E1]" />
            <h2 className="text-lg font-bold text-[#F0F0F0] tracking-wide">Watchlist & Favorites</h2>
          </div>

          {mergedWatchlist.length > 0 ? (
            <div className="flex flex-wrap gap-4 sm:gap-6 items-start">
              {mergedWatchlist.map((item) => (
                <MovieCard
                  key={item.id || item.media_id}
                  item={item}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] text-center space-y-1.5">
              <p className="text-sm font-semibold text-[#F0F0F0]">Your watchlist is currently empty</p>
              <p className="text-xs text-[#8FA8AD] max-w-sm mx-auto">
                Click the Bookmark or Heart icon on any movie or show to add it to your personal streaming queue.
              </p>
            </div>
          )}
        </div>

        {/* Authenticated User Settings & Profiles Section */}
        {user && (
          <div className="pt-8 border-t border-white/[0.08] space-y-8">
            {/* Profiles Selector */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <User className="w-5 h-5 text-[#A4C8E1]" />
                  <h3 className="text-base font-bold text-[#F0F0F0]">Streaming Profiles</h3>
                </div>
                {profiles.length < 4 && !showCreateForm && (
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.14] text-[#F0F0F0] text-xs font-medium flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Profile</span>
                  </button>
                )}
              </div>

              {showCreateForm && (
                <form onSubmit={handleCreateProfile} className="max-w-md p-5 rounded-2xl bg-[#0B131B]/80 border border-white/[0.16] backdrop-blur-3xl space-y-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                  <h4 className="text-xs font-bold uppercase text-[#F0F0F0]">Add New Profile</h4>
                  {profileCreateError && <p className="text-xs text-red-400">{profileCreateError}</p>}
                  <input
                    type="text"
                    placeholder="Profile Name"
                    required
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    className="w-full bg-[#0B131B]/70 border border-white/[0.14] rounded-xl px-3.5 py-2 text-xs text-[#F0F0F0] placeholder-[#8FA8AD] focus:outline-none focus:border-white/[0.3] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-grow py-2 rounded-xl bg-[#F0F0F0] text-[#0B131B] font-semibold text-xs cursor-pointer hover:bg-[#A4C8E1] transition"
                    >
                      Save Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-[#F0F0F0] text-xs border border-white/[0.12] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border backdrop-blur-xl transition-all ${
                      activeProfile?.id === p.id
                        ? 'border-white/[0.3] bg-white/[0.1] shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_0_20px_rgba(164,200,225,0.2)] text-[#F0F0F0]'
                        : 'border-white/[0.08] bg-white/[0.04] text-[#8FA8AD] hover:text-[#F0F0F0] hover:border-white/[0.2] hover:bg-white/[0.08]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveProfile(p)}
                      className="flex items-center gap-3 text-left focus:outline-none flex-grow cursor-pointer min-w-0"
                    >
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/[0.14] shrink-0">
                        <Image src={p.avatar_url} alt={p.name} fill sizes="32px" className="object-cover" />
                      </div>
                      <span className="text-xs font-semibold truncate">{p.name}</span>
                    </button>
                    {profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(p.id)}
                        className="p-1.5 text-[#8FA8AD] hover:text-red-400 transition cursor-pointer"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Playback Settings */}
            {activeProfile && settings && (
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-2.5">
                  <SettingsIcon className="w-5 h-5 text-[#A4C8E1]" />
                  <h3 className="text-base font-bold text-[#F0F0F0]">Playback Preferences</h3>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-2xl space-y-4 text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#F0F0F0] font-medium">Autoplay Next Episode</span>
                    <input
                      type="checkbox"
                      checked={settings.autoplay}
                      onChange={(e) => updateSettings({ autoplay: e.target.checked })}
                      className="w-4 h-4 accent-[#A4C8E1] rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#F0F0F0] font-medium">Subtitles Enabled by Default</span>
                    <input
                      type="checkbox"
                      checked={settings.subtitles_enabled}
                      onChange={(e) => updateSettings({ subtitles_enabled: e.target.checked })}
                      className="w-4 h-4 accent-[#A4C8E1] rounded cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[#8FA8AD] block">Preferred Audio Language</span>
                    <select
                      value={settings.preferred_language}
                      onChange={(e) => updateSettings({ preferred_language: e.target.value })}
                      className="w-full bg-[#0B131B]/70 border border-white/[0.14] rounded-xl px-3 py-2 text-[#F0F0F0] focus:outline-none focus:border-white/[0.3] cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]"
                    >
                      <option value="en">English (US)</option>
                      <option value="hi">Hindi</option>
                      <option value="de">Deutsch</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Watch History */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Eye className="w-5 h-5 text-[#A4C8E1]" />
                  <h3 className="text-base font-bold text-[#F0F0F0]">Watch History</h3>
                </div>
                {dedupedHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearHistoryMutation.mutate()}
                    className="text-xs text-[#8FA8AD] hover:text-red-400 transition cursor-pointer font-medium"
                  >
                    Clear History
                  </button>
                )}
              </div>
              {dedupedHistory.length > 0 ? (
                <div className="space-y-2">
                  {dedupedHistory.map((h) => {
                    const cleanId = String(h.media_id || h.id).split('_s')[0].split('-s')[0].split('_')[0].trim();
                    const watchUrl = `/watch/${h.media_type || 'movie'}/${cleanId}`;
                    return (
                      <div
                        key={h.id}
                        className="p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/[0.22] backdrop-blur-xl flex items-center justify-between transition group shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]"
                      >
                        <Link href={watchUrl} className="flex items-center gap-3 min-w-0 flex-grow hover:opacity-90">
                          <div className="w-8 h-8 bg-white/[0.08] rounded-lg flex items-center justify-center text-[#A4C8E1] shrink-0 group-hover:bg-[#39AEA9]/20 group-hover:text-[#39AEA9] transition-colors border border-white/[0.1]">
                            <PlayCircle className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-[#F0F0F0] truncate max-w-sm group-hover:text-[#A4C8E1] transition-colors">{h.title}</h4>
                            <p className="text-[10px] text-[#8FA8AD] uppercase tracking-wider">
                              {h.media_type} &middot; {Math.max(1, Math.round(Number(h.progress_percent || 0)))}% watched
                            </p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-[#8FA8AD] font-mono">
                            {new Date(h.watched_at).toLocaleDateString()}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHistoryItemMutation.mutate(h.id);
                            }}
                            className="p-1 rounded text-[#8FA8AD] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            title="Remove from history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center text-xs text-[#8FA8AD] backdrop-blur-md">
                  No watch history recorded yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageContent />
    </Suspense>
  );
}
