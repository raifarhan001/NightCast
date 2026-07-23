'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '../../store/userStore';
import { apiFetch, setStoredToken } from '../../lib/api';
import MovieCard from '../../components/shared/MovieCard';
import { Sparkles, User, Settings as SettingsIcon, LogOut, Trash2, Plus, Bookmark, Clock, Eye, ShieldCheck, Mail, Lock } from 'lucide-react';
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

  const { data: favorites = [] } = useQuery<any[]>({
    queryKey: ['profile-favorites', activeProfile?.id],
    queryFn: () => apiFetch('/api/user/favorites', {
      headers: activeProfile ? { 'X-Profile-ID': activeProfile.id } : {}
    }),
    enabled: !!activeProfile
  });

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
      <div className="max-w-md mx-auto px-6 py-20 min-h-[85vh] flex flex-col justify-center bg-[#030308]">
        <div className="glass-panel rounded-3xl p-8 space-y-6 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="text-center space-y-2">
            <h1 className="font-display text-2xl font-black tracking-widest text-white uppercase text-gradient-cyan">
              {authMode === 'login' ? 'NEXUS Sign In' : 'Join NEXUS PLAY'}
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              {authMode === 'login' ? 'Access your watchlist, profiles, and history' : 'Create an account to begin streaming'}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Email Address</label>
              <div className="relative">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#080812] rounded-xl border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#00D2FF]/50 transition-colors duration-200" />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Password</label>
              <div className="relative">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-[#080812] rounded-xl border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#00D2FF]/50 transition-colors duration-200" />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              </div>
            </div>

            <button type="submit"
              className="w-full py-3.5 rounded-xl bg-[#00D2FF] hover:bg-[#38BDF8] text-[#030308] font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_0_25px_rgba(0,210,255,0.3)] active:scale-[0.97]">
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="text-center">
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-xs text-[#00D2FF] font-semibold hover:underline">
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already registered? Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 min-h-screen bg-[#030308] grid grid-cols-1 lg:grid-cols-4 gap-10">
      {/* Sidebar Controls */}
      <div className="lg:col-span-1 space-y-8">
        {/* User Card */}
        <div className="glass-panel rounded-3xl p-6 text-center space-y-4 border border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-[#00D2FF]/10 border border-[#00D2FF]/30 text-[#00D2FF] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,210,255,0.2)]">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm truncate">{user.email}</h3>
            <p className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase mt-0.5">
              {user.is_admin ? 'Administrator' : 'Premium Member'}
            </p>
          </div>
          <button onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider transition-colors duration-200 active:scale-[0.97]">
            <LogOut className="w-4 h-4" /><span>Sign Out</span>
          </button>
        </div>

        {/* Profiles Selector */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#00D2FF] font-black">Profiles</h3>
            {profiles.length < 4 && !showCreateForm && (
              <button onClick={() => setShowCreateForm(true)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00D2FF]/20 text-zinc-400 hover:text-[#00D2FF] transition-all duration-200">
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateProfile} className="glass-panel rounded-2xl p-4 space-y-3.5 border border-white/10">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-white">New Profile</h4>
              {profileCreateError && <p className="text-[10px] text-red-400 font-semibold">{profileCreateError}</p>}
              <input type="text" placeholder="Profile Name" required value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="w-full bg-[#080812] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00D2FF]/50" />
              <div className="flex gap-2">
                <button type="submit" className="flex-grow py-2 rounded-lg bg-[#00D2FF] text-[#030308] text-xs font-black transition-all duration-200 active:scale-95">Save</button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 text-xs transition-all duration-200 active:scale-95">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {profiles.map(p => (
              <div key={p.id} className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                activeProfile?.id === p.id
                  ? 'border-[#00D2FF]/40 bg-[#00D2FF]/10 text-white shadow-[0_0_15px_rgba(0,210,255,0.15)]'
                  : 'border-white/10 bg-[#080812] text-zinc-400 hover:text-white'
              }`}>
                <button onClick={() => setActiveProfile(p)} className="flex items-center gap-3 text-left focus:outline-none flex-grow">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0">
                    <Image src={p.avatar_url} alt={p.name} fill sizes="32px" className="object-cover" />
                  </div>
                  <span className="text-xs font-bold">{p.name}</span>
                </button>
                {profiles.length > 1 && (
                  <button onClick={() => handleDeleteProfile(p.id)} className="p-2 text-zinc-500 hover:text-red-400 transition-colors duration-200">
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
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#00D2FF] font-black">Playback Settings</h3>
            <div className="glass-panel rounded-3xl p-5 space-y-4 text-xs border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-bold">Autoplay Next</span>
                <input type="checkbox" checked={settings.autoplay}
                  onChange={(e) => updateSettings({ autoplay: e.target.checked })}
                  className="w-4 h-4 accent-[#00D2FF] rounded" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-bold">Subtitles Enabled</span>
                <input type="checkbox" checked={settings.subtitles_enabled}
                  onChange={(e) => updateSettings({ subtitles_enabled: e.target.checked })}
                  className="w-4 h-4 accent-[#00D2FF] rounded" />
              </div>
              <div className="space-y-1.5">
                <span className="text-zinc-300 font-bold block">Preferred Language</span>
                <select value={settings.preferred_language} onChange={(e) => updateSettings({ preferred_language: e.target.value })}
                  className="w-full bg-[#080812] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-[#00D2FF]/50">
                  <option value="en">English (US)</option>
                  <option value="de">Deutsch</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area: Watchlist & Watch History */}
      <div className="lg:col-span-3 space-y-10">
        {/* Watchlist */}
        <div className="space-y-5">
          <div className="flex items-center gap-2.5 text-white">
            <Bookmark className="w-5 h-5 text-[#00D2FF]" />
            <h2 className="font-display text-xl font-black tracking-tight">Watchlist</h2>
          </div>
          {favorites.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {favorites.map((fav) => (
                <MovieCard key={fav.id} item={{ id: fav.media_id, media_type: fav.media_type as any, title: fav.title, poster_path: fav.poster_path }} />
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-10 text-center space-y-1.5 border border-white/10">
              <p className="text-xs font-bold text-white">Your watchlist is currently empty</p>
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">Explore titles and bookmark them to build your personal streaming library.</p>
            </div>
          )}
        </div>

        {/* Watch History */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-white">
              <Clock className="w-5 h-5 text-[#00D2FF]" />
              <h2 className="font-display text-xl font-black tracking-tight">Watch History</h2>
            </div>
            {history.length > 0 && (
              <button onClick={() => clearHistoryMutation.mutate()}
                className="text-[10px] uppercase font-bold tracking-widest text-red-400 hover:underline">
                Clear History
              </button>
            )}
          </div>
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/10 hover:border-[#00D2FF]/30 transition-all duration-300">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 bg-[#080812] rounded-xl flex items-center justify-center text-[#00D2FF] shrink-0 border border-white/10">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate max-w-[280px]">{h.title}</h4>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
                        {h.media_type} &middot; {h.progress_percent.toFixed(0)}% watched
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold">
                    {new Date(h.watched_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-10 text-center space-y-1.5 border border-white/10">
              <p className="text-xs font-bold text-white">No history recorded yet</p>
              <p className="text-[11px] text-zinc-400">Stream a movie or show to track your playback resume points.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
