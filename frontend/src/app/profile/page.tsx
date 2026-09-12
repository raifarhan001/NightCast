'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '../../store/userStore';
import { apiFetch, setStoredToken } from '../../lib/api';
import MovieCard from '../../components/shared/MovieCard';
import AmbientGlow from '../../components/shared/AmbientGlow';
import { getContinueWatchingList, removeWatchProgress, getCleanMediaId, LocalProgressItem } from '../../lib/progress';
import { Sparkles, User, Settings as SettingsIcon, LogOut, Trash2, Plus, Bookmark, Clock, Eye, ShieldCheck, Mail, Lock, PlayCircle, Film, LogIn } from 'lucide-react';
import Image from 'next/image';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, activeProfile, profiles, settings, fetchProfiles, setActiveProfile, updateSettings, logout, setUser } = useUserStore();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [showAuthCard, setShowAuthCard] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [profileCreateError, setProfileCreateError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [localContinueWatching, setLocalContinueWatching] = useState<LocalProgressItem[]>([]);
  const [localWatchlist, setLocalWatchlist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const refreshList = () => {
      setLocalContinueWatching(getContinueWatchingList());
      try {
        const stored = localStorage.getItem('nightcast_watchlist');
        if (stored) setLocalWatchlist(JSON.parse(stored));
      } catch {}
    };
    refreshList();

    window.addEventListener("focus", refreshList);
    window.addEventListener("storage", refreshList);
    window.addEventListener("nightcast:progress-update", refreshList);

    return () => {
      window.removeEventListener("focus", refreshList);
      window.removeEventListener("storage", refreshList);
      window.removeEventListener("nightcast:progress-update", refreshList);
    };
  }, []);

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

      // Filter out completed (>= 92%) or unstarted (< 1.5% and < 15s)
      if (percent >= 92.0 || (duration > 60 && seconds >= duration - 30)) return;
      if (seconds < 15 && percent < 1.5) return;

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

  const handleRemoveContinueWatching = async (item: any) => {
    const cleanId = getCleanMediaId(item.id);
    removeWatchProgress(cleanId, item.season, item.episode);
    setLocalContinueWatching(getContinueWatchingList());

    if (activeProfile) {
      try {
        const queryParams = new URLSearchParams();
        if (item.season) queryParams.set("season", item.season.toString());
        if (item.episode) queryParams.set("episode", item.episode.toString());
        const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";
        await apiFetch(`/api/progress/continue/${cleanId}${qs}`, {
          method: "DELETE",
          headers: { "X-Profile-ID": activeProfile.id },
        });
        refetchContinueWatching();
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
    try {
      if (authMode === 'login') {
        const loginRes = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        if (loginRes?.access_token) setStoredToken(loginRes.access_token);
        const me = await apiFetch('/api/auth/me');
        setUser(me);
        queryClient.invalidateQueries({ queryKey: ['trending'] });
        await fetchProfiles();
        const freshProfiles = useUserStore.getState().profiles;
        if (freshProfiles.length > 0) setActiveProfile(freshProfiles[0]);
      } else {
        await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
        setAuthMode('login');
        const loginRes = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        if (loginRes?.access_token) setStoredToken(loginRes.access_token);
        const me = await apiFetch('/api/auth/me');
        setUser(me);
        await fetchProfiles();
        const freshProfiles = useUserStore.getState().profiles;
        if (freshProfiles.length > 0) setActiveProfile(freshProfiles[0]);
      }
      setShowAuthCard(false);
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
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

  return (
    <div className="w-full min-h-screen bg-[#0B131B] text-[#F0F0F0] relative overflow-hidden pb-28 pt-8">
      {/* Dynamic Ambient Background Glow */}
      <AmbientGlow />

      <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-14 relative z-10 space-y-8">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#4A6E8D]/25">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#F0F0F0] tracking-tight">
              {user ? 'My Library & Profile' : 'My List & Watchlist'}
            </h1>
            <p className="text-xs sm:text-sm text-[#4A6E8D] mt-1">
              {user
                ? `Logged in as ${user.email}`
                : 'Your saved watchlist and continue watching progress on this device'}
            </p>
          </div>

          {!user ? (
            <button
              type="button"
              onClick={() => setShowAuthCard((prev) => !prev)}
              className="px-5 py-2.5 rounded-full bg-[#F0F0F0] text-[#0B131B] font-semibold text-xs tracking-wide flex items-center gap-2 hover:bg-[#A4C8E1] active:scale-95 transition-all shadow-lg cursor-pointer w-fit"
            >
              <LogIn className="w-4 h-4" />
              <span>{showAuthCard ? 'Close Sign In' : 'Sign In to Sync'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => logout()}
              className="px-5 py-2.5 rounded-full bg-[#1B3A57]/60 hover:bg-[#2C3E50]/80 border border-[#4A6E8D]/35 text-[#F0F0F0]/80 hover:text-[#F0F0F0] font-medium text-xs tracking-wide flex items-center gap-2 transition cursor-pointer w-fit"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>

        {/* Inline Auth Form Dropdown for Guest Users */}
        {!user && showAuthCard && (
          <div className="max-w-md mx-auto p-6 rounded-3xl bg-[#1B3A57]/40 backdrop-blur-2xl border border-[#4A6E8D]/35 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-[#F0F0F0] uppercase tracking-wider">
                {authMode === 'login' ? 'Sign In to Nightcast' : 'Create an Account'}
              </h3>
              <p className="text-xs text-[#4A6E8D]">
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
                <label className="text-[11px] uppercase tracking-wider font-semibold text-[#4A6E8D]">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B131B]/80 rounded-xl border border-[#4A6E8D]/40 text-[#F0F0F0] placeholder-[#4A6E8D] text-xs focus:outline-none focus:border-[#A4C8E1]/60 transition"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A6E8D]" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-[#4A6E8D]">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B131B]/80 rounded-xl border border-[#4A6E8D]/40 text-[#F0F0F0] placeholder-[#4A6E8D] text-xs focus:outline-none focus:border-[#A4C8E1]/60 transition"
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A6E8D]" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#F0F0F0] text-[#0B131B] font-semibold text-xs uppercase tracking-wider hover:bg-[#A4C8E1] transition shadow-lg cursor-pointer active:scale-95"
              >
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-xs text-[#4A6E8D] hover:text-[#A4C8E1] transition cursor-pointer"
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
              <span className="text-xs text-[#4A6E8D] font-medium">
                {mergedContinueWatching.length} {mergedContinueWatching.length === 1 ? 'title' : 'titles'}
              </span>
            )}
          </div>

          {mergedContinueWatching.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
              {mergedContinueWatching.map((cw, idx) => (
                <MovieCard
                  key={`cw-${cw.id}-${cw.season || 0}-${cw.episode || 0}-${idx}`}
                  item={cw}
                  onRemove={() => handleRemoveContinueWatching(cw)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#1B3A57]/20 border border-[#4A6E8D]/25 text-center space-y-1.5 backdrop-blur-md">
              <p className="text-sm font-semibold text-[#F0F0F0]">No in-progress titles</p>
              <p className="text-xs text-[#4A6E8D] max-w-sm mx-auto">
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

          {favorites.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
              {favorites.map((fav) => (
                <MovieCard
                  key={fav.id}
                  item={{
                    id: fav.media_id,
                    media_type: fav.media_type as any,
                    title: fav.title,
                    poster_path: fav.poster_path,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#1B3A57]/20 border border-[#4A6E8D]/25 text-center space-y-1.5 backdrop-blur-md">
              <p className="text-sm font-semibold text-[#F0F0F0]">Your watchlist is currently empty</p>
              <p className="text-xs text-[#4A6E8D] max-w-sm mx-auto">
                Click the Bookmark or Heart icon on any movie or show to add it to your personal streaming queue.
              </p>
            </div>
          )}
        </div>

        {/* Authenticated User Settings & Profiles Section */}
        {user && (
          <div className="pt-8 border-t border-[#4A6E8D]/25 space-y-8">
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
                    className="px-3 py-1.5 rounded-full bg-[#1B3A57]/60 hover:bg-[#2C3E50]/80 border border-[#4A6E8D]/35 text-[#F0F0F0] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Profile</span>
                  </button>
                )}
              </div>

              {showCreateForm && (
                <form onSubmit={handleCreateProfile} className="max-w-md p-5 rounded-2xl bg-[#1B3A57]/40 border border-[#4A6E8D]/35 backdrop-blur-xl space-y-3">
                  <h4 className="text-xs font-bold uppercase text-[#F0F0F0]">Add New Profile</h4>
                  {profileCreateError && <p className="text-xs text-red-400">{profileCreateError}</p>}
                  <input
                    type="text"
                    placeholder="Profile Name"
                    required
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    className="w-full bg-[#0B131B]/80 border border-[#4A6E8D]/40 rounded-xl px-3.5 py-2 text-xs text-[#F0F0F0] placeholder-[#4A6E8D] focus:outline-none focus:border-[#A4C8E1]/60"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-grow py-2 rounded-xl bg-[#F0F0F0] text-[#0B131B] font-semibold text-xs cursor-pointer hover:bg-[#A4C8E1]"
                    >
                      Save Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 rounded-xl bg-[#1B3A57]/60 hover:bg-[#2C3E50]/80 text-[#F0F0F0] text-xs border border-[#4A6E8D]/30 cursor-pointer"
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
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      activeProfile?.id === p.id
                        ? 'border-[#A4C8E1] bg-[#1B3A57]/60 shadow-[0_0_20px_rgba(164,200,225,0.2)] text-[#F0F0F0]'
                        : 'border-[#4A6E8D]/25 bg-[#1B3A57]/20 text-[#F0F0F0]/70 hover:text-[#F0F0F0] hover:border-[#4A6E8D]/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveProfile(p)}
                      className="flex items-center gap-3 text-left focus:outline-none flex-grow cursor-pointer min-w-0"
                    >
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#4A6E8D]/40 shrink-0">
                        <Image src={p.avatar_url} alt={p.name} fill sizes="32px" className="object-cover" />
                      </div>
                      <span className="text-xs font-semibold truncate">{p.name}</span>
                    </button>
                    {profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(p.id)}
                        className="p-1.5 text-[#4A6E8D] hover:text-red-400 transition cursor-pointer"
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
                <div className="p-5 rounded-2xl bg-[#1B3A57]/30 border border-[#4A6E8D]/30 backdrop-blur-xl space-y-4 text-xs">
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
                    <span className="text-[#4A6E8D] block">Preferred Audio Language</span>
                    <select
                      value={settings.preferred_language}
                      onChange={(e) => updateSettings({ preferred_language: e.target.value })}
                      className="w-full bg-[#0B131B] border border-[#4A6E8D]/40 rounded-xl px-3 py-2 text-[#F0F0F0] focus:outline-none focus:border-[#A4C8E1]/60 cursor-pointer"
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
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearHistoryMutation.mutate()}
                    className="text-xs text-[#4A6E8D] hover:text-red-400 transition cursor-pointer font-medium"
                  >
                    Clear History
                  </button>
                )}
              </div>
              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="p-3.5 rounded-xl bg-[#1B3A57]/20 border border-[#4A6E8D]/25 hover:border-[#A4C8E1]/40 flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-[#2C3E50]/50 rounded-lg flex items-center justify-center text-[#A4C8E1] shrink-0">
                          <Eye className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[#F0F0F0] truncate max-w-sm">{h.title}</h4>
                          <p className="text-[10px] text-[#4A6E8D] uppercase tracking-wider">
                            {h.media_type} &middot; {h.progress_percent.toFixed(0)}% watched
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-[#4A6E8D] font-mono">
                        {new Date(h.watched_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#1B3A57]/20 border border-[#4A6E8D]/25 text-center text-xs text-[#4A6E8D]">
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
