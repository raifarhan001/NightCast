'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '../../store/userStore';
import { apiFetch, setStoredToken } from '../../lib/api';
import MovieCard from '../../components/shared/MovieCard';
import { getContinueWatchingList, removeWatchProgress, LocalProgressItem } from '../../lib/progress';
import { Sparkles, User, Settings as SettingsIcon, LogOut, Trash2, Plus, Bookmark, Clock, Eye, ShieldCheck, Mail, Lock, PlayCircle } from 'lucide-react';
import Image from 'next/image';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, activeProfile, profiles, settings, fetchProfiles, setActiveProfile, updateSettings, logout, setUser } = useUserStore();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [newProfileName, setNewProfileName] = useState('');
  const [profileCreateError, setProfileCreateError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [localContinueWatching, setLocalContinueWatching] = useState<LocalProgressItem[]>([]);

  useEffect(() => {
    const refreshList = () => {
      setLocalContinueWatching(getContinueWatchingList());
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

    for (const item of localContinueWatching) {
      const key = item.media_type === 'tv' ? `${item.id}_s${item.season || 1}e${item.episode || 1}` : `${item.id}`;
      map.set(key, {
        id: item.id,
        media_type: item.media_type,
        title: item.title,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        season: item.season,
        episode: item.episode,
        progress_percent: item.progress_percent,
        updated_at: item.updated_at,
      });
    }

    for (const c of backendContinueWatching) {
      const key = c.media_type === 'tv' ? `${c.media_id}_s${c.season || 1}e${c.episode || 1}` : `${c.media_id}`;
      map.set(key, {
        id: c.media_id || c.id,
        media_type: c.media_type,
        title: c.title,
        poster_path: c.poster_path,
        season: c.season,
        episode: c.episode,
        progress_percent: c.progress_percent,
        updated_at: c.updated_at,
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [localContinueWatching, backendContinueWatching]);

  const handleRemoveContinueWatching = async (item: any) => {
    removeWatchProgress(item.id, item.season, item.episode);
    setLocalContinueWatching(getContinueWatchingList());

    if (activeProfile) {
      try {
        const queryParams = new URLSearchParams();
        if (item.season) queryParams.set("season", item.season.toString());
        if (item.episode) queryParams.set("episode", item.episode.toString());
        const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";
        await apiFetch(`/api/progress/continue/${item.id}${qs}`, {
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
        body: JSON.stringify({ name: newProfileName, avatar_url: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 100000)}?auto=format&fit=crop&q=80&w=256&h=256` })
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
      } catch (err) { console.error("Profile deletion failed:", err); }
    }
  };

  const clearHistoryMutation = useMutation({
    mutationFn: () => apiFetch('/api/progress/history', { method: 'DELETE', headers: activeProfile ? { 'X-Profile-ID': activeProfile.id } : {} }),
    onSuccess: () => refetchHistory()
  });

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 min-h-[85vh] flex flex-col justify-center bg-[#0A0F11]">
        <div className="bg-[#121A1D] rounded-2xl p-8 space-y-6 border border-[#223136] shadow-2xl">
          <div className="text-center space-y-2">
            <h1 className="font-display text-2xl font-bold tracking-widest text-[#E5EFC1] uppercase">
              {authMode === 'login' ? 'NIGHTCAST Sign In' : 'Join NIGHTCAST'}
            </h1>
            <p className="text-xs text-[#8FA8AD] font-mono">
              {authMode === 'login' ? 'Access your watchlist, profiles, and history' : 'Create an account to begin streaming'}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono font-semibold text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#8FA8AD]">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#0A0F11] rounded-xl border border-[#223136] text-[#E5EFC1] placeholder-[#8FA8AD] text-sm font-mono focus:outline-none focus:border-[#39AEA9] transition-colors"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8FA8AD]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#8FA8AD]">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-[#0A0F11] rounded-xl border border-[#223136] text-[#E5EFC1] placeholder-[#8FA8AD] text-sm font-mono focus:outline-none focus:border-[#39AEA9] transition-colors"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8FA8AD]" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] hover:opacity-95 text-[#0A0F11] font-mono font-bold text-xs uppercase tracking-widest transition-all shadow-[0_4px_24px_rgba(57,174,169,0.35)] active:scale-[0.98] cursor-pointer"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-xs text-[#8FA8AD] font-mono hover:text-[#39AEA9] transition-colors cursor-pointer"
            >
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already registered? Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 min-h-screen bg-[#0A0F11] text-[#E5EFC1] grid grid-cols-1 lg:grid-cols-4 gap-10">
      {/* Sidebar Controls */}
      <div className="lg:col-span-1 space-y-8">
        {/* User Card */}
        <div className="bg-[#121A1D] rounded-2xl p-6 text-center space-y-4 border border-[#223136] shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#0A0F11] border border-[#223136] text-[#39AEA9] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(57,174,169,0.2)]">
            <ShieldCheck className="w-8 h-8 text-[#39AEA9]" />
          </div>
          <div>
            <h3 className="font-bold text-[#E5EFC1] text-sm truncate font-sans">{user.email}</h3>
            <p className="text-[10px] text-[#8FA8AD] font-mono font-bold tracking-widest uppercase mt-0.5">
              {user.is_admin ? 'Administrator' : 'Premium Member'}
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#39AEA9]/10 hover:bg-[#39AEA9]/20 border border-[#39AEA9]/30 text-[#39AEA9] text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Profiles Selector */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#8FA8AD] font-mono font-bold">Profiles</h3>
            {profiles.length < 4 && !showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="p-1.5 rounded-lg bg-[#121A1D] hover:bg-[#1A2529] text-[#8FA8AD] hover:text-white transition-all border border-[#223136] hover:border-[#39AEA9] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateProfile} className="bg-[#121A1D] rounded-2xl p-4 space-y-3.5 border border-[#223136] shadow-xl">
              <h4 className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#E5EFC1]">New Profile</h4>
              {profileCreateError && <p className="text-[10px] font-mono text-red-400 font-semibold">{profileCreateError}</p>}
              <input
                type="text"
                placeholder="Profile Name"
                required
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="w-full bg-[#0A0F11] border border-[#223136] rounded-xl px-3 py-2 text-xs text-[#E5EFC1] placeholder-[#8FA8AD] focus:outline-none focus:border-[#39AEA9] font-mono"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-grow py-2 rounded-xl bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] hover:opacity-95 text-[#0A0F11] text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_2px_10px_rgba(57,174,169,0.3)]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-2 rounded-xl bg-[#0A0F11] hover:bg-[#1A2529] text-[#8FA8AD] text-xs font-mono transition-all border border-[#223136] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {profiles.map(p => (
              <div
                key={p.id}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  activeProfile?.id === p.id
                    ? 'border-transparent bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] text-[#0A0F11] shadow-[0_4px_16px_rgba(57,174,169,0.25)] font-bold'
                    : 'border-[#223136] bg-[#121A1D] text-[#8FA8AD] hover:text-[#E5EFC1] hover:border-[#39AEA9]/60'
                }`}
              >
                <button onClick={() => setActiveProfile(p)} className="flex items-center gap-3 text-left focus:outline-none flex-grow cursor-pointer">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#223136] shrink-0">
                    <Image src={p.avatar_url} alt={p.name} fill sizes="32px" className="object-cover" />
                  </div>
                  <span className="text-xs font-bold font-sans">{p.name}</span>
                </button>
                {profiles.length > 1 && (
                  <button onClick={() => handleDeleteProfile(p.id)} className="p-2 opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* User Preferences */}
        {activeProfile && settings && (
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#8FA8AD] font-mono font-bold">Playback Settings</h3>
            <div className="bg-[#121A1D] rounded-2xl p-5 space-y-4 text-xs border border-[#223136] shadow-xl font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[#E5EFC1] font-bold">Autoplay Next</span>
                <input
                  type="checkbox"
                  checked={settings.autoplay}
                  onChange={(e) => updateSettings({ autoplay: e.target.checked })}
                  className="w-4 h-4 accent-[#39AEA9] rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#E5EFC1] font-bold">Subtitles Enabled</span>
                <input
                  type="checkbox"
                  checked={settings.subtitles_enabled}
                  onChange={(e) => updateSettings({ subtitles_enabled: e.target.checked })}
                  className="w-4 h-4 accent-[#39AEA9] rounded cursor-pointer"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[#8FA8AD] font-bold block">Preferred Language</span>
                <select
                  value={settings.preferred_language}
                  onChange={(e) => updateSettings({ preferred_language: e.target.value })}
                  className="w-full bg-[#0A0F11] border border-[#223136] rounded-xl px-2.5 py-2 text-[#E5EFC1] focus:outline-none focus:border-[#39AEA9] font-mono cursor-pointer"
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
      </div>

      {/* Main Content Area: Continue Watching, Watchlist & Watch History */}
      <div className="lg:col-span-3 space-y-10">
        {/* Continue Watching */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[#E5EFC1]">
              <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#39AEA9] to-[#A2D5AB]" />
              <h2 className="font-display text-xl font-bold tracking-tight text-[#E5EFC1]">Continue Watching</h2>
            </div>
            {mergedContinueWatching.length > 0 && (
              <span className="text-[11px] font-mono text-[#8FA8AD]">
                {mergedContinueWatching.length} {mergedContinueWatching.length === 1 ? 'title' : 'titles'} in progress
              </span>
            )}
          </div>
          {mergedContinueWatching.length > 0 ? (
            <div className="flex flex-wrap gap-4 sm:gap-6 justify-start">
              {mergedContinueWatching.map((cw, idx) => (
                <MovieCard
                  key={`cw-${cw.id}-${cw.season || 0}-${cw.episode || 0}-${idx}`}
                  item={cw}
                  onRemove={() => handleRemoveContinueWatching(cw)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-[#121A1D] rounded-2xl p-8 text-center space-y-1.5 border border-[#223136] shadow-xl">
              <p className="text-xs font-mono font-bold text-[#E5EFC1] uppercase tracking-wider">No in-progress titles</p>
              <p className="text-[11px] text-[#8FA8AD] max-w-xs mx-auto font-sans">Titles you start watching will automatically appear here with your saved resume point.</p>
            </div>
          )}
        </div>

        {/* Watchlist */}
        <div className="space-y-5">
          <div className="flex items-center gap-3 text-[#E5EFC1]">
            <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#39AEA9] to-[#A2D5AB]" />
            <h2 className="font-display text-xl font-bold tracking-tight text-[#E5EFC1]">Watchlist</h2>
          </div>
          {favorites.length > 0 ? (
            <div className="flex flex-wrap gap-4 sm:gap-6 justify-start">
              {favorites.map((fav) => (
                <MovieCard key={fav.id} item={{ id: fav.media_id, media_type: fav.media_type as any, title: fav.title, poster_path: fav.poster_path }} />
              ))}
            </div>
          ) : (
            <div className="bg-[#121A1D] rounded-2xl p-10 text-center space-y-1.5 border border-[#223136] shadow-xl">
              <p className="text-xs font-mono font-bold text-[#E5EFC1] uppercase tracking-wider">Your watchlist is currently empty</p>
              <p className="text-[11px] text-[#8FA8AD] max-w-xs mx-auto font-sans">Explore titles and bookmark them to build your personal streaming library.</p>
            </div>
          )}
        </div>

        {/* Watch History */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[#E5EFC1]">
              <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#39AEA9] to-[#A2D5AB]" />
              <h2 className="font-display text-xl font-bold tracking-tight text-[#E5EFC1]">Watch History</h2>
            </div>
            {history.length > 0 && (
              <button
                onClick={() => clearHistoryMutation.mutate()}
                className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#39AEA9] hover:text-[#A2D5AB] transition-colors cursor-pointer"
              >
                Clear History
              </button>
            )}
          </div>
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="bg-[#121A1D] rounded-2xl p-4 flex items-center justify-between border border-[#223136] hover:border-[#39AEA9]/70 hover:bg-[#1A2529] transition-all shadow-md">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 bg-[#0A0F11] rounded-xl flex items-center justify-center text-[#39AEA9] shrink-0 border border-[#223136]">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#E5EFC1] truncate max-w-[280px] font-sans">{h.title}</h4>
                      <p className="text-[10px] text-[#8FA8AD] font-mono uppercase tracking-widest font-semibold">
                        {h.media_type} &middot; {h.progress_percent.toFixed(0)}% watched
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#8FA8AD] font-mono font-bold">
                    {new Date(h.watched_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#121A1D] rounded-2xl p-10 text-center space-y-1.5 border border-[#223136] shadow-xl">
              <p className="text-xs font-mono font-bold text-[#E5EFC1] uppercase tracking-wider">No history recorded yet</p>
              <p className="text-[11px] text-[#8FA8AD] font-sans">Stream a movie or show to track your playback resume points.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
