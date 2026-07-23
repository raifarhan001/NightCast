import { create } from 'zustand';
import { apiFetch, Profile, Settings, setStoredToken } from '../lib/api';

interface UserState {
  user: any | null;
  activeProfile: Profile | null;
  profiles: Profile[];
  settings: Settings | null;
  loading: boolean;
  initialized: boolean;
  
  initialize: () => Promise<void>;
  setUser: (user: any | null) => void;
  setActiveProfile: (profile: Profile | null) => void;
  setProfiles: (profiles: Profile[]) => void;
  fetchProfiles: () => Promise<void>;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  activeProfile: null,
  profiles: [],
  settings: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      const user = await apiFetch('/api/auth/me');
      set({ user });
      
      const profiles = await apiFetch('/api/auth/profiles');
      set({ profiles });
      
      // Load active profile from localStorage or choose first
      const storedProfile = localStorage.getItem('active_profile');
      let active = null;
      if (storedProfile) {
        try {
          active = JSON.parse(storedProfile);
        } catch (_) {}
      }
      
      if (!active && profiles.length > 0) {
        active = profiles[0];
      }
      
      if (active) {
        get().setActiveProfile(active);
      }
    } catch (e) {
      // Not authenticated, clean up state
      set({ user: null, activeProfile: null, profiles: [], settings: null });
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  setUser: (user) => set({ user }),
  
  setActiveProfile: (profile) => {
    if (profile) {
      localStorage.setItem('active_profile', JSON.stringify(profile));
      // Write profile_id to cookie so server middleware/headers can read it
      document.cookie = `profile_id=${profile.id}; path=/; max-age=31536000; SameSite=Lax`;
      set({ activeProfile: profile });
      
      // Fetch settings for profile
      apiFetch('/api/auth/settings', {
        headers: { 'X-Profile-ID': profile.id }
      }).then(settings => {
        set({ settings });
      }).catch(() => {});
    } else {
      localStorage.removeItem('active_profile');
      document.cookie = `profile_id=; path=/; max-age=0`;
      set({ activeProfile: null, settings: null });
    }
  },

  setProfiles: (profiles) => set({ profiles }),

  fetchProfiles: async () => {
    try {
      const profiles = await apiFetch('/api/auth/profiles');
      set({ profiles });
    } catch (_) {}
  },

  updateSettings: async (newSettings) => {
    const { activeProfile } = get();
    if (!activeProfile) return;

    try {
      const updated = await apiFetch('/api/auth/settings', {
        method: 'PUT',
        headers: { 'X-Profile-ID': activeProfile.id },
        body: JSON.stringify(newSettings)
      });
      set({ settings: updated });
    } catch (e) {
      console.error("Failed to update settings:", e);
    }
  },

  logout: async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    setStoredToken(null);
    get().setActiveProfile(null);
    set({ user: null, profiles: [], settings: null });
  }
}));
