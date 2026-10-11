import { create } from "zustand";

interface AmbientState {
  heroBackdrop: string | null;
  heroTitle: string | null;
  activeBackdrop: string | null;
  activeTitle: string | null;
  clearTimeoutId: any | null;
  setHeroBackdrop: (backdrop?: string | null, title?: string | null) => void;
  setActiveBackdrop: (backdrop?: string | null, title?: string | null) => void;
  clearActiveBackdrop: (delayMs?: number) => void;
}

export const useAmbientStore = create<AmbientState>((set, get) => ({
  heroBackdrop: null,
  heroTitle: null,
  activeBackdrop: null,
  activeTitle: null,
  clearTimeoutId: null,

  setHeroBackdrop: (backdrop, title) => {
    if (!backdrop) return;
    set({
      heroBackdrop: backdrop,
      heroTitle: title || null,
    });
  },

  setActiveBackdrop: (backdrop, title) => {
    const { clearTimeoutId } = get();
    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId);
    }
    if (!backdrop) return;
    set({
      activeBackdrop: backdrop,
      activeTitle: title || null,
      clearTimeoutId: null,
    });
  },

  clearActiveBackdrop: (delayMs = 350) => {
    const { clearTimeoutId } = get();
    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId);
    }
    const timer = setTimeout(() => {
      set({ activeBackdrop: null, activeTitle: null, clearTimeoutId: null });
    }, delayMs);
    set({ clearTimeoutId: timer });
  },
}));
