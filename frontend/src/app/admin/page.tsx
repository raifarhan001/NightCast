'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '../../store/userStore';
import { apiFetch, UserStats, UserAccount, SystemLog } from '../../lib/api';
import { AdminErrorBoundary } from '../../components/shared/ErrorBoundaries';
import { ShieldAlert, Users, Film, MessageSquare, Heart, Terminal, Settings as SettingsIcon } from 'lucide-react';

function AdminPage() {
  const { user } = useUserStore();

  const { data: stats = {} as UserStats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['admin-stats'],
    queryFn: () => apiFetch('/api/admin/stats'),
    enabled: !!user?.is_admin
  });

  const { data: usersList = [], isLoading: usersLoading } = useQuery<UserAccount[]>({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch('/api/admin/users'),
    enabled: !!user?.is_admin
  });

  const { data: logs = [] } = useQuery<SystemLog[]>({
    queryKey: ['admin-logs'],
    queryFn: () => apiFetch('/api/admin/logs'),
    enabled: !!user?.is_admin
  });

  const { data: health } = useQuery<any>({
    queryKey: ['admin-health'],
    queryFn: () => apiFetch('/api/v1/health'),
    enabled: !!user?.is_admin,
    refetchInterval: 10000
  });

  if (!user || !user.is_admin) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-xl font-extrabold tracking-tight text-white uppercase">Access Restricted</h1>
          <p className="text-xs text-nexus-muted font-light leading-relaxed">
            You do not have the necessary privileges. Log in with an admin account.
          </p>
        </div>
      </div>
    );
  }

  if (statsLoading || usersLoading) {
    return (
      <div className="w-full min-h-screen bg-black flex justify-center items-center">
        <div className="w-8 h-8 rounded-full border-2 border-cyan border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 min-h-screen bg-black space-y-10">
      <div className="space-y-2">
        <h1 className="font-display text-2xl md:text-4xl font-extrabold tracking-tight text-white uppercase">Administration</h1>
        <p className="text-xs text-nexus-muted font-light">Monitor system metrics and user activity.</p>
      </div>

      {health && health.components && (
        <div className="glass-panel rounded-2xl p-6 border border-glass-stroke space-y-4">
          <div className="flex items-center justify-between border-b border-glass-stroke pb-3">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-cyan font-bold">System Telemetry</h3>
            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] uppercase tracking-wide font-bold border ${
              health.status === 'healthy'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
            }`}>
              {health.status}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="space-y-1"><p className="text-[9px] uppercase tracking-wider text-nexus-muted">Database</p><p className="text-white font-bold">{health.components.database.status}</p><p className="text-[10px] text-nexus-muted">{health.components.database.latency_ms}ms</p></div>
            <div className="space-y-1"><p className="text-[9px] uppercase tracking-wider text-nexus-muted">Cache</p><p className="text-white font-bold">{health.components.redis_cache.status}</p><p className="text-[10px] text-nexus-muted">{health.components.redis_cache.driver}</p></div>
            <div className="space-y-1"><p className="text-[9px] uppercase tracking-wider text-nexus-muted">TMDB</p><p className="text-white font-bold">{health.components.external_tmdb.status}</p><p className="text-[10px] text-nexus-muted">{health.components.external_tmdb.mode}</p></div>
            <div className="space-y-1"><p className="text-[9px] uppercase tracking-wider text-nexus-muted">Resources</p><p className="text-white font-bold">CPU: {health.system.cpu_utilization}</p><p className="text-[10px] text-nexus-muted">RAM: {health.system.memory_usage}</p></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { icon: Users, label: 'Total Users', value: stats.users },
          { icon: SettingsIcon, label: 'Profiles', value: stats.profiles },
          { icon: Film, label: 'Plays', value: stats.plays },
          { icon: MessageSquare, label: 'Reviews', value: stats.reviews },
          { icon: Heart, label: 'Favorites', value: stats.favorites },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="glass-panel rounded-2xl p-5 space-y-2">
            <div className="text-cyan"><Icon className="w-5 h-5" /></div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-nexus-muted">{label}</p>
            <p className="text-2xl font-bold text-white">{value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-cyan font-bold">Users</h3>
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-nexus-surface text-nexus-muted font-bold border-b border-glass-stroke">
                  <tr>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Profiles</th>
                    <th className="px-5 py-3.5">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-stroke">
                  {usersList.map((usr: any) => (
                    <tr key={usr.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                      <td className="px-5 py-3.5 font-semibold text-white">{usr.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] uppercase tracking-wide font-bold border ${
                          usr.is_admin ? 'bg-cyan-muted text-cyan border-cyan/20' : 'bg-white/5 text-nexus-muted border-glass-stroke'
                        }`}>
                          {usr.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-nexus-muted font-medium">{usr.profile_count} Profile(s)</td>
                      <td className="px-5 py-3.5 text-nexus-muted">{new Date(usr.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white">
            <Terminal className="w-4 h-4 text-cyan" />
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-cyan font-bold">System Logs</h3>
          </div>
          <div className="glass-panel rounded-2xl p-4 bg-black font-mono text-[10px] space-y-2.5 max-h-[360px] overflow-y-auto no-scrollbar">
            {logs.map((log: any, idx: number) => (
              <div key={idx} className="space-y-0.5 leading-relaxed">
                <span className="text-nexus-muted">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                <span className={log.level === 'WARNING' ? 'text-yellow-500' : 'text-emerald-400'}>{log.level}</span>:{' '}
                <span className="text-white">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPageWrapper() {
  return (
    <AdminErrorBoundary>
      <AdminPage />
    </AdminErrorBoundary>
  );
}
