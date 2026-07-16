'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '../../store/userStore';
import { apiFetch } from '../../lib/api';
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
        await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        const me = await apiFetch('/api/auth/me');
        setUser(me);
        queryClient.invalidateQueries({ queryKey: ['trending'] });
        await fetchProfiles();
        const freshProfiles = useUserStore.getState().profiles;
        if (freshProfiles.length > 0) setActiveProfile(freshProfiles[0]);
      } else {
        await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
        setAuthMode('login');
        await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
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
      <div className="max-w-md mx-auto px-6 py-20 min-h-[80vh] flex flex-col justify-center">
        <div className="glass-panel rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-display text-2xl font-extrabold tracking-[0.1em] text-white uppercase">
              {authMode === 'login' ? 'Welcome Back' : 'Join NEXUS'}
            </h1>
            <p className="text-xs text-nexus-muted font-light">
              {authMode === 'login' ? 'Sign in to access your streams' : 'Create an account to begin'}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-nexus-muted">Email</label>
              <div className="relative">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-10 pr-4 py-3 bg-black rounded-xl border border-glass-stroke text-white placeholder-nexus-muted text-sm focus:outline-none focus:border-cyan/50 transition-colors duration-200" />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-nexus-muted">Password</label>
              <div className="relative">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-black rounded-xl border border-glass-stroke text-white placeholder-nexus-muted text-sm focus:outline-none focus:border-cyan/50 transition-colors duration-200" />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
              </div>
            </div>

            <button type="submit"
              className="w-full py-3.5 rounded-xl bg-white hover:bg-cyan text-black font-semibold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg hover:shadow-glow-cyan active:scale-[0.97]">
              {authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="text-center">
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-xs text-cyan font-semibold hover:underline">
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already registered? Sign In"}
            </button>
          </div>

          <div className="border-t border-glass-stroke pt-5 space-y-3">
            <p className="text-[9px] uppercase tracking-wider text-nexus-muted font-bold text-center">Quick Access</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => { setEmail('google.user@gmail.com'); setPassword('mockpass123!'); setAuthMode('login'); }}
                className="py-2.5 rounded-xl border border-glass-stroke bg-black hover:bg-white/[0.03] text-xs text-nexus-muted hover:text-white font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-95">
                <span>Google</span>
              </button>
              <button type="button" onClick={() => { setEmail('github.coder@github.com'); setPassword('mockpass123!'); setAuthMode('login'); }}
                className="py-2.5 rounded-xl border border-glass-stroke bg-black hover:bg-white/[0.03] text-xs text-nexus-muted hover:text-white font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-95">
                <span>GitHub</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 min-h-screen bg-black grid grid-cols-1 lg:grid-cols-4 gap-10">
      <div className="lg:col-span-1 space-y-8">
        <div className="glass-panel rounded-2xl p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-muted border border-cyan/20 text-cyan flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm truncate">{user.email}</h3>
            <p className="text-[10px] text-nexus-muted font-medium tracking-wider uppercase mt-0.5">
              {user.is_admin ? 'Admin' : 'Member'}
            </p>
          </div>
          <button onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-wider transition-colors duration-200 active:scale-[0.97]">
            <LogOut className="w-4 h-4" /><span>Sign Out</span>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-cyan font-bold">Profiles</h3>
            {profiles.length < 4 && !showCreateForm && (
              <button onClick={() => setShowCreateForm(true)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-muted text-nexus-muted hover:text-cyan transition-all duration-200">
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateProfile} className="glass-panel rounded-xl p-4 space-y-3.5">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-white">New Profile</h4>
              {profileCreateError && <p className="text-[10px] text-red-400 font-semibold">{profileCreateError}</p>}
              <input type="text" placeholder="Profile Name" required value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="w-full bg-black border border-glass-stroke rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan/50" />
              <div className="flex gap-2">
                <button type="submit" className="flex-grow py-2 rounded-lg bg-white hover:bg-cyan text-black text-xs font-semibold transition-all duration-200 active:scale-95">Save</button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-nexus-muted text-xs transition-all duration-200 active:scale-95">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {profiles.map(p => (
              <div key={p.id} className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 ${
                activeProfile?.id === p.id
                  ? 'border-cyan/30 bg-cyan-muted text-white'
                  : 'border-glass-stroke bg-nexus-card text-nexus-muted hover:text-white'
              }`}>
                <button onClick={() => setActiveProfile(p)} className="flex items-center gap-3 text-left focus:outline-none flex-grow">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-glass-stroke shrink-0">
                    <Image src={p.avatar_url} alt={p.name} fill sizes="32px" className="object-cover" />
                  </div>
                  <span className="text-xs font-bold">{p.name}</span>
                </button>
                {profiles.length > 1 && (
                  <button onClick={() => handleDeleteProfile(p.id)} className="p-2 text-nexus-muted hover:text-red-400 transition-colors duration-200">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {activeProfile && settings && (
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-cyan font-bold">Settings</h3>
            <div className="glass-panel rounded-2xl p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-nexus-muted font-semibold">Autoplay Next</span>
                <input type="checkbox" checked={settings.autoplay}
                  onChange={(e) => updateSettings({ autoplay: e.target.checked })}
                  className="w-4 h-4 accent-cyan rounded" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-nexus-muted font-semibold">Subtitles</span>
                <input type="checkbox" checked={settings.subtitles_enabled}
                  onChange={(e) => updateSettings({ subtitles_enabled: e.target.checked })}
                  className="w-4 h-4 accent-cyan rounded" />
              </div>
              <div className="space-y-1.5">
                <span className="text-nexus-muted font-semibold block">Language</span>
                <select value={settings.preferred_language} onChange={(e) => updateSettings({ preferred_language: e.target.value })}
                  className="w-full bg-nexus-surface border border-glass-stroke rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-cyan/50">
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                  <option value="es">Espa&ntilde;ol</option>
                  <option value="fr">Fran&ccedil;ais</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-3 space-y-10">
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-white">
            <Bookmark className="w-5 h-5 text-cyan" />
            <h2 className="font-display text-xl font-bold tracking-tight">Watchlist</h2>
          </div>
          {favorites.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {favorites.map((fav) => (
                <MovieCard key={fav.id} item={{ id: fav.media_id, media_type: fav.media_type as any, title: fav.title, poster_path: fav.poster_path }} />
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-10 text-center space-y-1.5">
              <p className="text-xs font-semibold text-white">Your watchlist is empty</p>
              <p className="text-[11px] text-nexus-muted max-w-xs mx-auto">Discover titles and bookmark them to keep track.</p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Clock className="w-5 h-5 text-cyan" />
              <h2 className="font-display text-xl font-bold tracking-tight">History</h2>
            </div>
            {history.length > 0 && (
              <button onClick={() => clearHistoryMutation.mutate()}
                className="text-[10px] uppercase font-bold tracking-wider text-red-400 hover:underline">
                Clear All
              </button>
            )}
          </div>
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="glass-card rounded-2xl p-4 flex items-center justify-between border border-glass-stroke hover:border-white/10 transition-all duration-200">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 bg-nexus-card rounded-xl flex items-center justify-center text-cyan shrink-0 border border-glass-stroke">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate max-w-[280px]">{h.title}</h4>
                      <p className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold">
                        {h.media_type} &middot; {h.progress_percent.toFixed(0)}% watched
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-nexus-dim font-semibold">
                    {new Date(h.watched_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-10 text-center space-y-1.5">
              <p className="text-xs font-semibold text-white">No history yet</p>
              <p className="text-[11px] text-nexus-muted">Start watching to track your progress.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
