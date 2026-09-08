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
          <h1 className="text-xl font-bold tracking-tight text-white">Access restricted</h1>
          <p className="text-xs text-[#8FA8AD] leading-relaxed">
            You do not have administrative privileges. Please log in with an administrator account.
          </p>
        </div>
      </div>
    );
  }

  if (statsLoading || usersLoading) {
    return (
      <div className="w-full min-h-screen bg-[#0A0F11] flex justify-center items-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#39AEA9] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 min-h-screen bg-[#0A0F11] space-y-10">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white">Administration</h1>
        <p className="text-sm text-[#8FA8AD]">Monitor system metrics and user activity.</p>
      </div>

      {health && health.components && (
        <div className="bg-[#121A1D]/80 backdrop-blur-2xl rounded-3xl p-6 border border-white/[0.08] space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-xs uppercase tracking-wider text-[#39AEA9] font-bold">System Telemetry</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              health.status === 'healthy'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
            }`}>
              {health.status}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1"><p className="text-[11px] text-[#8FA8AD]">Database</p><p className="text-white font-semibold">{health.components.database.status}</p><p className="text-[11px] text-[#8FA8AD]">{health.components.database.latency_ms}ms</p></div>
            <div className="space-y-1"><p className="text-[11px] text-[#8FA8AD]">Cache</p><p className="text-white font-semibold">{health.components.redis_cache.status}</p><p className="text-[11px] text-[#8FA8AD]">{health.components.redis_cache.driver}</p></div>
            <div className="space-y-1"><p className="text-[11px] text-[#8FA8AD]">TMDB</p><p className="text-white font-semibold">{health.components.external_tmdb.status}</p><p className="text-[11px] text-[#8FA8AD]">{health.components.external_tmdb.mode}</p></div>
            <div className="space-y-1"><p className="text-[11px] text-[#8FA8AD]">Resources</p><p className="text-white font-semibold">CPU: {health.system.cpu_utilization}</p><p className="text-[11px] text-[#8FA8AD]">RAM: {health.system.memory_usage}</p></div>
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
          <div key={label} className="bg-[#121A1D]/80 backdrop-blur-xl rounded-2xl p-5 space-y-2 border border-white/[0.08] shadow-sm">
            <div className="text-[#39AEA9]"><Icon className="w-5 h-5" /></div>
            <p className="text-xs font-medium text-[#8FA8AD]">{label}</p>
            <p className="text-2xl font-bold text-white">{value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#39AEA9] font-bold">Users</h3>
          <div className="bg-[#121A1D]/80 backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/[0.08] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] text-[#8FA8AD] font-semibold border-b border-white/[0.08]">
                  <tr>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Profiles</th>
                    <th className="px-5 py-3.5">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {usersList.map((usr: any) => (
                    <tr key={usr.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                      <td className="px-5 py-3.5 font-medium text-white">{usr.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          usr.is_admin ? 'bg-[#39AEA9]/15 text-[#39AEA9] border-[#39AEA9]/30' : 'bg-white/5 text-[#8FA8AD] border-white/10'
                        }`}>
                          {usr.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#8FA8AD]">{usr.profile_count} Profile(s)</td>
                      <td className="px-5 py-3.5 text-[#8FA8AD]">{new Date(usr.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white">
            <Terminal className="w-4 h-4 text-[#39AEA9]" />
            <h3 className="text-xs uppercase tracking-wider text-[#39AEA9] font-bold">System Logs</h3>
          </div>
          <div className="bg-[#121A1D]/80 backdrop-blur-2xl rounded-3xl p-5 font-mono text-[11px] space-y-2.5 max-h-[360px] overflow-y-auto no-scrollbar border border-white/[0.08] shadow-xl">
            {logs.map((log: any, idx: number) => (
              <div key={idx} className="space-y-0.5 leading-relaxed">
                <span className="text-[#8FA8AD]">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                <span className={log.level === 'WARNING' ? 'text-yellow-400' : 'text-[#A2D5AB]'}>{log.level}</span>:{' '}
                <span className="text-white/90">{log.message}</span>
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
