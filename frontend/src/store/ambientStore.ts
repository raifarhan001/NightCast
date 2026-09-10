import { create } from "zustand";

interface AmbientState {
  activeBackdrop: string | null;
  activeTitle: string | null;
  clearTimeoutId: any | null;
  setActiveBackdrop: (backdrop: string | null, title?: string) => void;
  clearActiveBackdrop: (delayMs?: number) => void;
}

export const useAmbientStore = create<AmbientState>((set, get) => ({
  activeBackdrop: null,
  activeTitle: null,
  clearTimeoutId: null,

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
