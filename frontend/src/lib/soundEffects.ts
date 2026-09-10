"use client";

// Sound Manager: All background tones, UI sounds, and audio feedback are completely disabled.
class SoundManager {
  private isMuted: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("nightcast_ui_sound_enabled", "false");
      } catch (_) {}
    }
  }

  public toggleMute(): boolean {
    return true;
  }

  public getIsMuted(): boolean {
    return true;
  }

  public playHover() {
    // Disabled
  }

  public playTap() {
    // Disabled
  }

  public playChime() {
    // Disabled
  }
}

export const soundFx = new SoundManager();
